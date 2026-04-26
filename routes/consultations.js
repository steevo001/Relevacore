const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');
const { sendConsultationConfirmation, sendConsultationNotification } = require('../services/email');

router.post('/', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').optional().trim(),
  body('company').optional().trim(),
  body('preferred_date').optional().trim(),
  body('preferred_time').optional().trim(),
  body('timezone').optional().trim(),
  body('topic').optional().trim(),
  body('message').optional().trim()
], validate, async (req, res) => {
  try {
    const { name, email, phone, company, preferred_date, preferred_time, timezone, topic, message } = req.body;
    const result = db.run(
      'INSERT INTO consultations (name, email, phone, company, preferred_date, preferred_time, timezone, topic, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, phone || null, company || null, preferred_date || null, preferred_time || null, timezone || 'UTC', topic || null, message || null]
    );
    const booking = { name, email, preferred_date, preferred_time, topic, message };
    sendConsultationConfirmation(booking).catch(console.error);
    sendConsultationNotification(booking).catch(console.error);
    res.status(201).json({ message: 'Consultation booked successfully!', id: result.lastInsertRowid });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

router.get('/', authMiddleware, (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT * FROM consultations';
    const params = [];
    if (status) { query += ' WHERE status = ?'; params.push(status); }

    let countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const totalRow = db.get(countQuery, params);

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    const consultations = db.all(query, params);
    res.json({ consultations, total: totalRow?.total || 0 });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/:id', authMiddleware, [
  body('status').isIn(['pending', 'confirmed', 'completed', 'cancelled']).withMessage('Invalid status')
], validate, (req, res) => {
  try {
    const result = db.run('UPDATE consultations SET status = ?, updated_at = datetime("now") WHERE id = ?', [req.body.status, req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found.' });
    res.json({ message: 'Status updated.' });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const result = db.run('DELETE FROM consultations WHERE id = ?', [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found.' });
    res.json({ message: 'Deleted.' });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
