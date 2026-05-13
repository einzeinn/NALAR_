"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

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
const ACCEPTED_EXTS = [".pdf", ".csv", ".xlsx", ".xls", ".txt", ".log"];
const MAX_SIZE_MB   = 20;

// URL Logic: Gunakan env var dari Vercel, jika tidak ada baru pakai localhost
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ERROR_MESSAGES: Record<string, string> = {
  unsupported_format: "Unsupported file format. Use PDF, CSV, XLSX, TXT, or LOG.",
  file_too_large:     `File size exceeds the ${MAX_SIZE_MB} MB limit.`,
  extraction_failed:  "Failed to read file contents. Ensure the file is not corrupted.",
  extraction_error:   "An error occurred while processing the file.",
  pipeline_failed:    "AI pipeline failed. Please try again in a few seconds.",
  network:            "Unable to connect to the AI engine. Check your internet or backend status.",
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

const TABS = ["Overview", "Agent Flow", "Anomalies", "Reports"];

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
  const map: Record<number, string> = {
    0: "Document metadata and content successfully parsed.",
    1: `Risk score calculated: ${analysis.overall_risk_score}/100.`,
    2: `Status: ${analysis.final_validation?.status}. ${analysis.final_validation?.conclusion}`,
    3: "Executive summary and anomaly categories generated.",
    4: "Actionable recommendations and priority levels assigned.",
    5: "Intelligence report finalized and ready for export.",
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function Home() {
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

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setErrorMsg(null);
    setResult(null);
    setLogs([]);
    setCurrentStep(0);
    setFile(selected);
    setIsUploading(true);
    setActiveTab("Agent Flow");

    const form = new FormData();
    form.append("file", selected);

    try {
      setCurrentStep(1);
      pushLog(TRAIL_LOGS[0]);

      // Simulasi visual pipeline
      let isFetchDone = false;
      const simulatePipeline = async () => {
        if (isFetchDone) return; await delay(2000);
        if (isFetchDone) return; setCurrentStep(2); pushLog(TRAIL_LOGS[1]); await delay(2000);
        if (isFetchDone) return; setCurrentStep(3); pushLog(TRAIL_LOGS[2]); await delay(2000);
        if (isFetchDone) return; setCurrentStep(4); pushLog(TRAIL_LOGS[3]); await delay(2000);
        if (isFetchDone) return; setCurrentStep(5); pushLog(TRAIL_LOGS[4]); 
      };
      simulatePipeline();

      // GUNAKAN API_BASE_URL DISINI
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: form,
      });

      if (!response.ok) throw new Error("Backend response error");

      const data = (await response.json()) as UploadResult;
      isFetchDone = true;
      setCurrentStep(6); 
      pushLog(TRAIL_LOGS[5]); 
      setResult(data);
      fillLogs();
      
      const newDocs = docsProcessed + 1;
      setDocsProcessed(newDocs);
      setReportCount(reportCount + 1);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ docs: newDocs, reports: reportCount + 1 }));

      setActiveTab("Overview");

    } catch (err) {
      setErrorMsg(ERROR_MESSAGES.network);
      setCurrentStep(0);
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
              </div>
            </header>

            {/* ── Nav ── */}
            <nav className="mt-12 flex flex-wrap gap-4 font-mono text-sm font-semibold text-[#9a9aa1]">
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

            {/* ── Upload Area ── */}
            <div className="mt-6 mb-8">
              {errorMsg && (
                <div className="mb-4 flex items-start gap-4 rounded-[8px] border border-[#ff5d78]/30 bg-[#ff5d78]/[0.08] p-5">
                  <p className="text-sm text-[#ff7890]">{errorMsg}</p>
                </div>
              )}

              {(!result || isUploading) && (
                <label className={cx(
                  "group relative grid min-h-[240px] cursor-pointer place-items-center rounded-[8px] border border-dashed p-8 transition",
                  isUploading ? "border-[#ffdb4d]/50 bg-[#222228] cursor-wait" : "border-[#c6ff25]/35 bg-[#222228] hover:border-[#c6ff25]/70"
                )}>
                  <input ref={fileInputRef} accept=".pdf,.csv,.xlsx,.xls,.txt,.log" className="hidden" onChange={handleFileChange} type="file" disabled={isUploading} />
                  <div className="text-center pointer-events-none">
                    <p className="text-xl font-extrabold text-white">{isUploading ? "Analyzing Pipeline..." : "Drop enterprise data here"}</p>
                    <span className="mt-6 inline-flex rounded-[8px] border border-white/20 px-6 py-3 text-sm font-bold text-white group-hover:border-[#c6ff25]/50">
                      {isUploading ? "Processing..." : "Analyze with AI →"}
                    </span>
                  </div>
                </label>
              )}

              {result && !isUploading && (
                <div className="mb-4 flex items-center justify-between rounded-[8px] border border-[#c6ff25]/25 bg-[#c6ff25]/5 px-6 py-4">
                  <p className="text-sm text-[#a4a4aa]">Analysis Complete: <span className="text-white font-bold">{result.filename}</span></p>
                  <button onClick={handleReset} className="text-xs text-[#ff72ad] border border-[#ff72ad]/40 px-4 py-2 rounded-md hover:bg-[#ff72ad]/10">Reset Analysis</button>
                </div>
              )}
            </div>

            {/* ── Tab Contents ── */}
            {activeTab === "Overview" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <section className="rounded-[8px] border border-[#c6ff25]/25 bg-[#25252c] p-7">
                  <div className="grid gap-8 lg:grid-cols-[170px_1fr]">
                    <div className="text-center lg:text-left">
                      <p className="font-mono text-xs uppercase tracking-[0.34em] text-[#909096]">GLOBAL RISK</p>
                      <p className="text-5xl font-black text-white mt-4">{score}</p>
                    </div>
                    <div className="self-center">
                      <h2 className="text-3xl font-extrabold text-white">{riskLabel}</h2>
                      <div className="mt-8 space-y-4">
                        <RiskBar label="Access Risks" value={riskBars.access} color="bg-[#ff72ad]" />
                        <RiskBar label="Financial Risks" value={riskBars.financial} color="bg-[#ffdb4d]" />
                        <RiskBar label="Compliance Risks" value={riskBars.compliance} color="bg-[#5c82ff]" />
                      </div>
                    </div>
                  </div>
                </section>
                <div className="grid gap-6 lg:grid-cols-3">
                    <InsightCard accent="lime" action="Investigate →" title="Access Control" text={analysis.smart_summary?.risk_categories?.access_risk || "Upload data to begin."} onClick={() => setActiveTab("Anomalies")} />
                    <InsightCard accent="pink" action="Review →" title="Financials" text={analysis.smart_summary?.risk_categories?.financial_risk || "Upload data to begin."} onClick={() => setActiveTab("Reports")} />
                    <InsightCard accent="blue" action="Fix Now →" title="Compliance" text={analysis.smart_summary?.risk_categories?.compliance || "Upload data to begin."} onClick={() => setActiveTab("Reports")} />
                </div>
              </div>
            )}

            {activeTab === "Agent Flow" && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <section className="rounded-[8px] border border-white/10 bg-[#25252c] p-8">
                  <div className="grid grid-cols-5 gap-4">
                    {AGENTS.map((agent, i) => (
                      <div key={agent.id} className={cx("p-4 border rounded-md text-center transition-all", activeStep > i ? agent.accent : "border-white/10 opacity-30")}>
                        <p className="font-bold">{agent.id}</p>
                        <p className="text-[10px] uppercase mt-1">{agent.name}</p>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="bg-[#1f1f25] p-6 rounded-md">
                   {logs.map((log, i) => (
                     <div key={i} className="mb-4">
                        <p className={cx("font-mono text-sm", log.filled ? "text-[#c6ff25]" : "text-white/20")}>{log.label}</p>
                        {log.filled && <p className="text-xs text-white/50 mt-1">{trailDescription(i, result?.ai_analysis || emptyAnalysis)}</p>}
                     </div>
                   ))}
                </section>
              </div>
            )}

            {activeTab === "Anomalies" && (
               <div className="space-y-6 animate-in fade-in">
                  {anomalyFeed.map((item, i) => (
                    <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-md flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white">{item.title}</p>
                        <p className="text-xs text-white/60">{item.description}</p>
                      </div>
                      <span className={cx("px-3 py-1 rounded text-[10px] font-bold", severityClass(item.severity))}>{item.severity}</span>
                    </div>
                  ))}
               </div>
            )}

            {activeTab === "Reports" && (
               <div className="space-y-6 animate-in fade-in">
                  <section className="p-8 bg-white/5 border border-white/10 rounded-md">
                    <p className="font-mono text-[10px] text-white/40 uppercase mb-4 tracking-widest">Executive Brief</p>
                    <p className="text-lg italic text-white/90">"{analysis.smart_summary?.executive_brief || "Awaiting data..."}"</p>
                  </section>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {recommendations.map((rec, i) => (
                      <div key={i} className="p-5 border border-white/10 bg-[#25252c] rounded-md">
                        <p className="font-bold text-white">{rec.action}</p>
                        <p className="text-xs text-white/60 mt-2">{rec.detail}</p>
                      </div>
                    ))}
                  </div>
               </div>
            )}

            {/* ── Footer ── */}
            <footer className="mt-12 border-t border-white/10 pt-6 font-mono text-[10px] text-[#8a8a91]">
              <span>Powered by Gemini 2.0 Flash · Multi-Agent Architecture</span>
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
    <div className="flex justify-between gap-3 border-white/10 py-2 sm:border-r sm:px-7 first:pl-0 last:border-r-0 last:pr-0 text-[10px]">
      <span>{label}</span>
      <span className="font-bold text-[#c6ff25]">{value}</span>
    </div>
  );
}

function RiskBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr_36px] items-center gap-4 text-xs text-[#a4a4aa]">
      <span>{label}</span>
      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
        <div className={cx("h-full transition-all duration-1000", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-right font-mono">{value}</span>
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

function MetricCard({ accent, label, note, value }: { accent: string; label: string; note: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-white/10 bg-[#25252c] p-6">
      <p className="font-mono text-[10px] uppercase text-white/40">{label}</p>
      <p className="mt-4 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] text-white/40">{note}</p>
    </div>
  );
}

function InsightCard({ accent, action, text, title, onClick }: { accent: string; action: string; text?: string; title: string; onClick: () => void }) {
  return (
    <article className="rounded-[8px] border border-white/10 bg-[#25252c] p-7">
      <p className="font-mono text-[10px] uppercase text-white/40 tracking-widest">{title}</p>
      <p className="mt-6 text-sm text-white/80 min-h-[80px]">{text}</p>
      <button onClick={onClick} className="mt-6 text-xs text-white border border-white/20 px-4 py-2 rounded-md hover:bg-white/5 transition-all">{action}</button>
    </article>
  );
}

const emptyAnalysis: AiAnalysis = {
  summary: "", overall_risk_score: 0, key_entities: [],
  final_validation: { conclusion: "", status: "PENDING" },
  smart_summary: { executive_brief: "No data analyzed yet.", risk_categories: { access_risk: "", financial_risk: "", compliance: "" }, anomaly_feed: [] },
  action_report: { recommendations: [], overall_recommendation: "", estimated_resolution_days: 0 },
};