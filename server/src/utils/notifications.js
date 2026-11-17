const db = require('../config/db');

/**
 * Real-time Notifications & Server-Sent Events (SSE) Manager
 */
class NotificationService {
  // Store connected SSE clients { res, userId, role }
  static sseClients = [];

  /**
   * Register a new SSE client connection
   */
  static addClient(res, userId = null, role = 'customer') {
    const client = { res, userId, role, id: Date.now() + Math.random() };
    this.sseClients.push(client);

    // Initial keepalive ping
    res.write(`data: ${JSON.stringify({ type: 'connected', time: new Date().toISOString() })}\n\n`);

    res.on('close', () => {
      this.sseClients = this.sseClients.filter(c => c.id !== client.id);
    });

    return client;
  }

  /**
   * Send notification to database and broadcast to SSE listeners
   */
  static notify({ userId = null, targetRole = 'customer', orderId = null, title, message, type = 'system' }) {
    // 1. Insert into database
    const result = db.run(
      `INSERT INTO notifications (user_id, target_role, order_id, title, message, type, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))`,
      [userId, targetRole, orderId, title, message, type]
    );

    const notificationPayload = {
      id: result.lastInsertRowid,
      userId,
      targetRole,
      orderId,
      title,
      message,
      type,
      is_read: 0,
      created_at: new Date().toISOString()
    };

    // 2. Broadcast to connected SSE clients
    const eventData = `data: ${JSON.stringify(notificationPayload)}\n\n`;

    for (const client of this.sseClients) {
      let shouldSend = false;

      if (targetRole === 'all') {
        shouldSend = true;
      } else if (userId && client.userId === userId) {
        shouldSend = true;
      } else if (targetRole === 'seller' && (client.role === 'staff' || client.role === 'owner')) {
        shouldSend = true;
      } else if (targetRole === client.role) {
        shouldSend = true;
      }

      if (shouldSend) {
        try {
          client.res.write(eventData);
        } catch (err) {
          // Connection likely closed
        }
      }
    }

    return notificationPayload;
  }

  /**
   * Send email notice if SMTP is enabled in settings
   */
  static async sendEmailNotice({ to, subject, html }) {
    const smtpEnabled = db.get("SELECT value FROM settings WHERE key = 'smtp_enabled'")?.value === 'true';
    if (!smtpEnabled) {
      // SMTP is disabled by default as per specification
      return { sent: false, reason: 'SMTP is disabled in settings. Configure credentials to enable.' };
    }

    // When configured, nodemailer would send here
    console.log(`[SMTP Notice to ${to}]: ${subject}`);
    return { sent: true };
  }
}

module.exports = NotificationService;
