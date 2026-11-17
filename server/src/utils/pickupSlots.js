const constants = require('../config/constants');
const db = require('../config/db');

/**
 * Pickup Slots & Malaysia Timezone Utility
 * Business operating hours: 8:00 AM – 8:00 PM (Asia/Kuala_Lumpur)
 */
class PickupSlotsUtil {
  /**
   * Get the current Date object in Malaysia Time (UTC+8)
   */
  static getMalaysiaNow() {
    // Current UTC time
    const now = new Date();
    // Convert to Malaysia time (UTC+8)
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const myTime = new Date(utc + (3600000 * 8));
    return myTime;
  }

  /**
   * Format a Date into 'YYYY-MM-DD'
   */
  static formatDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Return the list of valid selectable dates: Today + next 7 days
   */
  static getValidDates() {
    const myNow = this.getMalaysiaNow();
    const dates = [];

    for (let i = 0; i < 8; i++) {
      const d = new Date(myNow);
      d.setDate(myNow.getDate() + i);
      dates.push({
        date: this.formatDate(d),
        label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-MY', { weekday: 'short', month: 'short', day: 'numeric' }),
        dayOfWeek: d.toLocaleDateString('en-MY', { weekday: 'long' }),
        isToday: i === 0
      });
    }

    return dates;
  }

  /**
   * Parse slot start time e.g. "08:00 - 10:00" -> { startHour: 8, startMin: 0 }
   */
  static parseSlotStart(slotStr) {
    const [start] = slotStr.split(' - ');
    const [hour, min] = start.split(':').map(Number);
    return { hour, min };
  }

  /**
   * Check if a given slot for a given date is in the future according to Malaysia Time
   */
  static isSlotInFuture(dateStr, slotStr) {
    const myNow = this.getMalaysiaNow();
    const todayStr = this.formatDate(myNow);

    if (dateStr < todayStr) {
      return false; // Past date
    }

    if (dateStr > todayStr) {
      return true; // Future date
    }

    // For today, check start hour & minute
    const { hour, min } = this.parseSlotStart(slotStr);
    const currentHour = myNow.getHours();
    const currentMin = myNow.getMinutes();

    if (currentHour < hour) return true;
    if (currentHour === hour && currentMin < min) return true;

    // Slot has already started or passed
    return false;
  }

  /**
   * Get available pickup slots for a specific date, checking capacity and time boundaries
   */
  static getAvailableSlotsForDate(dateStr) {
    const myNow = this.getMalaysiaNow();
    const todayStr = this.formatDate(myNow);

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }

    const validDates = this.getValidDates().map(d => d.date);
    if (!validDates.includes(dateStr)) {
      throw new Error('Date is outside the 8-day pickup booking window (today + 7 days)');
    }

    // Read configured default capacity
    const defaultCapacitySetting = db.get("SELECT value FROM settings WHERE key = 'default_slot_capacity'");
    const defaultCapacity = defaultCapacitySetting ? parseInt(defaultCapacitySetting.value, 10) : 10;

    const slots = [];
    for (const slotStr of constants.PICKUP_SLOTS) {
      const isFuture = this.isSlotInFuture(dateStr, slotStr);

      // Query current bookings for this slot from active orders
      const orderCount = db.get(
        `SELECT COUNT(*) as count FROM orders 
         WHERE pickup_date = ? AND pickup_slot = ? AND status != 'Cancelled'`,
        [dateStr, slotStr]
      )?.count || 0;

      // Query specific configured capacity if overridden
      const customCap = db.get(
        `SELECT max_orders FROM pickup_slot_capacity 
         WHERE pickup_date = ? AND pickup_slot = ?`,
        [dateStr, slotStr]
      );
      const maxCapacity = customCap ? customCap.max_orders : defaultCapacity;
      const availableCapacity = Math.max(0, maxCapacity - orderCount);

      const isAvailable = isFuture && availableCapacity > 0;

      slots.push({
        slot: slotStr,
        isFuture,
        maxCapacity,
        bookedCount: orderCount,
        availableCapacity,
        isAvailable,
        reason: !isFuture ? 'Slot already started or passed' : availableCapacity <= 0 ? 'Fully booked' : null
      });
    }

    return slots;
  }

  /**
   * Reserve a slot transactionally
   */
  static validateAndBookSlot(dateStr, slotStr) {
    const availableSlots = this.getAvailableSlotsForDate(dateStr);
    const targetSlot = availableSlots.find(s => s.slot === slotStr);

    if (!targetSlot) {
      throw new Error(`Invalid pickup slot '${slotStr}'.`);
    }

    if (!targetSlot.isFuture) {
      throw new Error(`Pickup slot '${slotStr}' for ${dateStr} has already passed or started.`);
    }

    if (targetSlot.availableCapacity <= 0) {
      throw new Error(`Pickup slot '${slotStr}' for ${dateStr} is fully booked.`);
    }

    return true;
  }
}

module.exports = PickupSlotsUtil;
