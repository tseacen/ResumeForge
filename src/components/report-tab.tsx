import { AlertTriangle, Check, XCircle } from "lucide-react";

import { ScoreDashboard } from "@/components/score-dashboard";
import { type ParsedJob } from "@/lib/schemas/job.schema";
import { type CompatibilityScore } from "@/lib/schemas/score.schema";

interface Props {
  score: CompatibilityScore;
  job: ParsedJob;
}

function ItemRow({ tone, text }: { tone: "green" | "amber" | "red"; text: string }) {
  return (
    <div className={`item-row ${tone}`}>
      <div className="iico">
        {tone === "green" && <Check size={12} strokeWidth={2.4} />}
        {tone === "amber" && <AlertTriangle size={12} strokeWidth={2.2} />}
        {tone === "red" && <XCircle size={12} strokeWidth={2} />}
      </div>
      <div className="it-text">{text}</div>
    </div>
  );
}

function BannerList({
  tone,
  title,
  sub,
  items,
}: {
  tone: "red" | "orange";
  title: string;
  sub: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <div className={`banner ${tone}`}>
        <div className="bn-icon">
          {tone === "red" ? <XCircle size={18} strokeWidth={2} /> : <AlertTriangle size={18} strokeWidth={2} />}
        </div>
        <div>
          <div className="bn-title">{title}</div>
          <div className="bn-sub">{sub}</div>
        </div>
        <span className="bn-count">{items.length}</span>
      </div>
      {items.map((item, i) => (
        <div key={i} className="item-row red" style={{ borderRadius: 8, marginBottom: 8 }}>
          <div className="iico">
            {tone === "red"
              ? <XCircle size={12} strokeWidth={2} />
              : <AlertTriangle size={12} strokeWidth={2.2} />}
          </div>
          <div className="it-text">{item}</div>
        </div>
      ))}
    </div>
  );
}

export function ReportTab({ score, job }: Props) {
  const jobLine = [job.title, job.company].filter(Boolean).join(" at ");

  return (
    <div className="tab-fade">
      <div className="page-title-row">
        <div>
          <h1 className="h1">Fit report</h1>
          <p className="lede">
            {jobLine
              ? `How this resume reads against ${jobLine} — strengths to lean into, weaknesses to address, and what's blocking submission.`
              : "The headline of how this resume reads against the job — strengths to lean into, weaknesses to address, and what's blocking submission."}
          </p>
        </div>
      </div>

      <ScoreDashboard score={score} />

      <div className="two-col" style={{ marginBottom: 20 }}>
        <div className="g-card pad">
          <div className="col-head">
            <div className="col-title">
              <span className="col-icon green">
                <Check size={14} strokeWidth={2.2} />
              </span>
              Strengths
            </div>
            <span className="col-count">{score.strengths.length}</span>
          </div>
          {score.strengths.length === 0 ? (
            <p style={{ fontSize: 14, color: "var(--muted)" }}>No strengths detected.</p>
          ) : (
            score.strengths.map((s, i) => <ItemRow key={i} tone="green" text={s} />)
          )}
        </div>

        <div className="g-card pad">
          <div className="col-head">
            <div className="col-title">
              <span className="col-icon amber">
                <AlertTriangle size={14} strokeWidth={2.2} />
              </span>
              Weaknesses
            </div>
            <span className="col-count">{score.weaknesses.length}</span>
          </div>
          {score.weaknesses.length === 0 ? (
            <p style={{ fontSize: 14, color: "var(--muted)" }}>All preferred requirements are covered.</p>
          ) : (
            score.weaknesses.map((w, i) => <ItemRow key={i} tone="amber" text={w} />)
          )}
        </div>
      </div>

      <BannerList
        tone="red"
        title="Blockers"
        sub="Will likely kill the application if not addressed before submission."
        items={score.blockers}
      />

      <BannerList
        tone="orange"
        title="Interview risks"
        sub="Likely-to-come-up topics where this resume needs a rehearsed answer."
        items={score.interviewRisks}
      />
    </div>
  );
}
