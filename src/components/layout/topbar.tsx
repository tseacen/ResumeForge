"use client";

import { Download, History, RefreshCw } from "lucide-react";

import { type AppPhase } from "@/lib/schemas/session.schema";

const smallButton =
  "inline-flex h-7 items-center justify-center gap-[5px] rounded-md border border-[var(--line)] bg-[var(--card)] px-2.5 text-[12.5px] font-medium text-[var(--ink)] shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--line-2)] hover:bg-[var(--card-2)] active:translate-y-px";
const ghostButton =
  "inline-flex h-7 items-center justify-center gap-[5px] rounded-md border border-transparent bg-transparent px-2.5 text-[12.5px] font-medium text-[var(--ink-2)] transition-colors hover:bg-[rgba(31,30,27,0.04)] active:translate-y-px";

interface TopbarProps {
  phase: AppPhase;
  title: string | null;
  canExport: boolean;
  activeModel?: string;
  onReset: () => void;
  onExport: () => void;
}

export function Topbar({ phase, title, canExport, activeModel, onReset, onExport }: TopbarProps) {
  const isSetup = phase === "setup-ai" || phase === "setup-cv";
  const displayTitle = isSetup ? "Configuration" : (title ?? "Nouvelle adaptation");
  const accent = isSetup ? "initiale" : title ? "" : "adaptation";

  return (
    <header className="flex flex-none items-center justify-between border-b border-[var(--line)] bg-[rgba(250,249,245,0.88)] px-7 py-3.5 backdrop-blur-[10px] max-[980px]:px-4 max-[980px]:py-3">
      <div className="flex min-w-0 items-center gap-3.5">
        <div className="overflow-hidden font-[family-name:var(--font-display)] text-base font-medium tracking-[-0.01em] text-ellipsis whitespace-nowrap text-[var(--ink)]">
          {displayTitle} {accent && <em className="text-[var(--accent)] italic">{accent}</em>}
        </div>
        {title && !isSetup && (
          <span className="rounded-full border border-[var(--line)] bg-[var(--bg-2)] px-[9px] py-[3px] font-[family-name:var(--font-mono)] text-xs text-[var(--muted)]">
            v3 · brouillon
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {!isSetup && activeModel && (
          <span className="mr-3 font-[family-name:var(--font-mono)] text-xs text-[var(--muted-2)]">
            via {activeModel}
          </span>
        )}
        {title && !isSetup && (
          <button className={`${ghostButton} max-[980px]:hidden`} type="button">
            <History size={13} /> Historique
          </button>
        )}
        {canExport && (
          <button className={smallButton} type="button" onClick={onExport}>
            <Download size={13} /> Exporter
          </button>
        )}
        {!isSetup && (
          <button className={smallButton} type="button" onClick={onReset}>
            <RefreshCw size={13} /> Réinitialiser
          </button>
        )}
      </div>
    </header>
  );
}
