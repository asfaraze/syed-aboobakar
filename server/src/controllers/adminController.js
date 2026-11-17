const bcrypt = require('bcryptjs');
const constants = require('../config/constants');
const db = require('../config/db');
const AuditLogger = require('../utils/auditLogger');
const PricingService = require('../utils/pricing');

class AdminController {
  /**
   * Helper to mask email address: a***r@example.com
   */
  static maskEmail(email) {
    if (!email) return 'N/A';
    const [user, domain] = email.split('@');
    if (!domain) return '***';
    if (user.length <= 2) return `${user[0]}***@${domain}`;
    return `${user[0]}***${user[user.length - 1]}@${domain}`;
  }

  /**
   * Helper to mask phone number: +601****89
   */
  static maskPhone(phone) {
    if (!phone) return 'N/A';
    const clean = phone.replace(/\s+/g, '');
    if (clean.length <= 4) return '****';
    return `${clean.substring(0, 4)}****${clean.substring(clean.length - 2)}`;
  }

  /**
   * Dashboard Overview Statistics
   * Staff sees operational stats; Owner sees operational + financial figures
   */
  static getOverview(req, res) {
    try {
      const isOwner = req.user.role === 'owner';
      const today = new Date().toISOString().split('T')[0];

      // Today's orders
      const todayOrdersRow = db.get("SELECT COUNT(*) as count FROM orders WHERE pickup_date = ? AND status != 'Cancelled'", [today]);
      const todayOrders = todayOrdersRow ? todayOrdersRow.count : 0;

      // Pending orders
      const pendingOrdersRow = db.get("SELECT COUNT(*) as count FROM orders WHERE status IN ('Placed', 'Confirmed', 'Preparing')");
      const pendingOrders = pendingOrdersRow ? pendingOrdersRow.count : 0;

      // Ready for pickup orders
      const readyOrdersRow = db.get("SELECT COUNT(*) as count FROM orders WHERE status = 'Ready for pickup'");
      const readyOrders = readyOrdersRow ? readyOrdersRow.count : 0;

      // Total products
      const totalProductsRow = db.get("SELECT COUNT(*) as count FROM products WHERE is_active = 1");
      const totalProducts = totalProductsRow ? totalProductsRow.count : 0;

      // Low stock count
      const lowStockRow = db.get("SELECT COUNT(*) as count FROM products WHERE is_active = 1 AND stock_quantity <= low_stock_threshold");
      const lowStockCount = lowStockRow ? lowStockRow.count : 0;

      // Recent 10 orders
      const recentOrders = db.query("SELECT * FROM orders ORDER BY id DESC LIMIT 10");

      // Financials (OWNER ONLY)
      let financials = null;
      if (isOwner) {
        const todaySalesRow = db.get(
          "SELECT SUM(total_sen) as total, SUM(subtotal_sen) as gross, SUM(discount_sen) as discounts FROM orders WHERE pickup_date = ? AND status != 'Cancelled'",
          [today]
        );
        const allTimeSalesRow = db.get(
          "SELECT SUM(total_sen) as total, SUM(subtotal_sen) as gross, SUM(discount_sen) as discounts FROM orders WHERE status != 'Cancelled'"
        );
        const collectedRow = db.get(
          "SELECT SUM(total_sen) as total FROM orders WHERE payment_status = 'paid' AND status != 'Cancelled'"
        );

        financials = {
          today_sales_sen: todaySalesRow?.total || 0,
          today_sales_rm: PricingService.formatRM(todaySalesRow?.total || 0),
          today_gross_sen: todaySalesRow?.gross || 0,
          today_discount_sen: todaySalesRow?.discounts || 0,
          all_time_sales_sen: allTimeSalesRow?.total || 0,
          all_time_sales_rm: PricingService.formatRM(allTimeSalesRow?.total || 0),
          collected_payments_sen: collectedRow?.total || 0,
          collected_payments_rm: PricingService.formatRM(collectedRow?.total || 0)
        };
      }

      return res.json({
        isOwner,
        todayOrders,
        pendingOrders,
        readyOrders,
        totalProducts,
        lowStockCount,
        recentOrders,
        financials
      });
    } catch (err) {
      console.error('Overview error:', err);
      return res.status(500).json({ error: 'Failed to retrieve overview statistics' });
    }
  }

