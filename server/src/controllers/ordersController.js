const crypto = require('crypto');
const constants = require('../config/constants');
const db = require('../config/db');
const PickupSlotsUtil = require('../utils/pickupSlots');
const PricingService = require('../utils/pricing');
const AuditLogger = require('../utils/auditLogger');
const NotificationService = require('../utils/notifications');

class OrdersController {
  /**
   * Place a new pickup-only order (Transactional checkout)
   */
  static create(req, res) {
    try {
      const {
        items,
        pickup_date,
        pickup_slot,
        customer_name,
        customer_phone,
        customer_email,
        coupon_code,
        payment_method = 'shop',
        notes
      } = req.body;

      // 1. Mandatory customer details
      if (!customer_name || !customer_phone) {
        return res.status(400).json({ error: 'Customer name and phone number are required.' });
      }

      // 2. Pickup Date & Slot Validation
      if (!pickup_date || !pickup_slot) {
        return res.status(400).json({ error: 'Pickup date and pickup slot are required.' });
      }

      PickupSlotsUtil.validateAndBookSlot(pickup_date, pickup_slot);

      // 3. Payment Method Check
      if (payment_method === 'billplz') {
        const billplzSetting = db.get("SELECT value FROM settings WHERE key = 'billplz_enabled'");
        if (!billplzSetting || billplzSetting.value !== 'true') {
          return res.status(400).json({
            error: 'Online payment via Billplz FPX is currently disabled. Please select "Pay at the Shop".'
          });
        }
      }

      // 4. Run Transaction: Price validation + Stock reservation + Order insertion
      const order = db.transaction(tx => {
        // Calculate items and total on server
        const cart = PricingService.calculateCart(items, coupon_code);
        if (cart.items.length === 0) {
          throw new Error('Your cart is empty.');
        }

        // Generate unique order number: SAK-YYYYMMDD-XXXX
        const datePart = pickup_date.replace(/-/g, '');
        const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
        const orderNumber = `SAK-${datePart}-${randomHex}`;

        // Generate unique 4-digit pickup code: PK-XXXX
        const pickupCode = `PK-${Math.floor(1000 + Math.random() * 9000)}`;

        const userId = req.user ? req.user.id : null;

        // Insert Order
        const orderResult = tx.run(
          `INSERT INTO orders (
            order_number, pickup_code, user_id, customer_name, customer_phone, customer_email,
            pickup_date, pickup_slot, status, subtotal_sen, discount_sen, coupon_code, total_sen,
            payment_method, payment_status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Placed', ?, ?, ?, ?, ?, 'pending', ?)`,
          [
            orderNumber,
            pickupCode,
            userId,
            customer_name.trim(),
            customer_phone.trim(),
            customer_email ? customer_email.trim() : null,
            pickup_date,
            pickup_slot,
            cart.subtotal_sen,
            cart.discount_sen,
            cart.coupon ? cart.coupon.code : null,
            cart.total_sen,
            payment_method,
            notes ? notes.trim() : null
          ]
        );

        const orderId = orderResult.lastInsertRowid;

        // Deduct stock & insert order items
        for (const item of cart.items) {
          // Atomic stock decrement
          const currentProd = tx.get('SELECT stock_quantity, low_stock_threshold FROM products WHERE id = ?', [item.product_id]);
          if (!currentProd || currentProd.stock_quantity < item.quantity) {
            throw new Error(`Insufficient stock for "${item.name}". Please adjust your cart.`);
          }

          const newStock = currentProd.stock_quantity - item.quantity;
          tx.run('UPDATE products SET stock_quantity = ? WHERE id = ?', [newStock, item.product_id]);

          // Insert order item snapshot
          tx.run(
            `INSERT INTO order_items (
              order_id, product_id, product_name, unit, unit_price_sen, quantity, total_price_sen
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              orderId,
              item.product_id,
              item.name,
              item.unit,
              item.price_sen,
              item.quantity,
              item.total_price_sen
            ]
          );

          // Record inventory movement
          tx.run(
            `INSERT INTO inventory_movements (product_id, change_qty, balance_qty, movement_type, reference_id, notes)
             VALUES (?, ?, ?, 'ORDER_PLACED', ?, 'Stock reserved for order')`,
            [item.product_id, -item.quantity, newStock, String(orderId)]
          );

          // Check low stock
          if (newStock <= currentProd.low_stock_threshold) {
            NotificationService.notify({
              targetRole: 'seller',
              title: 'Low Stock Alert',
              message: `Product "${item.name}" stock dropped to ${newStock}.`,
              type: 'low_stock'
            });
          }
        }

        // Increment coupon usage if applied
        if (cart.coupon) {
          tx.run('UPDATE coupons SET times_used = times_used + 1 WHERE code = ?', [cart.coupon.code]);
        }

        return {
          orderId,
          orderNumber,
          pickupCode,
          total_sen: cart.total_sen,
          subtotal_sen: cart.subtotal_sen,
          discount_sen: cart.discount_sen,
          pickup_date,
          pickup_slot
        };
      });

      // Audit Log
      AuditLogger.log({
        userId: req.user ? req.user.id : null,
        userName: customer_name,
        role: req.user ? req.user.role : 'customer',
        action: 'ORDER_PLACED',
        details: { orderNumber: order.orderNumber, pickupCode: order.pickupCode, total_sen: order.total_sen },
        ipAddress: req.ip
      });

      // Notify Customer & Seller
      NotificationService.notify({
        userId: req.user ? req.user.id : null,
        targetRole: 'customer',
        orderId: order.orderId,
        title: 'Order Placed Successfully',
        message: `Your pickup order ${order.orderNumber} has been received. Pickup Code: ${order.pickupCode}`,
        type: 'order_status'
      });

      NotificationService.notify({
        targetRole: 'seller',
        orderId: order.orderId,
        title: 'New Pickup Order Received!',
        message: `New order ${order.orderNumber} for ${pickup_date} (${pickup_slot}). Amount: ${PricingService.formatRM(order.total_sen)}`,
        type: 'order_placed'
      });

      return res.status(201).json({
        message: 'Order placed successfully',
        order
      });
    } catch (err) {
      console.error('Order creation error:', err);
      return res.status(400).json({ error: err.message });
    }
  }

  /**
   * Customer: View My Orders
   */
  static getMyOrders(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const orders = db.query(
        `SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC`,
        [req.user.id]
      );

      return res.json({ orders });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve orders' });
    }
  }

  /**
   * Get single order details with items
   */
  static getOrderDetails(req, res) {
    try {
      const { id } = req.params;
      const order = db.get('SELECT * FROM orders WHERE id = ? OR order_number = ?', [id, id]);

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Check customer ownership if logged in and not staff/owner
      if (req.user && req.user.role === 'customer' && order.user_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to view this order.' });
      }

      const items = db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);

      return res.json({
        order: {
          ...order,
          formatted: {
            subtotal: PricingService.formatRM(order.subtotal_sen),
            discount: PricingService.formatRM(order.discount_sen),
            total: PricingService.formatRM(order.total_sen)
          }
        },
        items
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve order' });
    }
  }

  /**
   * Public Order Tracking by Order Number + Phone/Pickup Code
   */
  static trackOrder(req, res) {
    try {
      const { orderNumber, identifier } = req.body;

      if (!orderNumber || !identifier) {
        return res.status(400).json({ error: 'Order number and Phone Number or Pickup Code are required.' });
      }

      const cleanNum = orderNumber.trim();
      const cleanIdent = identifier.trim();

      const order = db.get(
        `SELECT id, order_number, pickup_code, pickup_date, pickup_slot, status, subtotal_sen, discount_sen, total_sen, payment_method, payment_status, created_at, customer_name
         FROM orders 
         WHERE order_number = ? AND (customer_phone = ? OR pickup_code = ?)`,
        [cleanNum, cleanIdent, cleanIdent]
      );

      if (!order) {
        return res.status(404).json({ error: 'No matching order found. Please check your order number and phone or pickup code.' });
      }

      const items = db.query(
        `SELECT product_name, unit, unit_price_sen, quantity, total_price_sen 
         FROM order_items WHERE order_id = ?`,
        [order.id]
      );

      return res.json({
        order: {
          ...order,
          formatted: {
            subtotal: PricingService.formatRM(order.subtotal_sen),
            discount: PricingService.formatRM(order.discount_sen),
            total: PricingService.formatRM(order.total_sen)
          }
        },
        items
      });
    } catch (err) {
      return res.status(500).json({ error: 'Tracking failed' });
    }
  }

  /**
   * Cancel Order (Allowed ONLY before order reaches 'Preparing')
   * Restores reserved stock and records inventory movement and audit log.
   */
  static cancelOrder(req, res) {
    try {
      const { id } = req.params;
      const { reason = 'Cancelled by customer' } = req.body;

      const order = db.get('SELECT * FROM orders WHERE id = ?', [id]);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Check customer ownership
      if (req.user && req.user.role === 'customer' && order.user_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to cancel this order.' });
      }

      // Disallow cancellation if already Cancelled
      if (order.status === 'Cancelled') {
        return res.status(400).json({ error: 'Order has already been cancelled.' });
      }

      // Strict check: Customers can cancel only BEFORE Preparing ('Placed' or 'Confirmed')
      const isStaffOrOwner = req.user && (req.user.role === 'staff' || req.user.role === 'owner');
      if (!isStaffOrOwner && order.status !== 'Placed' && order.status !== 'Confirmed') {
        return res.status(400).json({
          error: `Orders cannot be cancelled once they reach '${order.status}'. Please call the store directly at 8:00 AM – 8:00 PM.`
        });
      }

      // Run Transaction to restore stock and update order
      db.transaction(tx => {
        // 1. Get order items to return stock
        const items = tx.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
        for (const item of items) {
          const product = tx.get('SELECT stock_quantity FROM products WHERE id = ?', [item.product_id]);
          if (product) {
            const restoredStock = product.stock_quantity + item.quantity;
            tx.run('UPDATE products SET stock_quantity = ? WHERE id = ?', [restoredStock, item.product_id]);

            tx.run(
              `INSERT INTO inventory_movements (product_id, change_qty, balance_qty, movement_type, reference_id, notes)
               VALUES (?, ?, ?, 'ORDER_CANCELLED', ?, 'Stock restored from order cancellation')`,
              [item.product_id, item.quantity, restoredStock, String(order.id)]
            );
          }
        }

        // 2. Decrement coupon usage if applied
        if (order.coupon_code) {
          tx.run('UPDATE coupons SET times_used = MAX(0, times_used - 1) WHERE code = ?', [order.coupon_code]);
        }

        // 3. Update Order status
        tx.run(
          `UPDATE orders SET status = 'Cancelled', cancellation_reason = ?, updated_at = datetime('now') WHERE id = ?`,
          [reason, order.id]
        );
      });

      // Audit Log
      AuditLogger.log({
        userId: req.user ? req.user.id : null,
        userName: req.user ? req.user.name : order.customer_name,
        role: req.user ? req.user.role : 'customer',
        action: 'ORDER_CANCELLED',
        details: { orderId: order.id, orderNumber: order.orderNumber, reason },
        ipAddress: req.ip
      });

      // Notify
      NotificationService.notify({
        userId: order.user_id,
        targetRole: 'customer',
        orderId: order.id,
        title: 'Order Cancelled',
        message: `Order ${order.order_number} has been cancelled. Reserved items have been returned to stock.`,
        type: 'order_status'
      });

      return res.json({ message: 'Order successfully cancelled. Stock has been restored.' });
    } catch (err) {
      console.error('Cancellation error:', err);
      return res.status(500).json({ error: 'Failed to cancel order' });
    }
  }

  /**
   * Seller: List all orders with filters
   */
  static getAllOrders(req, res) {
    try {
      const { status, date, search, page = 1, limit = 50 } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
      const offset = (pageNum - 1) * limitNum;

      const conditions = [];
      const params = [];

      if (status && status !== 'All') {
        conditions.push('status = ?');
        params.push(status);
      }

      if (date) {
        conditions.push('pickup_date = ?');
        params.push(date);
      }

      if (search && search.trim() !== '') {
        const q = `%${search.trim()}%`;
        conditions.push('(order_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ? OR pickup_code LIKE ?)');
        params.push(q, q, q, q);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countRow = db.get(`SELECT COUNT(*) as total FROM orders ${whereClause}`, params);
      const total = countRow ? countRow.total : 0;

      const orders = db.query(
        `SELECT * FROM orders ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...params, limitNum, offset]
      );

      return res.json({
        orders,
        pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve orders' });
    }
  }

  /**
   * Seller: Update Order Status (Placed -> Confirmed -> Preparing -> Ready for pickup -> Collected)
   */
  static updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['Placed', 'Confirmed', 'Preparing', 'Ready for pickup', 'Collected', 'Cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }

      const order = db.get('SELECT * FROM orders WHERE id = ?', [id]);
      if (!order) return res.status(404).json({ error: 'Order not found' });

      if (order.status === 'Cancelled') {
        return res.status(400).json({ error: 'Cannot change status of an already cancelled order.' });
      }

      if (order.status === 'Collected') {
        return res.status(400).json({ error: 'Order is already marked as Collected.' });
      }

      // Mark payment as paid if order is collected
      const paymentStatusUpdate = status === 'Collected' ? ", payment_status = 'paid'" : '';

      db.run(
        `UPDATE orders SET status = ?, updated_at = datetime('now') ${paymentStatusUpdate} WHERE id = ?`,
        [status, id]
      );

      AuditLogger.log({
        userId: req.user.id,
        userName: req.user.name,
        role: req.user.role,
        action: 'ORDER_STATUS_UPDATE',
        details: { orderId: id, oldStatus: order.status, newStatus: status },
        ipAddress: req.ip
      });

      // Send status notification to customer
      NotificationService.notify({
        userId: order.user_id,
        targetRole: 'customer',
        orderId: order.id,
        title: `Order Status: ${status}`,
        message: `Your pickup order ${order.order_number} is now ${status}. Pickup Code: ${order.pickup_code}`,
        type: 'order_status'
      });

      return res.json({ message: `Order status updated to ${status}` });
    } catch (err) {
      console.error('Status update error:', err);
      return res.status(500).json({ error: 'Failed to update order status' });
    }
  }
}

module.exports = OrdersController;
