const jwt = require('jsonwebtoken');
const constants = require('../config/constants');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'syed-aboobakar-kedai-super-secret-key-2026';

/**
 * Generate a JWT token for a user session
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: constants.SECURITY.JWT_EXPIRY }
  );
}

/**
 * Authentication Middleware
 * Reads token from HTTP-only cookie 'sak_session' or Authorization header
 */
function authenticate(req, res, next) {
  const token = req.cookies?.sak_session || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verify user still exists and is active in DB
    const user = db.get('SELECT id, name, email, phone, role, totp_enabled, is_active FROM users WHERE id = ?', [decoded.id]);
    if (!user || user.is_active === 0) {
      req.user = null;
      return next();
    }

    req.user = user;
    next();
  } catch (err) {
    req.user = null;
    next();
  }
}

/**
 * Require logged in user
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  next();
}

/**
 * Role-Based Access Control (RBAC)
 * Usage: requireRole('owner') or requireRole('staff', 'owner')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Your role is '${req.user.role}'.`
      });
    }

    next();
  };
}

module.exports = {
  JWT_SECRET,
  generateToken,
  authenticate,
  requireAuth,
  requireRole
};