  /**
   * Customers Management
   * Masked phone & email for staff; Owner can see ranking & order counts
   */
  static getCustomers(req, res) {
    try {
      const isOwner = req.user.role === 'owner';

      const customers = db.query(`
        SELECT u.id, u.name, u.email, u.phone, u.created_at,
          COUNT(o.id) as total_orders,
          COALESCE(SUM(CASE WHEN o.status != 'Cancelled' THEN o.total_sen ELSE 0 END), 0) as total_spend_sen
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        WHERE u.role = 'customer'
        GROUP BY u.id
        ORDER BY total_spend_sen DESC, total_orders DESC
      `);

      const sanitized = customers.map((c, index) => ({
        id: c.id,
        name: c.name,
        rank: index + 1,
        email: isOwner ? c.email : AdminController.maskEmail(c.email),
        phone: isOwner ? c.phone : AdminController.maskPhone(c.phone),
        isMasked: !isOwner,
        total_orders: c.total_orders,
        total_spend_sen: isOwner ? c.total_spend_sen : undefined,
        total_spend_rm: isOwner ? PricingService.formatRM(c.total_spend_sen) : undefined,
        created_at: c.created_at
      }));

      return res.json({ customers: sanitized, isOwner });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve customers' });
    }
  }

  /**
   * OWNER ONLY: Reveal customer unmasked contact details
   * Every reveal is immutably recorded in the audit log.
   */
  static revealCustomerContact(req, res) {
    try {
      if (req.user.role !== 'owner') {
        return res.status(403).json({ error: 'Permission denied. Only the Store Owner can reveal private customer contact details.' });
      }

      const { id } = req.params;
      const customer = db.get('SELECT id, name, email, phone FROM users WHERE id = ? AND role = "customer"', [id]);

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // Record in Hash-Chained Audit Log
      AuditLogger.log({
        userId: req.user.id,
        userName: req.user.name,
        role: req.user.role,
        action: 'CUSTOMER_CONTACT_REVEAL',
        details: { customerId: customer.id, customerName: customer.name },
        ipAddress: req.ip
      });

      return res.json({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        revealedAt: new Date().toISOString()
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to reveal customer contact' });
    }
  }

  /**
   * Sales Analytics (OWNER ONLY)
   */
  static getSalesAnalytics(req, res) {
    try {
      if (req.user.role !== 'owner') {
        return res.status(403).json({ error: 'Permission denied. Financial analytics are reserved for Store Owner.' });
      }

      // Daily sales for the last 14 days
      const dailySales = db.query(`
        SELECT pickup_date as date, 
          COUNT(id) as orders_count,
          SUM(total_sen) as net_sales_sen,
          SUM(subtotal_sen) as gross_sales_sen,
          SUM(discount_sen) as discounts_sen
        FROM orders 
        WHERE status != 'Cancelled'
        GROUP BY pickup_date 
        ORDER BY pickup_date DESC 
        LIMIT 14
      `);

      // Best selling products
      const topProducts = db.query(`
        SELECT oi.product_id, oi.product_name, oi.unit,
          SUM(oi.quantity) as total_quantity_sold,
          SUM(oi.total_price_sen) as total_revenue_sen
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status != 'Cancelled'
        GROUP BY oi.product_id
        ORDER BY total_quantity_sold DESC
        LIMIT 10
      `);

      // Summary totals
      const totalsRow = db.get(`
        SELECT 
          COUNT(id) as total_orders,
          SUM(CASE WHEN status = 'Collected' THEN 1 ELSE 0 END) as collected_orders,
          SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
          SUM(CASE WHEN status != 'Cancelled' THEN total_sen ELSE 0 END) as net_sales_sen,
          SUM(CASE WHEN status != 'Cancelled' THEN subtotal_sen ELSE 0 END) as gross_sales_sen,
          SUM(CASE WHEN status != 'Cancelled' THEN discount_sen ELSE 0 END) as total_discounts_sen,
          SUM(CASE WHEN payment_status = 'paid' AND status != 'Cancelled' THEN total_sen ELSE 0 END) as collected_payments_sen
        FROM orders
      `);

      return res.json({
        dailySales: dailySales.reverse().map(d => ({
          ...d,
          formatted: {
            net: PricingService.formatRM(d.net_sales_sen || 0),
            gross: PricingService.formatRM(d.gross_sales_sen || 0),
            discount: PricingService.formatRM(d.discounts_sen || 0)
          }
        })),
        topProducts: topProducts.map(p => ({
          ...p,
          revenue_rm: PricingService.formatRM(p.total_revenue_sen)
        })),
        totals: {
          ...totalsRow,
          net_sales_rm: PricingService.formatRM(totalsRow?.net_sales_sen || 0),
          gross_sales_rm: PricingService.formatRM(totalsRow?.gross_sales_sen || 0),
          total_discounts_rm: PricingService.formatRM(totalsRow?.total_discounts_sen || 0),
          collected_payments_rm: PricingService.formatRM(totalsRow?.collected_payments_sen || 0)
        }
      });
    } catch (err) {
      console.error('Analytics error:', err);
      return res.status(500).json({ error: 'Failed to retrieve analytics' });
    }
  }

  /**
   * Inventory Movement History
   */
  static getInventoryMovements(req, res) {
    try {
      const movements = db.query(`
        SELECT m.*, p.name as product_name, p.unit
        FROM inventory_movements m
        JOIN products p ON m.product_id = p.id
        ORDER BY m.id DESC
        LIMIT 100
      `);

      return res.json({ movements });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve inventory movements' });
    }
  }

  /**
   * Staff Management: List Staff (OWNER ONLY)
   */
  static getStaff(req, res) {
    try {
      if (req.user.role !== 'owner') {
        return res.status(403).json({ error: 'Only the Store Owner can manage staff accounts' });
      }

      const staff = db.query(
        "SELECT id, name, email, phone, role, is_active, totp_enabled, created_at FROM users WHERE role IN ('staff', 'owner') ORDER BY id ASC"
      );

      return res.json({ staff });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve staff list' });
    }
  }

  /**
   * Staff Management: Create Staff Account (OWNER ONLY)
   */
  static async createStaff(req, res) {
    try {
      if (req.user.role !== 'owner') {
        return res.status(403).json({ error: 'Only the Store Owner can create staff' });
      }

      const { name, email, phone, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and initial password are required' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const existing = db.get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
      if (existing) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      const hash = await bcrypt.hash(password, constants.SECURITY.BCRYPT_ROUNDS);

      const result = db.run(
        `INSERT INTO users (name, email, phone, password_hash, role, is_active)
         VALUES (?, ?, ?, ?, 'staff', 1)`,
        [name.trim(), cleanEmail, phone ? phone.trim() : null, hash]
      );

      AuditLogger.log({
        userId: req.user.id,
        userName: req.user.name,
        role: req.user.role,
        action: 'STAFF_CREATED',
        details: { newStaffId: result.lastInsertRowid, email: cleanEmail },
        ipAddress: req.ip
      });

      return res.status(201).json({ message: 'Staff account created successfully', staffId: result.lastInsertRowid });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to create staff account' });
    }
  }

  /**
   * Staff Management: Toggle Staff Status (OWNER ONLY)
   */
  static toggleStaffStatus(req, res) {
    try {
      if (req.user.role !== 'owner') {
        return res.status(403).json({ error: 'Only Store Owner can change staff status' });
      }

      const { id } = req.params;
      const targetUser = db.get('SELECT * FROM users WHERE id = ?', [id]);

      if (!targetUser) return res.status(404).json({ error: 'User not found' });
      if (targetUser.role === 'owner') return res.status(400).json({ error: 'Cannot deactivate the Store Owner' });

      const newStatus = targetUser.is_active === 1 ? 0 : 1;
      db.run('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, id]);

      AuditLogger.log({
        userId: req.user.id,
        userName: req.user.name,
        role: req.user.role,
        action: 'STAFF_STATUS_TOGGLED',
        details: { targetUserId: id, newStatus },
        ipAddress: req.ip
      });

      return res.json({ message: `Staff status changed to ${newStatus === 1 ? 'Active' : 'Disabled'}` });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update staff status' });
    }
  }

  /**
   * Staff Management: Reset Staff Password (OWNER ONLY)
   */
  static async resetStaffPassword(req, res) {
    try {
      if (req.user.role !== 'owner') {
        return res.status(403).json({ error: 'Only Store Owner can reset staff passwords' });
      }

      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }

      const target = db.get('SELECT * FROM users WHERE id = ?', [id]);
      if (!target) return res.status(404).json({ error: 'User not found' });

      const hash = await bcrypt.hash(newPassword, constants.SECURITY.BCRYPT_ROUNDS);
      db.run('UPDATE users SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL WHERE id = ?', [hash, id]);

      AuditLogger.log({
        userId: req.user.id,
        userName: req.user.name,
        role: req.user.role,
        action: 'STAFF_PASSWORD_RESET',
        details: { targetUserId: id, targetEmail: target.email },
        ipAddress: req.ip
      });

      return res.json({ message: 'Staff password has been reset successfully' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to reset password' });
    }
  }

  /**
   * Audit Logs View & Cryptographic Chain Verification (OWNER ONLY)
   */
  static getAuditLogs(req, res) {
    try {
      if (req.user.role !== 'owner') {
        return res.status(403).json({ error: 'Audit logs can only be viewed by the Store Owner' });
      }

      const logs = db.query('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100');
      const integrity = AuditLogger.verifyIntegrity();

      return res.json({ logs, integrity });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve audit logs' });
    }
  }

  /**
   * Shop Settings: Get Settings (OWNER ONLY)
   */
  static getSettings(req, res) {
    try {
      if (req.user.role !== 'owner') {
        return res.status(403).json({ error: 'Settings access is restricted to Store Owner' });
      }

      const rows = db.query('SELECT key, value FROM settings');
      const settings = {};
      for (const r of rows) {
        settings[r.key] = r.value;
      }

      return res.json({ settings });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to load settings' });
    }
  }

  /**
   * Shop Settings: Update Settings (OWNER ONLY)
   */
  static updateSettings(req, res) {
    try {
      if (req.user.role !== 'owner') {
        return res.status(403).json({ error: 'Settings update is restricted to Store Owner' });
      }

      const updates = req.body;
      db.transaction(tx => {
        for (const [key, val] of Object.entries(updates)) {
          tx.run(
            'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
            [key, String(val)]
          );
        }
      });

      AuditLogger.log({
        userId: req.user.id,
        userName: req.user.name,
        role: req.user.role,
        action: 'SETTINGS_UPDATE',
        details: updates,
        ipAddress: req.ip
      });

      return res.json({ message: 'Settings saved successfully' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to save settings' });
    }
  }

  /**
   * Export Orders to CSV (OWNER ONLY)
   */
  static exportOrdersCSV(req, res) {
    try {
      if (req.user.role !== 'owner') {
        return res.status(403).json({ error: 'Export restricted to Store Owner' });
      }

      const orders = db.query('SELECT * FROM orders ORDER BY id DESC');
      let csv = 'order_number,pickup_code,customer_name,customer_phone,pickup_date,pickup_slot,status,total_rm,payment_method,payment_status,created_at\n';

      for (const o of orders) {
        const totalRM = (o.total_sen / 100).toFixed(2);
        csv += `"${o.order_number}","${o.pickup_code}","${o.customer_name}","${o.customer_phone}","${o.pickup_date}","${o.pickup_slot}","${o.status}",${totalRM},"${o.payment_method}","${o.payment_status}","${o.created_at}"\n`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="syed_aboobakar_orders_export.csv"');
      return res.send(csv);
    } catch (err) {
      return res.status(500).json({ error: 'Export failed' });
    }
  }
}

module.exports = AdminController;
