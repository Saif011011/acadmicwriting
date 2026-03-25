// ═══════════════════════════════════════════════════════════
//  AcademicWriting Services — Backend Server v2.0
//  Node.js + Express + MongoDB (Mongoose) + Gemini AI
// ═══════════════════════════════════════════════════════════
require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const path       = require('path');
const rateLimit  = require('express-rate-limit');
const mongoose   = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const QRCode     = require('qrcode');

const app  = express();
const PORT = process.env.PORT || 3000;

// ══════════════════════════════════════════════════════════
//  MONGODB CONNECTION
// ══════════════════════════════════════════════════════════
mongoose.connect(process.env.MONGODB_URI || '', {
  serverSelectionTimeoutMS: 5000
}).then(() => {
  console.log('✅ MongoDB connected');
}).catch(err => {
  console.error('❌ MongoDB connection failed:', err.message);
  console.log('   → Orders will not be saved. Add MONGODB_URI to .env');
});

// ══════════════════════════════════════════════════════════
//  MONGOOSE SCHEMAS
// ══════════════════════════════════════════════════════════

// Order Schema
const orderSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  phone:     { type: String, required: true, trim: true },
  email:     { type: String, required: true, trim: true, lowercase: true },
  service:   { type: String, required: true },
  subject:   { type: String, required: true, trim: true },
  level:     { type: String, default: '' },
  pages:     { type: String, default: '' },
  deadline:  { type: String, required: true },
  topic:     { type: String, default: '' },
  notes:     { type: String, default: '' },
  status:    { type: String, enum: ['pending','in-progress','completed','cancelled'], default: 'pending' },
  adminNotes:{ type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// Contact/Enquiry Schema
const enquirySchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  phone:     { type: String, required: true, trim: true },
  email:     { type: String, required: true, trim: true, lowercase: true },
  message:   { type: String, required: true },
  source:    { type: String, default: 'contact-form' },
  createdAt: { type: Date, default: Date.now }
});

const Order   = mongoose.model('Order',   orderSchema);
const Enquiry = mongoose.model('Enquiry', enquirySchema);

// ══════════════════════════════════════════════════════════
//  GEMINI AI
// ══════════════════════════════════════════════════════════
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `You are "Writing Help Bot" — the friendly, knowledgeable AI support assistant for AcademicWriting Services, a professional academic writing company based in India.

Your ONLY job is to help visitors understand and use AcademicWriting Services. Stay strictly on-topic.

══ SERVICES & PRICING ══
• Thesis / Dissertation Writing — ₹6,000 (50-60 pages) | ₹8,000 (60-100 pages)
• Research Paper (Journal Format) — ₹2,000
• Review / Survey Paper — ₹2,000
• Presentation (PPT) — ₹500 (2 free revisions included)
• Plagiarism Report (Turnitin / iThenticate) — ₹200 onwards
• Editing & Proofreading — ₹500 onwards

══ KEY FEATURES ══
• Plagiarism max 2–3%, Turnitin / Unicheck certified
• 100% confidential — data never shared
• Expert writers: M.Sc / Ph.D. level
• Formats: DOCX, PDF, LaTeX
• Levels: UG, PG, Ph.D., Post-Doc
• All subjects: Science, Arts, Commerce, Law, Engineering, Medical, Management
• Journals: IJCRT, Springer, Elsevier, IEEE, and more
• On-time delivery guaranteed
• 24/7 WhatsApp support

══ PAYMENT ══
UPI ID: 7557737223-4@ybl
Accepts: PhonePe, Google Pay, Paytm, BHIM UPI
Process: Pay advance → share screenshot on WhatsApp → work begins within 2 hours

══ CONTACT ══
WhatsApp / Call: +91 7557737223
Email: academicwriting@gmail.com

══ ORDER PROCESS ══
1. Share requirements (topic, pages, journal, deadline)
2. Get instant quote
3. Confirm payment via UPI
4. Expert assigned, writing begins
5. Receive document + plagiarism report on time

Tone: warm, professional, concise. Keep replies to 2–5 sentences unless the question genuinely needs detail.
If asked to place an order: direct them to the Order Form on the page or WhatsApp +91 7557737223.
If asked anything unrelated to academic writing services: politely say you can only help with AcademicWriting Services queries.`;

// ══════════════════════════════════════════════════════════
//  MIDDLEWARE
// ══════════════════════════════════════════════════════════
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Admin auth middleware
function adminAuth(req, res, next) {
  const secret = req.headers['x-admin-secret'] || req.query.secret || req.body?.secret;
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized — invalid admin secret' });
  }
  next();
}

// Rate limiting
const chatLimit  = rateLimit({ windowMs: 60000, max: 20, message: { error: 'Too many requests.' } });
const orderLimit = rateLimit({ windowMs: 60000, max: 5,  message: { error: 'Too many submissions.' } });
const adminLimit = rateLimit({ windowMs: 60000, max: 60, message: { error: 'Rate limit hit.' } });

// ══════════════════════════════════════════════════════════
//  PUBLIC API ROUTES
// ══════════════════════════════════════════════════════════

