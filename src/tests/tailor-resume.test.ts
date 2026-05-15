import fs from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import { parseJobText } from "@/lib/parsers/parse-job-text";
import { parseResumeHtml } from "@/lib/parsers/parse-resume-html";
import { type ParsedJob } from "@/lib/schemas/job.schema";
import { type ParsedResume } from "@/lib/schemas/resume.schema";
import { tailorResume } from "@/lib/tailoring/tailor-resume";

const SAMPLE_HTML = fs.readFileSync(
  path.resolve(__dirname, "fixtures/sample-resume.html"),
  "utf-8"
);
const SAMPLE_JOB = fs.readFileSync(
  path.resolve(__dirname, "fixtures/sample-job.txt"),
  "utf-8"
);

describe("tailorResume", () => {
  it("returns an object with html and audits", () => {
    const resume = parseResumeHtml(SAMPLE_HTML);
    const job = parseJobText(SAMPLE_JOB);
    const result = tailorResume(resume, job);
    expect(result).toHaveProperty("html");
    expect(result).toHaveProperty("audits");
    expect(typeof result.html).toBe("string");
    expect(Array.isArray(result.audits)).toBe(true);
  });

  it("html is non-empty", () => {
    const resume = parseResumeHtml(SAMPLE_HTML);
    const job = parseJobText(SAMPLE_JOB);
    const { html } = tailorResume(resume, job);
    expect(html.length).toBeGreaterThan(100);
  });

  it("html contains the candidate name", () => {
    const resume = parseResumeHtml(SAMPLE_HTML);
    const job = parseJobText(SAMPLE_JOB);
    const { html } = tailorResume(resume, job);
    expect(html).toContain("Jane Doe");
  });

  it("html contains experience content", () => {
    const resume = parseResumeHtml(SAMPLE_HTML);
    const job = parseJobText(SAMPLE_JOB);
    const { html } = tailorResume(resume, job);
    expect(html.toLowerCase()).toContain("experience");
  });

  it("html contains skills content", () => {
    const resume = parseResumeHtml(SAMPLE_HTML);
    const job = parseJobText(SAMPLE_JOB);
    const { html } = tailorResume(resume, job);
    expect(html.toLowerCase()).toContain("skills");
  });

  it("html does not contain raw '<script>' tags (no XSS)", () => {
    const maliciousResume: ParsedResume = {
      rawHtml: "",
      facts: [
        {
          id: "xss-test",
          source: "resume_html",
          category: "identity",
          text: '<script>alert("xss")</script>',
          normalizedKeywords: [],
          confidence: 1,
        },
      ],
      parsedAt: new Date().toISOString(),
    };
    const job: ParsedJob = { rawText: "", requirements: [], parsedAt: new Date().toISOString() };
    const { html } = tailorResume(maliciousResume, job);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("all audit changeIds are unique", () => {
    const resume = parseResumeHtml(SAMPLE_HTML);
    const job = parseJobText(SAMPLE_JOB);
    const { audits } = tailorResume(resume, job);
    const ids = audits.map((a) => a.changeId);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it("all audit classifications are valid schema values", () => {
    const resume = parseResumeHtml(SAMPLE_HTML);
    const job = parseJobText(SAMPLE_JOB);
    const { audits } = tailorResume(resume, job);
    const valid = new Set(["proven", "rewritten", "inferred_safe", "needs_user_validation", "blocked"]);
    for (const a of audits) {
      expect(valid.has(a.classification), `unexpected classification: ${a.classification}`).toBe(true);
    }
  });

  it("all audit sourceFactIds reference real facts in the resume (or are empty for blocked)", () => {
    const resume = parseResumeHtml(SAMPLE_HTML);
    const job = parseJobText(SAMPLE_JOB);
    const { audits } = tailorResume(resume, job);
    const validIds = new Set(resume.facts.map((f) => f.id));
    for (const a of audits) {
      if (a.classification === "blocked") continue; // blocked items intentionally have no source
      for (const id of a.sourceFactIds) {
        expect(validIds.has(id), `audit "${a.changeId}" references unknown fact id "${id}"`).toBe(true);
      }
    }
  });

  it("blocked audits document required skills absent from the resume", () => {
    const resume = parseResumeHtml(SAMPLE_HTML);
    const job = parseJobText(SAMPLE_JOB);
    const { audits } = tailorResume(resume, job);
    const blocked = audits.filter((a) => a.classification === "blocked");
    // Every blocked item should reference a required tech skill not in resume
    for (const b of blocked) {
      expect(b.targetSection).toBe("skills");
      expect(b.risk).toBe("high");
    }
  });

  it("rewritten audits have low risk and valid source fact IDs", () => {
    const resume = parseResumeHtml(SAMPLE_HTML);
    const job = parseJobText(SAMPLE_JOB);
    const { audits } = tailorResume(resume, job);
    const rewritten = audits.filter((a) => a.classification === "rewritten");
    const validIds = new Set(resume.facts.map((f) => f.id));
    for (const a of rewritten) {
      expect(a.risk).toBe("low");
      expect(a.sourceFactIds.every((id) => validIds.has(id))).toBe(true);
    }
  });

  it("is deterministic — same input produces the same html structure", () => {
    const resume = parseResumeHtml(SAMPLE_HTML);
    const job = parseJobText(SAMPLE_JOB);
    // nanoid makes changeIds different, but HTML content should be identical
    const { html: html1 } = tailorResume(resume, job);
    const { html: html2 } = tailorResume(resume, job);
    expect(html1).toBe(html2);
  });

  it("handles empty resume without throwing", () => {
    const resume: ParsedResume = { rawHtml: "", facts: [], parsedAt: new Date().toISOString() };
    const job = parseJobText(SAMPLE_JOB);
    expect(() => tailorResume(resume, job)).not.toThrow();
    const { html, audits } = tailorResume(resume, job);
    expect(typeof html).toBe("string");
    expect(audits).toBeDefined();
  });

  it("handles empty job without throwing", () => {
    const resume = parseResumeHtml(SAMPLE_HTML);
    const job: ParsedJob = { rawText: "", requirements: [], parsedAt: new Date().toISOString() };
    expect(() => tailorResume(resume, job)).not.toThrow();
    const { audits } = tailorResume(resume, job);
    // No required tech skills → no blocked audits
    expect(audits.filter((a) => a.classification === "blocked")).toHaveLength(0);
  });
});
