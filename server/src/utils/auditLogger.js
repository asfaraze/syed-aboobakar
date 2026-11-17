const crypto = require('crypto');
const db = require('../config/db');

/**
 * Audit Logger with Tamper-Evident SHA-256 Hash Chaining
 * Every log entry includes the cryptographic hash of the previous log entry.
 */
class AuditLogger {
  static log({ userId = null, userName = 'SYSTEM', role = 'system', action, details, ipAddress = '127.0.0.1' }) {
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : String(details);
    
    // Fetch the latest audit log to obtain its hash
    const lastLog = db.get('SELECT record_hash FROM audit_logs ORDER BY id DESC LIMIT 1');
    const prevHash = lastLog ? lastLog.record_hash : 'GENESIS_SYED_ABOOBAKAR_KEDAI';
    const timestamp = new Date().toISOString();

    // Compute tamper-evident hash
    const dataToHash = `${prevHash}|${userId || 'none'}|${role}|${action}|${detailsStr}|${timestamp}`;
    const recordHash = crypto.createHash('sha256').update(dataToHash).digest('hex');

    db.run(
      `INSERT INTO audit_logs (user_id, user_name, role, action, details, ip_address, prev_hash, record_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, userName, role, action, detailsStr, ipAddress, prevHash, recordHash, timestamp]
    );

    return { prevHash, recordHash, timestamp };
  }

  /**
   * Verifies the cryptographic chain integrity of all audit records
   * Returns { isValid: boolean, corruptedId: number | null, count: number }
   */
  static verifyIntegrity() {
    const logs = db.query('SELECT * FROM audit_logs ORDER BY id ASC');
    if (logs.length === 0) return { isValid: true, count: 0 };

    let expectedPrevHash = 'GENESIS_SYED_ABOOBAKAR_KEDAI';
    for (const log of logs) {
      if (log.prev_hash !== expectedPrevHash) {
        return { isValid: false, corruptedId: log.id, reason: 'Broken prev_hash link', count: logs.length };
      }

      const dataToHash = `${log.prev_hash}|${log.user_id || 'none'}|${log.role}|${log.action}|${log.details}|${log.created_at}`;
      const computedHash = crypto.createHash('sha256').update(dataToHash).digest('hex');

      if (computedHash !== log.record_hash) {
        return { isValid: false, corruptedId: log.id, reason: 'Tampered record content', count: logs.length };
      }

      expectedPrevHash = log.record_hash;
    }

    return { isValid: true, count: logs.length };
  }
}

module.exports = AuditLogger;
