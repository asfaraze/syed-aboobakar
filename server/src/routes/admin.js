const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { requireRole } = require('../middleware/auth');

// Dashboard Overview (Staff & Owner)
router.get('/overview', requireRole('staff', 'owner'), AdminController.getOverview);

// Customer Management (Staff gets masked contacts, Owner can reveal)
router.get('/customers', requireRole('staff', 'owner'), AdminController.getCustomers);
router.post('/customers/:id/reveal', requireRole('owner'), AdminController.revealCustomerContact);

// Financial Analytics (OWNER ONLY)
router.get('/analytics', requireRole('owner'), AdminController.getSalesAnalytics);

// Inventory Movement History
router.get('/inventory-movements', requireRole('staff', 'owner'), AdminController.getInventoryMovements);

// Staff Management (OWNER ONLY)
router.get('/staff', requireRole('owner'), AdminController.getStaff);
router.post('/staff', requireRole('owner'), AdminController.createStaff);
router.patch('/staff/:id/toggle', requireRole('owner'), AdminController.toggleStaffStatus);
router.post('/staff/:id/reset-password', requireRole('owner'), AdminController.resetStaffPassword);

// Audit Logs (OWNER ONLY)
router.get('/audit-logs', requireRole('owner'), AdminController.getAuditLogs);

// Shop Settings (OWNER ONLY)
router.get('/settings', requireRole('owner'), AdminController.getSettings);
router.put('/settings', requireRole('owner'), AdminController.updateSettings);

// Reports Export (OWNER ONLY)
router.get('/export-orders', requireRole('owner'), AdminController.exportOrdersCSV);

module.exports = router;
