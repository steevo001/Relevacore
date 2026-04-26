const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');
const { sendPricingNotification } = require('../services/email');

router.post('/inquiry', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').optional().trim(),
  body('company').optional().trim(),
  body('plan').trim().notEmpty().withMessage('Plan is required'),
  body('message').optional().trim()
], validate, async (req, res) => {
  try {
    const { name, email, phone, company, plan, message } = req.body;
    const result = db.run(
      'INSERT INTO pricing_inquiries (name, email, phone, company, plan, message) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, phone || null, company || null, plan, message || null]
    );
    sendPricingNotification({ name, email, phone, company, plan, message }).catch(console.error);
    res.status(201).json({ message: 'Thanks! We\'ll reach out within 24 hours.', id: result.lastInsertRowid });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Something went wrong.' }); }
});

router.get('/inquiries', authMiddleware, (req, res) => {
  try {
    const { status, plan, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT * FROM pricing_inquiries';
    const params = [];
    const conditions = [];
    if (status) { conditions.push('status = ?'); params.push(status); }
    if (plan) { conditions.push('plan = ?'); params.push(plan); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');

    let countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const totalRow = db.get(countQuery, params);

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    const inquiries = db.all(query, params);
    res.json({ inquiries, total: totalRow?.total || 0 });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/inquiries/:id', authMiddleware, [
  body('status').isIn(['new', 'contacted', 'converted', 'closed']).withMessage('Invalid')
], validate, (req, res) => {
  try {
    const result = db.run('UPDATE pricing_inquiries SET status = ?, updated_at = datetime("now") WHERE id = ?', [req.body.status, req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found.' });
    res.json({ message: 'Updated.' });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
