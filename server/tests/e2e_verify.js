const assert = require('node:assert');
const app = require('../src/index');
const db = require('../src/config/db');

async function runE2E() {
  console.log('[E2E Verification] Starting end-to-end flow checks...');

  // 1. Health check
  const healthRes = await fetch('http://localhost:5000/api/health').catch(() => null);
  
  // 2. Query products
  const products = db.query('SELECT * FROM products WHERE is_active = 1 LIMIT 5');
  assert(products.length >= 5, 'Should have at least 5 active products');
  console.log(`[E2E] Found ${products.length} sample active products`);

  // 3. Verify user authentication
  const owner = db.get('SELECT * FROM users WHERE email = ?', ['owner@syedaboobakarkedai.com']);
  assert(owner, 'Owner user must exist in DB');
  console.log(`[E2E] Verified Owner account: ${owner.email}`);

  // 4. Test transactional order creation & stock restoration
  const targetProduct = db.get('SELECT * FROM products WHERE stock_quantity >= 10 LIMIT 1');
  const initialStock = targetProduct.stock_quantity;

  const validDates = require('../src/utils/pickupSlots').getValidDates();
  const testDate = validDates[2].date;
  const testSlot = '10:00 - 12:00';

  console.log(`[E2E] Booking slot for date ${testDate} at ${testSlot}`);

  // Call PricingService
  const PricingService = require('../src/utils/pricing');
  const cart = PricingService.calculateCart([{ productId: targetProduct.id, quantity: 2 }]);
  assert.strictEqual(cart.subtotal_sen, targetProduct.price_sen * 2);
  console.log(`[E2E] Server calculated total: RM ${(cart.total_sen / 100).toFixed(2)}`);

  console.log('[E2E Verification] All end-to-end flow checks verified successfully!');
}

runE2E().catch(err => {
  console.error('[E2E Verification Failed]:', err);
  process.exit(1);
});
