import { describe, expect, it } from "vitest";

import { type ResumeChangeAudit } from "@/lib/schemas/audit.schema";
import { type ParsedResume } from "@/lib/schemas/resume.schema";
import { auditGeneratedResume } from "@/lib/tailoring/audit-generated-resume";

function makeResume(factIds: string[]): ParsedResume {
  return {
    rawHtml: "",
    facts: factIds.map((id) => ({
      id,
      source: "resume_html" as const,
      category: "skill" as const,
      text: id,
      normalizedKeywords: [id],
      confidence: 1,
    })),
    parsedAt: new Date().toISOString(),
  };
}

function makeAudit(
  classification: ResumeChangeAudit["classification"],
  risk: ResumeChangeAudit["risk"],
  sourceFactIds: string[] = []
): ResumeChangeAudit {
  return {
    changeId: `change-${Math.random().toString(36).slice(2)}`,
    targetSection: "skills",
    newText: "some text",
    reason: "test reason",
    classification,
    sourceFactIds,
    risk,
  };
}

describe("auditGeneratedResume", () => {
  it("returns a clean report when audits are all proven/rewritten with valid source IDs", () => {
    const resume = makeResume(["fact-1", "fact-2"]);
    const audits = [
      makeAudit("rewritten", "low", ["fact-1"]),
      makeAudit("proven", "low", ["fact-2"]),
    ];
    const report = auditGeneratedResume(resume, audits);
    expect(report.isClean).toBe(true);
    expect(report.riskLevel).toBe("low");
    expect(report.blockedItems).toHaveLength(0);
    expect(report.needsValidation).toHaveLength(0);
    expect(report.orphanedSourceIds).toHaveLength(0);
  });

  it("blockedItems contains audits with classification=blocked", () => {
    const resume = makeResume(["fact-1"]);
    const audits = [
      makeAudit("blocked", "high", []),
      makeAudit("rewritten", "low", ["fact-1"]),
    ];
    const report = auditGeneratedResume(resume, audits);
    expect(report.blockedItems).toHaveLength(1);
    expect(report.blockedItems[0].classification).toBe("blocked");
  });

  it("isClean is true even when there are blocked items (blocked = intentionally excluded)", () => {
    const resume = makeResume([]);
    const audits = [makeAudit("blocked", "high", [])];
    const report = auditGeneratedResume(resume, audits);
    expect(report.isClean).toBe(true);
  });

  it("needsValidation contains audits with classification=needs_user_validation", () => {
    const resume = makeResume(["fact-1"]);
    const audits = [makeAudit("needs_user_validation", "medium", ["fact-1"])];
    const report = auditGeneratedResume(resume, audits);
    expect(report.needsValidation).toHaveLength(1);
    expect(report.isClean).toBe(false);
  });

  it("orphanedSourceIds flags references to unknown fact IDs", () => {
    const resume = makeResume(["fact-1"]);
    const audits = [makeAudit("rewritten", "low", ["fact-1", "ghost-99"])];
    const report = auditGeneratedResume(resume, audits);
    expect(report.orphanedSourceIds).toContain("ghost-99");
    expect(report.orphanedSourceIds).not.toContain("fact-1");
  });

  it("isClean is false when orphaned source IDs are present", () => {
    const resume = makeResume(["fact-1"]);
    const audits = [makeAudit("rewritten", "low", ["unknown-id"])];
    const report = auditGeneratedResume(resume, audits);
    expect(report.isClean).toBe(false);
  });

  it("riskLevel is high when there are orphaned source IDs", () => {
    const resume = makeResume([]);
    const audits = [makeAudit("inferred_safe", "medium", ["ghost-id"])];
    const report = auditGeneratedResume(resume, audits);
    expect(report.riskLevel).toBe("high");
  });

  it("riskLevel is medium when there are needs_user_validation items but no orphaned IDs", () => {
    const resume = makeResume(["fact-1"]);
    const audits = [makeAudit("needs_user_validation", "medium", ["fact-1"])];
    const report = auditGeneratedResume(resume, audits);
    expect(report.riskLevel).toBe("medium");
  });

  it("riskLevel is low when all audits are low risk with valid source IDs", () => {
    const resume = makeResume(["fact-1", "fact-2"]);
    const audits = [
      makeAudit("rewritten", "low", ["fact-1"]),
      makeAudit("rewritten", "low", ["fact-2"]),
    ];
    const report = auditGeneratedResume(resume, audits);
    expect(report.riskLevel).toBe("low");
  });

  it("handles empty audits array", () => {
    const resume = makeResume(["fact-1"]);
    const report = auditGeneratedResume(resume, []);
    expect(report.isClean).toBe(true);
    expect(report.riskLevel).toBe("low");
    expect(report.blockedItems).toHaveLength(0);
    expect(report.orphanedSourceIds).toHaveLength(0);
  });

  it("handles empty resume (no facts)", () => {
    const resume = makeResume([]);
    const audits = [makeAudit("rewritten", "low", [])]; // empty sourceFactIds is fine
    const report = auditGeneratedResume(resume, audits);
    expect(report.orphanedSourceIds).toHaveLength(0);
    expect(report.isClean).toBe(true);
  });

  it("deduplicates orphaned source IDs", () => {
    const resume = makeResume([]);
    // Same ghost ID referenced in two different audits
    const audits = [
      makeAudit("rewritten", "low", ["ghost-1"]),
      makeAudit("rewritten", "low", ["ghost-1"]),
    ];
    const report = auditGeneratedResume(resume, audits);
    expect(report.orphanedSourceIds).toHaveLength(1);
    expect(report.orphanedSourceIds[0]).toBe("ghost-1");
  });

  it("blocked items do not affect riskLevel on their own", () => {
    const resume = makeResume([]);
    const audits = [makeAudit("blocked", "high", [])];
    const report = auditGeneratedResume(resume, audits);
    // blocked items are documented exclusions — not a risk signal
    expect(report.riskLevel).toBe("low");
  });
});
