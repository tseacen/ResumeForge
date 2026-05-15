import { nanoid } from "nanoid";

import { type ResumeChangeAudit } from "@/lib/schemas/audit.schema";
import { type ParsedJob } from "@/lib/schemas/job.schema";
import { type ParsedResume, type ResumeFact } from "@/lib/schemas/resume.schema";

export interface TailoringResult {
  html: string;
  audits: ResumeChangeAudit[];
}

// ── Shared helpers ────────────────────────────────────────────────────────────

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

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function relevanceScore(fact: ResumeFact, jobKeywords: Set<string>): number {
  return fact.normalizedKeywords.filter((kw) => jobKeywords.has(kw)).length;
}

function reorderByRelevance(facts: ResumeFact[], jobKeywords: Set<string>): ResumeFact[] {
  return [...facts].sort((a, b) => relevanceScore(b, jobKeywords) - relevanceScore(a, jobKeywords));
}

function makeAudit(
  targetSection: string,
  newText: string,
  classification: ResumeChangeAudit["classification"],
  risk: ResumeChangeAudit["risk"],
  sourceFactIds: string[],
  reason: string,
  originalText?: string
): ResumeChangeAudit {
  return {
    changeId: nanoid(10),
    targetSection,
    originalText,
    newText,
    reason,
    classification,
    sourceFactIds,
    risk,
  };
}

// Heuristic: experience facts that look like bullet points vs. title/company lines
function isBulletFact(f: ResumeFact): boolean {
  return (
    f.text.length >= 50 ||
    /^(led|built|designed|developed|implemented|managed|created|improved|reduced|increased|migrated|shipped|worked|collaborated|mentored|established|launched|optimized|delivered|architected|automated|integrated|scaled)/i.test(
      f.text
    )
  );
}

// ── HTML generator ────────────────────────────────────────────────────────────

interface ResumeSections {
  identity: ResumeFact[];
  links: ResumeFact[];
  summary: ResumeFact[];
  experience: ResumeFact[];
  skills: ResumeFact[];
  education: ResumeFact[];
  projects: ResumeFact[];
}

function generateResumeHtml(sections: ResumeSections): string {
  const lines: string[] = [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="UTF-8" />',
    "  <title>Resume</title>",
    "</head>",
    "<body>",
  ];

  // Header
  const nameFact = sections.identity.find(
    (f) =>
      !f.text.startsWith("email:") &&
      !f.text.startsWith("phone:") &&
      !f.text.startsWith("location:")
  );
  const emailRaw = sections.identity.find((f) => f.text.startsWith("email:"))?.text;
  const phoneRaw = sections.identity.find((f) => f.text.startsWith("phone:"))?.text;
  const locationRaw = sections.identity.find((f) => f.text.startsWith("location:"))?.text;

  const email = emailRaw?.replace("email:", "").trim();
  const phone = phoneRaw?.replace("phone:", "").trim();
  const location = locationRaw?.replace("location:", "").trim();

  lines.push("<header>");
  if (nameFact) lines.push(`  <h1>${esc(nameFact.text)}</h1>`);

  const contactParts: string[] = [];
  if (email) contactParts.push(`<a href="mailto:${esc(email)}">${esc(email)}</a>`);
  if (phone) contactParts.push(`<a href="tel:${esc(phone)}">${esc(phone)}</a>`);
  if (location) contactParts.push(esc(location));

  for (const link of sections.links) {
    const m = link.text.match(/^(.+):\s*(https?:\/\/.+)$/);
    if (m) {
      contactParts.push(`<a href="${esc(m[2].trim())}">${esc(m[1].trim())}</a>`);
    } else if (link.text.startsWith("http")) {
      contactParts.push(`<a href="${esc(link.text)}">${esc(link.text)}</a>`);
    }
  }

  if (contactParts.length > 0) {
    lines.push(`  <p class="contact">${contactParts.join(" · ")}</p>`);
  }
  lines.push("</header>");

  // Summary
  if (sections.summary.length > 0) {
    lines.push("<section>");
    lines.push("  <h2>Summary</h2>");
    for (const f of sections.summary) {
      lines.push(`  <p>${esc(f.text)}</p>`);
    }
    lines.push("</section>");
  }

  // Skills
  if (sections.skills.length > 0) {
    lines.push("<section>");
    lines.push("  <h2>Skills</h2>");
    lines.push("  <ul>");
    for (const f of sections.skills) {
      lines.push(`    <li>${esc(f.text)}</li>`);
    }
    lines.push("  </ul>");
    lines.push("</section>");
  }

  // Experience
  if (sections.experience.length > 0) {
    lines.push("<section>");
    lines.push("  <h2>Experience</h2>");

    let inList = false;
    for (const f of sections.experience) {
      if (isBulletFact(f)) {
        if (!inList) {
          lines.push("  <ul>");
          inList = true;
        }
        lines.push(`    <li>${esc(f.text)}</li>`);
      } else {
        if (inList) {
          lines.push("  </ul>");
          inList = false;
        }
        lines.push(`  <h3>${esc(f.text)}</h3>`);
      }
    }
    if (inList) lines.push("  </ul>");
    lines.push("</section>");
  }

  // Projects
  if (sections.projects.length > 0) {
    lines.push("<section>");
    lines.push("  <h2>Projects</h2>");
    lines.push("  <ul>");
    for (const f of sections.projects) {
      lines.push(`    <li>${esc(f.text)}</li>`);
    }
    lines.push("  </ul>");
    lines.push("</section>");
  }

  // Education
  if (sections.education.length > 0) {
    lines.push("<section>");
    lines.push("  <h2>Education</h2>");
    lines.push("  <ul>");
    for (const f of sections.education) {
      lines.push(`    <li>${esc(f.text)}</li>`);
    }
    lines.push("  </ul>");
    lines.push("</section>");
  }

  lines.push("</body>", "</html>");
  return lines.join("\n");
}

