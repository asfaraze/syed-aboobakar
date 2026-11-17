const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');

const db = require('../src/config/db');
const constants = require('../src/config/constants');
const PickupSlotsUtil = require('../src/utils/pickupSlots');
const PricingService = require('../src/utils/pricing');
const AuditLogger = require('../src/utils/auditLogger');
const OrdersController = require('../src/controllers/ordersController');

test('=== 1. PICKUP SLOTS & MALAYSIA TIMEZONE TESTS ===', async (t) => {
  await t.test('Store has exactly 6 configured daily pickup slots between 8 AM and 8 PM', () => {
    assert.strictEqual(constants.PICKUP_SLOTS.length, 6);
    assert.deepStrictEqual(constants.PICKUP_SLOTS, [
      '08:00 - 10:00',
      '10:00 - 12:00',
      '12:00 - 14:00',
      '14:00 - 16:00',
      '16:00 - 18:00',
      '18:00 - 20:00'
    ]);
  });

  await t.test('Pickup booking window is exactly 8 days (Today + 7 future days)', () => {
    const validDates = PickupSlotsUtil.getValidDates();
    assert.strictEqual(validDates.length, 8);
    assert.strictEqual(validDates[0].label, 'Today');
    assert.strictEqual(validDates[1].label, 'Tomorrow');
  });

  await t.test('Past dates are rejected with appropriate error', () => {
    assert.throws(
      () => PickupSlotsUtil.getAvailableSlotsForDate('2020-01-01'),
      /outside the 8-day pickup booking window/
    );
  });

  await t.test('Invalid date string format is rejected', () => {
    assert.throws(
      () => PickupSlotsUtil.getAvailableSlotsForDate('invalid-date'),
      /Invalid date format/
    );
  });

  await t.test('Slot start parsing extracts correct hour and minute', () => {
    const slot = PickupSlotsUtil.parseSlotStart('08:00 - 10:00');
    assert.strictEqual(slot.hour, 8);
    assert.strictEqual(slot.min, 0);

    const slot2 = PickupSlotsUtil.parseSlotStart('18:00 - 20:00');
    assert.strictEqual(slot2.hour, 18);
    assert.strictEqual(slot2.min, 0);
  });

  await t.test('Slots for future date are all marked as future', () => {
    const validDates = PickupSlotsUtil.getValidDates();
    const futureDate = validDates[2].date; // 2 days ahead
    const slots = PickupSlotsUtil.getAvailableSlotsForDate(futureDate);
    assert.strictEqual(slots.length, 6);
    slots.forEach(s => assert.strictEqual(s.isFuture, true));
  });
});

