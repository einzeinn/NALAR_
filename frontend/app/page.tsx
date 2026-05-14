"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────
type Severity = "HIGH" | "MED" | "LOW" | "MEDIUM";

type Entity = {
  entity_name?: string;
  description?: string;
  potential_risk?: string;
};

type Anomaly = {
  title?: string;
  description?: string;
  severity?: Severity;
  category?: string;
};

type Recommendation = {
  action?: string;
  detail?: string;
  priority?: Severity;
  category?: string;
  effort?: string;
};

type AiAnalysis = {
  summary?: string;
  key_entities?: Entity[];
  overall_risk_score?: number;
  final_validation?: { conclusion?: string; status?: string };
  smart_summary?: {
    executive_brief?: string;
    risk_categories?: {
      access_risk?: string;
      financial_risk?: string;
      compliance?: string;
    };
    anomaly_feed?: Anomaly[];
  };
  action_report?: {
    recommendations?: Recommendation[];
    overall_recommendation?: string;
    estimated_resolution_days?: number;
  };
};

type UploadResult = {
  status?: string;
  filename?: string;
  ai_analysis?: AiAnalysis;
};

type Agent = {
  id: string;
  name: string;
  role: string;
  accent: string;
  glow: string;
};
// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "nalar_stats";
const HISTORY_KEY = "nalar_history";

const ACCEPTED_EXTS = [".pdf", ".csv", ".xlsx", ".xls", ".txt", ".log"];
const MAX_SIZE_MB   = 20;

const ERROR_MESSAGES: Record<string, string> = {
  unsupported_format: "Unsupported file format. Use PDF, CSV, XLSX, TXT, or LOG.",
  file_too_large:     `File size exceeds the ${MAX_SIZE_MB} MB limit.`,
  extraction_failed:  "Failed to read file contents. Ensure the file is not corrupted or password-protected.",
  extraction_error:   "An error occurred while processing the file.",
  pipeline_failed:    "AI pipeline failed. Please try again in a few seconds.",
  network:            "Unable to connect to the backend. Ensure the server is running on port 8000.",
  timeout:            "Request timeout. The backend might be overloaded.",
  unknown:            "An unexpected error occurred. Please try again.",
};

const AGENTS: Agent[] = [
  { id: "D", name: "Document Analyzer",  role: "Ingest",   accent: "text-[#c6ff25] border-[#c6ff25]/[0.45] bg-[#c6ff25]/10",  glow: "shadow-[0_0_26px_rgba(198,255,37,0.22)]"  },
  { id: "A", name: "Anomaly Detector",   role: "Detect",   accent: "text-[#ff72ad] border-[#ff72ad]/[0.45] bg-[#ff72ad]/10",  glow: "shadow-[0_0_26px_rgba(255,114,173,0.22)]" },
  { id: "V", name: "Validator & Checker",role: "Validate", accent: "text-[#6d91ff] border-[#6d91ff]/[0.45] bg-[#6d91ff]/10",  glow: "shadow-[0_0_26px_rgba(109,145,255,0.2)]"  },
  { id: "S", name: "Smart Summarizer",   role: "Summarize",accent: "text-[#ffdb4d] border-[#ffdb4d]/[0.45] bg-[#ffdb4d]/10",  glow: "shadow-[0_0_26px_rgba(255,219,77,0.2)]"   },
  { id: "R", name: "Rec. Engine",        role: "Action",   accent: "text-[#d4d4df] border-white/15 bg-white/5",               glow: "shadow-[0_0_26px_rgba(255,255,255,0.08)]"  },
];

const TRAIL_LOGS = [
  "Document ingested",
  "Risk vectors scored",
  "Validation complete",
  "Executive summary built",
  "Action report ready",
  "Intelligence report generated",
];

const TABS = ["Overview", "Agent Flow", "Anomalies", "Reports", "History"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeSeverity(value?: string): "HIGH" | "MED" | "LOW" {
  if (value === "HIGH"   || value === "Tinggi")   return "HIGH";
  if (value === "MEDIUM" || value === "MED" || value === "Menengah") return "MED";
  return "LOW";
}

function severityClass(value?: string) {
  const s = normalizeSeverity(value);
  if (s === "HIGH") return "border-[#ff5d78]/30 bg-[#ff5d78]/[0.18] text-[#ff7890]";
  if (s === "MED")  return "border-[#ffdb4d]/30 bg-[#ffdb4d]/[0.14] text-[#ffdb4d]";
  return "border-[#c6ff25]/25 bg-[#c6ff25]/[0.12] text-[#c6ff25]";
}

function entityRiskDot(risk?: string) {
  const r = risk?.toLowerCase() ?? "";
  if (r.includes("tinggi") || r.includes("high"))   return "bg-[#ff72ad] shadow-[0_0_7px_rgba(255,114,173,0.7)]";
  if (r.includes("menengah") || r.includes("medium") || r.includes("moderate")) return "bg-[#ffdb4d] shadow-[0_0_7px_rgba(255,219,77,0.7)]";
  return "bg-[#c6ff25] shadow-[0_0_7px_rgba(198,255,37,0.7)]";
}

function entityRiskBadge(risk?: string) {
  const r = risk?.toLowerCase() ?? "";
  if (r.includes("tinggi") || r.includes("high"))   return "border-[#ff5d78]/30 bg-[#ff5d78]/[0.15] text-[#ff7890]";
  if (r.includes("menengah") || r.includes("medium") || r.includes("moderate")) return "border-[#ffdb4d]/30 bg-[#ffdb4d]/[0.12] text-[#ffdb4d]";
  return "border-[#c6ff25]/25 bg-[#c6ff25]/[0.10] text-[#c6ff25]";
}

function computeRiskBars(analysis: AiAnalysis) {
  const score = analysis.overall_risk_score ?? 0;
  if (score === 0) return { access: 0, financial: 0, compliance: 0, operational: 0 };
  const feed = analysis.smart_summary?.anomaly_feed ?? [];
  const countCat = (cat: string) => feed.filter((a) => a.category?.toUpperCase() === cat).length;
  const scale = (base: number, extra: number) => Math.min(98, Math.round(base + extra * 9));
  return {
    access:      scale(score * 0.7, countCat("ACCESS")),
    financial:   scale(score * 0.6, countCat("FINANCIAL")),
    compliance:  scale(score * 0.5, countCat("COMPLIANCE")),
    operational: scale(score * 0.4, countCat("OPERATIONAL")),
  };
}

function trailDescription(index: number, analysis: AiAnalysis): string {
  const score      = analysis.overall_risk_score ?? 0;
  const entities   = analysis.key_entities?.length ?? 0;
  const anomalies  = analysis.smart_summary?.anomaly_feed?.length ?? 0;
  const status     = analysis.final_validation?.status ?? "PENDING";
  const conclusion = analysis.final_validation?.conclusion ?? "";
  const brief      = analysis.smart_summary?.executive_brief ?? "";
  const recs       = analysis.action_report?.recommendations?.length ?? 0;
  const days       = analysis.action_report?.estimated_resolution_days;
  const map: Record<number, string> = {
    0: entities > 0 ? `${entities} entit${entities > 1 ? "ies" : "y"} extracted.` : "Document parsed.",
    1: score > 0 ? `Risk score calculated: ${score}/100.` : "Risk scoring complete.",
    2: `Status: ${status}. ${conclusion}`.trim(),
    3: brief ? `${brief.slice(0, 110)}${brief.length > 110 ? "…" : ""}` : `${anomalies} anomal${anomalies !== 1 ? "ies" : "y"} categorized.`,
    4: recs > 0 ? `${recs} action${recs > 1 ? "s" : ""} recommended. Est. ${days ?? "?"} days to resolve.` : "No critical actions required.",
    5: "Full intelligence report ready for review.",
  };
  return map[index] ?? "";
}

function loadStats(): { docs: number; reports: number } {
  if (typeof window === "undefined") return { docs: 0, reports: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { docs: 0, reports: 0 };
  } catch { return { docs: 0, reports: 0 }; }
}
function saveStats(docs: number, reports: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ docs, reports }));
}

