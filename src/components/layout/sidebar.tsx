"use client";

import { Edit3, Settings, Sparkles } from "lucide-react";

import { type AdaptationSessionSummary } from "@/lib/schemas/session.schema";

const sidebarLink =
  "flex w-full flex-col gap-px rounded-[7px] px-2.5 py-2 text-left text-[var(--ink-2)] transition-colors hover:bg-[rgba(31,30,27,0.04)]";
const activeSidebarLink = "bg-[var(--accent-soft)] [&_.session-title]:text-[var(--accent)]";

interface SidebarProps {
  sessions: AdaptationSessionSummary[];
  activeSessionId: string | null;
  onNewSession: () => void;
  onSelectSession: (id: string) => void;
  onOpenSettings: () => void;
}

function groupLabel(dateIso: string): string {
  const date = new Date(dateIso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === yesterday.toDateString()) return "Hier";
  return "Cette semaine";
}

export function Sidebar({
  sessions,
  activeSessionId,
  onNewSession,
  onSelectSession,
  onOpenSettings,
}: SidebarProps) {
  const grouped = sessions.reduce<Record<string, AdaptationSessionSummary[]>>((acc, session) => {
    const label = groupLabel(session.updatedAt);
    acc[label] = [...(acc[label] ?? []), session];
    return acc;
  }, {});

  return (
    <aside className="sticky top-0 flex h-screen flex-col overflow-hidden border-r border-[var(--line)] bg-[var(--bg-2)] max-[980px]:hidden">
      <div className="flex items-center gap-2.5 px-4 pt-[18px] pb-3">
        <div className="grid h-[30px] w-[30px] flex-none place-items-center rounded-lg bg-[var(--ink)] text-[var(--bg)]">
          <Sparkles size={15} strokeWidth={1.8} />
        </div>
        <div className="font-[family-name:var(--font-display)] text-[17px] font-medium tracking-[-0.015em] text-[var(--ink)]">
          Resume<em className="font-medium text-[var(--accent)] italic">Forge</em>
        </div>
      </div>

      <button
        className="mx-3 mt-1 mb-4 flex items-center gap-2.5 rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-3 py-[9px] text-[13.5px] font-medium whitespace-nowrap text-[var(--ink)] shadow-[var(--shadow-sm)] transition-colors duration-150 hover:border-[var(--line-2)] hover:bg-[var(--card-2)] active:translate-y-px"
        type="button"
        onClick={onNewSession}
      >
        <Edit3 size={15} />
        <span className="flex-1 overflow-hidden text-left text-ellipsis">Nouvelle adaptation</span>
        <span className="rounded border border-[var(--line)] bg-[var(--bg-2)] px-1.5 py-px font-[family-name:var(--font-mono)] text-[10.5px] text-[var(--muted)] max-[1080px]:hidden">
          ⌘ N
        </span>
      </button>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {Object.entries(grouped).length === 0 && (
          <div className="px-2.5 py-[18px] text-[12.5px] text-[var(--muted)]">
            Vos adaptations récentes apparaîtront ici.
          </div>
        )}
        {Object.entries(grouped).map(([day, items]) => (
          <div key={day}>
            <div className="px-2 pt-3.5 pb-1 text-[11.5px] font-medium text-[var(--muted-2)]">
              {day}
            </div>
            {items.map((session) => (
              <button
                key={session.id}
                className={`${sidebarLink} ${session.id === activeSessionId ? activeSidebarLink : ""}`}
                type="button"
                onClick={() => onSelectSession(session.id)}
              >
                <div className="session-title overflow-hidden text-[13px] leading-[1.35] font-medium text-ellipsis whitespace-nowrap text-[var(--ink-2)]">
                  {session.title}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted-2)]">
                  {session.score != null && (
                    <span className="font-[family-name:var(--font-mono)] text-[10.5px] text-[var(--success)]">
                      {session.score}/100
                    </span>
                  )}
                  <span>·</span>
                  <span>{session.status === "adapted" ? "Adapté" : "Diagnostic"}</span>
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2.5 border-t border-[var(--line)] p-2.5 px-3">
        <div className="flex flex-1 cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-[rgba(31,30,27,0.04)]">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-[var(--accent)] font-[family-name:var(--font-display)] text-xs font-semibold text-white">
            A
          </div>
          <div>
            <div className="text-[13px] leading-[1.2] font-medium text-[var(--ink)]">
              Local session
            </div>
            <div className="text-[11px] text-[var(--muted)]">Données locales</div>
          </div>
        </div>
        <button
          className="grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] hover:bg-[rgba(31,30,27,0.06)] hover:text-[var(--ink)]"
          type="button"
          title="Réglages"
          onClick={onOpenSettings}
        >
          <Settings size={16} />
        </button>
      </div>
    </aside>
  );
}
