# AcademicWriting Services — Full Stack Website

Powered by **Google Gemini API (FREE)** — no paid API needed!

- ✅ Node.js + Express backend
- ✅ Writing Help Bot via Google Gemini 1.5 Flash (free tier)
- ✅ UPI QR code generated server-side
- ✅ Order form with persistent JSON database
- ✅ Rate limiting + security headers
- ✅ Deploy-ready on Render, Railway, VPS

---

## 📁 Project Structure

```
academicwriting/
├── server.js           ← Express backend (Gemini AI + all API routes)
├── package.json
├── .env.example        ← Copy this to .env and add your key
├── data/
│   └── orders.json     ← Order database (auto-created)
└── public/
    └── index.html      ← Full frontend website
```

---

## ⚙️ Setup & Run Locally

### 1. Install dependencies
```bash
npm install
```

### 2. Get your FREE Gemini API key
1. Go to → https://aistudio.google.com
2. Click **"Get API Key"** → **"Create API key"**
3. Copy the key (starts with `AIza...`)

### 3. Configure environment
```bash
cp .env.example .env
```
Edit `.env`:
```
GEMINI_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ADMIN_SECRET=your_secret_password
PORT=3000
```

### 4. Start the server
```bash
npm start
```
Visit: http://localhost:3000

---

## 🚀 Deploy on Render (Free Hosting)

1. Push this folder to a **GitHub repository**
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Add Environment Variables:
   - `GEMINI_API_KEY` = your key from aistudio.google.com
   - `ADMIN_SECRET` = any password you choose
   - `NODE_ENV` = production
6. Click **Deploy** — live in ~3 minutes!

---

## 🚀 Deploy on Railway

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```
Then add `GEMINI_API_KEY` in Railway dashboard → Variables.

---

## 🚀 Deploy on VPS (DigitalOcean / Hostinger)

```bash
git clone <your-repo>
cd academicwriting
npm install
cp .env.example .env
nano .env        # paste your Gemini API key
npm install -g pm2
pm2 start server.js --name academicwriting
pm2 save && pm2 startup
```

---

## 🔑 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/qr` | UPI QR code as base64 image |
| POST | `/api/chat` | Writing Help Bot (Gemini AI) |
| POST | `/api/orders` | Save order to database |
| GET | `/api/orders?secret=XXX` | View all orders (admin) |
| GET | `/api/stats` | Public order stats |

---

## 👀 View Submitted Orders

```
https://your-site.com/api/orders?secret=YOUR_ADMIN_SECRET
```

---

## 💡 Gemini Free Tier Limits
- **1,500 requests/day** free
- **1 million tokens/minute**
- Model: `gemini-1.5-flash` (fast + smart)
- More than enough for a customer support chatbot!

---

## 📞 Contact
WhatsApp: +91 7557737223 | UPI: 7557737223-4@ybl
