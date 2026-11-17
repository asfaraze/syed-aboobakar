const db = require('../config/db');

function initSchema() {
  db.exec(`
    -- Users table (Customers, Staff, Owner)
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer', -- 'customer', 'staff', 'owner'
      totp_secret TEXT,                     -- 2FA secret (base32)
      totp_enabled INTEGER DEFAULT 0,       -- 1 if 2FA active
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until TEXT,                    -- ISO timestamp if locked
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Products table (Prices stored in whole sen, e.g. RM 12.50 = 1250 sen)
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_ms TEXT,
      name_ta TEXT,
      category TEXT NOT NULL,
      price_sen INTEGER NOT NULL,          -- In sen
      original_price_sen INTEGER,          -- Strikethrough price if discounted
      discount_percent INTEGER DEFAULT 0,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER DEFAULT 5,
      unit TEXT NOT NULL DEFAULT '1 unit', -- e.g., '10kg', '500g', '1L', '1 bunch'
      description TEXT,
      description_ms TEXT,
      description_ta TEXT,
      image_url TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Coupons table
    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      discount_type TEXT NOT NULL,         -- 'percent' or 'fixed'
      discount_value INTEGER NOT NULL,     -- e.g., 10 for 10%, or 500 for RM 5.00
      min_spend_sen INTEGER DEFAULT 0,
      max_discount_sen INTEGER,
      start_date TEXT,
      end_date TEXT,
      usage_limit INTEGER DEFAULT 100,
      times_used INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Orders table (Pickup only, whole sen)
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,   -- e.g. SAK-20261117-0012
      pickup_code TEXT NOT NULL,           -- e.g. PK-4821
      user_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      pickup_date TEXT NOT NULL,           -- YYYY-MM-DD
      pickup_slot TEXT NOT NULL,           -- e.g. '08:00 - 10:00'
      status TEXT NOT NULL DEFAULT 'Placed', -- 'Placed', 'Confirmed', 'Preparing', 'Ready for pickup', 'Collected', 'Cancelled'
      subtotal_sen INTEGER NOT NULL,
      discount_sen INTEGER DEFAULT 0,
      coupon_code TEXT,
      total_sen INTEGER NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'shop', -- 'shop' or 'billplz'
      payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'refunded'
      billplz_bill_id TEXT,
      notes TEXT,
      cancellation_reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Order items (immutable snapshot of item prices at checkout)
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      unit TEXT NOT NULL,
      unit_price_sen INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      total_price_sen INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- Pickup Slot Capacity Tracking (to prevent overbooking)
    CREATE TABLE IF NOT EXISTS pickup_slot_capacity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pickup_date TEXT NOT NULL,
      pickup_slot TEXT NOT NULL,
      max_orders INTEGER DEFAULT 10,
      current_orders INTEGER DEFAULT 0,
      UNIQUE(pickup_date, pickup_slot)
    );

    -- Inventory Movements (Audit of all stock additions, deductions, cancellations)
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      change_qty INTEGER NOT NULL,        -- Positive (restock) or negative (deducted)
      balance_qty INTEGER NOT NULL,       -- Balance after movement
      movement_type TEXT NOT NULL,        -- 'ORDER_PLACED', 'ORDER_CANCELLED', 'MANUAL_ADJUSTMENT', 'RESTOCK', 'IMPORT'
      reference_id TEXT,                  -- Order ID or reason
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- Notifications table
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,                     -- Specific user, or NULL for role target
      target_role TEXT,                    -- 'customer', 'staff', 'owner', 'all'
      order_id INTEGER,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,                  -- 'order_placed', 'order_status', 'low_stock', 'system'
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
    );

    -- Push notification subscriptions
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT,
      auth TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Immutable Audit Logs with Tamper-Evident Hash Chaining
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT,
      role TEXT,
      action TEXT NOT NULL,                -- e.g., 'CUSTOMER_DATA_REVEAL', 'PRICE_CHANGE'
      details TEXT NOT NULL,
      ip_address TEXT,
      prev_hash TEXT NOT NULL,             -- Hash of the previous audit log
      record_hash TEXT NOT NULL,           -- SHA256(prev_hash + ':' + details + ':' + created_at)
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Shop Settings
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(pickup_date);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_movements(product_id);
  `);

  // Insert default shop settings if not exists
  const defaultSettings = [
    ['shop_name', 'Syed Aboobakar Kedai'],
    ['currency', 'RM'],
    ['operating_hours', '8:00 AM – 8:00 PM'],
    ['default_slot_capacity', '10'],
    ['low_stock_alert_threshold', '5'],
    ['billplz_enabled', 'false'],
    ['billplz_api_key', ''],
    ['billplz_collection_id', ''],
    ['billplz_x_signature_key', ''],
    ['smtp_enabled', 'false'],
    ['smtp_host', ''],
    ['smtp_port', '587'],
    ['smtp_user', ''],
    ['smtp_pass', ''],
    ['smtp_from', 'noreply@syedaboobakarkedai.com'],
  ];

  for (const [key, val] of defaultSettings) {
    const existing = db.get('SELECT key FROM settings WHERE key = ?', [key]);
    if (!existing) {
      db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, val]);
    }
  }
}

module.exports = { initSchema };
