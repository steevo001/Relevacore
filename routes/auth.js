const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], validate, (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = db.get('SELECT * FROM admin_users WHERE email = ?', [email]);

    if (!admin || !bcrypt.compareSync(password, admin.password)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  res.json({ admin: req.admin });
});

// POST /api/auth/change-password
router.post('/change-password', authMiddleware, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
], validate, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = db.get('SELECT * FROM admin_users WHERE id = ?', [req.admin.id]);

    if (!bcrypt.compareSync(currentPassword, admin.password)) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 12);
    db.run('UPDATE admin_users SET password = ? WHERE id = ?', [hashedPassword, req.admin.id]);

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
