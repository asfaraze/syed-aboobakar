const db = require('../config/db');
const NotificationService = require('../utils/notifications');

class NotificationsController {
  /**
   * Get notifications for the requesting user/role
   */
  static getNotifications(req, res) {
    try {
      const userId = req.user ? req.user.id : null;
      const role = req.user ? req.user.role : 'customer';

      let query = `
        SELECT * FROM notifications 
        WHERE (user_id = ? OR target_role = ? OR target_role = 'all'
      `;
      const params = [userId, role];

      if (role === 'staff' || role === 'owner') {
        query += ` OR target_role = 'seller'`;
      }
      query += `) ORDER BY id DESC LIMIT 50`;

      const notifications = db.query(query, params);
      const unreadCount = notifications.filter(n => n.is_read === 0).length;

      return res.json({ notifications, unreadCount });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve notifications' });
    }
  }

  /**
   * Mark single notification as read
   */
  static markAsRead(req, res) {
    try {
      const { id } = req.params;
      db.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
      return res.json({ message: 'Marked as read' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update notification' });
    }
  }

  /**
   * Mark all notifications as read
   */
  static markAllAsRead(req, res) {
    try {
      const userId = req.user ? req.user.id : null;
      if (userId) {
        db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
      } else {
        db.run('UPDATE notifications SET is_read = 1 WHERE target_role = "customer"');
      }
      return res.json({ message: 'All notifications marked as read' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to mark all as read' });
    }
  }

  /**
   * Server-Sent Events (SSE) Stream Endpoint
   */
  static stream(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const userId = req.user ? req.user.id : null;
    const role = req.user ? req.user.role : 'customer';

    NotificationService.addClient(res, userId, role);
  }

  /**
   * Register Browser Push Notification Subscription
   */
  static subscribePush(req, res) {
    try {
      const { subscription } = req.body;
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Invalid push subscription payload' });
      }

      const userId = req.user ? req.user.id : null;
      db.run(
        `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id`,
        [
          userId,
          subscription.endpoint,
          subscription.keys?.p256dh || null,
          subscription.keys?.auth || null
        ]
      );

      return res.json({ message: 'Push subscription registered successfully' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to register push subscription' });
    }
  }
}

module.exports = NotificationsController;
