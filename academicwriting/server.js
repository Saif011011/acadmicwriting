// ═══════════════════════════════════════════════════════════
//  AcademicWriting Services — Backend Server
//  Node.js + Express + Google Gemini API (FREE tier)
// ═══════════════════════════════════════════════════════════
require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const path       = require('path');
const rateLimit  = require('express-rate-limit');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const QRCode     = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const fs         = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Database (flat-file JSON) ──────────────────────────────
const DB_PATH = path.join(__dirname, 'data', 'orders.json');
function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify({ orders: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch { return { orders: [] }; }
}
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ── Google Gemini client ───────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ── Bot system prompt ──────────────────────────────────────
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

// ── Middleware ─────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Rate limiting ──────────────────────────────────────────
const chatLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please slow down.' }
});
const orderLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many order submissions.' }
});

// ══════════════════════════════════════════════════════════
//  ROUTES
// ══════════════════════════════════════════════════════════

// ── GET /api/qr  — generate UPI QR code ───────────────────
app.get('/api/qr', async (req, res) => {
  try {
    const upiId  = '7557737223-4@ybl';
    const upiUrl = `upi://pay?pa=${upiId}&pn=AcademicWriting+Services&cu=INR`;
    const dataUrl = await QRCode.toDataURL(upiUrl, {
      width: 220,
      margin: 2,
      color: { dark: '#0D1B3E', light: '#FFFFFF' },
      errorCorrectionLevel: 'H'
    });
    res.json({ success: true, qr: dataUrl, upiId });
  } catch (err) {
    res.status(500).json({ success: false, error: 'QR generation failed' });
  }
});

// ── POST /api/chat  — Writing Help Bot (Gemini) ───────────
app.post('/api/chat', chatLimit, async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      success: false,
      message: 'Bot is not configured yet. Please WhatsApp us at +91 7557737223 for help! 🙏'
    });
  }

  try {
    // Gemini uses 'user' and 'model' roles (not 'assistant')
    // Separate the last user message from the history
    const allMsgs = messages.slice(-10); // keep last 10 turns
    const lastMsg = allMsgs[allMsgs.length - 1];
    const history = allMsgs.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',           // free tier model
      systemInstruction: SYSTEM_PROMPT      // system prompt here
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMsg.content);
    const text = result.response.text();

    res.json({ success: true, message: text });

  } catch (err) {
    console.error('Gemini API error:', err.message);
    res.status(500).json({
      success: false,
      message: "I'm having a little trouble right now. Please WhatsApp us at +91 7557737223 for instant help! 🙏"
    });
  }
});

// ── POST /api/orders  — save new order ────────────────────
app.post('/api/orders', orderLimit, (req, res) => {
  const { name, phone, email, service, subject, level, pages, deadline, topic, notes } = req.body;
  if (!name || !phone || !email || !service || !subject || !deadline) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  const db = readDB();
  const order = {
    id: uuidv4(),
    name, phone, email, service, subject,
    level: level || '',
    pages: pages || '',
    deadline, topic: topic || '',
    notes: notes || '',
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  db.orders.push(order);
  writeDB(db);
  console.log(`📋 New order from ${name} (${phone}) — ${service}`);
  res.json({ success: true, orderId: order.id, message: 'Order received!' });
});

// ── GET /api/orders  — admin view (protected) ─────────────
app.get('/api/orders', (req, res) => {
  const secret = req.headers['x-admin-secret'] || req.query.secret;
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const db = readDB();
  res.json({ success: true, total: db.orders.length, orders: db.orders });
});

// ── GET /api/stats  — public stats ────────────────────────
app.get('/api/stats', (req, res) => {
  const db = readDB();
  res.json({
    success: true,
    totalOrders: db.orders.length,
    pendingOrders: db.orders.filter(o => o.status === 'pending').length
  });
});

// ── Catch-all → serve frontend ─────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 AcademicWriting server running on http://localhost:${PORT}`);
  console.log(`📁 Orders stored in: ${DB_PATH}`);
  console.log(`🤖 Gemini API: ${process.env.GEMINI_API_KEY ? '✅ configured' : '❌ MISSING — set GEMINI_API_KEY in .env'}\n`);
});
