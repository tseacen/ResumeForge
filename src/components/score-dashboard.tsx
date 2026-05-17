"use client";

import { BarChart2, Briefcase, Layers, RefreshCw, Tag, Target } from "lucide-react";
import { useEffect, useState } from "react";

import { type CompatibilityScore } from "@/lib/schemas/score.schema";

interface Props {
  score: CompatibilityScore;
}

function strokeFor(v: number): string {
  if (v >= 80) return "#10b981";
  if (v >= 60) return "#f59e0b";
  return "#ef4444";
}

function fillClass(v: number): string {
  if (v >= 80) return "green";
  if (v >= 60) return "amber";
  return "red";
}

function ScoreGauge({ value }: { value: number }) {
  const R = 84;
  const C = 2 * Math.PI * R;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setProgress(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  const offset = C - (progress / 100) * C;

  return (
    <div className="gauge-wrap">
      <div className="gauge-center">
        <div className="gauge-num">{value}</div>
        <div className="gauge-of">out of 100</div>
      </div>
      <svg width="200" height="200" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r={R} fill="none" stroke="#f4f4f6" strokeWidth="14" />
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke={strokeFor(value)}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1100ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
    </div>
  );
}

const SUB_SCORES: {
  key: keyof Pick<
    CompatibilityScore,
    "ats" | "technicalFit" | "recruiterFit" | "seniorityFit" | "marketFit"
  >;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "technicalFit", label: "Technical fit", icon: <Target size={13} /> },
  { key: "recruiterFit", label: "Recruiter fit", icon: <Briefcase size={13} /> },
  { key: "ats", label: "ATS keywords", icon: <Tag size={13} /> },
  { key: "seniorityFit", label: "Seniority fit", icon: <Layers size={13} /> },
  { key: "marketFit", label: "Market fit", icon: <BarChart2 size={13} /> },
];

const RISK_LABELS: Record<CompatibilityScore["riskLevel"], string> = {
  low: "Low risk · ready to send",
  medium: "Moderate risk · address before submission",
  high: "High risk · do not submit yet",
};

export function ScoreDashboard({ score }: Props) {
  const [showBars, setShowBars] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setShowBars(true), 150);
    return () => clearTimeout(id);
  }, []);

  const riskTone =
    score.riskLevel === "low" ? "" : score.riskLevel === "medium" ? "amber" : "red";

  return (
    <div className="dash-grid">
      {/* Gauge card */}
      <div className="g-card gauge-card">
        <div className="gauge-label">Global fit score</div>
        <ScoreGauge value={score.global} />
        <div className={`risk-pill${riskTone ? ` ${riskTone}` : ""}`}>
          <span className="rkdot" />
          {RISK_LABELS[score.riskLevel]}
        </div>
      </div>

      {/* Sub-scores card */}
      <div className="g-card subs-card">
        <div className="subs-head">
          <div>
            <div className="g-card-eyebrow">Sub-scores</div>
            <div className="g-card-title">Breakdown across five dimensions</div>
          </div>
          <button className="pill-btn ghost sm" style={{ height: 28 }} type="button">
            <RefreshCw size={12} /> Recompute
          </button>
        </div>

        {SUB_SCORES.map(({ key, label, icon }, i) => {
          const v = score[key];
          return (
            <div className="sub-row" key={key}>
              <div className="sub-label">
                <span className="lico">{icon}</span>
                {label}
              </div>
              <div className="sub-bar">
                <div
                  className={`fill ${fillClass(v)}`}
                  style={{
                    width: showBars ? `${v}%` : "0%",
                    transitionDelay: `${i * 130}ms`,
                  }}
                />
              </div>
              <div className="sub-num">{v}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
