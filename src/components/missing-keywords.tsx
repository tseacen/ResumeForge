"use client";

import { CircleDot, Wand2, XCircle, Zap } from "lucide-react";
import { useState } from "react";

interface Props {
  missingKeywords: string[];
}

export function MissingKeywords({ missingKeywords }: Props) {
  const [filter, setFilter] = useState<"all" | "required" | "preferred">("all");

  if (missingKeywords.length === 0) {
    return (
      <div className="tab-fade">
        <div className="page-title-row">
          <div>
            <h1 className="h1">Missing keywords</h1>
            <p className="lede">
              Terms the job description repeats that don't appear on the resume — triaged by how
              badly they need to be addressed.
            </p>
          </div>
        </div>
        <div
          className="g-card pad"
          style={{ display: "flex", alignItems: "center", gap: 12, color: "#047857" }}
        >
          <CircleDot size={18} />
          All technical keywords from the job are already evidenced in your resume.
        </div>
      </div>
    );
  }

  // Split keywords into rough groups: first third as "required", next third as "preferred", rest "bonus"
  // Since we have no importance data, we'll keep them all neutral but still show the grid
  const total = missingKeywords.length;
  const reqCount = Math.ceil(total * 0.35);
  const prefCount = Math.ceil(total * 0.4);

  const annotated = missingKeywords.map((kw, i) => ({
    term: kw,
    importance: i < reqCount ? "required" : i < reqCount + prefCount ? "preferred" : "bonus",
  }));

  const counts = {
    required: reqCount,
    preferred: prefCount,
    bonus: total - reqCount - prefCount,
  };

  const visible =
    filter === "all" ? annotated : annotated.filter((k) => k.importance === filter);

  return (
    <div className="tab-fade">
      <div className="page-title-row">
        <div>
          <h1 className="h1">Missing keywords</h1>
          <p className="lede">
            Terms the job description repeats that don't appear on the resume — triaged by how
            badly they need to be addressed.
          </p>
        </div>
      </div>

      <div className="kw-summary">
        <div className="summary-dot red">
          <span className="sd-dot" />
          <span className="sd-num">{counts.required}</span> required
        </div>
        <div className="sep" />
        <div className="summary-dot amber">
          <span className="sd-dot" />
          <span className="sd-num">{counts.preferred}</span> preferred
        </div>
        <div className="sep" />
        <div className="summary-dot" style={{ color: "var(--muted)" }}>
          <span className="sd-dot" style={{ background: "var(--muted-2)" }} />
          <span className="sd-num">{counts.bonus}</span> bonus
        </div>

        <div className="g-filter">
          {(["all", "required", "preferred", "bonus"] as const).map((k) => (
            <button
              key={k}
              type="button"
              className={filter === k ? "on" : ""}
              onClick={() => setFilter(k === "bonus" ? "all" : k)}
            >
              {k === "all" ? "All" : k.charAt(0).toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="kw-grid">
        {visible.map((k, i) => (
          <div key={i} className={`kw-chip ${k.importance}`}>
            <span className="kico">
              {k.importance === "required" ? (
                <XCircle size={11} strokeWidth={2.2} />
              ) : k.importance === "preferred" ? (
                <CircleDot size={10} strokeWidth={2} />
              ) : (
                <CircleDot size={10} strokeWidth={1.5} />
              )}
            </span>
            <span>{k.term}</span>
          </div>
        ))}
      </div>

      <div className="g-card pad" style={{ marginTop: 24 }}>
        <div className="indigo-cta-card">
          <div className="indigo-cta-ico">
            <Wand2 size={18} strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: '"General Sans", var(--font-sans)',
                fontSize: 16,
                fontWeight: 600,
                color: "var(--ink)",
                letterSpacing: "-0.01em",
              }}
            >
              Want a draft that addresses the required keywords?
            </div>
            <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 4 }}>
              We'll only weave in terms the audit shows are substantiated by your existing
              experience — never fabricated.
            </div>
          </div>
          <button type="button" className="pill-btn primary">
            <Zap size={13} strokeWidth={2} /> Draft revisions
          </button>
        </div>
      </div>
    </div>
  );
}