// GET /api/qr — UPI QR code
app.get('/api/qr', async (req, res) => {
  try {
    const upiId  = '7557737223-4@ybl';
    const upiUrl = `upi://pay?pa=${upiId}&pn=AcademicWriting+Services&cu=INR`;
    const dataUrl = await QRCode.toDataURL(upiUrl, {
      width: 220, margin: 2,
      color: { dark: '#0D1B3E', light: '#FFFFFF' },
      errorCorrectionLevel: 'H'
    });
    res.json({ success: true, qr: dataUrl, upiId });
  } catch (err) {
    res.status(500).json({ success: false, error: 'QR generation failed' });
  }
});

// POST /api/chat — Gemini chatbot
app.post('/api/chat', chatLimit, async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0)
    return res.status(400).json({ error: 'messages array required' });
  if (!process.env.GEMINI_API_KEY)
    return res.status(500).json({ success: false, message: 'Bot is not configured. Please WhatsApp +91 7557737223 🙏' });

  try {
    const allMsgs = messages.slice(-10);
    const lastMsg = allMsgs[allMsgs.length - 1];
    const history = allMsgs.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction: SYSTEM_PROMPT });
    const chat  = model.startChat({ history });
    const result = await chat.sendMessage(lastMsg.content);
    res.json({ success: true, message: result.response.text() });
  } catch (err) {
    console.error('Gemini error:', err.message);
    res.status(500).json({ success: false, message: "I'm having trouble. Please WhatsApp +91 7557737223 🙏" });
  }
});

// POST /api/orders — submit order (saves to MongoDB)
app.post('/api/orders', orderLimit, async (req, res) => {
  const { name, phone, email, service, subject, level, pages, deadline, topic, notes } = req.body;
  if (!name || !phone || !email || !service || !subject || !deadline)
    return res.status(400).json({ success: false, error: 'Missing required fields' });

  try {
    const order = await Order.create({ name, phone, email, service, subject, level, pages, deadline, topic, notes });
    console.log(`📋 New order: ${name} (${phone}) — ${service}`);
    res.json({ success: true, orderId: order._id, message: 'Order received!' });
  } catch (err) {
    console.error('Order save error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to save order. Please WhatsApp us.' });
  }
});

// POST /api/enquiry — contact form
app.post('/api/enquiry', orderLimit, async (req, res) => {
  const { name, phone, email, message } = req.body;
  if (!name || !phone || !email || !message)
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  try {
    await Enquiry.create({ name, phone, email, message });
    res.json({ success: true, message: 'Enquiry received!' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to save enquiry.' });
  }
});

// ══════════════════════════════════════════════════════════
//  ADMIN API ROUTES (all protected by adminAuth)
// ══════════════════════════════════════════════════════════

// GET /api/admin/stats — dashboard stats
app.get('/api/admin/stats', adminLimit, adminAuth, async (req, res) => {
  try {
    const [total, pending, inProgress, completed, cancelled, enquiries] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'in-progress' }),
      Order.countDocuments({ status: 'completed' }),
      Order.countDocuments({ status: 'cancelled' }),
      Enquiry.countDocuments()
    ]);
    // Orders in last 7 days
    const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentOrders = await Order.countDocuments({ createdAt: { $gte: week } });
    // Revenue estimate
    const allOrders = await Order.find({ status: { $ne: 'cancelled' } }, 'service');
    const revenue = allOrders.reduce((sum, o) => {
      const match = o.service.match(/₹([\d,]+)/);
      return sum + (match ? parseInt(match[1].replace(',','')) : 0);
    }, 0);
    res.json({ success: true, stats: { total, pending, inProgress, completed, cancelled, enquiries, recentOrders, revenue } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/orders — list all orders with filter/search/sort
app.get('/api/admin/orders', adminLimit, adminAuth, async (req, res) => {
  try {
    const { status, search, sort = '-createdAt', page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (search) {
      const re = new RegExp(search, 'i');
      query.$or = [{ name: re }, { email: re }, { phone: re }, { service: re }, { subject: re }];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      Order.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
      Order.countDocuments(query)
    ]);
    res.json({ success: true, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/orders/:id — single order
app.get('/api/admin/orders/:id', adminLimit, adminAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/orders/:id — update status or admin notes
app.patch('/api/admin/orders/:id', adminLimit, adminAuth, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const update = {};
    if (status) update.status = status;
    if (adminNotes !== undefined) update.adminNotes = adminNotes;
    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/orders/:id — delete order
app.delete('/api/admin/orders/:id', adminLimit, adminAuth, async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/enquiries — all enquiries
app.get('/api/admin/enquiries', adminLimit, adminAuth, async (req, res) => {
  try {
    const enquiries = await Enquiry.find().sort('-createdAt').limit(100);
    res.json({ success: true, total: enquiries.length, enquiries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/export — export all orders as JSON
app.get('/api/admin/export', adminLimit, adminAuth, async (req, res) => {
  try {
    const orders = await Order.find().sort('-createdAt');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.json');
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(orders, null, 2));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin dashboard page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Catch-all → frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 AcademicWriting v2.0 running on http://localhost:${PORT}`);
  console.log(`🛡️  Admin dashboard: http://localhost:${PORT}/admin`);
  console.log(`🤖 Gemini API: ${process.env.GEMINI_API_KEY ? '✅' : '❌ MISSING'}`);
  console.log(`🗄️  MongoDB: ${process.env.MONGODB_URI ? '✅ connecting...' : '❌ MISSING'}\n`);
});
