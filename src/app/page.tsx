"use client";

import {
  ArrowRight,
  Briefcase,
  Check,
  Copy,
  FileCheck,
  FileText,
  Hourglass,
  List,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Tag,
  Upload,
  Wand2,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { useRef, useState } from "react";

import { AuditPanel } from "@/components/audit-panel";
import { MissingKeywords } from "@/components/missing-keywords";
import { ReportTab } from "@/components/report-tab";
import { ResumePreview } from "@/components/resume-preview";
import { runAnalysis } from "@/lib/analyze";
import { type AnalysisResponse } from "@/lib/types";

type TabId = "analyze" | "report" | "cv" | "audit" | "keywords";

// ── DropZone ─────────────────────────────────────────────────────────────────

interface DropZoneProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  hint: string;
}

function DropZone({ label, icon, value, onChange, placeholder, hint }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const filled = value.length > 0;

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => onChange(String(e.target?.result ?? ""));
    reader.readAsText(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  const metaLine = filled
    ? `${value.length.toLocaleString()} chars · ${value.split("\n").length.toLocaleString()} lines`
    : null;

  return (
    <div
      className={`drop${filled ? " filled" : ""}${dragOver ? " dragover" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div className="drop-head">
        <div className="label">
          <span className="ico">{icon}</span>
          {label}
        </div>
        {filled && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="check-badge">
              <span className="dot" />
              <Check size={11} strokeWidth={2.4} />
              loaded
            </span>
            <button
              className="drop-icon-btn"
              onClick={() => {
                onChange("");
                setPasteMode(false);
              }}
              title="Clear"
            >
              <X size={14} />
            </button>
          </div>
        )}
        {!filled && pasteMode && (
          <button className="pill-btn ghost sm" onClick={() => setPasteMode(false)}>
            <X size={12} /> Cancel
          </button>
        )}
      </div>

      {!filled && !pasteMode && (
        <div className="drop-empty">
          <div className="dico">
            <Upload size={20} />
          </div>
          <div className="dtitle">{placeholder}</div>
          <div className="dhint">{hint}</div>
          <button
            type="button"
            className="dchoose"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            Browse files
          </button>
          <button
            type="button"
            className="dpaste"
            onClick={(e) => {
              e.stopPropagation();
              setPasteMode(true);
            }}
          >
            or paste directly
          </button>
        </div>
      )}

      {!filled && pasteMode && (
        <textarea
          className="drop-paste-area"
          placeholder={`Paste your ${label.toLowerCase()} here…`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
      )}

      {filled && (
        <div className="drop-filled-body">
          <div className="drop-meta mono">{metaLine}</div>
          <textarea
            className="drop-preview"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
          />
          <div className="drop-actions">
            <button className="pill-btn sm" onClick={() => inputRef.current?.click()}>
              <Upload size={13} /> Replace
            </button>
            <button
              className="pill-btn ghost sm"
              onClick={() => void navigator.clipboard?.writeText(value)}
            >
              <Copy size={13} /> Copy
            </button>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".html,.htm,.txt,.md,.json"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ── NavItem ───────────────────────────────────────────────────────────────────

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, count, active, disabled, onClick }: NavItemProps) {
  return (
    <button
      className={`nav-item${active ? " active" : ""}${disabled ? " disabled" : ""}`}
      onClick={disabled ? undefined : onClick}
      type="button"
    >
      <span className="ni-icon">{icon}</span>
      {label}
      {count != null && count > 0 && (
        <span className="ni-count mono">{count}</span>
      )}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [tab, setTab] = useState<TabId>("analyze");
  const [resumeHtml, setResumeHtml] = useState("");
  const [jobText, setJobText] = useState("");
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzed = result !== null;

  const reportCount = result
    ? result.score.blockers.length + result.score.interviewRisks.length
    : 0;
  const auditCount = result?.tailored.audits.length ?? 0;
  const keywordsCount = result?.score.missingKeywords.length ?? 0;

  async function handleAnalyze() {
    if (!resumeHtml.trim() || !jobText.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      const analysis = runAnalysis(resumeHtml, jobText);
      setResult(analysis);
      setTab("report");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  const crumbLabels: Record<TabId, string> = {
    analyze: "Analyze",
    report: "Fit report",
    cv: "CV preview",
    audit: "Audit trail",
    keywords: "Missing keywords",
  };

  const canAnalyze = resumeHtml.trim().length > 0 && jobText.trim().length > 0 && !isAnalyzing;

  return (
    <div className="app-shell">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">CT</div>
          <div>
            <div className="brand-name">CV Tailor</div>
            <div className="brand-sub">v0.4 · agent</div>
          </div>
        </div>

        <div className="nav-section">
          <div className="nav-eyebrow">Workspace</div>
          <NavItem
            icon={<Wand2 size={17} />}
            label="Analyze"
            active={tab === "analyze"}
            onClick={() => setTab("analyze")}
          />
        </div>

        <div className="nav-section" style={{ paddingTop: 4 }}>
          <div className="nav-eyebrow">Results</div>
          <NavItem
            icon={<FileCheck size={17} />}
            label="Report"
            count={reportCount}
            active={tab === "report"}
            disabled={!analyzed}
            onClick={() => setTab("report")}
          />
          <NavItem
            icon={<FileText size={17} />}
            label="CV"
            active={tab === "cv"}
            disabled={!analyzed}
            onClick={() => setTab("cv")}
          />
          <NavItem
            icon={<List size={17} />}
            label="Audit"
            count={auditCount}
            active={tab === "audit"}
            disabled={!analyzed}
            onClick={() => setTab("audit")}
          />
          <NavItem
            icon={<Tag size={17} />}
            label="Keywords"
            count={keywordsCount}
            active={tab === "keywords"}
            disabled={!analyzed}
            onClick={() => setTab("keywords")}
          />
        </div>

        <div className="sidebar-foot">
          <button className="nav-item" type="button" style={{ marginBottom: 4 }}>
            <span className="ni-icon">
              <Settings size={17} />
            </span>
            Settings
          </button>
          <div className="user-card">
            <div className="avatar">U</div>
            <div style={{ minWidth: 0 }}>
              <div className="user-name">Local session</div>
              <div className="user-mail">No data leaves your machine</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="main-area">
        <div className="topbar">
          <div className="crumbs">
            <span>CV Tailor</span>
            <span className="sep">/</span>
            <span className="here">{crumbLabels[tab]}</span>
          </div>
          <div className="top-actions">
            {analyzed && (
              <span className="status-chip">
                <span className="status-dot" />
                Ready
              </span>
            )}
            {analyzed && (
              <button
                type="button"
                className="pill-btn"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
              >
                <RefreshCw size={13} /> Re-run
              </button>
            )}
            <button
              type="button"
              className="pill-btn primary"
              onClick={() => setTab("analyze")}
            >
              <Plus size={13} strokeWidth={2.2} /> New tailoring
            </button>
          </div>
        </div>

        <div className="content">
          {/* Analyze view */}
          {tab === "analyze" && (
            <div className="tab-fade">
              <div className="page-title-row">
                <div>
                  <h1 className="h1">Tailor a new application</h1>
                  <p className="lede">
                    Drop your resume and the job description. We'll score the fit, surface blockers,
                    and rewrite weak lines without inventing facts.
                  </p>
                </div>
              </div>

              <div className="input-grid">
                <DropZone
                  label="Resume (HTML)"
                  icon={<FileText size={14} />}
                  value={resumeHtml}
                  onChange={setResumeHtml}
                  placeholder="Drop your resume HTML or click to browse"
                  hint=".html exported from Docs, Notion, or any builder"
                />
                <DropZone
                  label="Job description"
                  icon={<Briefcase size={14} />}
                  value={jobText}
                  onChange={setJobText}
                  placeholder="Drop the job description or click to browse"
                  hint="Plain text, Markdown, or scraped HTML — all welcome"
                />
              </div>

              <button
                type="button"
                className={`btn-analyze${isAnalyzing ? " loading" : ""}`}
                disabled={!canAnalyze}
                onClick={handleAnalyze}
              >
                {isAnalyzing ? (
                  <>
                    <span className="btn-spinner" />
                    <span>Analyzing fit · scoring · drafting rewrites…</span>
                  </>
                ) : (
                  <>
                    <Zap size={16} strokeWidth={2} />
                    <span>{analyzed ? "Re-run analysis" : "Analyze fit"}</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 14,
                  color: "var(--muted)",
                  fontSize: 12,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Shield size={12} /> Runs locally — nothing leaves your machine
                </span>
                <span style={{ color: "var(--line-2)" }}>·</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Hourglass size={12} /> Typical run: instant (deterministic mode)
                </span>
              </div>

              {error && (
                <div className="error-banner" style={{ marginTop: 16 }}>
                  <XCircle size={16} />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Result views */}
          {tab === "report" && analyzed && (
            <ReportTab score={result!.score} job={result!.job} />
          )}
          {tab === "cv" && analyzed && (
            <ResumePreview
              html={result!.tailored.html}
              originalHtml={resumeHtml}
              audits={result!.tailored.audits}
              score={result!.score}
            />
          )}
          {tab === "audit" && analyzed && (
            <AuditPanel audits={result!.tailored.audits} auditReport={result!.auditReport} />
          )}
          {tab === "keywords" && analyzed && (
            <MissingKeywords missingKeywords={result!.score.missingKeywords} />
          )}

          {tab !== "analyze" && !analyzed && (
            <div className="empty-state tab-fade">
              <div className="es-ico">
                <Wand2 size={22} />
              </div>
              <div className="es-title">No analysis yet</div>
              <div className="es-text">
                Drop a resume and a job description on the Analyze tab to populate this view.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
