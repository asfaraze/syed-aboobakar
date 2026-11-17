const express = require('express');
const router = express.Router();
const PickupController = require('../controllers/pickupController');
const { requireRole } = require('../middleware/auth');

// Public Pickup Slots
router.get('/dates', PickupController.getDates);
router.get('/slots/:date', PickupController.getSlotsForDate);

// Owner/Staff Slot Management
router.post('/capacity', requireRole('owner'), PickupController.setSlotCapacity);

module.exports = router;
