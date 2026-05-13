# 🚀 NALAR_ Deployment Guide

Complete step-by-step guide untuk deploy NalarAI ke production (Render + Vercel).

---

## 📋 Prerequisites

- GitHub account dengan public repository
- [Render.com](https://render.com) account (free tier)
- [Vercel.com](https://vercel.com) account (free tier)
- Gemini API keys (3x dari [Google AI Studio](https://aistudio.google.com/app/apikey))

---

## 🔧 Phase 1: Setup Local Environment

### Backend (FastAPI)

```bash
cd backend

# Create .env dari template
cp .env.example .env

# Edit .env dan isi Gemini API keys
# GEMINI_API_KEY_1=your_key_here
# GEMINI_API_KEY_2=your_key_here
# GEMINI_API_KEY_3=your_key_here

# Test backend locally
uvicorn app.main:app --reload
# Akses: http://localhost:8000/docs
```

### Frontend (Next.js)

```bash
cd frontend

# Create .env.local dari template
cp .env.example .env.local

# .env.local akan berisi:
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Install & test frontend
npm install
npm run dev
# Akses: http://localhost:3000
```

---

## 🌐 Phase 2: Deploy Backend ke Render.com

### Step 1: Prepare Repository
```bash
# Ensure you're at project root
git add .
git commit -m "Add deployment config"
git push origin main
```

### Step 2: Create Render Service

1. Go to [render.com/dashboard](https://render.com/dashboard)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Fill in the settings:

| Setting | Value |
|---------|-------|
| **Name** | `nalar-backend` |
| **Root Directory** | `backend` |
| **Environment** | `Python 3.11` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Plan** | `Free` |
| **Region** | `Singapore` (atau `Tokyo` jika lebih dekat) |

### Step 3: Add Environment Variables

Di Render dashboard, buka **"Environment"** dan add:

```
GEMINI_API_KEY_1 = your_first_key
GEMINI_API_KEY_2 = your_second_key
GEMINI_API_KEY_3 = your_third_key
ALLOWED_ORIGINS = https://your-app.vercel.app,http://localhost:3000
```

### Step 4: Deploy

Render akan auto-deploy ketika push ke main branch.
Tunggu sampai status menjadi "Live" (biasanya 2-5 menit).

**Copy Backend URL**: `https://nalar-backend-xxxxx.onrender.com`

---

## 🎨 Phase 3: Deploy Frontend ke Vercel

### Step 1: Setup Vercel Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure:

| Setting | Value |
|---------|-------|
| **Framework** | `Next.js` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Install Command** | `npm install` |
| **Output Directory** | `.next` |

### Step 2: Add Environment Variables

Di Vercel dashboard → **"Settings"** → **"Environment Variables"**:

```
NEXT_PUBLIC_API_URL = https://nalar-backend-xxxxx.onrender.com
```

(Replace dengan Backend URL dari Render yang kamu dapat di Phase 2)

### Step 3: Deploy

Klik **"Deploy"** dan tunggu sampai selesai (~2-5 menit).

**Copy Frontend URL**: `https://your-app.vercel.app`

---

## 🔄 Phase 4: Update Backend CORS

Setelah Frontend deployed, update Backend ALLOWED_ORIGINS:

1. Go to Render dashboard → **nalar-backend** service
2. Click **"Environment"**
3. Edit `ALLOWED_ORIGINS`:
   ```
   ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:3000
   ```
4. Click **"Save"** (service akan auto-redeploy)

---

## ✅ Phase 5: Verification

### Test Backend
```bash
curl https://nalar-backend-xxxxx.onrender.com/health
# Expected response: {"status": "ok"}
```

### Test Frontend
1. Open https://your-app.vercel.app di browser
2. Upload test file (PDF/CSV/Excel)
3. Verify file di-process oleh 5-agent pipeline
4. Lihat hasil analysis

### Common Issues

| Issue | Solution |
|-------|----------|
| **CORS error di frontend** | Verify `ALLOWED_ORIGINS` di backend `.env` |
| **Backend timeout** | Increase timeout di Render settings (max 30 min) |
| **API URL not found** | Ensure `NEXT_PUBLIC_API_URL` set di Vercel |
| **Cold start lag** | Render free tier di-pause setelah 15 min inactivity; normal behavior |

---

## 📊 Production URLs

After deployment, update these anywhere needed:

```
🔗 Frontend:  https://your-app.vercel.app
🔗 Backend:   https://nalar-backend-xxxxx.onrender.com
🔗 API Docs:  https://nalar-backend-xxxxx.onrender.com/docs
```

---

## 🔐 Security Checklist

- [ ] `.env` files are in `.gitignore` (never commit secrets)
- [ ] Use environment variables for all API keys
- [ ] Backend CORS restricted to frontend URL (not `*`)
- [ ] Gemini API keys rotated every 90 days
- [ ] HTTPS enforced (both Render & Vercel provide automatic SSL)

---

## 📝 Rollback

If something goes wrong:

**Vercel**: Click **"Deployments"** → select previous version → **"Promote to Production"**

**Render**: Automatic rollback available in **"Deploys"** tab

---

## 💬 Support

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **FastAPI Docs**: https://fastapi.tiangolo.com/deployment
- **Next.js Docs**: https://nextjs.org/docs/deployment
