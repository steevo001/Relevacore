const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DB_PATH = path.join(__dirname, '..', 'relevacore.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

async function initDatabase() {
  console.log('🔧 Initializing RelevaCore database...');

  const SQL = await initSqlJs();
  let db;

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log('ℹ️  Existing database loaded.');
  } else {
    db = new SQL.Database();
    console.log('✅ New database created.');
  }

  // Run schema
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);
  console.log('✅ Database schema applied.');

  // Seed admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@relevacore.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'RelevaCore2025!';

  const existingAdmin = db.exec("SELECT id FROM admin_users WHERE email = ?", [adminEmail]);

  if (existingAdmin.length === 0 || existingAdmin[0].values.length === 0) {
    const hashedPassword = bcrypt.hashSync(adminPassword, 12);
    db.run('INSERT INTO admin_users (email, password, name) VALUES (?, ?, ?)', [
      adminEmail, hashedPassword, 'Admin'
    ]);
    console.log(`✅ Admin user created: ${adminEmail}`);
  } else {
    console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
  }

  // Seed sample blog posts
  const blogCount = db.exec("SELECT COUNT(*) as count FROM blog_posts");
  const count = blogCount[0].values[0][0];

  if (count === 0) {
    const posts = [
      {
        title: '5 Brand Strategy Frameworks That Actually Work in 2025',
        slug: '5-brand-strategy-frameworks-2025',
        excerpt: 'Discover the proven frameworks top agencies use to build brands that resonate with modern audiences and drive real conversions.',
        content: `<h2>Why Most Brand Strategies Fail</h2><p>In a saturated digital landscape, only brands with a clear, differentiated strategy survive. Here are the five frameworks we use at RelevaCore.</p><h3>1. The Resonance Mapping Framework</h3><p>Start by mapping your audience's emotional triggers, pain points, and aspirations. This creates a "resonance map" that guides every creative decision.</p><h3>2. The Core Positioning Matrix</h3><p>Position your brand at the intersection of what you do best, what your audience needs most, and what competitors aren't doing.</p><h3>3. The Content Gravity Model</h3><p>Create content that naturally attracts your ideal customers by focusing on topics where your expertise meets their curiosity.</p><h3>4. The Conversion Architecture</h3><p>Design every touchpoint as a step in a conversion journey — from social posts to landing pages.</p><h3>5. The Brand Consistency Engine</h3><p>Build systems and templates that ensure brand consistency across all channels without slowing down production.</p>`,
        category: 'strategy', tags: 'brand strategy,frameworks,marketing'
      },
      {
        title: 'The ROI of Premium Brand Design: Data-Backed Insights',
        slug: 'roi-premium-brand-design',
        excerpt: 'We analyzed 50+ brand redesign projects to quantify the real impact of premium design on revenue and engagement.',
        content: `<h2>Design Isn't Just Aesthetic — It's Revenue</h2><p>After analyzing over 50 brand redesign projects, the data is clear: premium design is a multiplier.</p><h3>The Numbers</h3><ul><li><strong>34% average increase</strong> in conversion rates post-redesign</li><li><strong>2.3x improvement</strong> in brand recall</li><li><strong>47% reduction</strong> in customer acquisition costs</li><li><strong>28% boost</strong> in customer lifetime value</li></ul><h3>What Makes Design "Premium"?</h3><p>It's not about complexity — it's about intentionality. Every color, typeface, and interaction should serve a strategic purpose.</p>`,
        category: 'design', tags: 'design,ROI,branding'
      },
      {
        title: 'Performance Marketing in 2025: What Actually Moves the Needle',
        slug: 'performance-marketing-2025',
        excerpt: 'Cut through the noise with performance marketing tactics that deliver measurable results across Meta, Google, and emerging platforms.',
        content: `<h2>The Landscape Has Changed</h2><p>iOS privacy updates, AI-generated content flooding, and rising CPMs have fundamentally altered performance marketing.</p><h3>Strategy 1: Creative-First Campaigns</h3><p>Your creative IS your targeting. Invest 70% of effort in ad creative and 30% in audience setup.</p><h3>Strategy 2: First-Party Data Activation</h3><p>Build robust first-party data assets and use them as the foundation for all paid media.</p><h3>Strategy 3: Landing Page Velocity Testing</h3><p>Build 10+ landing page variants and let the data decide instead of A/B testing two variations.</p>`,
        category: 'marketing', tags: 'performance marketing,ads,ROI'
      }
    ];

    for (const p of posts) {
      db.run(
        'INSERT INTO blog_posts (title, slug, excerpt, content, category, author, status, tags, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))',
        [p.title, p.slug, p.excerpt, p.content, p.category, 'RelevaCore Team', 'published', p.tags]
      );
    }
    console.log('✅ Sample blog posts seeded.');
  }

  // Seed sample portfolio items
  const portfolioCount = db.exec("SELECT COUNT(*) as count FROM portfolio_items");
  const pCount = portfolioCount[0].values[0][0];

  if (pCount === 0) {
    const items = [
      { title: 'Velo Streetwear', client: 'Velo Fashion Co.', description: 'Complete brand identity and e-commerce launch for a premium streetwear brand.', long_description: 'We developed a full visual identity system including logo, typography, color palette, packaging, and a high-converting Shopify storefront. Launch drove 12,000 pre-orders in the first 48 hours.', category: 'branding', results: '12K pre-orders, 340% ROAS on launch', featured: 1 },
      { title: 'NovaPay Fintech', client: 'NovaPay Inc.', description: 'Brand strategy and performance marketing for a B2B fintech platform entering the African market.', long_description: 'Repositioned NovaPay from a generic payment processor to the "financial infrastructure for African commerce." Included messaging framework, UI/UX redesign, and multi-channel acquisition strategy.', category: 'strategy', results: '67% increase in demo requests, 2.1x MQL growth', featured: 1 },
      { title: 'GlowUp Skincare', client: 'GlowUp Beauty', description: 'Social media management and content production that grew organic reach by 450%.', long_description: 'Built a content engine combining educational skincare tips, UGC curation, and influencer partnerships across Instagram, TikTok, and YouTube Shorts.', category: 'content', results: '450% organic reach growth, 89K new followers', featured: 1 },
      { title: 'Atlas Logistics', client: 'Atlas Global Logistics', description: 'Performance marketing campaign generating qualified B2B leads at 60% lower cost.', long_description: 'Using a creative-first approach on LinkedIn and Google Ads, we built a lead generation machine delivering qualified decision-makers at scale.', category: 'marketing', results: '60% lower CPL, 3.8x ROAS, 200+ leads/month', featured: 0 }
    ];

    for (const item of items) {
      db.run(
        'INSERT INTO portfolio_items (title, client, description, long_description, category, results, featured) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [item.title, item.client, item.description, item.long_description, item.category, item.results, item.featured]
      );
    }
    console.log('✅ Sample portfolio items seeded.');
  }

  // Save to disk
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);

  db.close();
  console.log('🚀 Database initialization complete!');
}

if (require.main === module) {
  initDatabase().catch(err => {
    console.error('Init failed:', err);
    process.exit(1);
  });
}

module.exports = initDatabase;
