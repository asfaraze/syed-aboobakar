const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const AuthController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

// Sensitive rate limiter for auth (10 attempts per 15 mins)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts from this IP. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/register', authLimiter, AuthController.register);
router.post('/login', authLimiter, AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/me', AuthController.getMe);

// Profile & Security (Customer, Staff, Owner)
router.put('/profile', requireAuth, AuthController.updateProfile);
router.put('/change-password', requireAuth, AuthController.changePassword);
router.delete('/account', requireAuth, AuthController.deleteAccount);

// Two-Factor Authentication
router.post('/2fa/setup', requireAuth, AuthController.setup2FA);
router.post('/2fa/activate', requireAuth, AuthController.activate2FA);
router.post('/2fa/disable', requireAuth, AuthController.disable2FA);

module.exports = router;
