# NALAR_
### Enterprise Risk Intelligence Through Multi-Agent AI Orchestration

> *"Most enterprise risks don't announce themselves. They hide inside documents, logs, and reports — waiting to be found. NALAR_ finds them."*

**Live Demo** → https://nalar-chi.vercel.app  
**API Docs** → https://nalar-backend-production-b6b2.up.railway.app/docs

---

## The Problem

Enterprise organizations generate thousands of documents daily — audit logs, financial reports, HR records, compliance files. Manual review is slow, expensive, and error-prone. Critical threats like insider fraud, access violations, and compliance breaches often go undetected for weeks or months.

Existing tools either require expensive enterprise licenses, specialized security teams, or analyze documents in isolation — missing cross-domain risks that only become visible when data is read together.

**NALAR_ changes that.**

---

## What NALAR_ Does

NALAR_ is a multi-agent AI platform that analyzes enterprise documents in real time, detecting anomalies, scoring risk, and generating actionable intelligence — in seconds, not days.

Upload any enterprise document. NALAR_ deploys 5 specialized AI agents in sequence, each building on the previous agent's findings:

```
Document Upload
     │
     ▼
┌─────────────────────┐
│  Agent 1            │  → Extracts entities, structure, and context
│  Document Analyzer  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Agent 2            │  → Identifies risk vectors, scores 0-100
│  Anomaly Detector   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Agent 3            │  → Cross-validates findings, issues verdict
│  Validator          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Agent 4            │  → Categorizes into Access / Financial / Compliance
│  Smart Summarizer   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Agent 5            │  → Generates prioritized action plan
│  Recommendation     │
│  Engine             │
└──────────┬──────────┘
           │
           ▼
    Intelligence Report
    (Risk Score · Anomaly Feed · Executive Summary · Action Plan)
```

---

## Why Multi-Agent?

A single LLM prompt analyzing a full document produces generic, shallow output.

NALAR_'s 5-agent architecture works differently — each agent has a **single, focused responsibility**:

| Approach | Single Prompt | NALAR_ Multi-Agent |
|---|---|---|
| Depth | Surface-level | Layered, specialist-level |
| Accuracy | Prone to hallucination | Each agent validates the previous |
| Output | Generic summary | Structured, categorized intelligence |
| Actionability | Vague suggestions | Prioritized, effort-tagged action plan |

This mirrors how real enterprise security teams operate: separate specialists for detection, validation, analysis, and response — coordinated by an orchestrator.

---

## Business Value

**Who it's for:** Security teams, compliance officers, internal auditors, finance controllers, and any enterprise team that needs to process documents for risk.

**What it replaces:** Hours of manual document review, expensive SIEM tools, and siloed analysis that misses cross-domain threats.

**Real-world impact:**
- Detects insider fraud patterns across HR, payroll, and access logs simultaneously
- Identifies compliance violations (GDPR, AML, SOX) before they become regulatory incidents
- Surfaces financial irregularities buried inside routine transaction reports
- Generates board-ready executive summaries and remediation plans automatically

**Cost advantage:** Runs on Google Gemini free tier. Deployable by any organization without enterprise security budget.

---

## Core Features

- **5-Agent Orchestration Pipeline** — sequential, collaborative AI agents with specialized roles
- **Universal Document Support** — PDF, CSV, XLSX, TXT, LOG
- **Real-Time Risk Scoring** — 0-100 score with category breakdown (Access, Financial, Compliance, Operational)
- **Live Anomaly Feed** — severity-tagged anomalies with category classification
- **Executive Intelligence Report** — board-ready summary with validator verdict
- **Actionable Remediation Plan** — priority-ranked actions with effort estimates and resolution timelines
- **Analysis History** — persistent session history with score tracking
- **Export to PDF** — one-click report export for distribution

---

## Technology Stack

