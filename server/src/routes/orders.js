const express = require('express');
const router = express.Router();
const OrdersController = require('../controllers/ordersController');
const { requireAuth, requireRole } = require('../middleware/auth');

// Public & Customer Checkout & Tracking
router.post('/', OrdersController.create);
router.post('/track', OrdersController.trackOrder);
router.get('/my-orders', requireAuth, OrdersController.getMyOrders);
router.get('/:id', OrdersController.getOrderDetails);
router.post('/:id/cancel', OrdersController.cancelOrder);

// Seller Order Management (Staff & Owner)
router.get('/admin/all', requireRole('staff', 'owner'), OrdersController.getAllOrders);
router.put('/admin/:id/status', requireRole('staff', 'owner'), OrdersController.updateStatus);

module.exports = router;
