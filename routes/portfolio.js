const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');

// GET /api/portfolio — Public
router.get('/', (req, res) => {
  try {
    const { category, featured, limit = 20, offset = 0 } = req.query;
    let query = 'SELECT * FROM portfolio_items WHERE status = ?';
    const params = ['published'];
    if (category) { query += ' AND category = ?'; params.push(category); }
    if (featured !== undefined) { query += ' AND featured = ?'; params.push(parseInt(featured)); }

    let countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const totalRow = db.get(countQuery, params);

    query += ' ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    const items = db.all(query, params);
    res.json({ items, total: totalRow?.total || 0 });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// GET /api/portfolio/all — Admin
router.get('/all', authMiddleware, (req, res) => {
  try {
    const items = db.all('SELECT * FROM portfolio_items ORDER BY sort_order ASC, created_at DESC');
    const totalRow = db.get('SELECT COUNT(*) as total FROM portfolio_items');
    res.json({ items, total: totalRow?.total || 0 });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

// GET /api/portfolio/:id — Public
router.get('/:id', (req, res) => {
  try {
    const item = db.get('SELECT * FROM portfolio_items WHERE id = ? AND status = ?', [req.params.id, 'published']);
    if (!item) return res.status(404).json({ error: 'Not found.' });
    res.json({ item });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

// POST /api/portfolio — Admin
router.post('/', authMiddleware, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('client').optional().trim(),
  body('description').optional().trim(),
  body('long_description').optional().trim(),
  body('category').optional().trim(),
  body('results').optional().trim(),
  body('featured').optional(),
  body('status').optional().isIn(['draft', 'published', 'archived'])
], validate, (req, res) => {
  try {
    const { title, client, description, long_description, category, results, featured, status } = req.body;
    const result = db.run(
      'INSERT INTO portfolio_items (title, client, description, long_description, category, results, featured, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, client || null, description || null, long_description || null, category || 'branding', results || null, featured ? 1 : 0, status || 'published']
    );
    res.status(201).json({ message: 'Created.', id: result.lastInsertRowid });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// PUT /api/portfolio/:id — Admin
router.put('/:id', authMiddleware, [
  body('title').optional().trim().notEmpty(),
  body('client').optional().trim(),
  body('description').optional().trim(),
  body('long_description').optional().trim(),
  body('category').optional().trim(),
  body('results').optional().trim(),
  body('featured').optional(),
  body('status').optional().isIn(['draft', 'published', 'archived']),
  body('sort_order').optional().isNumeric()
], validate, (req, res) => {
  try {
    const existing = db.get('SELECT * FROM portfolio_items WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Not found.' });

    const fields = {};
    ['title', 'client', 'description', 'long_description', 'category', 'results', 'status', 'sort_order'].forEach(f => {
      if (req.body[f] !== undefined) fields[f] = req.body[f];
    });
    if (req.body.featured !== undefined) fields.featured = req.body.featured ? 1 : 0;
    fields.updated_at = new Date().toISOString();

    const setClauses = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(fields), req.params.id];
    db.run(`UPDATE portfolio_items SET ${setClauses} WHERE id = ?`, values);
    res.json({ message: 'Updated.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// DELETE /api/portfolio/:id
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const result = db.run('DELETE FROM portfolio_items WHERE id = ?', [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found.' });
    res.json({ message: 'Deleted.' });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
