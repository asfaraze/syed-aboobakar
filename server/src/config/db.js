const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// Ensure database directory exists
const dbDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dbDir, 'grocery.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys for high performance and integrity
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

/**
 * Helper wrapper for SQLite queries
 */
const dbWrapper = {
  raw: db,

  /**
   * Execute raw SQL (e.g. table creation)
   */
  exec(sql) {
    return db.exec(sql);
  },

  /**
   * Run a prepared statement returning multiple rows
   */
  query(sql, params = []) {
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  },

  /**
   * Run a prepared statement returning one single row
   */
  get(sql, params = []) {
    const stmt = db.prepare(sql);
    return stmt.get(...params);
  },

  /**
   * Run an INSERT / UPDATE / DELETE statement
   * Returns { changes: number, lastInsertRowid: number }
   */
  run(sql, params = []) {
    const stmt = db.prepare(sql);
    return stmt.run(...params);
  },

  /**
   * Run operations inside an ACID transaction
   */
  transaction(fn) {
    db.exec('BEGIN TRANSACTION');
    try {
      const result = fn(dbWrapper);
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
};

module.exports = dbWrapper;