### AI & Intelligence
- **Google Gemini 2.5 Flash** — primary reasoning model across all 5 agents
- **Multi-key rotation** — automatic API key cycling with cooldown management for reliability
- **Structured JSON output** — each agent outputs validated JSON, enabling reliable inter-agent data passing
- **Fallback resilience** — graceful degradation when model calls fail, pipeline never crashes

### Backend
- **FastAPI** — async Python API with full OpenAPI documentation
- **Python** — orchestration logic, file parsing (PDF, CSV, XLSX, TXT, LOG)
- **pypdf, openpyxl** — document extraction libraries

### Frontend
- **Next.js 16** — React framework with App Router
- **TypeScript** — fully typed throughout
- **Tailwind CSS** — utility-first styling
- **Lucide React** — iconography

### Infrastructure
- **Railway** — backend deployment (Singapore region)
- **Vercel** — frontend deployment with global CDN
- **GitHub** — version control and CI/CD trigger

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Next.js Frontend                  │
│          (Vercel · Global CDN · TypeScript)         │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS POST /api/upload
                       ▼
┌─────────────────────────────────────────────────────┐
│                  FastAPI Backend                    │
│              (Railway · Singapore)                  │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │         Multi-Agent Orchestrator            │   │
│  │                                             │   │
│  │  Agent 1 → Agent 2 → Agent 3 → Agent 4 → Agent 5  │
│  │                                             │   │
│  │  Each agent enriches a shared data object   │   │
│  │  and passes it to the next agent            │   │
│  └──────────────────┬──────────────────────────┘   │
│                     │                               │
│  ┌──────────────────▼──────────────────────────┐   │
│  │         API Key Manager                     │   │
│  │  Round-robin · Cooldown · Rate limit aware  │   │
│  └──────────────────┬──────────────────────────┘   │
└─────────────────────┼───────────────────────────────┘
                      │
                      ▼
          ┌───────────────────────┐
          │   Google Gemini API   │
          │  (3 keys · rotated)   │
          └───────────────────────┘
```

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Google Gemini API keys (get free at [aistudio.google.com](https://aistudio.google.com/app/apikey))

### Backend

```bash
cd backend
cp .env.example .env
# Fill in your GEMINI_API_KEY_1, _2, _3 in .env

pip install -r requirements.txt
uvicorn app.main:app --reload
# → http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000

npm install
npm run dev
# → http://localhost:3000
```

---

## Deployment

| Service | Platform | Region |
|---|---|---|
| Frontend | Vercel | Global CDN |
| Backend | Railway | Singapore |

Full deployment guide: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## Demo Files

Ready-to-use test documents in `/demo`:

| File | Description | Expected Risk Score |
|---|---|---|
| `server_auth_log.txt` | Server authentication log with security incidents | 75-85 |
| `financial_anomaly_report.csv` | Transaction data with fraud indicators | 80-90 |
| `nalar_hr_internal_report.txt` | HR report with insider threat patterns | 90-95 |

---

## Judging Criteria Alignment

| Criteria | How NALAR_ addresses it |
|---|---|
| **Application of Technology** | Google Gemini integrated across 5 specialized agents with structured JSON output, multi-key rotation, and fallback resilience — not a single prompt wrapper |
| **Business Value** | Addresses real enterprise pain: hours of manual document review replaced by a 12-second AI pipeline. Applicable across security, finance, compliance, and HR domains |
| **Originality** | Multi-agent orchestration applied to enterprise risk intelligence — each agent plays a specialist role in a collaborative pipeline, mirroring real SOC team workflows |
| **Presentation** | Live production deployment, real-time dashboard, export to PDF, analysis history — fully functional product, not a prototype |

---

## About

Built for the **Transforming Enterprise Through AI** hackathon on lablab.ai.

**Author:** M. Rifki Haipal (quiiplle)  
AI Engineer · Indie Builder · Jakarta, Indonesia  
GitHub: [github.com/einzeinn](https://github.com/einzeinn)

---

<p align="center">
Built with Gemini AI, 5 specialized agents, and unreasonable attention to detail.
</p>
