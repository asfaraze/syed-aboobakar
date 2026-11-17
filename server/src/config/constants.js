// Malaysia Grocery Store Constants
module.exports = {
  SHOP_NAME: 'Syed Aboobakar Kedai',
  CURRENCY: 'RM',
  TIMEZONE: 'Asia/Kuala_Lumpur', // UTC+8
  OPENING_HOUR: 8, // 8:00 AM
  CLOSING_HOUR: 20, // 8:00 PM (20:00)
  
  // 10 Mandatory Categories
  CATEGORIES: [
    'Rice & Grains',
    'Oil & Spices',
    'Vegetables',
    'Fruits',
    'Meat & Fish',
    'Dairy & Eggs',
    'Snacks',
    'Drinks',
    'Household',
    'Others'
  ],

  // 2-Hour Pickup Slots
  PICKUP_SLOTS: [
    '08:00 - 10:00',
    '10:00 - 12:00',
    '12:00 - 14:00',
    '14:00 - 16:00',
    '16:00 - 18:00',
    '18:00 - 20:00'
  ],

  // Order Lifecycle Stages
  ORDER_STATUSES: {
    PLACED: 'Placed',
    CONFIRMED: 'Confirmed',
    PREPARING: 'Preparing',
    READY_FOR_PICKUP: 'Ready for pickup',
    COLLECTED: 'Collected',
    CANCELLED: 'Cancelled'
  },

  // User Roles
  ROLES: {
    CUSTOMER: 'customer',
    STAFF: 'staff',
    OWNER: 'owner'
  },

  // Security Lockout Rules
  SECURITY: {
    MAX_FAILED_ATTEMPTS: 5,
    LOCKOUT_MINUTES: 15,
    JWT_EXPIRY: '7d',
    BCRYPT_ROUNDS: 10
  }
};
