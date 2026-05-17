"use client";

import { Code2, Download, File, FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { type ResumeChangeAudit } from "@/lib/schemas/audit.schema";
import { type CompatibilityScore } from "@/lib/schemas/score.schema";

interface Props {
  html: string;
  originalHtml?: string;
  audits: ResumeChangeAudit[];
  score?: CompatibilityScore;
}

type CvMode = "adapted" | "original";

export function ResumePreview({ html, originalHtml, audits, score }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mode, setMode] = useState<CvMode>("adapted");
  const [copied, setCopied] = useState(false);

  const activeHtml = mode === "original" && originalHtml ? originalHtml : html;
  const changeCount = audits.length;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const blob = new Blob([activeHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    iframe.src = url;
    return () => URL.revokeObjectURL(url);
  }, [activeHtml]);

  function copyHtml() {
    void navigator.clipboard.writeText(html).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function download(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="tab-fade">
      <div className="page-title-row">
        <div>
          <h1 className="h1">CV preview</h1>
          <p className="lede">
            Your resume, tailored to this job — every change tagged, sourced, and reversible.
            Nothing is fabricated.
          </p>
        </div>
      </div>

      <div className="cv-wrap">
        {/* Main CV frame */}
        <div className="g-card cv-frame-card">
          <div className="cv-toolbar">
            <div className="cv-tabs">
              <button
                type="button"
                className={mode === "adapted" ? "on" : ""}
                onClick={() => setMode("adapted")}
              >
                Adapted
                <span className="tab-badge">{changeCount}</span>
              </button>
              {originalHtml && (
                <button
                  type="button"
                  className={mode === "original" ? "on" : ""}
                  onClick={() => setMode("original")}
                >
                  Original
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="status-chip">
                <span className="status-dot" />
                {changeCount} change{changeCount !== 1 ? "s" : ""}
              </span>
              <button
                type="button"
                className="pill-btn sm"
                onClick={() => download(html, "tailored-resume.html", "text/html")}
              >
                <Download size={13} /> PDF
              </button>
            </div>
          </div>

          <div className="cv-frame-host">
            <div className="cv-iframe-paper">
              <iframe
                ref={iframeRef}
                style={{ width: "100%", height: 700, border: "none", display: "block" }}
                title="CV preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>

        {/* Aside */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <div className="g-card cv-aside-card">
            <div className="g-card-eyebrow">Tailoring</div>
            <div className="g-card-title">
              {changeCount} change{changeCount !== 1 ? "s" : ""} applied
            </div>

            {changeCount > 0 && (
              <div style={{ marginTop: 12 }}>
                {audits.slice(0, 5).map((a) => (
                  <div
                    key={a.changeId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 0",
                      borderBottom: "1px solid var(--line)",
                      fontSize: 13,
                      color: "var(--muted)",
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        flex: "0 0 6px",
                        background:
                          a.classification === "blocked"
                            ? "var(--red)"
                            : a.classification === "needs_user_validation"
                              ? "var(--amber)"
                              : a.classification === "proven"
                                ? "var(--green)"
                                : "var(--blue)",
                      }}
                    />
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                    >
                      {a.targetSection}
                    </span>
                  </div>
                ))}
                {audits.length > 5 && (
                  <div
                    style={{ fontSize: 12, color: "var(--muted)", paddingTop: 8, textAlign: "center" }}
                  >
                    +{audits.length - 5} more changes
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="g-card cv-aside-card">
            <div className="g-card-eyebrow">Export</div>
            <div className="g-card-title">Send this somewhere</div>
            <div className="cv-export-list">
              <button
                type="button"
                className="cv-export-btn"
                onClick={() => download(html, "tailored-resume.html", "text/html")}
              >
                <span className="xico">
                  <Download size={14} />
                </span>
                <span>
                  <div>Download HTML (adapted)</div>
                  <div className="xsub">Stripped of editor markup</div>
                </span>
              </button>

              <button type="button" className="cv-export-btn" onClick={copyHtml}>
                <span className="xico">
                  <Code2 size={14} />
                </span>
                <span>
                  <div>{copied ? "Copied!" : "Copy HTML source"}</div>
                  <div className="xsub">Paste into your editor</div>
                </span>
              </button>

              <button
                type="button"
                className="cv-export-btn"
                onClick={() =>
                  download(
                    JSON.stringify({ audits, score: score ?? null }, null, 2),
                    "resume-report.json",
                    "application/json"
                  )
                }
              >
                <span className="xico">
                  <File size={14} />
                </span>
                <span>
                  <div>Export JSON report</div>
                  <div className="xsub">Audits + scores</div>
                </span>
              </button>

              {originalHtml && (
                <button
                  type="button"
                  className="cv-export-btn"
                  onClick={() => download(originalHtml, "original-resume.html", "text/html")}
                >
                  <span className="xico">
                    <FileText size={14} />
                  </span>
                  <span>
                    <div>Download original</div>
                    <div className="xsub">Unmodified source</div>
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
