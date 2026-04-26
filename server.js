require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please try again later.' }
});

const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Too many submissions. Please try again later.' }
});

app.use('/api/', limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/consultations', require('./routes/consultations'));
app.use('/api/newsletter', require('./routes/newsletter'));
app.use('/api/blog', require('./routes/blog'));
app.use('/api/portfolio', require('./routes/portfolio'));
app.use('/api/pricing', require('./routes/pricing'));
app.use('/api/dashboard', require('./routes/dashboard'));

// SPA-like routing for frontend pages
const pageRoutes = {
  '/work': 'work.html',
  '/services': 'services.html',
  '/insights': 'insights.html',
  '/contact': 'contact.html',
  '/booking': 'booking.html'
};

Object.entries(pageRoutes).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', file));
  });
});

// Admin routes
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.get('/admin/:page', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'admin', `${req.params.page}.html`);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
  }
});

// Blog post catch-all
app.get('/insights/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'insights-post.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// 404 handler
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found.' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server after database is ready
async function start() {
  const initDatabase = require('./database/init');
  const { getDb } = require('./database/db');

  const DB_PATH = path.join(__dirname, 'relevacore.db');
  if (!fs.existsSync(DB_PATH)) {
    await initDatabase();
  }

  // Initialize db connection
  await getDb();

  app.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║       🚀 RelevaCore Server Running        ║');
    console.log(`║       http://localhost:${PORT}              ║`);
    console.log('║                                           ║');
    console.log('║  Admin: /admin                            ║');
    console.log(`║  Email: ${process.env.ADMIN_EMAIL || 'admin@relevacore.com'}       ║`);
    console.log('║  Pass:  (see .env ADMIN_PASSWORD)         ║');
    console.log('║  API:   /api/health                       ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log('');
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
