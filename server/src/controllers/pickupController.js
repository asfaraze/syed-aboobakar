const constants = require('../config/constants');
const db = require('../config/db');
const PickupSlotsUtil = require('../utils/pickupSlots');
const AuditLogger = require('../utils/auditLogger');

class PickupController {
  /**
   * Get valid dates list (today + 7 days) and shop pickup policy
   */
  static getDates(req, res) {
    try {
      const dates = PickupSlotsUtil.getValidDates();
      const myNow = PickupSlotsUtil.getMalaysiaNow();

      return res.json({
        dates,
        malaysiaTime: myNow.toISOString(),
        operatingHours: '8:00 AM – 8:00 PM Malaysia Time',
        pickupRules: {
          model: 'In-Store Pickup ONLY (No delivery)',
          address: 'Syed Aboobakar Kedai, Jalan Pasar, Malaysia',
          slotsCount: constants.PICKUP_SLOTS.length,
          slots: constants.PICKUP_SLOTS
        }
      });
    } catch (err) {
      console.error('Pickup dates error:', err);
      return res.status(500).json({ error: 'Failed to retrieve pickup dates' });
    }
  }

  /**
   * Get available slots for a specific date (YYYY-MM-DD)
   */
  static getSlotsForDate(req, res) {
    try {
      const { date } = req.params;
      const slots = PickupSlotsUtil.getAvailableSlotsForDate(date);
      return res.json({ date, slots });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  /**
   * Admin: Set custom capacity for a specific slot on a date
   */
  static setSlotCapacity(req, res) {
    try {
      const { date, slot, maxOrders } = req.body;
      const maxCap = parseInt(maxOrders, 10);

      if (isNaN(maxCap) || maxCap < 1) {
        return res.status(400).json({ error: 'Capacity must be at least 1' });
      }

      if (!constants.PICKUP_SLOTS.includes(slot)) {
        return res.status(400).json({ error: 'Invalid pickup slot' });
      }

      db.run(
        `INSERT INTO pickup_slot_capacity (pickup_date, pickup_slot, max_orders)
         VALUES (?, ?, ?)
         ON CONFLICT(pickup_date, pickup_slot) DO UPDATE SET max_orders = excluded.max_orders`,
        [date, slot, maxCap]
      );

      AuditLogger.log({
        userId: req.user.id,
        userName: req.user.name,
        role: req.user.role,
        action: 'SLOT_CAPACITY_UPDATE',
        details: { date, slot, maxOrders: maxCap },
        ipAddress: req.ip
      });

      return res.json({ message: 'Pickup slot capacity updated', date, slot, maxOrders: maxCap });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update slot capacity' });
    }
  }
}

module.exports = PickupController;
