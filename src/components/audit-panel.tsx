"use client";

import { useState } from "react";

import { type ResumeChangeAudit } from "@/lib/schemas/audit.schema";
import { type AuditReport } from "@/lib/tailoring/audit-generated-resume";

interface Props {
  audits: ResumeChangeAudit[];
  auditReport: AuditReport;
}

type Classification = ResumeChangeAudit["classification"];

const CLASS_LABEL: Record<Classification, string> = {
  proven: "Proven",
  rewritten: "Rewritten",
  inferred_safe: "Inferred safe",
  needs_user_validation: "Needs validation",
  blocked: "Blocked",
};

const CLASS_TONE: Record<Classification, string> = {
  proven: "green",
  rewritten: "blue",
  inferred_safe: "blue",
  needs_user_validation: "amber",
  blocked: "red",
};

const RISK_TONE: Record<ResumeChangeAudit["risk"], string> = {
  low: "muted",
  medium: "amber",
  high: "red",
};

type FilterKey = "all" | Classification;

export function AuditPanel({ audits, auditReport }: Props) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const counts = audits.reduce(
    (acc, a) => {
      acc[a.classification] = (acc[a.classification] ?? 0) + 1;
      return acc;
    },
    {} as Partial<Record<Classification, number>>
  );

  const visible =
    filter === "all" ? audits : audits.filter((a) => a.classification === filter);

  const filterOptions: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "proven", label: "Proven" },
    { key: "rewritten", label: "Rewritten" },
    { key: "inferred_safe", label: "Inferred" },
    { key: "needs_user_validation", label: "Validation" },
    { key: "blocked", label: "Blocked" },
  ];

  return (
    <div className="tab-fade">
      <div className="page-title-row">
        <div>
          <h1 className="h1">Audit trail</h1>
          <p className="lede">
            Every change the agent made, every line it kept, and every claim it could not verify.
            No silent rewrites.
          </p>
        </div>
      </div>

      <div className="audit-summary">
        <div className="summary-dot green">
          <span className="sd-dot" />
          <span className="sd-num">{counts.proven ?? 0}</span> proven
        </div>
        <div className="sep" />
        <div className="summary-dot blue">
          <span className="sd-dot" />
          <span className="sd-num">{(counts.rewritten ?? 0) + (counts.inferred_safe ?? 0)}</span> rewritten
        </div>
        <div className="sep" />
        <div className="summary-dot amber">
          <span className="sd-dot" />
          <span className="sd-num">{counts.needs_user_validation ?? 0}</span> needs validation
        </div>
        <div className="sep" />
        <div className="summary-dot red">
          <span className="sd-dot" />
          <span className="sd-num">{counts.blocked ?? 0}</span> blocked
        </div>

        <div className="g-filter">
          {filterOptions.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={filter === key ? "on" : ""}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 && (
        <div className="g-card pad" style={{ textAlign: "center", color: "var(--muted)" }}>
          Nothing matches that filter.
        </div>
      )}

      {visible.map((item) => (
        <div key={item.changeId} className={`audit-row ${item.classification}`}>
          <div className="audit-bar" />
          <div className="audit-body">
            <div className="audit-top">
              <span className="chip">{item.targetSection}</span>
              <span className={`chip ${CLASS_TONE[item.classification]}`}>
                <span className="cdot" />
                {CLASS_LABEL[item.classification]}
              </span>
              <span className={`chip ${RISK_TONE[item.risk]}`}>
                risk · {item.risk}
              </span>
            </div>
            <div className="audit-reason">{item.reason}</div>
            {item.originalText && (
              <div className="audit-original">Was: {item.originalText.slice(0, 120)}{item.originalText.length > 120 ? "…" : ""}</div>
            )}
          </div>
        </div>
      ))}

      {!auditReport.isClean && auditReport.blockedItems.length > 0 && (
        <div
          className="g-card pad"
          style={{
            marginTop: 24,
            borderColor: "rgba(239,68,68,0.25)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
              {auditReport.blockedItems.length} claim
              {auditReport.blockedItems.length !== 1 ? "s" : ""} blocked
            </div>
            <div style={{ fontSize: 14, color: "var(--muted)" }}>
              These could not be added — not evidenced in the original resume. Review them before
              sending.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
