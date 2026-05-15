import fs from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import { parseResumeHtml } from "@/lib/parsers/parse-resume-html";
import { ParsedResumeSchema } from "@/lib/schemas/resume.schema";

const SAMPLE_HTML = fs.readFileSync(
  path.resolve(__dirname, "fixtures/sample-resume.html"),
  "utf-8"
);

describe("parseResumeHtml", () => {
  it("returns a schema-valid ParsedResume", () => {
    const result = parseResumeHtml(SAMPLE_HTML);
    const parsed = ParsedResumeSchema.safeParse(result);
    expect(parsed.success, parsed.error?.message).toBe(true);
  });

  it("extracts the candidate name from h1", () => {
    const { facts } = parseResumeHtml(SAMPLE_HTML);
    const identity = facts.filter((f) => f.category === "identity");
    expect(identity.some((f) => f.text === "Jane Doe")).toBe(true);
  });

  it("extracts email", () => {
    const { facts } = parseResumeHtml(SAMPLE_HTML);
    expect(facts.some((f) => f.text.includes("jane.doe@example.com"))).toBe(true);
  });

  it("extracts phone", () => {
    const { facts } = parseResumeHtml(SAMPLE_HTML);
    expect(facts.some((f) => f.category === "identity" && f.text.includes("phone:"))).toBe(true);
  });

  it("extracts external links", () => {
    const { facts } = parseResumeHtml(SAMPLE_HTML);
    const links = facts.filter((f) => f.category === "link");
    expect(links.some((f) => f.text.includes("github.com/janedoe"))).toBe(true);
    expect(links.some((f) => f.text.includes("linkedin.com/in/janedoe"))).toBe(true);
  });

  it("extracts the summary paragraph", () => {
    const { facts } = parseResumeHtml(SAMPLE_HTML);
    const summary = facts.find((f) => f.category === "summary");
    expect(summary).toBeDefined();
    expect(summary!.text).toContain("Full-stack engineer");
  });

  it("extracts experience bullets", () => {
    const { facts } = parseResumeHtml(SAMPLE_HTML);
    const exp = facts.filter((f) => f.category === "experience");
    expect(exp.length).toBeGreaterThan(3);
    expect(exp.some((f) => f.text.includes("payment service"))).toBe(true);
    expect(exp.some((f) => f.text.includes("microservices"))).toBe(true);
  });

  it("extracts skills", () => {
    const { facts } = parseResumeHtml(SAMPLE_HTML);
    const skills = facts.filter((f) => f.category === "skill");
    const skillTexts = skills.map((s) => s.text);
    expect(skillTexts).toContain("TypeScript");
    expect(skillTexts).toContain("React");
    expect(skillTexts).toContain("Docker");
  });

  it("extracts education", () => {
    const { facts } = parseResumeHtml(SAMPLE_HTML);
    const edu = facts.find((f) => f.category === "education");
    expect(edu).toBeDefined();
    expect(edu!.text).toContain("Computer Science");
  });

  it("extracts projects", () => {
    const { facts } = parseResumeHtml(SAMPLE_HTML);
    const projects = facts.filter((f) => f.category === "project");
    expect(projects.some((f) => f.text.includes("OpenTrack"))).toBe(true);
  });

  it("produces stable (deterministic) IDs for the same input", () => {
    const first = parseResumeHtml(SAMPLE_HTML);
    const second = parseResumeHtml(SAMPLE_HTML);
    const firstIds = first.facts.map((f) => f.id).sort();
    const secondIds = second.facts.map((f) => f.id).sort();
    expect(firstIds).toEqual(secondIds);
  });

  it("does not produce duplicate fact IDs", () => {
    const { facts } = parseResumeHtml(SAMPLE_HTML);
    const ids = facts.map((f) => f.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it("normalizedKeywords are non-empty for content facts", () => {
    const { facts } = parseResumeHtml(SAMPLE_HTML);
    const contentFacts = facts.filter((f) => f.category !== "link");
    for (const f of contentFacts) {
      expect(f.normalizedKeywords.length, `empty keywords for: "${f.text}"`).toBeGreaterThan(0);
    }
  });

  it("all facts have confidence between 0 and 1", () => {
    const { facts } = parseResumeHtml(SAMPLE_HTML);
    for (const f of facts) {
      expect(f.confidence, `bad confidence for: "${f.text}"`).toBeGreaterThanOrEqual(0);
      expect(f.confidence, `bad confidence for: "${f.text}"`).toBeLessThanOrEqual(1);
    }
  });

  it("handles empty HTML without throwing", () => {
    expect(() => parseResumeHtml("")).not.toThrow();
    const result = parseResumeHtml("");
    expect(result.facts).toEqual([]);
  });

  it("handles minimal HTML (no sections)", () => {
    const html = "<html><body><h1>John Smith</h1><p>john@example.com</p></body></html>";
    const result = parseResumeHtml(html);
    expect(result.facts.some((f) => f.text === "John Smith")).toBe(true);
  });
});
