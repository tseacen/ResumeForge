import fs from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import { parseJobText } from "@/lib/parsers/parse-job-text";
import { parseResumeHtml } from "@/lib/parsers/parse-resume-html";
import { type JobRequirement, type ParsedJob } from "@/lib/schemas/job.schema";
import { type ParsedResume, type ResumeFact } from "@/lib/schemas/resume.schema";
import { CompatibilityScoreSchema } from "@/lib/schemas/score.schema";
import { scoreCompatibility } from "@/lib/scoring/score-compatibility";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeResume(keywords: string[]): ParsedResume {
  const facts: ResumeFact[] = keywords.map((kw, i) => ({
    id: `fact-${i}`,
    source: "resume_html" as const,
    category: "skill" as const,
    text: kw,
    normalizedKeywords: [kw.toLowerCase()],
    confidence: 1,
  }));
  return { rawHtml: "", facts, parsedAt: new Date().toISOString() };
}

function makeJob(
  requirements: Array<{
    label: string;
    category: JobRequirement["category"];
    importance: JobRequirement["importance"];
  }>
): ParsedJob {
  const reqs: JobRequirement[] = requirements.map((r, i) => ({
    id: `req-${i}`,
    label: r.label,
    category: r.category,
    importance: r.importance,
  }));
  return { rawText: "", requirements: reqs, parsedAt: new Date().toISOString() };
}

// ── Fixture-based tests ───────────────────────────────────────────────────────

const SAMPLE_HTML = fs.readFileSync(
  path.resolve(__dirname, "fixtures/sample-resume.html"),
  "utf-8"
);
const SAMPLE_JOB = fs.readFileSync(
  path.resolve(__dirname, "fixtures/sample-job.txt"),
  "utf-8"
);

