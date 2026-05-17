"use client";

import { Download, FileText, Printer } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { type ResumeChangeAudit } from "@/lib/schemas/audit.schema";

const iconButton =
  "inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--card)] px-2.5 text-[12px] font-medium text-[var(--ink-2)] shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--line-2)] hover:bg-[var(--card-2)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40";
const previewTab =
  "rounded-md px-[11px] py-[5px] text-xs font-medium text-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-40";

interface PreviewPaneProps {
  originalHtml: string | null;
  adaptedHtml: string | null;
  audits: ResumeChangeAudit[];
  mode: "original" | "adapted" | "diff";
  adaptedReady: boolean;
  onModeChange: (mode: "original" | "adapted" | "diff") => void;
  onExportHtml: () => void;
}

// A4 width at 96dpi for the virtual page; the wrapper scales it to the container width.
const VIRTUAL_PAGE_WIDTH = 794;
const VIRTUAL_PADDING = 40;

function wrapResumeHtml(rawHtml: string): string {
  const lower = rawHtml.toLowerCase();
  const hasHtmlShell = lower.includes("<html") || lower.includes("<!doctype");
  const baseCss = `
    html, body { margin: 0; padding: 0; background: #ffffff; }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Inter, sans-serif;
      color: #1f1e1b;
      line-height: 1.5;
      padding: ${VIRTUAL_PADDING}px;
      max-width: ${VIRTUAL_PAGE_WIDTH}px;
      box-sizing: border-box;
    }
    h1 { font-size: 30px; margin: 0 0 4px; letter-spacing: -0.01em; }
    h2 { font-size: 14px; margin: 22px 0 8px; text-transform: uppercase; letter-spacing: 0.12em; color: #6b6862; border-bottom: 1px solid #e7e3da; padding-bottom: 4px; }
    h3 { font-size: 15px; margin: 12px 0 2px; }
    p { margin: 0 0 8px; }
    ul { margin: 6px 0 10px 18px; padding: 0; }
    li { margin: 3px 0; }
    a { color: #c4644a; text-decoration: none; }
    header .contact { color: #6b6862; font-size: 13px; }
    @page { size: A4; margin: 16mm; }
    @media print {
      body { padding: 0; max-width: none; }
    }
  `.trim();

  if (hasHtmlShell) {
    // Inject our scaffold styles into the document head without overriding user styles
    if (/<head[\s>]/i.test(rawHtml)) {
      return rawHtml.replace(/<head([^>]*)>/i, `<head$1><style>${baseCss}</style>`);
    }
    if (/<html[\s>]/i.test(rawHtml)) {
      return rawHtml.replace(/<html([^>]*)>/i, `<html$1><head><style>${baseCss}</style></head>`);
    }
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseCss}</style></head><body>${rawHtml}</body></html>`;
}

function ResumeIframe({
  html,
  iframeRef,
}: {
  html: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [docHeight, setDocHeight] = useState(1000);

  const srcDoc = useMemo(() => wrapResumeHtml(html), [html]);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const update = () => {
      const containerWidth = wrapper.clientWidth;
      const targetWidth = VIRTUAL_PAGE_WIDTH;
      setScale(Math.min(1, containerWidth / targetWidth));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, []);

  function handleLoad() {
    const frame = iframeRef.current;
    if (!frame) return;
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      const height = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight);
      setDocHeight(height);
    } catch {
      // cross-origin guard — we own the srcDoc so this should not happen
    }
  }

  // Re-measure after scale changes (font metrics may shift slightly)
  useEffect(() => {
    handleLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, srcDoc]);

  return (
    <div className="w-full" ref={wrapperRef}>
      <div
        className="rounded-md border border-[var(--line)] bg-white shadow-[var(--shadow-sm)]"
        style={{
          width: "100%",
          height: docHeight * scale,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <iframe
          ref={iframeRef}
          title="CV preview"
          srcDoc={srcDoc}
          sandbox="allow-same-origin"
          onLoad={handleLoad}
          style={{
            width: VIRTUAL_PAGE_WIDTH,
            height: docHeight,
            border: 0,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            display: "block",
          }}
        />
      </div>
    </div>
  );
}

function AuditList({ audits }: { audits: ResumeChangeAudit[] }) {
  if (audits.length === 0) {
    return (
      <div className="rounded-[10px] border border-dashed border-[var(--line)] bg-[var(--card-2)] px-4 py-6 text-center text-[13px] text-[var(--muted)]">
        Aucun changement enregistré pour cette adaptation.
      </div>
    );
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {audits.map((audit) => (
        <li
          key={audit.changeId}
          className="rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-4 py-3 shadow-[var(--shadow-sm)]"
        >
          <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold tracking-[0.1em] text-[var(--muted)] uppercase">
            <span className="rounded-full border border-[var(--line)] bg-[var(--bg-2)] px-2 py-[2px]">
              {audit.targetSection}
            </span>
            <span
              className={`rounded-full border px-2 py-[2px] ${
                audit.classification === "blocked"
                  ? "border-[rgba(181,57,47,0.22)] bg-[var(--danger-soft)] text-[var(--danger)]"
                  : audit.classification === "needs_user_validation"
                    ? "border-[rgba(181,136,46,0.22)] bg-[var(--warn-soft)] text-[var(--warn)]"
                    : "border-[rgba(90,122,79,0.22)] bg-[var(--success-soft)] text-[var(--success)]"
              }`}
            >
              {audit.classification}
            </span>
          </div>
          {audit.originalText && (
            <div className="mb-1 text-[12.5px] leading-[1.5] text-[var(--muted)] line-through">
              {audit.originalText}
            </div>
          )}
          <div className="text-[13.5px] leading-[1.5] text-[var(--ink-2)]">{audit.newText}</div>
          <div className="mt-1.5 text-[12px] text-[var(--muted)]">{audit.reason}</div>
        </li>
      ))}
    </ul>
  );
}

export function PreviewPane({
  originalHtml,
  adaptedHtml,
  audits,
  mode,
  adaptedReady,
  onModeChange,
  onExportHtml,
}: PreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const visibleHtml = useMemo(() => {
    if (mode === "adapted" || mode === "diff") return adaptedHtml ?? originalHtml;
    return originalHtml;
  }, [mode, adaptedHtml, originalHtml]);

  if (!originalHtml && !adaptedHtml) {
    return (
      <aside className="flex min-w-0 flex-col bg-[var(--bg-2)] max-[980px]:hidden">
        <div className="flex items-center justify-between border-b border-[var(--line)] bg-[rgba(245,242,234,0.86)] px-[18px] py-3.5 backdrop-blur-[10px]">
          <div className="flex min-w-0 items-center gap-2 font-[family-name:var(--font-display)] text-sm font-medium tracking-[-0.005em] text-[var(--ink)]">
            <FileText size={14} /> CV — aperçu
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3.5 p-10 text-center text-[var(--muted)]">
          <FileText className="h-[72px] w-[72px] rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-[21px] shadow-[var(--shadow-sm)]" />
          <strong className="font-[family-name:var(--font-display)] text-lg font-medium tracking-[-0.01em] text-[var(--ink)]">
            L&apos;aperçu apparaîtra ici
          </strong>
          <span className="max-w-[280px] text-[13.5px] leading-[1.55]">
            Collez une offre dans le chat ; je l&apos;analyse, puis je génère le CV adapté à droite.
          </span>
        </div>
      </aside>
    );
  }

  function handlePrintPdf() {
    const frame = iframeRef.current;
    if (!frame || !frame.contentWindow) return;
    try {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } catch {
      // ignore
    }
  }

  return (
    <aside className="flex min-w-0 flex-col bg-[var(--bg-2)] max-[980px]:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-[rgba(245,242,234,0.86)] px-[18px] py-3 backdrop-blur-[10px]">
        <div className="flex min-w-0 items-center gap-2 font-[family-name:var(--font-display)] text-sm font-medium tracking-[-0.005em] text-[var(--ink)]">
          <FileText size={14} /> {adaptedReady ? "CV adapté" : "CV de base"}
        </div>
        <div className="flex gap-0.5 rounded-lg border border-[var(--line)] bg-[var(--card)] p-[3px]">
          <button
            className={`${previewTab} ${mode === "original" ? "bg-[var(--bg-2)] text-[var(--ink)]" : ""}`}
            type="button"
            onClick={() => onModeChange("original")}
          >
            Original
          </button>
          <button
            className={`${previewTab} ${mode === "adapted" ? "bg-[var(--bg-2)] text-[var(--ink)]" : ""}`}
            type="button"
            disabled={!adaptedReady}
            onClick={() => onModeChange("adapted")}
          >
            Adapté
          </button>
          <button
            className={`${previewTab} ${mode === "diff" ? "bg-[var(--bg-2)] text-[var(--ink)]" : ""}`}
            type="button"
            disabled={!adaptedReady}
            onClick={() => onModeChange("diff")}
          >
            Audits
          </button>
        </div>
        <div className="flex gap-1.5">
          <button
            className={iconButton}
            type="button"
            onClick={onExportHtml}
            disabled={!adaptedReady}
            title="Télécharger en HTML"
          >
            <Download size={13} /> HTML
          </button>
          <button
            className={iconButton}
            type="button"
            onClick={handlePrintPdf}
            disabled={!visibleHtml}
            title="Exporter en PDF (via impression)"
          >
            <Printer size={13} /> PDF
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-[22px]">
        {mode === "diff" ? (
          <AuditList audits={audits} />
        ) : (
          visibleHtml && <ResumeIframe html={visibleHtml} iframeRef={iframeRef} />
        )}
      </div>
    </aside>
  );
}
