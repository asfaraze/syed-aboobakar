const express = require('express');
const router = express.Router();
const NotificationsController = require('../controllers/notificationsController');

router.get('/', NotificationsController.getNotifications);
router.patch('/:id/read', NotificationsController.markAsRead);
router.post('/mark-all-read', NotificationsController.markAllAsRead);
router.get('/stream', NotificationsController.stream);
router.post('/subscribe', NotificationsController.subscribePush);

module.exports = router;
