const db = require('../config/db');
const AuditLogger = require('../utils/auditLogger');
const PricingService = require('../utils/pricing');

class CouponsController {
  /**
   * Validate coupon code for shopping cart
   */
  static validate(req, res) {
    try {
      const { code, subtotal_sen = 0 } = req.body;
      if (!code) return res.status(400).json({ error: 'Coupon code is required' });

      const cleanCode = code.trim().toUpperCase();
      const coupon = db.get('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [cleanCode]);

      if (!coupon) {
        return res.status(404).json({ error: `Coupon "${cleanCode}" is invalid or expired` });
      }

      const today = new Date().toISOString().split('T')[0];
      if (coupon.start_date && coupon.start_date > today) {
        return res.status(400).json({ error: `Coupon "${cleanCode}" is not active yet` });
      }
      if (coupon.end_date && coupon.end_date < today) {
        return res.status(400).json({ error: `Coupon "${cleanCode}" has expired` });
      }
      if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) {
        return res.status(400).json({ error: `Coupon "${cleanCode}" has reached maximum usage limit` });
      }

      const subtotal = parseInt(subtotal_sen, 10) || 0;
      if (coupon.min_spend_sen && subtotal < coupon.min_spend_sen) {
        return res.status(400).json({
          error: `Minimum order of ${PricingService.formatRM(coupon.min_spend_sen)} required to apply this coupon`
        });
      }

      let discount_sen = 0;
      if (coupon.discount_type === 'percent') {
        discount_sen = Math.round((subtotal * coupon.discount_value) / 100);
        if (coupon.max_discount_sen && discount_sen > coupon.max_discount_sen) {
          discount_sen = coupon.max_discount_sen;
        }
      } else {
        discount_sen = coupon.discount_value;
      }

      return res.json({
        valid: true,
        coupon: {
          code: coupon.code,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          discount_sen,
          discount_formatted: PricingService.formatRM(discount_sen)
        }
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to validate coupon' });
    }
  }

  /**
   * Admin: List all coupons
   */
  static getAll(req, res) {
    try {
      const coupons = db.query('SELECT * FROM coupons ORDER BY id DESC');
      return res.json({ coupons });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve coupons' });
    }
  }

  /**
   * Admin: Create Coupon
   */
  static create(req, res) {
    try {
      const {
        code,
        discount_type,
        discount_value,
        min_spend_sen = 0,
        max_discount_sen,
        start_date,
        end_date,
        usage_limit = 100
      } = req.body;

      if (!code || !discount_type || discount_value === undefined) {
        return res.status(400).json({ error: 'Code, discount type, and discount value are required' });
      }

      const cleanCode = code.trim().toUpperCase();
      const existing = db.get('SELECT id FROM coupons WHERE code = ?', [cleanCode]);
      if (existing) {
        return res.status(400).json({ error: `Coupon "${cleanCode}" already exists` });
      }

      const result = db.run(
        `INSERT INTO coupons (
          code, discount_type, discount_value, min_spend_sen, max_discount_sen,
          start_date, end_date, usage_limit, times_used, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
        [
          cleanCode,
          discount_type,
          parseInt(discount_value, 10),
          parseInt(min_spend_sen, 10) || 0,
          max_discount_sen ? parseInt(max_discount_sen, 10) : null,
          start_date || null,
          end_date || null,
          parseInt(usage_limit, 10) || 100
        ]
      );

      AuditLogger.log({
        userId: req.user.id,
        userName: req.user.name,
        role: req.user.role,
        action: 'COUPON_CREATE',
        details: { code: cleanCode, discount_type, discount_value },
        ipAddress: req.ip
      });

      const newCoupon = db.get('SELECT * FROM coupons WHERE id = ?', [result.lastInsertRowid]);
      return res.status(201).json({ message: 'Coupon created successfully', coupon: newCoupon });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to create coupon' });
    }
  }

  /**
   * Admin: Toggle Coupon Active
   */
  static toggleStatus(req, res) {
    try {
      const { id } = req.params;
      const coupon = db.get('SELECT * FROM coupons WHERE id = ?', [id]);
      if (!coupon) return res.status(404).json({ error: 'Coupon not found' });

      const newStatus = coupon.is_active === 1 ? 0 : 1;
      db.run('UPDATE coupons SET is_active = ? WHERE id = ?', [newStatus, id]);

      AuditLogger.log({
        userId: req.user.id,
        userName: req.user.name,
        role: req.user.role,
        action: 'COUPON_STATUS_TOGGLE',
        details: { code: coupon.code, is_active: newStatus },
        ipAddress: req.ip
      });

      return res.json({ message: `Coupon is now ${newStatus === 1 ? 'Active' : 'Disabled'}` });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to toggle coupon' });
    }
  }
}

module.exports = CouponsController;