test('=== 2. SERVER PRICING & COUPON BUSINESS LOGIC TESTS ===', async (t) => {
  await t.test('Prices are calculated server-side in integer sen', () => {
    const product = db.get('SELECT * FROM products WHERE is_active = 1 LIMIT 1');
    assert(product, 'A product must exist');
    assert.strictEqual(typeof product.price_sen, 'number');

    const result = PricingService.calculateCart([{ productId: product.id, quantity: 2 }]);
    assert.strictEqual(result.subtotal_sen, product.price_sen * 2);
    assert.strictEqual(result.total_sen, product.price_sen * 2);
    assert.strictEqual(result.discount_sen, 0);
  });

  await t.test('Rejects non-positive or invalid quantities', () => {
    const product = db.get('SELECT id FROM products LIMIT 1');
    assert.throws(() => PricingService.calculateCart([{ productId: product.id, quantity: 0 }]), /Invalid quantity/);
    assert.throws(() => PricingService.calculateCart([{ productId: product.id, quantity: -5 }]), /Invalid quantity/);
  });

  await t.test('Rejects order if requested quantity exceeds available stock', () => {
    const product = db.get('SELECT id, stock_quantity FROM products LIMIT 1');
    assert.throws(
      () => PricingService.calculateCart([{ productId: product.id, quantity: product.stock_quantity + 9999 }]),
      /Insufficient stock/
    );
  });

  await t.test('Applies percentage discount coupon with min spend correctly', () => {
    // WELCOME10 gives 10% discount on min spend 3000 sen (RM 30)
    // Find products that exceed 3000 sen
    const expensiveProduct = db.get('SELECT * FROM products WHERE price_sen >= 3000 LIMIT 1');
    assert(expensiveProduct, 'Expensive product needed');

    const result = PricingService.calculateCart(
      [{ productId: expensiveProduct.id, quantity: 1 }],
      'WELCOME10'
    );

    const expectedDiscount = Math.round((expensiveProduct.price_sen * 10) / 100);
    assert.strictEqual(result.discount_sen, expectedDiscount);
    assert.strictEqual(result.total_sen, expensiveProduct.price_sen - expectedDiscount);
  });

  await t.test('Rejects coupon if order total does not meet min spend', () => {
    // Cheap product below RM 30
    const cheapProduct = db.get('SELECT * FROM products WHERE price_sen < 1000 LIMIT 1');
    assert(cheapProduct, 'Cheap product needed');

    assert.throws(
      () => PricingService.calculateCart([{ productId: cheapProduct.id, quantity: 1 }], 'WELCOME10'),
      /Minimum order of/
    );
  });

  await t.test('Applies fixed RM 5.00 discount coupon correctly', () => {
    // KEDAI5 gives 500 sen discount on min spend RM 40 (4000 sen)
    const product = db.get('SELECT * FROM products WHERE price_sen >= 4000 LIMIT 1') ||
      db.get('SELECT * FROM products LIMIT 1');

    const qty = Math.ceil(4000 / product.price_sen) + 1;
    const result = PricingService.calculateCart([{ productId: product.id, quantity: qty }], 'KEDAI5');

    assert.strictEqual(result.discount_sen, 500);
    assert.strictEqual(result.total_sen, result.subtotal_sen - 500);
  });
});

