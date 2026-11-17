const db = require('../config/db');

/**
 * Server-Side Pricing, Currency & Coupon Calculation Engine
 * ALL calculations are in integer sen (RM 1.00 = 100 sen)
 */
class PricingService {
  /**
   * Convert sen to formatted RM string (e.g., 1250 -> "RM 12.50")
   */
  static formatRM(sen) {
    return `RM ${(sen / 100).toFixed(2)}`;
  }

  /**
   * Calculate cart total from an array of { productId, quantity }
   */
  static calculateCart(items, couponCode = null) {
    if (!Array.isArray(items) || items.length === 0) {
      return {
        items: [],
        subtotal_sen: 0,
        discount_sen: 0,
        total_sen: 0,
        coupon: null
      };
    }

    const calculatedItems = [];
    let subtotal_sen = 0;

    for (const item of items) {
      const quantity = parseInt(item.quantity, 10);
      if (isNaN(quantity) || quantity <= 0) {
        throw new Error(`Invalid quantity ${item.quantity} for product ID ${item.productId}`);
      }

      const product = db.get('SELECT * FROM products WHERE id = ? AND is_active = 1', [item.productId]);
      if (!product) {
        throw new Error(`Product ID ${item.productId} is not available or does not exist`);
      }

      if (product.stock_quantity < quantity) {
        throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock_quantity}, Requested: ${quantity}`);
      }

      const itemTotal_sen = product.price_sen * quantity;
      subtotal_sen += itemTotal_sen;

      calculatedItems.push({
        product_id: product.id,
        name: product.name,
        name_ms: product.name_ms,
        name_ta: product.name_ta,
        unit: product.unit,
        price_sen: product.price_sen,
        original_price_sen: product.original_price_sen,
        discount_percent: product.discount_percent,
        quantity,
        total_price_sen: itemTotal_sen,
        stock_quantity: product.stock_quantity,
        image_url: product.image_url
      });
    }

    // Process Coupon if provided
    let discount_sen = 0;
    let appliedCoupon = null;

    if (couponCode && String(couponCode).trim() !== '') {
      const cleanCode = String(couponCode).trim().toUpperCase();
      const coupon = db.get('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [cleanCode]);

      if (!coupon) {
        throw new Error(`Coupon "${cleanCode}" is invalid or inactive`);
      }

      const today = new Date().toISOString().split('T')[0];
      if (coupon.start_date && coupon.start_date > today) {
        throw new Error(`Coupon "${cleanCode}" is not active yet`);
      }
      if (coupon.end_date && coupon.end_date < today) {
        throw new Error(`Coupon "${cleanCode}" has expired`);
      }
      if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) {
        throw new Error(`Coupon "${cleanCode}" has reached its maximum usage limit`);
      }
      if (coupon.min_spend_sen && subtotal_sen < coupon.min_spend_sen) {
        throw new Error(
          `Minimum order of ${this.formatRM(coupon.min_spend_sen)} required to use coupon "${cleanCode}"`
        );
      }

      if (coupon.discount_type === 'percent') {
        discount_sen = Math.round((subtotal_sen * coupon.discount_value) / 100);
        if (coupon.max_discount_sen && discount_sen > coupon.max_discount_sen) {
          discount_sen = coupon.max_discount_sen;
        }
      } else if (coupon.discount_type === 'fixed') {
        // fixed discount in sen
        discount_sen = coupon.discount_value;
      }

      // Discount cannot exceed subtotal
      if (discount_sen > subtotal_sen) {
        discount_sen = subtotal_sen;
      }

      appliedCoupon = {
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        discount_sen
      };
    }

    const total_sen = Math.max(0, subtotal_sen - discount_sen);

    return {
      items: calculatedItems,
      subtotal_sen,
      discount_sen,
      total_sen,
      coupon: appliedCoupon
    };
  }
}

module.exports = PricingService;
