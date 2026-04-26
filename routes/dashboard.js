const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');

router.get('/stats', authMiddleware, (req, res) => {
  try {
    const totalLeads = db.get('SELECT COUNT(*) as count FROM leads')?.count || 0;
    const newLeads = db.get('SELECT COUNT(*) as count FROM leads WHERE status = ?', ['new'])?.count || 0;
    const totalConsultations = db.get('SELECT COUNT(*) as count FROM consultations')?.count || 0;
    const pendingConsultations = db.get('SELECT COUNT(*) as count FROM consultations WHERE status = ?', ['pending'])?.count || 0;
    const totalSubscribers = db.get('SELECT COUNT(*) as count FROM newsletter_subscribers WHERE subscribed = 1')?.count || 0;
    const totalBlogPosts = db.get('SELECT COUNT(*) as count FROM blog_posts WHERE status = ?', ['published'])?.count || 0;
    const totalPortfolioItems = db.get('SELECT COUNT(*) as count FROM portfolio_items WHERE status = ?', ['published'])?.count || 0;
    const totalPricingInquiries = db.get('SELECT COUNT(*) as count FROM pricing_inquiries')?.count || 0;
    const totalBlogViews = db.get('SELECT COALESCE(SUM(views), 0) as total FROM blog_posts')?.total || 0;
    const leadsThisMonth = db.get("SELECT COUNT(*) as count FROM leads WHERE created_at >= date('now', 'start of month')")?.count || 0;
    const consultationsThisMonth = db.get("SELECT COUNT(*) as count FROM consultations WHERE created_at >= date('now', 'start of month')")?.count || 0;

    res.json({
      totalLeads, newLeads, totalConsultations, pendingConsultations,
      totalSubscribers, totalBlogPosts, totalPortfolioItems,
      totalPricingInquiries, totalBlogViews, leadsThisMonth, consultationsThisMonth
    });
  } catch (err) { console.error('Stats error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/recent-activity', authMiddleware, (req, res) => {
  try {
    const recentLeads = db.all("SELECT id, name, email, source, status, created_at, 'lead' as type FROM leads ORDER BY created_at DESC LIMIT 5");
    const recentConsultations = db.all("SELECT id, name, email, status, created_at, 'consultation' as type FROM consultations ORDER BY created_at DESC LIMIT 5");
    const recentSubscribers = db.all("SELECT id, email, created_at, 'subscriber' as type FROM newsletter_subscribers WHERE subscribed = 1 ORDER BY created_at DESC LIMIT 5");
    const recentInquiries = db.all("SELECT id, name, email, plan, status, created_at, 'pricing_inquiry' as type FROM pricing_inquiries ORDER BY created_at DESC LIMIT 5");

    const activity = [...recentLeads, ...recentConsultations, ...recentSubscribers, ...recentInquiries]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 15);

    res.json({ activity });
  } catch (err) { console.error('Activity error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
