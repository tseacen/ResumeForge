import fs from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import { parseJobText } from "@/lib/parsers/parse-job-text";
import { ParsedJobSchema } from "@/lib/schemas/job.schema";

const SAMPLE_JOB = fs.readFileSync(
  path.resolve(__dirname, "fixtures/sample-job.txt"),
  "utf-8"
);

describe("parseJobText", () => {
  it("returns a schema-valid ParsedJob", () => {
    const result = parseJobText(SAMPLE_JOB);
    const parsed = ParsedJobSchema.safeParse(result);
    expect(parsed.success, parsed.error?.message).toBe(true);
  });

  it("detects the job title", () => {
    const result = parseJobText(SAMPLE_JOB);
    expect(result.title).toBeDefined();
    expect(result.title).toContain("Senior Full-Stack Engineer");
  });

  it("detects the company name", () => {
    const result = parseJobText(SAMPLE_JOB);
    expect(result.company).toBeDefined();
    expect(result.company).toContain("TechCorp");
  });

  it("extracts requirements from the Requirements section", () => {
    const result = parseJobText(SAMPLE_JOB);
    const labels = result.requirements.map((r) => r.label.toLowerCase());
    expect(labels.some((l) => l.includes("typescript"))).toBe(true);
    expect(labels.some((l) => l.includes("node"))).toBe(true);
  });

  it("classifies TypeScript as a technical_skill", () => {
    const result = parseJobText(SAMPLE_JOB);
    const ts = result.requirements.find((r) => /typescript/i.test(r.label));
    expect(ts?.category).toBe("technical_skill");
  });

  it("classifies experience years as seniority", () => {
    const result = parseJobText(SAMPLE_JOB);
    const seniority = result.requirements.find(
      (r) => r.category === "seniority" && /5\+?\s*years/i.test(r.label)
    );
    expect(seniority).toBeDefined();
  });

  it("marks Requirements section items as required", () => {
    const result = parseJobText(SAMPLE_JOB);
    const required = result.requirements.filter((r) => r.importance === "required");
    expect(required.length).toBeGreaterThan(3);
  });

  it("marks Nice to Have section items as bonus", () => {
    const result = parseJobText(SAMPLE_JOB);
    const bonus = result.requirements.filter((r) => r.importance === "bonus");
    expect(bonus.length).toBeGreaterThan(1);
    expect(bonus.some((r) => /kubernetes/i.test(r.label))).toBe(true);
  });

  it("extracts location/availability signals", () => {
    const result = parseJobText(SAMPLE_JOB);
    const hasRemote = result.requirements.some(
      (r) => r.category === "location" || /remote/i.test(r.label)
    );
    expect(hasRemote).toBe(true);
  });

  it("produces stable (deterministic) IDs for the same input", () => {
    const first = parseJobText(SAMPLE_JOB);
    const second = parseJobText(SAMPLE_JOB);
    const firstIds = first.requirements.map((r) => r.id).sort();
    const secondIds = second.requirements.map((r) => r.id).sort();
    expect(firstIds).toEqual(secondIds);
  });

  it("does not produce duplicate requirement IDs", () => {
    const { requirements } = parseJobText(SAMPLE_JOB);
    const ids = requirements.map((r) => r.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it("handles empty input without throwing", () => {
    expect(() => parseJobText("")).not.toThrow();
    const result = parseJobText("");
    expect(result.requirements).toEqual([]);
  });

  it("handles plain requirement list without section headings", () => {
    const plain = `
Software Engineer

- Proficiency in Python
- Experience with Django or FastAPI
- Comfortable with PostgreSQL
`.trim();
    const result = parseJobText(plain);
    expect(result.requirements.length).toBeGreaterThan(0);
    expect(result.requirements.some((r) => /python/i.test(r.label))).toBe(true);
  });

  it("all requirements have non-empty labels", () => {
    const { requirements } = parseJobText(SAMPLE_JOB);
    for (const r of requirements) {
      expect(r.label.trim().length, "empty label found").toBeGreaterThan(0);
    }
  });
});
