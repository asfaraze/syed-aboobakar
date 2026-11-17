const express = require('express');
const router = express.Router();
const CouponsController = require('../controllers/couponsController');
const { requireRole } = require('../middleware/auth');

// Public validation
router.post('/validate', CouponsController.validate);

// Admin Management
router.get('/', requireRole('staff', 'owner'), CouponsController.getAll);
router.post('/', requireRole('staff', 'owner'), CouponsController.create);
router.patch('/:id/toggle', requireRole('staff', 'owner'), CouponsController.toggleStatus);

module.exports = router;
