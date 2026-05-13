# NALAR_ — Multi-Agent Enterprise Risk Intelligence Platform

> **AI-powered anomaly detection and risk scoring for enterprise environments, built on a 5-agent pipeline architecture.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=flat-square&logo=vercel)](https://your-app.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render)](https://your-backend.onrender.com)
[![Built with Gemini](https://img.shields.io/badge/Built%20with-Gemini%202.5%20Flash-4285F4?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)

---

## 🎯 Problem

Enterprise organizations generate thousands of documents, logs, and reports daily. Security incidents, financial irregularities, and compliance gaps are often buried inside these files — discovered too late, at great cost.

Manual review is slow. Rule-based systems miss context. **NALAR_ solves this with a coordinated team of 5 specialized AI agents that read, analyze, validate, summarize, and prescribe action — all within seconds.**

---

## ✨ Solution

Upload any enterprise document (PDF, CSV, XLSX, logs) and NALAR_'s multi-agent pipeline produces:

- **Risk score (0–100)** with category breakdown
- **Anomaly feed** with severity levels (HIGH / MEDIUM / LOW)
- **Executive summary** validated by an AI compliance auditor
- **Action report** with prioritized recommendations and resolution timeline

---

## 🤖 5-Agent Architecture

```
Document → [D] Analyzer → [A] Risk Detector → [V] Validator → [S] Summarizer → [R] Rec Engine → Report
```

| Agent | Role | Technology |
|-------|------|------------|
| **D** Document Analyzer | Extracts entities, structure, and key facts from raw document text | Gemini 2.5 Flash |
| **A** Anomaly Detector | Scores risk 0–100, identifies threat categories | Gemini 2.5 Flash + local fallback |
| **V** Validator & Checker | Cross-checks findings, confirms confidence, outputs VALIDATED/REJECTED | Gemini 2.5 Flash |
| **S** Smart Summarizer | Builds executive brief + risk category breakdown + anomaly feed | Gemini 2.5 Flash |
| **R** Recommendation Engine | Generates prioritized action items with effort and timeline estimates | Gemini 2.5 Flash |

Each agent receives the structured output of the previous one — no hallucination propagation, clean data contract at every step.

---

## 🏗️ Tech Stack

**Backend**
- Python + FastAPI — REST API gateway
- Google Gemini 2.5 Flash — AI inference for all 5 agents
- Multi-key round-robin manager with rate limit cooldown
- Supports: PDF (pypdf), CSV, XLSX (openpyxl), TXT, LOG

**Frontend**
- Next.js 16 + TypeScript
- Tailwind CSS v4 — custom dark enterprise design system
- Tab navigation: Overview · Agent Flow · Anomalies · Reports
- Real-time pipeline visualization with per-agent status
- localStorage-persisted session stats

---

## 🚀 Quick Start (Local)

### Prerequisites
- Python 3.11+
- Node.js 20+
- Google AI Studio API key(s) — [get one free](https://aistudio.google.com)

### Backend

```bash
cd backend
pip install -r requirements.txt

# Create .env from template
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY_1

uvicorn app.main:app --reload
# → http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

> The frontend expects the backend at `http://localhost:8000`. For production, set the `NEXT_PUBLIC_API_URL` environment variable on Vercel.

---

## 📁 Project Structure

```
nalar/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── document.py      # Agent D
│   │   │   ├── risk.py          # Agent A
│   │   │   ├── validator.py     # Agent V
│   │   │   ├── summarizer.py    # Agent S
│   │   │   └── recommender.py   # Agent R
│   │   ├── api/
│   │   │   └── upload.py        # File ingestion + routing
│   │   ├── core/
│   │   │   ├── gemini_call.py   # Stable Gemini wrapper + retry
│   │   │   └── api_key_manager.py  # Round-robin key rotation
│   │   └── main.py              # FastAPI app + CORS
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── page.tsx             # Main dashboard (tabs + pipeline UI)
│   │   ├── layout.tsx
│   │   └── globals.css
│   └── package.json
├── render.yaml                  # Render.com deploy config
└── README.md
```

---

## 🎬 Quick Start / Demo

Two sample files are included in the `/demo/` folder to test the pipeline:

1. **`server_auth_log.txt`** — Server authentication log with security incidents
   - Failed login attempts & brute force detection
   - Unauthorized access & API key misuse
   - Certificate expiration warnings
   - Expected: Risk Score 78–85 | Security & Compliance

2. **`financial_anomaly_report.csv`** — Transaction data with anomalies
   - Unusual vendors & high-value transactions
   - Offshore entities & suspicious patterns
   - Expected: Risk Score 82–90 | Financial & Fraud

Upload either file and watch all **5 agents process in sequence**. Each agent adds structured intelligence to the analysis pipeline.

---

## 🌐 Deployment

| Layer | Platform | Notes |
|-------|----------|-------|
| Backend | Render.com | Free tier, Singapore region |
| Frontend | Vercel | Auto-deploy from GitHub |

See `render.yaml` for backend configuration. Set `ALLOWED_ORIGINS` on Render after getting your Vercel URL.

---

## 📊 API Reference

### `POST /api/upload`
Upload a document for analysis.

**Request:** `multipart/form-data` with `file` field

**Supported formats:** `.pdf`, `.csv`, `.xlsx`, `.xls`, `.txt`, `.log`

**Response:**
```json
{
  "status": "success",
  "filename": "report.pdf",
  "file_type": ".pdf",
  "char_count": 8420,
  "ai_analysis": {
    "summary": "...",
    "overall_risk_score": 74,
    "key_entities": [...],
    "final_validation": { "status": "VALIDATED", "conclusion": "..." },
    "smart_summary": {
      "executive_brief": "...",
      "risk_categories": { "access_risk": "...", "financial_risk": "...", "compliance": "..." },
      "anomaly_feed": [...]
    },
    "action_report": {
      "recommendations": [...],
      "overall_recommendation": "...",
      "estimated_resolution_days": 14
    }
  }
}
```

### `GET /health`
Health check. Returns `{"status": "ok"}`.

---

## 👤 Team

Built by **M. Rifki Haipal** — AI Engineer & Full-Stack Developer  
GitHub: [@einzeinn](https://github.com/einzeinn)

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built for the lablab.ai AI Agents Hackathon 2026*
