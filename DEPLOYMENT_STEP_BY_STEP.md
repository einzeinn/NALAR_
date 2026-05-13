# 🚀 NALAR_ Deployment Step-by-Step (May 2026)

## Prerequisites Check

Before starting, ensure you have:
- [ ] GitHub account with NALAR_ repo (public)
- [ ] Render.com account (free tier)
- [ ] Vercel.com account (free tier)
- [ ] 3x Gemini API keys from Google AI Studio
- [ ] Backend running locally (test: http://localhost:8000/health)
- [ ] Frontend running locally (test: http://localhost:3000)

---

## PHASE 1: Deploy Backend to Render.com

### Step 1.1: Open Render Dashboard
1. Go to https://render.com/dashboard
2. Click **"New +"** button (top-right)
3. Select **"Web Service"**

### Step 1.2: Connect GitHub Repository
1. Click **"Connect"** next to your NALAR_ GitHub repo
2. If not visible, click **"Search repos"** and select `einzeinn/NALAR_`
3. Authorize Render to access GitHub

### Step 1.3: Configure Web Service Settings

Fill in these fields:

| Field | Value | Notes |
|-------|-------|-------|
| **Name** | `nalar-backend` | Service identifier |
| **Environment** | `Python 3.11` | Or latest Python 3.x |
| **Region** | `Singapore` | Closest to Indonesia |
| **Branch** | `main` | Deploy from main branch |
| **Root Directory** | `backend` | Where requirements.txt lives |
| **Build Command** | `pip install -r requirements.txt` | Install dependencies |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` | Run FastAPI |
| **Plan** | `Free` | Free tier is fine |

### Step 1.4: Add Environment Variables

Scroll down to **"Environment"** section and click **"Add Environment Variable"**

Add these variables:

```
GEMINI_API_KEY_1 = <paste your first Gemini API key>
GEMINI_API_KEY_2 = <paste your second Gemini API key>
GEMINI_API_KEY_3 = <paste your third Gemini API key>
ALLOWED_ORIGINS = http://localhost:3000
```

Note: We'll update `ALLOWED_ORIGINS` after deploying frontend.

### Step 1.5: Create Service

1. Click **"Create Web Service"** button
2. **Wait for build to complete** (typically 3-5 minutes)
3. Once "Live" status appears, you'll get a URL like: `https://nalar-backend-xxxxx.onrender.com`

**Save this URL** — you'll need it for frontend configuration.

### Step 1.6: Verify Backend is Running

Open your browser:
```
https://nalar-backend-xxxxx.onrender.com/health
```

Expected response:
```json
{"status": "ok"}
```

Also check API docs:
```
https://nalar-backend-xxxxx.onrender.com/docs
```

---

## PHASE 2: Deploy Frontend to Vercel

### Step 2.1: Open Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**

### Step 2.2: Import GitHub Repository
1. Search for `NALAR_` repository
2. Click **"Import"**

### Step 2.3: Configure Project Settings

In the "Configure Project" screen:

| Setting | Value |
|---------|-------|
| **Framework Preset** | `Next.js` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `.next` |
| **Install Command** | `npm install` |

### Step 2.4: Add Environment Variable

Before deploying, add environment variable:

1. Scroll to **"Environment Variables"** section
2. Add this variable:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://nalar-backend-xxxxx.onrender.com` |

(Replace `xxxxx` with your actual Render backend URL from Phase 1)

### Step 2.5: Deploy

Click **"Deploy"** and wait for build to complete (~2-5 minutes).

Once done, you'll get a URL like: `https://your-app.vercel.app`

**Save this URL** — you'll need it to update backend CORS.

### Step 2.6: Verify Frontend is Running

Open your browser:
```
https://your-app.vercel.app
```

You should see the NALAR_ dashboard. Try uploading a file from `/demo/` folder.

**If you get CORS error** → Go to Phase 3 to fix backend CORS.

---

## PHASE 3: Update Backend CORS

Now that frontend is deployed, update backend to allow it.

### Step 3.1: Update in Render Dashboard
1. Go to Render → nalar-backend service
2. Click **"Environment"** tab
3. Edit `ALLOWED_ORIGINS` variable:

```
ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:3000
```

(Keep localhost for local development)

4. Click **"Save"** (service will auto-redeploy, takes 1-2 min)

### Step 3.2: Verify CORS is Fixed
1. Go to https://your-app.vercel.app
2. Upload test file from `/demo/` folder
3. If upload succeeds → CORS is fixed ✅

---

## PHASE 4: Test Full Pipeline

### Step 4.1: Test Upload Endpoint

**Using frontend (recommended):**
1. Go to https://your-app.vercel.app
2. Click "Upload File"
3. Select `demo/server_auth_log.txt`
4. Wait for 5-agent analysis to complete
5. Verify you see risk score, anomalies, summary, recommendations

**Using curl (optional):**
```bash
curl -X POST https://nalar-backend-xxxxx.onrender.com/api/upload \
  -F "file=@demo/server_auth_log.txt"
```

### Step 4.2: Check API Docs

Visit `https://nalar-backend-xxxxx.onrender.com/docs` to see Swagger UI with all endpoints.

### Step 4.3: Monitor Render Logs

To debug issues:
1. Go to Render dashboard → nalar-backend
2. Click **"Logs"** tab
3. Watch real-time logs as you upload files

---

## PHASE 5: Common Issues & Fixes

### ❌ "CORS error in browser"
**Solution:**
1. Check that `NEXT_PUBLIC_API_URL` is set in Vercel environment
2. Verify `ALLOWED_ORIGINS` in Render backend includes your Vercel URL
3. Wait 2-3 minutes for Render redeploy after changing CORS

### ❌ "Backend times out during file upload"
**Solution:**
1. Render free tier has 30-min timeout limit
2. For large files (>10MB), this might be an issue
3. Upgrade to paid tier or optimize agent response times

### ❌ "Gemini API quota exceeded"
**Solution:**
1. You're hitting rate limits with single API key
2. Ensure you're rotating between 3 API keys (`api_key_manager.py` should handle this)
3. Add delay between requests if needed

### ❌ "Cold start is slow"
**Solution:**
1. Free tier services go to sleep after 15 min inactivity
2. First request after sleep takes 30-60 seconds
3. Normal behavior; upgrade to paid if this is critical

### ❌ "Frontend can't connect to backend"
**Solution:**
1. Verify backend service is "Live" in Render dashboard
2. Check `NEXT_PUBLIC_API_URL` matches actual backend URL
3. Ensure backend is not crashed (check Render logs)

---

## PHASE 6: After Successful Deployment

### You Now Have:
```
🔗 Frontend:  https://your-app.vercel.app
🔗 Backend:   https://nalar-backend-xxxxx.onrender.com
🔗 API Docs:  https://nalar-backend-xxxxx.onrender.com/docs
```

### Next Steps for Lablab.ai Submission:
1. ✅ Record demo video (3-5 min) using production URLs
2. ✅ Create presentation slides (3-5 slides)
3. ✅ Prepare project summary & tags
4. ✅ Submit to lablab.ai with live URLs

---

## Iteration & Debugging

### Making Changes After Deploy

**If you find bugs or want improvements:**

```bash
# 1. Fix locally
cd backend
# ... edit files ...
uvicorn app.main:app --reload

# 2. Test locally to confirm fix
# ... upload test files ...

# 3. Commit & push
git add backend/
git commit -m "fix: [describe fix]"
git push origin main

# 4. Render auto-redeploys (2-3 min)
# 5. Check production: https://nalar-backend-xxxxx.onrender.com
```

Same process for frontend — edit locally, test, push, Vercel auto-redeploys.

---

## 📋 Deployment Checklist

- [ ] Backend deployed to Render ✅
  - [ ] Health check: `/health` returns ok
  - [ ] API docs accessible: `/docs`
  - [ ] Environment variables set (3x Gemini keys, ALLOWED_ORIGINS)

- [ ] Frontend deployed to Vercel ✅
  - [ ] Site loads: https://your-app.vercel.app
  - [ ] Environment variable set: NEXT_PUBLIC_API_URL
  - [ ] Can access home page without errors

- [ ] CORS configured ✅
  - [ ] Backend ALLOWED_ORIGINS includes frontend URL
  - [ ] Test upload from frontend works

- [ ] Full pipeline tested ✅
  - [ ] Upload demo file from frontend
  - [ ] See 5-agent analysis complete
  - [ ] View risk score, anomalies, summary, recommendations

- [ ] Ready for Lablab.ai ✅
  - [ ] Production URLs working and stable
  - [ ] Demo files tested
  - [ ] Ready to record video presentation

---

**Questions? Refer to this guide or check Phase 5 for common issues.**
