const express = require('express');
const router = express.Router();
const CartController = require('../controllers/cartController');

router.post('/calculate', CartController.validateAndCalculate);

module.exports = router;