const emptyAnalysis: AiAnalysis = {
  summary: "", overall_risk_score: 0, key_entities: [],
  final_validation: { conclusion: "", status: "" },
  smart_summary: { executive_brief: "", risk_categories: { access_risk: "", financial_risk: "", compliance: "" }, anomaly_feed: [] },
  action_report: { recommendations: [], overall_recommendation: "", estimated_resolution_days: 0 },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [file, setFile]               = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult]           = useState<UploadResult | null>(null);
  const [logs, setLogs]               = useState<Array<{ label: string; filled: boolean }>>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [docsProcessed, setDocsProcessed] = useState(0);
  const [reportCount, setReportCount]     = useState(0);
  const [errorMsg, setErrorMsg]           = useState<string | null>(null);
  const [entitiesExpanded, setEntitiesExpanded] = useState(false);
  const [activeTab, setActiveTab]         = useState<string>("Overview");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (localStorage.getItem("nalar_auth") === "true") setIsAuthenticated(true);
    const hist = localStorage.getItem(HISTORY_KEY);
    if (hist) setHistory(JSON.parse(hist));
    const { docs, reports } = loadStats();
    setDocsProcessed(docs);
    setReportCount(reports);
  }, []);

  const analysis        = result?.ai_analysis ?? emptyAnalysis;
  const score           = analysis.overall_risk_score ?? 0;
  const riskBars        = useMemo(() => computeRiskBars(analysis), [analysis]);
  const anomalyFeed     = analysis.smart_summary?.anomaly_feed ?? [];
  const recommendations = analysis.action_report?.recommendations ?? [];
  const keyEntities     = analysis.key_entities ?? [];

  const ENTITIES_PREVIEW = 4;
  const visibleEntities  = entitiesExpanded ? keyEntities : keyEntities.slice(0, ENTITIES_PREVIEW);
  const hasMoreEntities  = keyEntities.length > ENTITIES_PREVIEW;

  const activeStep = isUploading ? currentStep : result ? 6 : 0;

  const pushLog  = (label: string) => setLogs((prev) => {
    if (prev.some(l => l.label === label)) return prev;
    return [...prev.slice(-5), { label, filled: false }];
  });
  
  const fillLogs = () => setLogs((prev) => prev.map((l) => ({ ...l, filled: true })));
  const delay    = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setLogs([]);
    setCurrentStep(0);
    setErrorMsg(null);
    setEntitiesExpanded(false);
    setActiveTab("Overview");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateFile = (f: File): string | null => {
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_EXTS.includes(ext))
      return `Format "${ext}" is not supported. Use: ${ACCEPTED_EXTS.join(", ")}`;
    if (f.size > MAX_SIZE_MB * 1024 * 1024)
      return `File size exceeds the ${(f.size / 1024 / 1024).toFixed(1)} MB limit. Limit: ${MAX_SIZE_MB} MB.`;
    if (f.size === 0)
      return "File is empty and cannot be analyzed.";
    return null;
  };

  const parseBackendError = async (response: Response): Promise<string> => {
    try {
      const body = await response.json();
      const code = body?.detail?.error as string | undefined;
      const msg  = body?.detail?.message as string | undefined;
      if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
      if (msg) return msg;
    } catch { /* not JSON */ }
    if (response.status === 413) return ERROR_MESSAGES.file_too_large;
    if (response.status === 415) return ERROR_MESSAGES.unsupported_format;
    if (response.status === 422) return ERROR_MESSAGES.extraction_failed;
    if (response.status >= 500)  return `Server error (${response.status}). Check backend terminal.`;
    return `Request failed (HTTP ${response.status}).`;
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setErrorMsg(null);
    setResult(null);
    setLogs([]);
    setCurrentStep(0);
    setEntitiesExpanded(false);

    const validationError = validateFile(selected);
    if (validationError) {
      setErrorMsg(validationError);
      e.target.value = "";
      return;
    }

    setFile(selected);
    setIsUploading(true);
    setActiveTab("Agent Flow");

    const form = new FormData();
    form.append("file", selected);

    try {
      setCurrentStep(1);
      pushLog(TRAIL_LOGS[0]);

      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 3 * 60 * 1000);

      const fetchPromise = fetch(`${API_BASE_URL}/api/upload`, {
  method: "POST",
  body: form,
  signal: controller.signal,
});
      let isFetchDone = false;
      const simulatePipeline = async () => {
        if (isFetchDone) return; await delay(2000);
        if (isFetchDone) return; setCurrentStep(2); pushLog(TRAIL_LOGS[1]); await delay(2000);
        if (isFetchDone) return; setCurrentStep(3); pushLog(TRAIL_LOGS[2]); await delay(2000);
        if (isFetchDone) return; setCurrentStep(4); pushLog(TRAIL_LOGS[3]); await delay(2000);
        if (isFetchDone) return; setCurrentStep(5); pushLog(TRAIL_LOGS[4]); 
      };

      simulatePipeline();

      let response: Response;
      try {
        response = await fetchPromise;
        isFetchDone = true;
        clearTimeout(timeoutId);
      } catch (fetchErr) {
        isFetchDone = true;
        clearTimeout(timeoutId);
        if (fetchErr instanceof DOMException && fetchErr.name === "AbortError")
          throw new Error(ERROR_MESSAGES.timeout);
        throw new Error(ERROR_MESSAGES.network);
      }

      if (!response.ok) {
        const errMsg = await parseBackendError(response);
        throw new Error(errMsg);
      }

      const data = (await response.json()) as UploadResult;

      setCurrentStep(6); 
      pushLog(TRAIL_LOGS[5]); 
      
      setResult(data);
      fillLogs();

      const newDocs = docsProcessed + 1;
      const newRep  = reportCount + 1;
      setDocsProcessed(newDocs);
      setReportCount(newRep);
      saveStats(newDocs, newRep);

      const newHist = [{ date: new Date().toISOString(), filename: data.filename, score: data.ai_analysis?.overall_risk_score ?? 0, analysis: data.ai_analysis }, ...history];
      setHistory(newHist);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHist));

      setActiveTab("Overview");

    } catch (err) {
      const msg = err instanceof Error ? err.message : ERROR_MESSAGES.unknown;
      setErrorMsg(msg);
      setCurrentStep(0);
      setLogs([]);
      setActiveTab("Overview");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const riskLabel = score >= 70 ? "Elevated Risk" : score >= 40 ? "Moderate Risk" : score > 0 ? "Low Risk" : "No Data";
  const riskBadge = score >= 70
    ? "border-[#ff5d78]/35 bg-[#ff5d78]/[0.1] text-[#ff7890]"
    : score >= 40
    ? "border-[#ffdb4d]/35 bg-[#ffdb4d]/[0.12] text-[#ffdb4d]"
    : "border-white/15 bg-white/5 text-[#9a9aa1]";

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#1b1b1d] grid place-items-center text-white px-4">
        <form onSubmit={(e) => {
          e.preventDefault();
          if (password === "admin") {
            localStorage.setItem("nalar_auth", "true");
            setIsAuthenticated(true);
          } else {
            alert("Invalid password (hint: admin)");
          }
        }} className="w-full max-w-sm p-8 border border-white/10 rounded-xl bg-[#25252c] shadow-[0_0_40px_rgba(198,255,37,0.1)]">
          <div className="flex justify-center mb-6">
             <span className="h-6 w-6 rounded-full bg-[#c6ff25] shadow-[0_0_22px_rgba(198,255,37,0.75)]" />
          </div>
          <h1 className="text-2xl font-black text-center mb-2 tracking-wide">NALAR_ <span className="text-[#c6ff25]">AUTH</span></h1>
          <p className="text-center text-sm text-[#898990] mb-8">Restricted Access. Enter clearance code.</p>
          <input 
            type="password" 
            placeholder="Enter password..." 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#1b1b1d] border border-white/10 rounded-md px-4 py-3 mb-6 focus:outline-none focus:border-[#c6ff25]/50 transition text-sm font-mono" 
          />
          <button type="submit" className="w-full bg-[#c6ff25] text-[#1b1b1d] font-bold py-3 rounded-md uppercase tracking-[0.2em] text-xs hover:bg-[#aef100] transition shadow-[0_0_15px_rgba(198,255,37,0.4)]">
            Authenticate
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#1b1b1d] px-4 py-8 text-[#f4f4f1] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1180px] overflow-hidden bg-[#1f1f23] shadow-[0_28px_90px_rgba(0,0,0,0.45)]">
        <section className="relative overflow-hidden px-5 pb-12 pt-10 sm:px-8 lg:px-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_93%_21%,rgba(198,255,37,0.1),transparent_16%),linear-gradient(110deg,rgba(109,145,255,0.08),transparent_34%)]" />

          <div className="relative z-10">
            {/* ── Header ── */}
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="h-4 w-4 rounded-full bg-[#c6ff25] shadow-[0_0_22px_rgba(198,255,37,0.75)]" />
                <div>
                  <p className="font-mono text-[13px] font-semibold uppercase tracking-[0.42em] text-[#c6ff25]">NALAR_</p>
                  <p className="mt-1 text-sm text-[#898990]">Enterprise Risk Intelligence Platform</p>
                </div>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.18em]">
                <span className="rounded-full border border-[#c6ff25]/40 px-4 py-2 text-[#c6ff25]">• Live</span>
                <span className="rounded-full border border-[#ffdb4d]/35 px-4 py-2 text-[#ffdb4d]">
                  {anomalyFeed.length} alert{anomalyFeed.length !== 1 ? "s" : ""}
                </span>
              </div>
            </header>

            {/* ── Shape strip ── */}
            <div className="mt-12 flex items-center gap-5">
              <div className="flex items-center gap-5">
                <span className="h-7 w-7 rounded-full bg-[#c6ff25]" />
                <span className="h-7 w-7 rotate-45 bg-[#ff72ad]" />
                <span className="h-4 w-4 rounded-full bg-[#5c82ff]" />
                <span className="h-0 w-0 border-x-[13px] border-b-[23px] border-x-transparent border-b-[#ffdb4d]" />
                <span className="h-2 w-2 rounded-full bg-[#ff72ad]" />
                <span className="h-4 w-4 rotate-45 bg-[#5c82ff]" />
              </div>
              <span className="h-px flex-1 bg-white/10" />
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#898990]">SYS-EPOCH 2026.05.13</span>
            </div>

            {/* ── Hero ── */}
            <div className="mt-12 max-w-[760px]">
              <h1 className="text-[56px] font-black leading-[0.96] tracking-[-0.02em] text-white sm:text-[78px] lg:text-[86px]">
                Risk <span className="text-[#c6ff25]">Intel</span><br />Command
              </h1>
              <p className="mt-7 max-w-[700px] text-lg leading-8 text-[#a4a4aa]">
                Multi-agent AI system for real-time anomaly detection, document analysis,
                and operational risk scoring across enterprise environments.
              </p>
            </div>

            {/* ── Stats strip ── */}
            <div className="mt-10 grid border-y border-white/10 py-4 font-mono text-xs uppercase tracking-[0.16em] text-[#85858c] sm:grid-cols-4">
              <MetricLine label="ANOMALIES FLAGGED" value={String(anomalyFeed.length)} />
              <MetricLine label="AVG RISK SCORE"    value={score > 0 ? `${score}/100` : "—"} />
              <MetricLine label="AGENTS ACTIVE"     value="5" />
              <MetricLine label="REPORTS GENERATED" value={String(reportCount)} />
            </div>

            {/* ── Nav ── */}
            <nav className="mt-8 flex flex-wrap gap-4 font-mono text-sm font-semibold text-[#9a9aa1]">
              {TABS.map((item) => (
                <button 
                  key={item} 
                  type="button" 
                  onClick={() => setActiveTab(item)}
                  className={cx(
                    "rounded-[8px] px-6 py-3 transition",
                    activeTab === item ? "border border-[#c6ff25]/40 bg-[#c6ff25]/10 text-[#c6ff25]" : "hover:text-white"
                  )}
                >
                  {item}
                </button>
              ))}
            </nav>

            {/* ── Drop Zone + Reset ── */}
            <div className="mt-6 mb-8">
              {errorMsg && (
                <div className="mb-4 flex items-start gap-4 rounded-[8px] border border-[#ff5d78]/30 bg-[#ff5d78]/[0.08] p-5">
                  <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-[#ff5d78] text-center font-mono text-xs font-bold leading-4 text-[#ff5d78]">!</span>
                  <div className="flex-1">
                    <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#ff7890]">Upload Error</p>
                    <p className="mt-1 text-sm leading-6 text-[#e0a0aa]">{errorMsg}</p>
                  </div>
                  <button type="button" onClick={() => setErrorMsg(null)}
                    className="shrink-0 font-mono text-xs text-[#ff7890] transition-colors hover:text-white">
                    ✕ Dismiss
                  </button>
                </div>
              )}

              {result && !isUploading && (
                <div className="mb-4 flex items-center justify-between gap-4 rounded-[8px] border border-[#c6ff25]/25 bg-[#c6ff25]/5 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#c6ff25] shadow-[0_0_10px_rgba(198,255,37,0.8)]" />
                    <div>
                      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#c6ff25]">Analysis Complete</p>
                      <p className="mt-0.5 text-sm text-[#a4a4aa]">
                        {result.filename} · Risk score: <span className="font-bold text-white">{score}/100</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-2 rounded-[8px] border border-white/20 bg-white/5 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.18em] text-[#c0c0c8] transition hover:border-[#ff72ad]/50 hover:bg-[#ff72ad]/10 hover:text-[#ff72ad]"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 7a5 5 0 1 0 1-3M2 4V1M2 4H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Analyze New File
                  </button>
                </div>
              )}

              {(!result || isUploading) && (
                <label className={cx(
                  "group relative grid min-h-[240px] cursor-pointer place-items-center rounded-[8px] border border-dashed p-8 transition",
                  isUploading
                    ? "border-[#ffdb4d]/50 bg-[#222228] cursor-wait"
                    : "border-[#c6ff25]/35 bg-[#222228] hover:border-[#c6ff25]/70"
                )}>
                  <input
                    ref={fileInputRef}
                    accept=".pdf,.csv,.xlsx,.xls,.txt,.log"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={handleFileChange}
                    type="file"
                    disabled={isUploading}
                  />
                  <div className="text-center pointer-events-none">
                    <div className={cx(
                      "mx-auto grid h-14 w-14 place-items-center rounded-[6px] text-2xl font-bold transition-colors",
                      isUploading ? "bg-[#ffdb4d]/20 text-[#ffdb4d] border border-[#ffdb4d]/50" : "bg-[#d9d4e6] text-[#23232b]"
                    )}>
                      {isUploading ? (
                        <div className="relative flex h-6 w-6 items-center justify-center">
                          <span className="absolute h-full w-full animate-ping rounded-full bg-[#ffdb4d] opacity-40"></span>
                          <span className="h-3 w-3 rounded-full bg-[#ffdb4d]"></span>
                        </div>
                      ) : "+"}
                    </div>
                    <p className="mt-6 text-xl font-extrabold text-white">
                      {isUploading ? "Processing Enterprise Data..." : file ? file.name : "Drop enterprise data here"}
                    </p>
                    <p className="mt-2 text-sm text-[#8d8d94]">PDFs · Logs · Reports · Structured data</p>
                    <span className="mt-6 inline-flex rounded-[8px] border border-white/20 px-6 py-3 text-sm font-bold text-white group-hover:border-[#c6ff25]/50">
                      {isUploading ? "Running pipeline…" : "Analyze with AI →"}
                    </span>
                    <div className="mt-5 flex flex-wrap justify-center gap-3 font-mono text-xs uppercase text-[#9b9ba2]">
                      {["PDF", "CSV", "XLSX", "TXT", "LOG"].map((t) => (
                        <span key={t} className="rounded-[6px] bg-white/[0.06] px-3 py-1">{t}</span>
                      ))}
                    </div>
                  </div>
                </label>
              )}
            </div>

            {/* ========================================================= */}
            {/* TAB: OVERVIEW */}
            {/* ========================================================= */}
            {activeTab === "Overview" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* ── Global Risk Score ── */}
                <section className="rounded-[8px] border border-[#c6ff25]/25 bg-[#25252c] p-7">
                  <div className="grid gap-8 lg:grid-cols-[170px_1fr]">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-[0.34em] text-[#909096]">GLOBAL RISK SCORE</p>
                      <div className="relative mt-8 h-28 w-28">
                        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 120 120">
                          <circle cx="60" cy="60" r="52" fill="transparent" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
                          <circle cx="60" cy="60" r="52" fill="transparent"
                            stroke={score >= 70 ? "#ff5d78" : score >= 40 ? "#ffdb4d" : "#c6ff25"}
                            strokeWidth="10" strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 52}
                            strokeDashoffset={2 * Math.PI * 52 * (1 - score / 100)}
                            className="transition-all duration-1000 ease-out"
                          />
                        </svg>
                        <div className="absolute inset-0 grid place-items-center">
                          <div className="text-center">
                            <p className="font-mono text-3xl font-bold text-white">{score}</p>
                            <p className="font-mono text-[10px] text-[#a7a7ac]">/100</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="self-center">
                      <h2 className="text-3xl font-extrabold text-white">{riskLabel}</h2>
                      <span className={cx("mt-3 inline-flex rounded-full border px-4 py-2 font-mono text-xs font-bold uppercase", riskBadge)}>
                        {score >= 70 ? "HIGH RISK" : score >= 40 ? "MODERATE-HIGH" : score > 0 ? "LOW RISK" : "PENDING"}
                      </span>
                      <div className="mt-8 space-y-4">
                        <RiskBar label="Access anomalies"         value={riskBars.access}      color="bg-[#ff72ad]" />
                        <RiskBar label="Financial irregularities" value={riskBars.financial}   color="bg-[#ffdb4d]" />
                        <RiskBar label="Compliance gaps"          value={riskBars.compliance}  color="bg-[#5c82ff]" />
                        <RiskBar label="Operational drift"        value={riskBars.operational} color="bg-[#c6ff25]" />
                      </div>
                    </div>
                  </div>
                </section>

                {/* ── Key Metrics ── */}
                <div>
                  <SectionTitle title="Key Metrics" />
                  <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {(() => {
                      const recentHistory = history.slice(0, 6).reverse();
                      const padZeros = (arr: number[]) => [...Array(Math.max(0, 6 - arr.length)).fill(0), ...arr].slice(-6);
                      
                      let dCount = Math.max(0, docsProcessed - recentHistory.length);
                      const chartDocs = padZeros(recentHistory.map(() => ++dCount));
                      
                      const chartAnomalies = padZeros(recentHistory.map(h => h.analysis?.smart_summary?.anomaly_feed?.length || 0));
                      
                      let rCount = Math.max(0, reportCount - recentHistory.length);
                      const chartReports = padZeros(recentHistory.map(() => ++rCount));
                      
                      const chartTime = padZeros(recentHistory.map(() => 12));

                      return (
                        <>
                          <MetricCard accent="lime"   label="Docs processed"    value={String(docsProcessed)} note={docsProcessed > 0 ? "+1 today" : "No documents yet"} chartData={chartDocs} />
                          <MetricCard accent="pink"   label="Anomalies found"   value={String(anomalyFeed.length)} note={anomalyFeed.length > 0 ? `+${anomalyFeed.length} this session` : "None detected"} chartData={chartAnomalies} />
                          <MetricCard accent="blue"   label="Reports generated" value={String(reportCount)} note={reportCount > 0 ? "Latest report ready" : "No reports yet"} chartData={chartReports} />
                          <MetricCard accent="yellow" label="Avg analysis time" value={result ? "~12s" : "—"} note={result ? "5-agent pipeline" : "Pending first run"} chartData={chartTime} />
                        </>
                      );
                    })()}
                  </section>
                </div>

                {/* ── AI-Generated Insights ── */}
                <div>
                  <SectionTitle title="AI-Generated Insights" />
                  <section className="grid gap-6 lg:grid-cols-3">
                    <InsightCard 
                      accent="lime" 
                      action="Investigate →" 
                      title="Access Risk"
                      text={analysis.smart_summary?.risk_categories?.access_risk || "Upload a document to generate access risk analysis."} 
                      onClick={() => setActiveTab("Anomalies")}
                    />
                    <InsightCard 
                      accent="pink" 
                      action="Review →" 
                      title="Financial Risk"
                      text={analysis.smart_summary?.risk_categories?.financial_risk || "Upload a document to generate financial risk analysis."} 
                      onClick={() => setActiveTab("Reports")}
                    />
                    <InsightCard 
                      accent="blue" 
                      action="Fix now →" 
                      title="Compliance"
                      text={analysis.smart_summary?.risk_categories?.compliance || "Upload a document to generate compliance analysis."} 
                      onClick={() => setActiveTab("Reports")}
                    />
                  </section>
                </div>
              </div>
            )}


            {/* ========================================================= */}
            {/* TAB: AGENT FLOW */}
            {/* ========================================================= */}
            {activeTab === "Agent Flow" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* ── Agent Pipeline ── */}
                <div>
                  <SectionTitle title="AI Agent Collaboration" />
                  <section className="rounded-[8px] border border-white/10 bg-[#25252c] p-8">
                    <div className="mb-10 flex items-center gap-3 text-lg font-bold text-white">
                      <span className={cx("h-3 w-3 rounded-full transition-colors", isUploading ? "animate-pulse bg-[#c6ff25]" : result ? "bg-[#c6ff25]" : "bg-[#4a6a1a]")} />
                      Live Multi-Agent Pipeline
                    </div>
                    <div className="grid grid-cols-5 items-start gap-3 sm:gap-6">
                      {AGENTS.map((agent, i) => {
                        const done    = activeStep > i + 1;
                        const current = activeStep === i + 1;
                        const active  = done || current;
                        return (
                          <div key={agent.id} className="relative flex flex-col items-center gap-3">
                            {i < AGENTS.length - 1 && (
                              <span className={cx("absolute left-[calc(50%+34px)] top-8 hidden h-px w-[calc(100%-28px)] transition-all duration-700 sm:block",
                                done ? "bg-[#c6ff25]" : "bg-white/16")} />
                            )}
                            <span className={cx(
                              "grid h-16 w-16 place-items-center rounded-[8px] border text-2xl font-black transition-all duration-500",
                              active ? `${agent.accent} ${agent.glow}` : "border-white/[0.12] bg-white/[0.03] text-[#676770]",
                              current && "animate-pulse"
                            )}>{agent.id}</span>
                            <div className="text-center">
                              <p className={cx("text-sm transition-colors", active ? "text-[#d5d5dc]" : "text-[#555560]")}>{agent.name}</p>
                              <p className="mt-1 text-xs text-[#82828a]">{agent.role}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-6 font-mono text-sm text-[#96969d]">
                      <span>
                        {activeStep === 0 && "Waiting for input…"}
                        {activeStep > 0 && activeStep <= 5 && <>Agent {activeStep} / 5 — <span className="text-[#ffdb4d]">{AGENTS[activeStep - 1]?.name}</span> running…</>}
                        {activeStep === 6 && <span className="text-[#c6ff25]">All 5 agents complete ✓</span>}
                      </span>
                      <span className="flex gap-2">
                        {AGENTS.map((a, i) => (
                          <span key={a.id} className={cx("h-2 w-2 rounded-full transition-colors duration-500",
                            activeStep > i + 1 ? "bg-[#c6ff25]" : activeStep === i + 1 ? "animate-pulse bg-[#ffdb4d]" : "bg-white/[0.18]")} />
                        ))}
                      </span>
                    </div>
                  </section>
                </div>

                {/* ── AI Reasoning Trail ── */}
                <section className="rounded-[8px] border border-white/10 bg-[#25252c] p-8">
                  <p className="text-lg font-bold uppercase tracking-[0.08em] text-[#b9b9bf]">
                    AI Reasoning Trail {file ? `— ${file.name}` : ""}
                  </p>
                  <div className="mt-7 space-y-6">
                    {logs.length === 0
                      ? <p className="text-sm text-[#7e7e85]">Awaiting document upload to begin analysis pipeline.</p>
                      : logs.map((log, i) => (
                          <div key={i} className="flex gap-4">
                            <span className={cx(
                              "mt-1 h-5 w-5 shrink-0 rounded-full border-2 transition-colors duration-500",
                              log.filled ? "border-[#c6ff25]" : "border-white/20"
                            )} />
                            <div>
                              <p className={cx("font-mono text-sm font-bold transition-colors duration-500",
                                log.filled ? "text-[#c6ff25]" : "text-[#777780]")}>{log.label}</p>
                              {log.filled && result?.ai_analysis && (
                                <p className="mt-1 text-sm leading-6 text-[#898990]">
                                  {trailDescription(i, result.ai_analysis)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                    }
                  </div>
                </section>
              </div>
            )}


            {/* ========================================================= */}
            {/* TAB: ANOMALIES */}
            {/* ========================================================= */}
            {activeTab === "Anomalies" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* ── Live Anomaly Feed ── */}
                <section className="rounded-[8px] border border-white/10 bg-[#25252c] p-8">
                  <p className="font-mono text-xs uppercase tracking-[0.34em] text-[#9c9ca3]">Live Anomaly Feed</p>
                  <div className="mt-6 space-y-3">
                    {anomalyFeed.length === 0
                      ? <p className="text-sm text-[#7e7e85]">No anomalies detected yet. Upload a document to begin.</p>
                      : anomalyFeed.map((item, i) => {
                          const sev = normalizeSeverity(item.severity);
                          return (
                            <div key={i} className="flex items-start gap-4 rounded-[8px] bg-white/5 p-4">
                              <span className={cx("mt-1 h-3 w-3 shrink-0 rounded-full",
                                sev === "HIGH" ? "bg-[#ff72ad] shadow-[0_0_8px_rgba(255,114,173,0.6)]"
                                : sev === "MED" ? "bg-[#ffdb4d] shadow-[0_0_8px_rgba(255,219,77,0.6)]"
                                : "bg-[#c6ff25] shadow-[0_0_8px_rgba(198,255,37,0.6)]")} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-[#d6d6dc]">{item.title}</p>
                                {item.description && <p className="mt-1 text-xs leading-relaxed text-[#7e7e85]">{item.description}</p>}
                                {item.category && <p className="mt-1 font-mono text-[9px] uppercase text-[#555560]">{item.category}</p>}
                              </div>
                              <span className={cx("shrink-0 rounded-[6px] border px-3 py-1 font-mono text-xs", severityClass(item.severity))}>{sev}</span>
                            </div>
                          );
                        })
                    }
                  </div>
                </section>

                {/* ── KEY ENTITIES ── */}
                {keyEntities.length > 0 && (
                  <div>
                    <SectionTitle title={`Key Entities Extracted (${keyEntities.length})`} />
                    <section className="rounded-[8px] border border-white/10 bg-[#25252c] p-6">
                      <div className="mb-6 flex flex-wrap gap-3">
                        {(["Tinggi","Menengah","Rendah"] as const).map((level) => {
                          const count = keyEntities.filter(e => e.potential_risk?.toLowerCase().includes(level.toLowerCase())).length;
                          if (count === 0) return null;
                          const colors = {
                            Tinggi:   "border-[#ff5d78]/30 bg-[#ff5d78]/10 text-[#ff7890]",
                            Menengah: "border-[#ffdb4d]/30 bg-[#ffdb4d]/10 text-[#ffdb4d]",
                            Rendah:   "border-[#c6ff25]/25 bg-[#c6ff25]/10 text-[#c6ff25]",
                          };
                          return (
                            <span key={level} className={cx("rounded-full border px-4 py-1.5 font-mono text-xs uppercase tracking-[0.18em]", colors[level])}>
                              {count} {level === "Tinggi" ? "High" : level === "Menengah" ? "Medium" : "Low"} risk
                            </span>
                          );
                        })}
                        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-mono text-xs uppercase tracking-[0.18em] text-[#9a9aa1]">
                          {keyEntities.length} total entities
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                        {visibleEntities.map((entity, i) => (
                          <div key={i} className="group rounded-[8px] border border-white/[0.07] bg-[#1f1f25] p-5 transition hover:border-white/15">
                            <div className="flex items-start gap-3">
                              <span className={cx("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", entityRiskDot(entity.potential_risk))} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-bold text-[#e0e0e6] group-hover:text-white transition-colors">
                                    {entity.entity_name ?? "Unknown Entity"}
                                  </p>
                                  {entity.potential_risk && (
                                    <span className={cx(
                                      "shrink-0 rounded-[5px] border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em]",
                                      entityRiskBadge(entity.potential_risk)
                                    )}>
                                      {entity.potential_risk.toLowerCase().includes("tinggi") ? "High"
                                        : entity.potential_risk.toLowerCase().includes("menengah") ? "Med"
                                        : entity.potential_risk.toLowerCase().includes("rendah") ? "Low"
                                        : entity.potential_risk}
                                    </span>
                                  )}
                                </div>
                                {entity.description && (
                                  <p className="mt-2 text-sm leading-6 text-[#8a8a92]">{entity.description}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {hasMoreEntities && (
                        <button
                          type="button"
                          onClick={() => setEntitiesExpanded((v) => !v)}
                          className="mt-5 flex w-full items-center justify-center gap-2 rounded-[8px] border border-white/10 py-3 font-mono text-xs uppercase tracking-[0.2em] text-[#9a9aa1] transition hover:border-white/25 hover:text-white"
                        >
                          {entitiesExpanded
                            ? `▲ Show less`
                            : `▼ Show ${keyEntities.length - ENTITIES_PREVIEW} more entit${keyEntities.length - ENTITIES_PREVIEW !== 1 ? "ies" : "y"}`}
                        </button>
                      )}
                    </section>
                  </div>
                )}
              </div>
            )}


            {/* ========================================================= */}
            {/* TAB: REPORTS */}
            {/* ========================================================= */}
            {/* ========================================================= */}
            {activeTab === "Reports" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex justify-end">
                  <button 
                    onClick={() => window.print()}
                    disabled={!result?.ai_analysis?.smart_summary?.executive_brief}
                    className="flex items-center gap-2 rounded-[8px] border border-[#c6ff25]/40 bg-[#c6ff25]/10 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.18em] text-[#c6ff25] transition hover:bg-[#c6ff25] hover:text-[#1b1b1d] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Export PDF
                  </button>
                </div>

                {/* ── Executive Summary ── */}
                {result?.ai_analysis?.smart_summary?.executive_brief ? (
                  <section className="rounded-[8px] border border-white/10 bg-[#25252c] p-8">
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <p className="font-mono text-xs uppercase tracking-[0.34em] text-[#9c9ca3]">Executive Summary</p>
                      <span className={cx("rounded-full border px-3 py-1 font-mono text-[10px] uppercase",
                        result.ai_analysis.final_validation?.status === "VALIDATED"
                          ? "border-[#c6ff25]/30 bg-[#c6ff25]/10 text-[#c6ff25]"
                          : "border-[#ffdb4d]/30 bg-[#ffdb4d]/10 text-[#ffdb4d]"
                      )}>
                        {result.ai_analysis.final_validation?.status ?? "PENDING"}
                      </span>
                    </div>
                    <p className="text-lg italic leading-8 text-[#d6d6dc]">&ldquo;{result.ai_analysis.smart_summary.executive_brief}&rdquo;</p>
                    {result.ai_analysis.final_validation?.conclusion && (
                      <p className="mt-4 font-mono text-sm text-[#6d91ff]">Validator: {result.ai_analysis.final_validation.conclusion}</p>
                    )}
                  </section>
                ) : (
                  <p className="text-sm text-[#7e7e85]">Upload document to view executive summary and action reports.</p>
                )}

                {/* ── Action Report ── */}
                {recommendations.length > 0 && (
                  <div>
                    <SectionTitle title="Action Report" />
                    {result?.ai_analysis?.action_report?.overall_recommendation && (
                      <div className="mb-4 rounded-[8px] border border-[#c6ff25]/20 bg-[#c6ff25]/5 p-5">
                        <p className="mb-2 font-mono text-xs uppercase tracking-[0.24em] text-[#c6ff25]">Management Directive</p>
                        <p className="text-sm leading-6 text-[#d6d6dc]">{result.ai_analysis.action_report.overall_recommendation}</p>
                        {result.ai_analysis.action_report.estimated_resolution_days ? (
                          <p className="mt-2 font-mono text-xs text-[#7e7e85]">
                            Est. resolution: {result.ai_analysis.action_report.estimated_resolution_days} days
                          </p>
                        ) : null}
                      </div>
                    )}
                    <section className="grid gap-4 lg:grid-cols-3">
                      {recommendations.map((item, i) => (
                        <div key={i} className="rounded-[8px] border border-white/10 bg-[#25252c] p-5">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-bold text-white">{item.action}</p>
                            <span className={cx("shrink-0 rounded-[6px] border px-2 py-1 font-mono text-[10px]", severityClass(item.priority))}>
                              {normalizeSeverity(item.priority)}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-[#a5a5ac]">{item.detail}</p>
                          {item.effort && <p className="mt-3 font-mono text-[10px] uppercase text-[#555560]">{item.effort.replace("_", " ")}</p>}
                        </div>
                      ))}
                    </section>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB: HISTORY */}
            {/* ========================================================= */}
            {activeTab === "History" && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <SectionTitle title="Analysis History" />
                {history.length === 0 ? (
                  <p className="text-sm text-[#7e7e85]">No history found. Upload a document to save results here.</p>
                ) : (
                  history.map((h, i) => (
                    <div key={i} className="flex items-center justify-between rounded-[8px] border border-white/10 bg-[#25252c] p-5 transition hover:border-white/20">
                      <div>
                        <p className="font-bold text-[#e0e0e6]">{h.filename}</p>
                        <p className="mt-1 font-mono text-xs text-[#7e7e85]">{new Date(h.date).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={cx(
                          "rounded-full border px-3 py-1 font-mono text-xs",
                          h.score >= 70 ? "border-[#ff5d78]/30 bg-[#ff5d78]/10 text-[#ff7890]"
                          : h.score >= 40 ? "border-[#ffdb4d]/30 bg-[#ffdb4d]/10 text-[#ffdb4d]"
                          : "border-[#c6ff25]/25 bg-[#c6ff25]/10 text-[#c6ff25]"
                        )}>
                          Score: {h.score}
                        </span>
                        <button 
                          onClick={() => {
                            setResult({ filename: h.filename, ai_analysis: h.analysis });
                            setActiveTab("Reports");
                          }}
                          className="font-mono text-xs text-[#5c82ff] hover:underline"
                        >
                          View Report
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}


            {/* ── Footer ── */}
            <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 font-mono text-xs text-[#8a8a91]">
              <span>Powered by Gemini 2.5 Flash · Google AI Studio · 5 agents active</span>
              <span className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-[#c6ff25]" />
                <span className="h-3 w-3 rotate-45 bg-[#ff72ad]" />
                <span className="h-3 w-3 rounded-full bg-[#5c82ff]" />
              </span>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-white/10 py-2 sm:border-r sm:px-7 first:pl-0 last:border-r-0 last:pr-0">
      <span>{label}</span>
      <span className="font-bold text-[#c6ff25]">{value}</span>
    </div>
  );
}

function RiskBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="grid grid-cols-[180px_1fr_36px] items-center gap-4 text-sm text-[#a4a4aa]">
      <span>{label}</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <span className={cx("block h-full rounded-full transition-all duration-1000 ease-out", color)} style={{ width: `${value}%` }} />
      </span>
      <span className="text-right font-mono text-xs">{value}</span>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-4 mt-10 flex items-center gap-3">
      <p className="font-mono text-xs uppercase tracking-[0.34em] text-[#9c9ca3]">{title}</p>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

function MetricCard({ accent, label, note, value, chartData }: { accent: "lime"|"pink"|"blue"|"yellow"; label: string; note: string; value: string; chartData?: number[] }) {
  const palette = {
    lime:   "border-[#c6ff25]/25 text-[#c6ff25]",
    pink:   "border-[#ff72ad]/30 text-[#ff72ad]",
    blue:   "border-[#5c82ff]/35 text-[#78a0ff]",
    yellow: "border-[#ffdb4d]/25 text-[#ffdb4d]",
  }[accent];

  const data = chartData || [18, 29, 22, 38, 34, 52];
  const maxVal = Math.max(...data, 1);
  const heights = data.map(v => Math.max(4, (v / maxVal) * 48));

  return (
    <div className={cx("rounded-[8px] border bg-[#25252c] p-6", palette)}>
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#9d9da4]">{label}</p>
      <p className="mt-5 text-4xl font-black">{value}</p>
      <p className="mt-2 font-mono text-sm">{note}</p>
      <div className="mt-7 flex h-12 items-end gap-2">
        {heights.map((h, i) => (
          <span key={i} className="w-full rounded-t-[3px] bg-current opacity-40 last:opacity-100" style={{ height: h, opacity: data[i] === 0 ? 0.1 : undefined }} />
        ))}
      </div>
    </div>
  );
}

function InsightCard({ accent, action, text, title, onClick }: { accent: "lime"|"pink"|"blue"; action: string; text?: string; title: string; onClick?: () => void }) {
  const palette = {
    lime: "border-[#c6ff25]/25 text-[#c6ff25] hover:bg-[#c6ff25] hover:text-[#25252c]",
    pink: "border-[#ff72ad]/30 text-[#ff72ad] hover:bg-[#ff72ad] hover:text-[#25252c]",
    blue: "border-[#5c82ff]/35 text-[#78a0ff] hover:bg-[#5c82ff] hover:text-[#25252c]",
  }[accent];
  
  return (
    <article className={cx("rounded-[8px] border bg-[#25252c] p-7 transition-colors", 
      accent === "lime" ? "border-[#c6ff25]/25 text-[#c6ff25]" : 
      accent === "pink" ? "border-[#ff72ad]/30 text-[#ff72ad]" : 
      "border-[#5c82ff]/35 text-[#78a0ff]"
    )}>
      <p className="font-mono text-xs uppercase tracking-[0.34em]">{title}</p>
      <p className="mt-6 min-h-[100px] text-base leading-7 text-[#dedee3]">{text}</p>
      <button 
        type="button" 
        onClick={onClick}
        className={cx("mt-6 rounded-[8px] border border-current px-5 py-3 font-mono text-sm transition-colors duration-300", palette)}
      >
        {action}
      </button>
    </article>
  );
}