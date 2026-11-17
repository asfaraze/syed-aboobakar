const express = require('express');
const router = express.Router();
const ProductsController = require('../controllers/productsController');
const { requireRole } = require('../middleware/auth');

// Public Product Catalog
router.get('/', ProductsController.getAll);
router.get('/suggestions', ProductsController.getSuggestions);
router.get('/csv-template', ProductsController.getCSVTemplate);
router.get('/:id', ProductsController.getById);

// Staff & Owner Protected Routes
router.post('/', requireRole('staff', 'owner'), ProductsController.create);
router.put('/:id', requireRole('staff', 'owner'), ProductsController.update);
router.delete('/:id', requireRole('staff', 'owner'), ProductsController.delete);
router.post('/:id/adjust-stock', requireRole('staff', 'owner'), ProductsController.adjustStock);
router.post('/bulk-import', requireRole('staff', 'owner'), ProductsController.bulkImportCSV);

module.exports = router;