// ── Main tailoring function ───────────────────────────────────────────────────

export function tailorResume(resume: ParsedResume, job: ParsedJob): TailoringResult {
  const audits: ResumeChangeAudit[] = [];

  const jobKeywords = new Set(job.requirements.flatMap((r) => normalizeKeywords(r.label)));
  const resumeKeywords = new Set(resume.facts.flatMap((f) => f.normalizedKeywords));

  const by = (cat: ResumeFact["category"]) => resume.facts.filter((f) => f.category === cat);

  const identityFacts = by("identity");
  const summaryFacts = by("summary");
  const experienceFacts = by("experience");
  const skillFacts = by("skill");
  const educationFacts = by("education");
  const projectFacts = by("project");
  const linkFacts = by("link");

  // ── 1. Skills: reorder by job relevance ───────────────────────────────────
  const reorderedSkills = reorderByRelevance(skillFacts, jobKeywords);
  const skillOrderChanged = skillFacts.some((f, i) => f.id !== reorderedSkills[i]?.id);

  if (skillOrderChanged && skillFacts.length > 1) {
    audits.push(
      makeAudit(
        "skills",
        reorderedSkills.map((f) => f.text).join(", "),
        "rewritten",
        "low",
        skillFacts.map((f) => f.id),
        "Reordered skills to surface job-relevant technologies first (no content added)",
        skillFacts.map((f) => f.text).join(", ")
      )
    );
  }

  // ── 2. Experience: reorder bullets by job relevance, keep title lines in place ──
  const titleFacts = experienceFacts.filter((f) => !isBulletFact(f));
  const bulletFacts = experienceFacts.filter(isBulletFact);
  const reorderedBullets = reorderByRelevance(bulletFacts, jobKeywords);
  const bulletOrderChanged = bulletFacts.some((f, i) => f.id !== reorderedBullets[i]?.id);

  if (bulletOrderChanged && reorderedBullets.length > 1) {
    audits.push(
      makeAudit(
        "experience",
        "Reordered experience bullets",
        "rewritten",
        "low",
        reorderedBullets.map((f) => f.id),
        "Surfaced experience bullets most relevant to the job requirements (no content changed)"
      )
    );
  }

  // Titles first, then reordered bullets (POC simplification)
  const tailoredExperience = [...titleFacts, ...reorderedBullets];

  // ── 3. Document blocked items (required job skills not in resume) ──────────
  const requiredTech = job.requirements.filter(
    (r) => r.importance === "required" && r.category === "technical_skill"
  );

  for (const req of requiredTech) {
    const inResume = normalizeKeywords(req.label).some((kw) => resumeKeywords.has(kw));
    if (!inResume) {
      audits.push(
        makeAudit(
          "skills",
          req.label,
          "blocked",
          "high",
          [],
          `Required skill "${req.label}" is not evidenced anywhere in the resume — adding it would fabricate experience`
        )
      );
    }
  }

  // ── 4. Generate output HTML ───────────────────────────────────────────────
  const html = generateResumeHtml({
    identity: identityFacts,
    links: linkFacts,
    summary: summaryFacts,
    experience: tailoredExperience,
    skills: reorderedSkills,
    education: educationFacts,
    projects: projectFacts,
  });

  return { html, audits };
}