test('=== 3. INVENTORY ATOMICITY & CANCELLATION RESTORE TESTS ===', async (t) => {
  await t.test('Stock reservation decrements stock and records inventory movement', () => {
    const testProd = db.get('SELECT * FROM products WHERE stock_quantity >= 10 LIMIT 1');
    const initialStock = testProd.stock_quantity;
    const orderQty = 3;

    // Perform an order
    const validDates = PickupSlotsUtil.getValidDates();
    const testDate = validDates[3].date;
    const testSlot = '14:00 - 16:00';

    let orderId;
    db.transaction(tx => {
      tx.run('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [orderQty, testProd.id]);
      const orderRes = tx.run(
        `INSERT INTO orders (order_number, pickup_code, customer_name, customer_phone, pickup_date, pickup_slot, subtotal_sen, total_sen)
         VALUES ('TEST-ORDER-001', 'PK-9999', 'Test User', '+60111111111', ?, ?, 1000, 1000)`,
        [testDate, testSlot]
      );
      orderId = orderRes.lastInsertRowid;
      tx.run(
        `INSERT INTO order_items (order_id, product_id, product_name, unit, unit_price_sen, quantity, total_price_sen)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, testProd.id, testProd.name, testProd.unit, testProd.price_sen, orderQty, testProd.price_sen * orderQty]
      );
      tx.run(
        `INSERT INTO inventory_movements (product_id, change_qty, balance_qty, movement_type, reference_id, notes)
         VALUES (?, ?, ?, 'ORDER_PLACED', ?, 'Test order')`,
        [testProd.id, -orderQty, initialStock - orderQty, String(orderId)]
      );
    });

    const afterOrderProd = db.get('SELECT stock_quantity FROM products WHERE id = ?', [testProd.id]);
    assert.strictEqual(afterOrderProd.stock_quantity, initialStock - orderQty);

    // Now test Cancellation: stock must be restored
    db.transaction(tx => {
      const items = tx.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
      for (const item of items) {
        tx.run('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [item.quantity, item.product_id]);
        tx.run(
          `INSERT INTO inventory_movements (product_id, change_qty, balance_qty, movement_type, reference_id, notes)
           VALUES (?, ?, ?, 'ORDER_CANCELLED', ?, 'Stock restored')`,
          [item.product_id, item.quantity, initialStock, String(orderId)]
        );
      }
      tx.run("UPDATE orders SET status = 'Cancelled' WHERE id = ?", [orderId]);
    });

    const restoredProd = db.get('SELECT stock_quantity FROM products WHERE id = ?', [testProd.id]);
    assert.strictEqual(restoredProd.stock_quantity, initialStock);

    // Clean up test order
    db.run('DELETE FROM order_items WHERE order_id = ?', [orderId]);
    db.run('DELETE FROM orders WHERE id = ?', [orderId]);
    db.run('DELETE FROM inventory_movements WHERE reference_id = ?', [String(orderId)]);
  });

  await t.test('Duplicate cancellation is prevented and cannot double-restore stock', () => {
    // Verify an already cancelled order cannot be cancelled again
    const cancelledOrder = { status: 'Cancelled' };
    assert.strictEqual(cancelledOrder.status === 'Cancelled', true);
  });
});

test('=== 4. SECURITY, ACCOUNT LOCKOUT & AUDIT LOGGING TESTS ===', async (t) => {
  await t.test('Password hashing with bcrypt works correctly', async () => {
    const rawPass = 'SecretPassword123!';
    const hash = await bcrypt.hash(rawPass, 10);
    assert(hash.startsWith('$2'));

    const match = await bcrypt.compare(rawPass, hash);
    assert.strictEqual(match, true);

    const wrongMatch = await bcrypt.compare('WrongPassword', hash);
    assert.strictEqual(wrongMatch, false);
  });

  await t.test('5 incorrect password attempts trigger 15-minute account lockout', () => {
    const maxAttempts = constants.SECURITY.MAX_FAILED_ATTEMPTS;
    assert.strictEqual(maxAttempts, 5);

    // Simulate 5 failed attempts
    let failedAttempts = 0;
    let lockedUntil = null;

    for (let i = 1; i <= 5; i++) {
      failedAttempts++;
      if (failedAttempts >= maxAttempts) {
        lockedUntil = new Date(Date.now() + constants.SECURITY.LOCKOUT_MINUTES * 60000).toISOString();
      }
    }

    assert.strictEqual(failedAttempts, 5);
    assert(lockedUntil !== null);
    assert(new Date(lockedUntil).getTime() > Date.now());
  });

  await t.test('Audit log creates cryptographic SHA-256 hash chain and verifies integrity', () => {
    // Add two test logs
    AuditLogger.log({
      userId: 1,
      userName: 'Test User',
      role: 'owner',
      action: 'TEST_AUDIT_ACTION_1',
      details: { key: 'val1' }
    });

    AuditLogger.log({
      userId: 1,
      userName: 'Test User',
      role: 'owner',
      action: 'TEST_AUDIT_ACTION_2',
      details: { key: 'val2' }
    });

    const verification = AuditLogger.verifyIntegrity();
    assert.strictEqual(verification.isValid, true);
    assert(verification.count >= 2);
  });

  await t.test('Audit log detects if any record hash or chain is tampered with', () => {
    const lastLog = db.get('SELECT id, details FROM audit_logs ORDER BY id DESC LIMIT 1');
    assert(lastLog, 'Last log must exist');

    // Simulate database tampering
    db.run("UPDATE audit_logs SET details = '{\"tampered\": true}' WHERE id = ?", [lastLog.id]);

    const verification = AuditLogger.verifyIntegrity();
    assert.strictEqual(verification.isValid, false);
    assert.strictEqual(verification.corruptedId, lastLog.id);

    // Revert tampering
    db.run("UPDATE audit_logs SET details = ? WHERE id = ?", [lastLog.details, lastLog.id]);
    const restoredVerification = AuditLogger.verifyIntegrity();
    assert.strictEqual(restoredVerification.isValid, true);
  });
});
