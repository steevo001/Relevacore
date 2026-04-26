const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/subscribe', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('name').optional().trim()
], validate, (req, res) => {
  try {
    const { email, name } = req.body;
    const existing = db.get('SELECT * FROM newsletter_subscribers WHERE email = ?', [email]);
    if (existing) {
      if (existing.subscribed) return res.json({ message: 'You\'re already subscribed!' });
      db.run('UPDATE newsletter_subscribers SET subscribed = 1 WHERE email = ?', [email]);
      return res.json({ message: 'Welcome back! Re-subscribed.' });
    }
    db.run('INSERT INTO newsletter_subscribers (email, name) VALUES (?, ?)', [email, name || null]);
    res.status(201).json({ message: 'Successfully subscribed! 🎉' });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

router.get('/subscribers', authMiddleware, (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const subscribers = db.all('SELECT * FROM newsletter_subscribers ORDER BY created_at DESC LIMIT ? OFFSET ?', [parseInt(limit), parseInt(offset)]);
    const totalRow = db.get('SELECT COUNT(*) as total FROM newsletter_subscribers WHERE subscribed = 1');
    res.json({ subscribers, total: totalRow?.total || 0 });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/subscribers/:id', authMiddleware, (req, res) => {
  try {
    const result = db.run('UPDATE newsletter_subscribers SET subscribed = 0 WHERE id = ?', [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found.' });
    res.json({ message: 'Unsubscribed.' });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
