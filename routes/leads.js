const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');
const { sendLeadNotification } = require('../services/email');

// POST /api/leads — Public
router.post('/', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').optional().trim(),
  body('company').optional().trim(),
  body('service').optional().trim(),
  body('budget').optional().trim(),
  body('message').optional().trim(),
  body('source').optional().trim()
], validate, async (req, res) => {
  try {
    const { name, email, phone, company, service, budget, message, source } = req.body;
    const result = db.run(
      'INSERT INTO leads (name, email, phone, company, service, budget, message, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, phone || null, company || null, service || null, budget || null, message || null, source || 'contact_form']
    );
    sendLeadNotification({ name, email, phone, company, service, message, source }).catch(console.error);
    res.status(201).json({ message: 'Thank you! We\'ll be in touch shortly.', id: result.lastInsertRowid });
  } catch (err) {
    console.error('Lead submission error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// GET /api/leads — Admin
router.get('/', authMiddleware, (req, res) => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT * FROM leads';
    const params = [];
    const conditions = [];

    if (status) { conditions.push('status = ?'); params.push(status); }
    if (search) {
      conditions.push('(name LIKE ? OR email LIKE ? OR company LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');

    // Count query
    let countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const totalRow = db.get(countQuery, params);

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const leads = db.all(query, params);
    res.json({ leads, total: totalRow?.total || 0 });
  } catch (err) {
    console.error('List leads error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/leads/:id
router.patch('/:id', authMiddleware, [
  body('status').isIn(['new', 'contacted', 'converted', 'closed']).withMessage('Invalid status')
], validate, (req, res) => {
  try {
    const result = db.run('UPDATE leads SET status = ?, updated_at = datetime("now") WHERE id = ?', [req.body.status, req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Lead not found.' });
    res.json({ message: 'Lead status updated.' });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

// DELETE /api/leads/:id
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const result = db.run('DELETE FROM leads WHERE id = ?', [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Lead not found.' });
    res.json({ message: 'Lead deleted.' });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
