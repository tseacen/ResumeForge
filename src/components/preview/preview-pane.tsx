"use client";

import { Ban, CheckCircle2, FileText, GitCompare } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { type ResumeForgeState } from "@/lib/schemas/app.schema";
import { type TailoringAuditItem } from "@/lib/schemas/tailoring.schema";

type PreviewMode = ResumeForgeState["previewMode"];

interface PreviewPaneProps {
  originalHtml: string | null;
  adaptedHtml: string | null;
  audit: TailoringAuditItem[];
  mode: PreviewMode;
  onModeChange: (mode: PreviewMode) => void;
}

const VIRTUAL_PAGE_WIDTH = 794;
const VIRTUAL_PADDING = 40;

function wrapResumeHtml(rawHtml: string, highlightChanges: boolean): string {
  const lower = rawHtml.toLowerCase();
  const hasHtmlShell = lower.includes("<html") || lower.includes("<!doctype");
  const diffCss = highlightChanges
    ? `
    [data-rf-change-id] {
      outline: 1px solid rgba(196, 100, 74, 0.35);
      background: rgba(196, 100, 74, 0.08);
      box-shadow: inset 3px 0 0 #c4644a;
      border-radius: 3px;
    }
  `
    : "";
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
    ${diffCss}
  `.trim();

  if (hasHtmlShell) {
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
  highlightChanges = false,
}: {
  html: string;
  highlightChanges?: boolean;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [scale, setScale] = useState(1);
  const [docHeight, setDocHeight] = useState(1000);

  const srcDoc = useMemo(() => wrapResumeHtml(html, highlightChanges), [html, highlightChanges]);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const update = () => {
      const containerWidth = wrapper.clientWidth;
      setScale(Math.min(1, containerWidth / VIRTUAL_PAGE_WIDTH));
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
      // sandboxed
    }
  }

  useEffect(() => {
    handleLoad();
  }, [scale, srcDoc]);

  return (
    <div className="w-full" ref={wrapperRef}>
      <div
        className="rounded-[10px] border border-[var(--line)] bg-white shadow-[0_18px_46px_-24px_rgba(31,30,27,0.32)]"
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

function ModeButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`h-7 rounded-md px-2.5 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-[var(--ink)] text-white shadow-[var(--shadow-sm)]"
          : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--ink)]"
      }`}
    >
      {label}
    </button>
  );
}

function DiffAuditPanel({ audit }: { audit: TailoringAuditItem[] }) {
  const applied = audit.filter((item) => item.status === "applied");
  const blocked = audit.filter((item) => item.status === "blocked");
  const items = audit.length > 0 ? audit : [];

  return (
    <div className="rounded-[12px] border border-[var(--line)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
      <div className="border-b border-[var(--line)] px-3.5 py-3">
        <div className="flex items-center gap-2 font-[family-name:var(--font-display)] text-sm font-medium text-[var(--ink)]">
          <GitCompare size={14} className="text-[var(--accent)]" /> Before / after
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11.5px] font-medium">
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success-soft)] px-2 py-[3px] text-[var(--success)]">
            <CheckCircle2 size={12} /> {applied.length} applied
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--danger-soft)] px-2 py-[3px] text-[var(--danger)]">
            <Ban size={12} /> {blocked.length} blocked
          </span>
        </div>
      </div>
      <div className="max-h-[44vh] overflow-auto p-3.5">
        {items.length === 0 ? (
          <p className="m-0 text-[12.5px] leading-[1.45] text-[var(--muted)]">
            No auditable changes for this generation.
          </p>
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <article
                key={item.id}
                className={`rounded-[10px] border p-3 ${
                  item.status === "applied"
                    ? "border-[var(--success)]/25 bg-[var(--success-soft)]"
                    : "border-[var(--danger)]/20 bg-[var(--danger-soft)]"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                    {item.status === "applied" ? "Applied" : "Blocked"}
                  </span>
                  <span className="rounded-full bg-[var(--card)] px-2 py-[2px] text-[10.5px] font-medium text-[var(--muted)]">
                    {item.targetKind}
                  </span>
                </div>
                <div className="grid gap-2 text-[12px] leading-[1.45]">
                  <div>
                    <span className="mb-1 block font-medium text-[var(--muted)]">Before</span>
                    <p className="m-0 rounded-md bg-[rgba(255,255,255,0.72)] p-2 text-[var(--ink-2)]">
                      {item.originalText}
                    </p>
                  </div>
                  <div>
                    <span className="mb-1 block font-medium text-[var(--muted)]">After</span>
                    <p className="m-0 rounded-md bg-[var(--card)] p-2 text-[var(--ink)]">
                      {item.rewrittenText}
                    </p>
                  </div>
                </div>
                <p className="m-0 mt-2 text-[11.5px] leading-[1.4] text-[var(--muted)]">
                  {item.reason}
                </p>
                {item.validationNotes[0] && (
                  <p className="m-0 mt-1 text-[11.5px] leading-[1.4] text-[var(--muted-2)]">
                    {item.validationNotes[0]}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyPreview() {
  return (
    <aside className="flex min-w-0 flex-col bg-[var(--bg-2)] max-[980px]:hidden">
      <div className="flex items-center justify-between border-b border-[var(--line)] bg-[rgba(245,242,234,0.86)] px-[18px] py-3.5 backdrop-blur-[10px]">
        <div className="flex min-w-0 items-center gap-2 font-[family-name:var(--font-display)] text-sm font-medium tracking-[-0.005em] text-[var(--ink)]">
          <FileText size={14} /> Resume — preview
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3.5 p-10 text-center text-[var(--muted)]">
        <FileText className="h-[72px] w-[72px] rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-[21px] shadow-[var(--shadow-sm)]" />
        <strong className="font-[family-name:var(--font-display)] text-lg font-medium tracking-[-0.01em] text-[var(--ink)]">
          Preview will appear here
        </strong>
        <span className="max-w-[280px] text-[13.5px] leading-[1.55]">
          Add a master resume to preview it during adaptation.
        </span>
      </div>
    </aside>
  );
}

export function PreviewPane({
  originalHtml,
  adaptedHtml,
  audit,
  mode,
  onModeChange,
}: PreviewPaneProps) {
  if (!originalHtml) return <EmptyPreview />;

  const hasAdapted = Boolean(adaptedHtml);
  const safeMode = hasAdapted ? mode : "original";
  const displayedHtml = safeMode === "original" ? originalHtml : (adaptedHtml ?? originalHtml);
  const title =
    safeMode === "diff" ? "Smart diff" : safeMode === "adapted" ? "Adapted resume" : "Base resume";

  return (
    <aside className="flex min-w-0 flex-col bg-[var(--bg-2)] max-[980px]:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-[rgba(245,242,234,0.9)] px-[18px] py-3 backdrop-blur-[10px]">
        <div className="flex min-w-0 items-center gap-2 font-[family-name:var(--font-display)] text-sm font-medium tracking-[-0.005em] text-[var(--ink)]">
          <FileText size={14} /> {title}
        </div>
        <div className="inline-flex rounded-lg border border-[var(--line)] bg-[var(--bg)] p-1">
          <ModeButton
            label="Original"
            active={safeMode === "original"}
            onClick={() => onModeChange("original")}
          />
          <ModeButton
            label="Adapted"
            active={safeMode === "adapted"}
            disabled={!hasAdapted}
            onClick={() => onModeChange("adapted")}
          />
          <ModeButton
            label="Diff"
            active={safeMode === "diff"}
            disabled={!hasAdapted}
            onClick={() => onModeChange("diff")}
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-[18px]">
        {safeMode === "diff" ? (
          <div className="grid gap-4 min-[1500px]:grid-cols-[320px_minmax(0,1fr)]">
            <DiffAuditPanel audit={audit} />
            <ResumeIframe html={displayedHtml} highlightChanges />
          </div>
        ) : (
          <ResumeIframe html={displayedHtml} />
        )}
      </div>
    </aside>
  );
}
