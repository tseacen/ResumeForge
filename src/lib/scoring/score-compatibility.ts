import { type JobRequirement, type ParsedJob } from "@/lib/schemas/job.schema";
import { type ParsedResume, type ResumeFact } from "@/lib/schemas/resume.schema";
import { type CompatibilityScore } from "@/lib/schemas/score.schema";

const STOPWORDS = new Set([
  "the", "and", "for", "was", "with", "this", "that", "from", "have", "has",
  "are", "were", "been", "will", "would", "could", "should", "not", "all",
  "can", "our", "their", "also", "its", "which", "when", "then", "into",
  "over", "such", "more", "than",
]);

function normalizeKeywords(text: string): string[] {
  return [
    ...new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9#+.\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    ),
  ];
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildResumeKeywordSet(facts: ResumeFact[]): Set<string> {
  return new Set(facts.flatMap((f) => f.normalizedKeywords));
}

function requirementMatches(req: JobRequirement, resumeKeywords: Set<string>): boolean {
  return normalizeKeywords(req.label).some((kw) => resumeKeywords.has(kw));
}

// Returns 0–100. Uses a 70/30 split between required and non-required requirements.
// Returns `defaultScore` when the category has no requirements at all.
function scoreDimension(
  requirements: JobRequirement[],
  resumeKeywords: Set<string>,
  defaultScore: number
): number {
  if (requirements.length === 0) return defaultScore;

  const required = requirements.filter((r) => r.importance === "required");
  const preferred = requirements.filter((r) => r.importance !== "required");

  const matchedRequired = required.filter((r) => requirementMatches(r, resumeKeywords));
  const matchedPreferred = preferred.filter((r) => requirementMatches(r, resumeKeywords));

  if (required.length === 0) {
    return (matchedPreferred.length / preferred.length) * 100;
  }

  const requiredScore = (matchedRequired.length / required.length) * 100;

  if (preferred.length === 0) return requiredScore;

  const preferredScore = (matchedPreferred.length / preferred.length) * 100;
  return requiredScore * 0.7 + preferredScore * 0.3;
}

export function scoreCompatibility(resume: ParsedResume, job: ParsedJob): CompatibilityScore {
  const resumeKeywords = buildResumeKeywordSet(resume.facts);
  const reqs = job.requirements;

  const techReqs = reqs.filter((r) => r.category === "technical_skill");
  const softReqs = reqs.filter((r) => r.category === "soft_skill");
  const educationReqs = reqs.filter((r) => r.category === "education");
  const seniorityReqs = reqs.filter(
    (r) => r.category === "seniority" || r.category === "experience"
  );
  const domainReqs = reqs.filter((r) => r.category === "domain");

  const technicalFit = clamp(scoreDimension(techReqs, resumeKeywords, 70));
  const seniorityFit = clamp(scoreDimension(seniorityReqs, resumeKeywords, 75));
  const marketFit = clamp(scoreDimension(domainReqs, resumeKeywords, 70));
  const recruiterFit = clamp(
    scoreDimension([...softReqs, ...educationReqs], resumeKeywords, 70)
  );

  // ATS: percentage of unique job keywords found in the resume
  const allJobKeywords = [...new Set(reqs.flatMap((r) => normalizeKeywords(r.label)))];
  const atsMatched = allJobKeywords.filter((kw) => resumeKeywords.has(kw)).length;
  const ats = clamp(allJobKeywords.length === 0 ? 100 : (atsMatched / allJobKeywords.length) * 100);

  const global = clamp(
    technicalFit * 0.35 + recruiterFit * 0.25 + ats * 0.2 + seniorityFit * 0.1 + marketFit * 0.1
  );

  // Matched / unmatched split for qualitative output
  const matched = reqs.filter((r) => requirementMatches(r, resumeKeywords));
  const unmatched = reqs.filter((r) => !requirementMatches(r, resumeKeywords));

  const strengths = matched
    .filter((r) => r.importance === "required")
    .map((r) => r.label)
    .slice(0, 10);

  const blockers = unmatched.filter((r) => r.importance === "required").map((r) => r.label);

  const weaknesses = unmatched
    .filter((r) => r.importance !== "required")
    .map((r) => r.label)
    .slice(0, 10);

  const missingKeywords = unmatched
    .filter((r) => r.category === "technical_skill" || r.category === "domain")
    .map((r) => r.label)
    .slice(0, 20);

  const interviewRisks: string[] = [];

  if (blockers.some((b) => /year|experience/i.test(b))) {
    interviewRisks.push("Seniority gap: may not meet the required years of experience");
  }
  if (blockers.some((b) => /typescript|javascript|python|java\b|golang|go\b|rust\b/i.test(b))) {
    interviewRisks.push("Core language mismatch: primary programming language not evidenced");
  }
  if (blockers.length > 3) {
    interviewRisks.push(
      `${blockers.length} required qualifications are not evidenced in the resume`
    );
  }
  if (seniorityFit < 50 && seniorityReqs.length > 0) {
    interviewRisks.push("Seniority level may not align with the position requirements");
  }
  if (ats < 40) {
    interviewRisks.push("Low ATS keyword coverage; resume may be filtered before human review");
  }

  const riskLevel: CompatibilityScore["riskLevel"] =
    blockers.length > 2 || global < 40
      ? "high"
      : blockers.length > 0 || global < 65
        ? "medium"
        : "low";

  return {
    global,
    ats,
    recruiterFit,
    technicalFit,
    seniorityFit,
    marketFit,
    riskLevel,
    strengths,
    weaknesses,
    blockers,
    missingKeywords,
    interviewRisks,
  };
}
