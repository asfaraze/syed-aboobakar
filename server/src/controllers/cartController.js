const PricingService = require('../utils/pricing');

class CartController {
  /**
   * Validate and calculate cart items, subtotal, discount, coupon, total
   */
  static validateAndCalculate(req, res) {
    try {
      const { items, couponCode } = req.body;
      const calculation = PricingService.calculateCart(items, couponCode);

      return res.json({
        ...calculation,
        formatted: {
          subtotal: PricingService.formatRM(calculation.subtotal_sen),
          discount: PricingService.formatRM(calculation.discount_sen),
          total: PricingService.formatRM(calculation.total_sen)
        }
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }
}

module.exports = CartController;
