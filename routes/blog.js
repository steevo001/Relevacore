const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');

function slugify(text) {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

// GET /api/blog — Public
router.get('/', (req, res) => {
  try {
    const { category, limit = 20, offset = 0 } = req.query;
    let query = 'SELECT id, title, slug, excerpt, thumbnail, author, category, tags, views, published_at, created_at FROM blog_posts WHERE status = ?';
    const params = ['published'];
    if (category) { query += ' AND category = ?'; params.push(category); }

    let countQuery = 'SELECT COUNT(*) as total FROM blog_posts WHERE status = ?';
    const countParams = ['published'];
    if (category) { countQuery += ' AND category = ?'; countParams.push(category); }
    const totalRow = db.get(countQuery, countParams);

    query += ' ORDER BY published_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    const posts = db.all(query, params);
    res.json({ posts, total: totalRow?.total || 0 });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// GET /api/blog/all — Admin
router.get('/all', authMiddleware, (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT * FROM blog_posts';
    const params = [];
    if (status) { query += ' WHERE status = ?'; params.push(status); }

    let countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const totalRow = db.get(countQuery, params);

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    const posts = db.all(query, params);
    res.json({ posts, total: totalRow?.total || 0 });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// GET /api/blog/:slug — Public
router.get('/:slug', (req, res) => {
  try {
    const post = db.get('SELECT * FROM blog_posts WHERE slug = ? AND status = ?', [req.params.slug, 'published']);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    db.run('UPDATE blog_posts SET views = views + 1 WHERE id = ?', [post.id]);
    post.views += 1;
    res.json({ post });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// POST /api/blog — Admin
router.post('/', authMiddleware, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('content').trim().notEmpty().withMessage('Content is required'),
  body('excerpt').optional().trim(),
  body('category').optional().trim(),
  body('tags').optional().trim(),
  body('status').optional().isIn(['draft', 'published', 'archived']),
  body('author').optional().trim()
], validate, (req, res) => {
  try {
    const { title, content, excerpt, category, tags, status, author } = req.body;
    let slug = slugify(title);
    const existing = db.get('SELECT id FROM blog_posts WHERE slug = ?', [slug]);
    if (existing) slug += '-' + Date.now();

    const publishedAt = status === 'published' ? new Date().toISOString() : null;
    const result = db.run(
      'INSERT INTO blog_posts (title, slug, excerpt, content, category, tags, status, author, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, slug, excerpt || title.substring(0, 160), content, category || 'insights', tags || null, status || 'draft', author || 'RelevaCore Team', publishedAt]
    );
    res.status(201).json({ message: 'Blog post created.', id: result.lastInsertRowid, slug });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// PUT /api/blog/:id — Admin
router.put('/:id', authMiddleware, [
  body('title').optional().trim().notEmpty(),
  body('content').optional().trim().notEmpty(),
  body('excerpt').optional().trim(),
  body('category').optional().trim(),
  body('tags').optional().trim(),
  body('status').optional().isIn(['draft', 'published', 'archived']),
  body('author').optional().trim()
], validate, (req, res) => {
  try {
    const existing = db.get('SELECT * FROM blog_posts WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Post not found.' });

    const fields = {};
    ['title', 'content', 'excerpt', 'category', 'tags', 'status', 'author'].forEach(f => {
      if (req.body[f] !== undefined) fields[f] = req.body[f];
    });

    if (fields.title && fields.title !== existing.title) {
      fields.slug = slugify(fields.title);
      const dupe = db.get('SELECT id FROM blog_posts WHERE slug = ? AND id != ?', [fields.slug, req.params.id]);
      if (dupe) fields.slug += '-' + Date.now();
    }

    if (fields.status === 'published' && existing.status !== 'published') {
      fields.published_at = new Date().toISOString();
    }
    fields.updated_at = new Date().toISOString();

    const setClauses = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(fields), req.params.id];
    db.run(`UPDATE blog_posts SET ${setClauses} WHERE id = ?`, values);

    res.json({ message: 'Blog post updated.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// DELETE /api/blog/:id
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const result = db.run('DELETE FROM blog_posts WHERE id = ?', [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Post not found.' });
    res.json({ message: 'Blog post deleted.' });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
