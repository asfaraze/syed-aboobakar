const bcrypt = require('bcryptjs');
const OTPAuth = require('otpauth');
const QRCode = require('qrcode');
const constants = require('../config/constants');
const db = require('../config/db');
const { generateToken } = require('../middleware/auth');
const AuditLogger = require('../utils/auditLogger');

class AuthController {
  /**
   * Register a new Customer account
   */
  static async register(req, res) {
    try {
      const { name, email, phone, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const existingUser = db.get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
      if (existingUser) {
        return res.status(400).json({ error: 'An account with this email already exists.' });
      }

      const passwordHash = await bcrypt.hash(password, constants.SECURITY.BCRYPT_ROUNDS);

      const result = db.run(
        `INSERT INTO users (name, email, phone, password_hash, role)
         VALUES (?, ?, ?, ?, 'customer')`,
        [name.trim(), cleanEmail, phone ? phone.trim() : null, passwordHash]
      );

      const newUser = db.get('SELECT id, name, email, phone, role FROM users WHERE id = ?', [result.lastInsertRowid]);
      const token = generateToken(newUser);

      // Set HTTP-only secure cookie
      res.cookie('sak_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      AuditLogger.log({
        userId: newUser.id,
        userName: newUser.name,
        role: newUser.role,
        action: 'CUSTOMER_REGISTER',
        details: { email: newUser.email },
        ipAddress: req.ip
      });

      return res.status(201).json({
        message: 'Registration successful',
        user: newUser,
        token
      });
    } catch (err) {
      console.error('Registration error:', err);
      return res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
  }

  /**
   * Login (with 5-attempt lockout for 15 minutes, and 2FA challenge for Staff/Owner)
   */
  static async login(req, res) {
    try {
      const { email, password, totpToken } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const user = db.get('SELECT * FROM users WHERE email = ?', [cleanEmail]);

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Check if user is inactive
      if (user.is_active === 0) {
        return res.status(403).json({ error: 'Account has been deactivated. Please contact support.' });
      }

      // Check account lockout
      if (user.locked_until) {
        const lockoutTime = new Date(user.locked_until).getTime();
        const now = Date.now();
        if (now < lockoutTime) {
          const remainingMinutes = Math.ceil((lockoutTime - now) / 60000);
          return res.status(423).json({
            error: `Account is temporarily locked due to 5 consecutive failed attempts. Please try again in ${remainingMinutes} minute(s).`
          });
        } else {
          // Lockout expired, reset attempts
          db.run('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?', [user.id]);
          user.failed_login_attempts = 0;
          user.locked_until = null;
        }
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        const newAttempts = (user.failed_login_attempts || 0) + 1;
        let lockedUntil = null;

        if (newAttempts >= constants.SECURITY.MAX_FAILED_ATTEMPTS) {
          lockedUntil = new Date(Date.now() + constants.SECURITY.LOCKOUT_MINUTES * 60000).toISOString();
        }

        db.run('UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?', [
          newAttempts,
          lockedUntil,
          user.id
        ]);

        AuditLogger.log({
          userId: user.id,
          userName: user.name,
          role: user.role,
          action: 'LOGIN_FAILED',
          details: { attempts: newAttempts, locked: !!lockedUntil },
          ipAddress: req.ip
        });

        if (lockedUntil) {
          return res.status(423).json({
            error: `Too many failed attempts. Account locked for ${constants.SECURITY.LOCKOUT_MINUTES} minutes.`
          });
        }

        const remaining = constants.SECURITY.MAX_FAILED_ATTEMPTS - newAttempts;
        return res.status(401).json({
          error: `Invalid email or password. ${remaining} attempt(s) remaining before lockout.`
        });
      }

      // If 2FA is enabled, verify TOTP token
      if (user.totp_enabled) {
        if (!totpToken) {
          return res.status(200).json({
            requires2FA: true,
            userId: user.id,
            email: user.email,
            message: 'Please enter the 6-digit code from your authenticator app.'
          });
        }

        const totp = new OTPAuth.TOTP({
          issuer: 'Syed Aboobakar Kedai',
          label: user.email,
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(user.totp_secret)
        });

        const delta = totp.validate({ token: String(totpToken).trim(), window: 1 });
        if (delta === null) {
          return res.status(401).json({ error: 'Invalid 2FA code. Please check your authenticator app.' });
        }
      }

      // Reset failed attempts on success
      db.run('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?', [user.id]);

      const safeUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        totp_enabled: !!user.totp_enabled
      };

      const token = generateToken(safeUser);

      res.cookie('sak_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      AuditLogger.log({
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: 'LOGIN_SUCCESS',
        details: { role: user.role },
        ipAddress: req.ip
      });

      return res.json({
        message: 'Login successful',
        user: safeUser,
        token
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Login failed. Please try again.' });
    }
  }

  /**
   * Get Current Authenticated User
   */
  static async getMe(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    return res.json({ user: req.user });
  }

  /**
   * Logout
   */
  static logout(req, res) {
    res.clearCookie('sak_session');
    return res.json({ message: 'Logged out successfully' });
  }

  /**
   * Setup 2FA: Generate secret & QR code
   */
  static async setup2FA(req, res) {
    try {
      const user = db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
      if (!user) return res.status(404).json({ error: 'User not found' });

      // Generate a new base32 secret
      const secret = new OTPAuth.Secret({ size: 20 });
      const base32Secret = secret.base32;

      const totp = new OTPAuth.TOTP({
        issuer: 'Syed Aboobakar Kedai',
        label: user.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secret
      });

      const otpauthUrl = totp.toString();
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

      // Save secret temporarily until confirmed
      db.run('UPDATE users SET totp_secret = ? WHERE id = ?', [base32Secret, user.id]);

      return res.json({
        secret: base32Secret,
        qrCode: qrCodeDataUrl,
        otpauthUrl
      });
    } catch (err) {
      console.error('Setup 2FA error:', err);
      return res.status(500).json({ error: 'Could not generate 2FA credentials' });
    }
  }

  /**
   * Verify & Activate 2FA
   */
  static async activate2FA(req, res) {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ error: 'Verification code is required' });

