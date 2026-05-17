"use client";

import { Download, ExternalLink, FileText } from "lucide-react";

import { type CvDocument, type CvLine } from "@/lib/schemas/cv-document.schema";

const iconButton =
  "grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] hover:bg-[rgba(31,30,27,0.06)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50";
const previewTab =
  "rounded-md px-[11px] py-[5px] text-xs font-medium text-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-40";

interface PreviewPaneProps {
  original: CvDocument | null;
  adapted: CvDocument | null;
  mode: "original" | "adapted" | "diff";
  adaptedReady: boolean;
  onModeChange: (mode: "original" | "adapted" | "diff") => void;
  onExport: () => void;
}

function lineTextForMode(line: CvLine, mode: PreviewPaneProps["mode"]) {
  if (mode === "original") return line.originalText ?? line.text;
  return line.text;
}

function CvLineView({ line, mode }: { line: CvLine; mode: PreviewPaneProps["mode"] }) {
  if (mode === "original" && line.status === "added") return null;

  if (mode === "diff" && line.originalText && line.originalText !== line.text) {
    return (
      <li className="rf-paper-diff">
        <span className="removed">{line.originalText}</span>
        <span className="added">{line.text}</span>
      </li>
    );
  }

  return <li className={mode !== "original" ? line.status : ""}>{lineTextForMode(line, mode)}</li>;
}

function CVPaper({ document, mode }: { document: CvDocument; mode: PreviewPaneProps["mode"] }) {
  return (
    <article className="rf-paper">
      <header>
        <h1>{document.name}</h1>
        {document.headline && <p className="rf-paper-title">{document.headline}</p>}
        {document.contact.length > 0 && (
          <p className="rf-paper-contact">{document.contact.join(" · ")}</p>
        )}
      </header>
      {document.sections.map((section) => (
        <section key={section.id}>
          <h2>{section.title}</h2>
          {section.kind === "summary" || section.kind === "skills" ? (
            <div>
              {section.lines.map((line) => {
                if (mode === "diff" && line.originalText && line.originalText !== line.text) {
                  return (
                    <div className="rf-paper-diff" key={line.id}>
                      <span className="removed">{line.originalText}</span>
                      <span className="added">{line.text}</span>
                    </div>
                  );
                }
                return (
                  <p className={mode !== "original" ? line.status : ""} key={line.id}>
                    {lineTextForMode(line, mode)}
                  </p>
                );
              })}
            </div>
          ) : (
            <ul>
              {section.lines.map((line) => (
                <CvLineView key={line.id} line={line} mode={mode} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </article>
  );
}

export function PreviewPane({
  original,
  adapted,
  mode,
  adaptedReady,
  onModeChange,
  onExport,
}: PreviewPaneProps) {
  const visibleDocument = mode === "adapted" || mode === "diff" ? (adapted ?? original) : original;

  if (!visibleDocument) {
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

  return (
    <aside className="flex min-w-0 flex-col bg-[var(--bg-2)] max-[980px]:hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[rgba(245,242,234,0.86)] px-[18px] py-3.5 backdrop-blur-[10px]">
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
            Diff
          </button>
        </div>
        <div className="flex gap-1">
          <button
            className={iconButton}
            type="button"
            onClick={onExport}
            disabled={!adaptedReady}
            title="Télécharger"
          >
            <Download size={14} />
          </button>
          <button className={iconButton} type="button" disabled title="Ouvrir">
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-[22px]">
        <CVPaper document={visibleDocument} mode={mode} />
      </div>
    </aside>
  );
}
