# AcademicWriting Services — Full Stack v2.0

## NEW: MongoDB Database + Admin Dashboard

- ✅ MongoDB Atlas (free, permanent database — survives redeploys!)
- ✅ Beautiful Admin Dashboard at /admin
- ✅ View, search, filter all orders
- ✅ Update order status (Pending → In Progress → Completed)
- ✅ WhatsApp client directly from dashboard
- ✅ Export all orders as JSON
- ✅ Enquiry management
- ✅ Gemini AI chatbot (free tier)
- ✅ UPI QR code (server-generated)

---

## STEP 1 — Get Free MongoDB Database (5 min)

1. Go to https://mongodb.com/atlas → Sign up free
2. Create a FREE cluster (M0 — always free)
3. Click "Connect" → "Connect your application"
4. Copy the connection string (looks like):
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/
5. Add your password in the string → add "academicwriting" as DB name:
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/academicwriting

---

## STEP 2 — Environment Variables

In Render dashboard → Environment Variables, add:

| Key | Value |
|-----|-------|
| MONGODB_URI | your MongoDB connection string |
| GEMINI_API_KEY | from aistudio.google.com |
| ADMIN_SECRET | your dashboard password |
| NODE_ENV | production |

---

## STEP 3 — Deploy on Render

Build Command: npm install
Start Command: npm start
Root Directory: academicwriting (if files are in subfolder)

---

## Admin Dashboard

Visit: https://your-site.onrender.com/admin
Password: whatever you set as ADMIN_SECRET

Features:
- 📊 Stats: total, pending, in-progress, completed, revenue estimate
- 📋 Full order table with search + filter + sort
- 👁 Click any order to view full details
- 🔄 Update status, add admin notes
- 💬 WhatsApp client with one click
- 📥 Export all orders as JSON
- 💬 Enquiry messages from visitors

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /api/qr | Public | UPI QR code |
| POST | /api/chat | Public | Gemini chatbot |
| POST | /api/orders | Public | Submit order |
| POST | /api/enquiry | Public | Submit enquiry |
| GET | /api/admin/stats | Admin | Dashboard stats |
| GET | /api/admin/orders | Admin | List orders |
| GET | /api/admin/orders/:id | Admin | Order detail |
| PATCH | /api/admin/orders/:id | Admin | Update status |
| DELETE | /api/admin/orders/:id | Admin | Delete order |
| GET | /api/admin/enquiries | Admin | All enquiries |
| GET | /api/admin/export | Admin | Export JSON |

Admin auth: pass header x-admin-secret: YOUR_ADMIN_SECRET
