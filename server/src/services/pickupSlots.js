const { PICKUP_SLOTS } = require('../config/constants');

/**
 * Returns current date and time in Malaysia (UTC+8)
 */
function getMalaysiaTime(customDate = null) {
  const d = customDate ? new Date(customDate) : new Date();
  // Format to Malaysia locale string to get accurate UTC+8 time components
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(d);
  const getPart = (type) => parts.find(p => p.type === type)?.value;

  const year = parseInt(getPart('year'), 10);
  const month = parseInt(getPart('month'), 10);
  const day = parseInt(getPart('day'), 10);
  const hour = parseInt(getPart('hour'), 10);
  const minute = parseInt(getPart('minute'), 10);

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { year, month, day, hour, minute, dateStr };
}

/**
 * Generate pickup slots for a specific date (YYYY-MM-DD)
 * Hides past slots if date is today in Malaysia time.
 */
function getSlotsForDate(dateStr, customNow = null) {
  const nowMY = getMalaysiaTime(customNow);
  const isToday = dateStr === nowMY.dateStr;

  return PICKUP_SLOTS.map(slot => {
    // Parse slot start and end hours (e.g. "08:00 - 10:00")
    const [startPart, endPart] = slot.split(' - ');
    const [startHour] = startPart.split(':').map(Number);
    const [endHour] = endPart.split(':').map(Number);

    // If today, slot is past if current Malaysia time is past the slot start time
    // (giving 15 minutes preparation window)
    let isPast = false;
    if (isToday) {
      const currentDecimal = nowMY.hour + (nowMY.minute / 60);
      // If current time is past start hour + 0.25h (15 mins), slot is unavailable for today
      if (currentDecimal >= startHour) {
        isPast = true;
      }
    }

    return {
      slot,
      startHour,
      endHour,
      isAvailable: !isPast
    };
  }).filter(s => s.isAvailable); // Return only available slots
}

/**
 * Get available dates for pickup: Today + next 7 days (8 days total)
 * Includes formatted day name (e.g. "Tuesday, 17 Nov")
 */
function getAvailablePickupDays(customNow = null) {
  const nowMY = getMalaysiaTime(customNow);
  const today = new Date(Date.UTC(nowMY.year, nowMY.month - 1, nowMY.day));

  const days = [];
  for (let i = 0; i <= 7; i++) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() + i);

    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Format human-friendly label
    const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(d);
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(d);
    const dayNumber = d.getUTCDate();

    const isToday = i === 0;
    const isTomorrow = i === 1;
    let label = `${dayName}, ${dayNumber} ${monthName}`;
    if (isToday) label = `Today (${label})`;
    else if (isTomorrow) label = `Tomorrow (${label})`;

    const availableSlots = getSlotsForDate(dateStr, customNow);

    // If today has no more slots left (e.g. after 8:00 PM), flag it
    days.push({
      date: dateStr,
      label,
      isToday,
      slotsCount: availableSlots.length,
      availableSlots
    });
  }

  return days;
}

/**
 * Validate whether a chosen date and slot are currently valid
 */
function isValidPickupSlot(dateStr, slotStr, customNow = null) {
  const availableDays = getAvailablePickupDays(customNow);
  const targetDay = availableDays.find(d => d.date === dateStr);
  if (!targetDay) return false;

  const validSlot = targetDay.availableSlots.find(s => s.slot === slotStr);
  return !!validSlot;
}

module.exports = {
  getMalaysiaTime,
  getSlotsForDate,
  getAvailablePickupDays,
  isValidPickupSlot
};