      const user = db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
      if (!user || !user.totp_secret) {
        return res.status(400).json({ error: '2FA has not been set up yet. Request setup first.' });
      }

      const totp = new OTPAuth.TOTP({
        issuer: 'Syed Aboobakar Kedai',
        label: user.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.totp_secret)
      });

      const delta = totp.validate({ token: String(token).trim(), window: 1 });
      if (delta === null) {
        return res.status(400).json({ error: 'Invalid verification code. Try again.' });
      }

      db.run('UPDATE users SET totp_enabled = 1 WHERE id = ?', [user.id]);

      AuditLogger.log({
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: '2FA_ACTIVATED',
        details: {},
        ipAddress: req.ip
      });

      return res.json({ message: 'Two-factor authentication successfully enabled!' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to verify 2FA' });
    }
  }

  /**
   * Disable 2FA
   */
  static async disable2FA(req, res) {
    try {
      const { password } = req.body;
      const user = db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect password' });
      }

      db.run('UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?', [user.id]);

      AuditLogger.log({
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: '2FA_DISABLED',
        details: {},
        ipAddress: req.ip
      });

      return res.json({ message: 'Two-factor authentication has been disabled.' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to disable 2FA' });
    }
  }

  /**
   * Update Profile
   */
  static async updateProfile(req, res) {
    try {
      const { name, phone } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required' });

      db.run('UPDATE users SET name = ?, phone = ?, updated_at = datetime("now") WHERE id = ?', [
        name.trim(),
        phone ? phone.trim() : null,
        req.user.id
      ]);

      const updated = db.get('SELECT id, name, email, phone, role, totp_enabled FROM users WHERE id = ?', [req.user.id]);
      return res.json({ message: 'Profile updated', user: updated });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  /**
   * Change Password
   */
  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }

      const user = db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const newHash = await bcrypt.hash(newPassword, constants.SECURITY.BCRYPT_ROUNDS);
      db.run('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?', [newHash, user.id]);

      AuditLogger.log({
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: 'PASSWORD_CHANGED',
        details: {},
        ipAddress: req.ip
      });

      return res.json({ message: 'Password updated successfully' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update password' });
    }
  }

  /**
   * Account Deletion (Preserving legal order records by nulling user_id)
   */
  static async deleteAccount(req, res) {
    try {
      const { password } = req.body;
      const user = db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);

      if (user.role === 'owner') {
        return res.status(400).json({ error: 'Store owner account cannot be deleted.' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect password' });
      }

      // Orders are preserved with user_id = NULL for tax/financial audit compliance
      db.run('DELETE FROM users WHERE id = ?', [user.id]);
      res.clearCookie('sak_session');

      AuditLogger.log({
        userId: null,
        userName: user.name,
        role: user.role,
        action: 'ACCOUNT_DELETED',
        details: { email: user.email },
        ipAddress: req.ip
      });

      return res.json({ message: 'Your account has been deleted.' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete account' });
    }
  }
}

module.exports = AuthController;
