import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import upload

app = FastAPI(
    title="NALAR_ Risk Intelligence API",
    description="Multi-agent AI pipeline for enterprise risk detection",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Tambahkan VERCEL_URL di Render environment variables setelah deploy Vercel
_RAW = os.getenv("ALLOWED_ORIGINS", "")
_EXTRA = [u.strip() for u in _RAW.split(",") if u.strip()]

ALLOWED_ORIGINS = [
    "http://localhost:3000",       # Next.js dev
    "http://127.0.0.1:3000",
    *_EXTRA,                       # produksi: isi via env var ALLOWED_ORIGINS
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api")


@app.get("/")
def root():
    return {
        "service": "NALAR_ Risk Intelligence API",
        "version": "1.0.0",
        "status": "online",
        "agents": 5,
    }


@app.get("/health")
def health():
    return {"status": "ok"}