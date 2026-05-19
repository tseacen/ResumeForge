"use client";

import { Edit3, Settings, Trash2 } from "lucide-react";

import { createTranslator, type AppLocale } from "@/lib/i18n";
import { type AdaptationSessionSummary } from "@/lib/schemas/session.schema";

const sidebarRow =
  "group relative flex w-full items-stretch rounded-[7px] transition-colors hover:bg-[rgba(31,30,27,0.04)]";
const activeSidebarRow = "bg-[var(--accent-soft)] [&_.session-title]:text-[var(--accent)]";
const sidebarLink =
  "flex min-w-0 flex-1 flex-col gap-px rounded-[7px] px-2.5 py-2 text-left text-[var(--ink-2)] focus:outline-none";

interface SidebarProps {
  locale: AppLocale;
  sessions: AdaptationSessionSummary[];
  activeSessionId: string | null;
  onNewSession: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onOpenSettings: () => void;
}

function groupLabel(dateIso: string, locale: AppLocale): string {
  const t = createTranslator(locale);
  const date = new Date(dateIso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return t("sidebar.today");
  if (date.toDateString() === yesterday.toDateString()) return t("sidebar.yesterday");
  return t("sidebar.thisWeek");
}

export function Sidebar({
  locale,
  sessions,
  activeSessionId,
  onNewSession,
  onSelectSession,
  onDeleteSession,
  onOpenSettings,
}: SidebarProps) {
  const t = createTranslator(locale);
  const grouped = sessions.reduce<Record<string, AdaptationSessionSummary[]>>((acc, session) => {
    const label = groupLabel(session.updatedAt, locale);
    acc[label] = [...(acc[label] ?? []), session];
    return acc;
  }, {});

  return (
    <aside className="sticky top-0 flex h-screen flex-col overflow-hidden border-r border-[var(--line)] bg-[var(--bg-2)] max-[980px]:hidden">
      <div className="flex items-center gap-2.5 px-4 pt-[18px] pb-3">
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
        <span className="flex-1 overflow-hidden text-left text-ellipsis">
          {t("sidebar.newAdaptation")}
        </span>
        <span className="rounded border border-[var(--line)] bg-[var(--bg-2)] px-1.5 py-px font-[family-name:var(--font-mono)] text-[10.5px] text-[var(--muted)] max-[1080px]:hidden">
          ⌘ N
        </span>
      </button>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {Object.entries(grouped).length === 0 && (
          <div className="px-2.5 py-[18px] text-[12.5px] text-[var(--muted)]">
            {t("sidebar.empty")}
          </div>
        )}
        {Object.entries(grouped).map(([day, items]) => (
          <div key={day}>
            <div className="px-2 pt-3.5 pb-1 text-[11.5px] font-medium text-[var(--muted-2)]">
              {day}
            </div>
            {items.map((session) => (
              <div
                key={session.id}
                className={`${sidebarRow} ${session.id === activeSessionId ? activeSidebarRow : ""}`}
              >
                <button
                  className={sidebarLink}
                  type="button"
                  onClick={() => onSelectSession(session.id)}
                >
                  <div className="session-title block max-w-full truncate pr-7 text-[13px] leading-[1.35] font-medium text-[var(--ink-2)]">
                    {session.title}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted-2)]">
                    {session.score != null && (
                      <span className="font-[family-name:var(--font-mono)] text-[10.5px] text-[var(--success)]">
                        {session.score}/100
                      </span>
                    )}
                    <span>·</span>
                    <span>
                      {session.status === "adapted"
                        ? t("sidebar.status.adapted")
                        : t("sidebar.status.diagnosis")}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  className="absolute top-1/2 right-1.5 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-[var(--muted)] opacity-0 transition-opacity hover:bg-[rgba(181,57,47,0.12)] hover:text-[var(--danger)] focus:opacity-100 group-hover:opacity-100"
                  title={t("sidebar.deleteTitle")}
                  aria-label={t("sidebar.deleteAria", { title: session.title })}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (window.confirm(t("sidebar.deleteConfirm", { title: session.title }))) {
                      onDeleteSession(session.id);
                    }
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
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
              {t("sidebar.localSession")}
            </div>
            <div className="text-[11px] text-[var(--muted)]">{t("sidebar.localData")}</div>
          </div>
        </div>
        <button
          className="grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] hover:bg-[rgba(31,30,27,0.06)] hover:text-[var(--ink)]"
          type="button"
          title={t("sidebar.settings")}
          onClick={onOpenSettings}
        >
          <Settings size={16} />
        </button>
      </div>
    </aside>
  );
}
