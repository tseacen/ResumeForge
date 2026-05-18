"use client";

import { FileText } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

interface PreviewPaneProps {
  originalHtml: string | null;
}

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

function ResumeIframe({ html }: { html: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [scale, setScale] = useState(1);
  const [docHeight, setDocHeight] = useState(1000);

  const srcDoc = useMemo(() => wrapResumeHtml(html), [html]);

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

export function PreviewPane({ originalHtml }: PreviewPaneProps) {
  if (!originalHtml) {
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
            Ajoutez un CV maître pour le visualiser pendant l&apos;adaptation.
          </span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex min-w-0 flex-col bg-[var(--bg-2)] max-[980px]:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-[rgba(245,242,234,0.86)] px-[18px] py-3 backdrop-blur-[10px]">
        <div className="flex min-w-0 items-center gap-2 font-[family-name:var(--font-display)] text-sm font-medium tracking-[-0.005em] text-[var(--ink)]">
          <FileText size={14} /> CV de base
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-[22px]">
        <ResumeIframe html={originalHtml} />
      </div>
    </aside>
  );
}