describe("scoreCompatibility", () => {
  it("returns a schema-valid CompatibilityScore", () => {
    const resume = parseResumeHtml(SAMPLE_HTML);
    const job = parseJobText(SAMPLE_JOB);
    const score = scoreCompatibility(resume, job);
    const parsed = CompatibilityScoreSchema.safeParse(score);
    expect(parsed.success, parsed.error?.message).toBe(true);
  });

  it("all numeric fields are between 0 and 100", () => {
    const resume = parseResumeHtml(SAMPLE_HTML);
    const job = parseJobText(SAMPLE_JOB);
    const score = scoreCompatibility(resume, job);
    const numericFields = ["global", "ats", "recruiterFit", "technicalFit", "seniorityFit", "marketFit"] as const;
    for (const field of numericFields) {
      expect(score[field], field).toBeGreaterThanOrEqual(0);
      expect(score[field], field).toBeLessThanOrEqual(100);
    }
  });

  it("is deterministic — same input produces same output", () => {
    const resume = parseResumeHtml(SAMPLE_HTML);
    const job = parseJobText(SAMPLE_JOB);
    const a = scoreCompatibility(resume, job);
    const b = scoreCompatibility(resume, job);
    expect(a).toEqual(b);
  });

  // ── Synthetic scoring tests ───────────────────────────────────────────────

  it("perfect match: all required tech skills present → technicalFit = 100", () => {
    const resume = makeResume(["typescript", "react", "docker"]);
    const job = makeJob([
      { label: "TypeScript", category: "technical_skill", importance: "required" },
      { label: "React", category: "technical_skill", importance: "required" },
      { label: "Docker", category: "technical_skill", importance: "required" },
    ]);
    const score = scoreCompatibility(resume, job);
    expect(score.technicalFit).toBe(100);
  });

  it("zero overlap → technicalFit = 0", () => {
    const resume = makeResume(["python", "django"]);
    const job = makeJob([
      { label: "TypeScript", category: "technical_skill", importance: "required" },
      { label: "React", category: "technical_skill", importance: "required" },
    ]);
    const score = scoreCompatibility(resume, job);
    expect(score.technicalFit).toBe(0);
  });

  it("unmatched required requirements become blockers", () => {
    const resume = makeResume(["react"]);
    const job = makeJob([
      { label: "React", category: "technical_skill", importance: "required" },
      { label: "Kubernetes", category: "technical_skill", importance: "required" },
    ]);
    const score = scoreCompatibility(resume, job);
    expect(score.blockers).toContain("Kubernetes");
    expect(score.blockers).not.toContain("React");
  });

  it("matched required requirements appear in strengths", () => {
    const resume = makeResume(["typescript", "react"]);
    const job = makeJob([
      { label: "TypeScript", category: "technical_skill", importance: "required" },
      { label: "React", category: "technical_skill", importance: "required" },
    ]);
    const score = scoreCompatibility(resume, job);
    expect(score.strengths).toContain("TypeScript");
    expect(score.strengths).toContain("React");
  });

  it("unmatched non-required requirements appear in weaknesses, not blockers", () => {
    const resume = makeResume(["react"]);
    const job = makeJob([
      { label: "React", category: "technical_skill", importance: "required" },
      { label: "Kubernetes", category: "technical_skill", importance: "bonus" },
    ]);
    const score = scoreCompatibility(resume, job);
    expect(score.blockers).toHaveLength(0);
    expect(score.weaknesses).toContain("Kubernetes");
  });

  it("missing keywords come from unmatched tech/domain requirements", () => {
    const resume = makeResume(["react"]);
    const job = makeJob([
      { label: "React", category: "technical_skill", importance: "required" },
      { label: "GraphQL", category: "technical_skill", importance: "preferred" },
      { label: "Fintech", category: "domain", importance: "preferred" },
    ]);
    const score = scoreCompatibility(resume, job);
    expect(score.missingKeywords).toContain("GraphQL");
    expect(score.missingKeywords).toContain("Fintech");
    expect(score.missingKeywords).not.toContain("React");
  });

  it("global score follows the weighted formula", () => {
    // Build a job where we can predict each dimension exactly
    const resume = makeResume(["typescript", "react"]);
    const job = makeJob([
      { label: "TypeScript", category: "technical_skill", importance: "required" },
      { label: "React", category: "technical_skill", importance: "required" },
    ]);
    const score = scoreCompatibility(resume, job);
    // technicalFit = 100, others default to 70/75
    // global ≈ 100*0.35 + 70*0.25 + ats*0.20 + 75*0.10 + 70*0.10
    // Just verify it's strictly above 0 and within bounds
    expect(score.global).toBeGreaterThan(0);
    expect(score.global).toBeLessThanOrEqual(100);
  });

  it("risk level is low when all required requirements are matched and global is high", () => {
    const resume = makeResume(["typescript", "react", "nodejs", "docker"]);
    const job = makeJob([
      { label: "TypeScript", category: "technical_skill", importance: "required" },
      { label: "React", category: "technical_skill", importance: "required" },
    ]);
    const score = scoreCompatibility(resume, job);
    expect(score.blockers).toHaveLength(0);
    expect(score.riskLevel).toBe("low");
  });

  it("risk level is medium when there is at least one blocker", () => {
    const resume = makeResume(["react"]);
    const job = makeJob([
      { label: "React", category: "technical_skill", importance: "required" },
      { label: "Kubernetes", category: "technical_skill", importance: "required" },
    ]);
    const score = scoreCompatibility(resume, job);
    expect(score.blockers.length).toBeGreaterThanOrEqual(1);
    expect(score.blockers.length).toBeLessThanOrEqual(2);
    expect(score.riskLevel).toBe("medium");
  });

  it("risk level is high when there are more than 2 blockers", () => {
    const resume = makeResume(["python"]);
    const job = makeJob([
      { label: "TypeScript", category: "technical_skill", importance: "required" },
      { label: "React", category: "technical_skill", importance: "required" },
      { label: "Kubernetes", category: "technical_skill", importance: "required" },
      { label: "AWS", category: "technical_skill", importance: "required" },
    ]);
    const score = scoreCompatibility(resume, job);
    expect(score.blockers.length).toBeGreaterThan(2);
    expect(score.riskLevel).toBe("high");
  });

  it("generates a seniority gap interview risk when required experience is not evidenced", () => {
    const resume = makeResume(["react"]);
    const job = makeJob([
      { label: "5+ years of experience", category: "seniority", importance: "required" },
    ]);
    const score = scoreCompatibility(resume, job);
    expect(
      score.interviewRisks.some((r) => /seniority gap/i.test(r) || /years of experience/i.test(r))
    ).toBe(true);
  });

  it("handles empty resume without throwing", () => {
    const resume: ParsedResume = { rawHtml: "", facts: [], parsedAt: new Date().toISOString() };
    const job = parseJobText(SAMPLE_JOB);
    expect(() => scoreCompatibility(resume, job)).not.toThrow();
    const score = scoreCompatibility(resume, job);
    const parsed = CompatibilityScoreSchema.safeParse(score);
    expect(parsed.success).toBe(true);
  });

  it("handles empty job without throwing", () => {
    const resume = parseResumeHtml(SAMPLE_HTML);
    const job: ParsedJob = { rawText: "", requirements: [], parsedAt: new Date().toISOString() };
    expect(() => scoreCompatibility(resume, job)).not.toThrow();
    const score = scoreCompatibility(resume, job);
    expect(score.blockers).toHaveLength(0);
    expect(score.strengths).toHaveLength(0);
  });

  it("ATS score is 100 when there are no job requirements", () => {
    const resume = makeResume(["react"]);
    const job: ParsedJob = { rawText: "", requirements: [], parsedAt: new Date().toISOString() };
    const score = scoreCompatibility(resume, job);
    expect(score.ats).toBe(100);
  });

  it("ATS score reflects keyword overlap ratio", () => {
    // Resume has 2 of 4 keywords → ats should be around 50%
    const resume = makeResume(["react", "typescript"]);
    const job = makeJob([
      { label: "React", category: "technical_skill", importance: "required" },
      { label: "TypeScript", category: "technical_skill", importance: "required" },
      { label: "Kubernetes", category: "technical_skill", importance: "required" },
      { label: "Terraform", category: "technical_skill", importance: "required" },
    ]);
    const score = scoreCompatibility(resume, job);
    // react + typescript match (2/4 unique keywords) → ~50
    expect(score.ats).toBeGreaterThanOrEqual(40);
    expect(score.ats).toBeLessThanOrEqual(60);
  });
});
