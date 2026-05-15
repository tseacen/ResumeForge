import { type JobRequirement, type ParsedJob } from "@/lib/schemas/job.schema";

// ── Section heading classifiers ──────────────────────────────────────────────
const SECTION_REQUIRED =
  /^(requirements?|qualifications?|what you.ll need|what we.re looking for|must.have|required skills?)/i;
const SECTION_PREFERRED =
  /^(nice.to.have|preferred|bonus|plus|what we.d love|ideally|optional)/i;
const SECTION_RESPONSIBILITIES =
  /^(responsibilities|what you.ll do|your role|the role|duties|about the role)/i;
const SECTION_ABOUT_COMPANY = /^(about us|about the company|who we are|our mission)/i;

// ── Requirement category classifiers ────────────────────────────────────────

// Technical skills: languages, frameworks, tools, platforms
const TECH_KEYWORDS =
  /\b(javascript|typescript|python|java|go|golang|rust|ruby|php|swift|kotlin|c\+\+|c#|scala|sql|html|css|react|next\.?js|vue|angular|svelte|node\.?js|express|django|flask|fastapi|spring|rails|laravel|graphql|rest|grpc|aws|gcp|azure|docker|kubernetes|terraform|ansible|ci\/cd|github|gitlab|jenkins|postgres|mysql|mongodb|redis|elasticsearch|kafka|rabbitmq|tailwind|webpack|vite|jest|vitest|playwright|cypress|linux|bash|git|figma|sketch|xd|photoshop)/i;

// Soft skills
const SOFT_KEYWORDS =
  /\b(communication|collaboration|teamwork|leadership|mentoring|mentorship|ownership|autonomy|problem.?solving|critical thinking|adaptability|time management|interpersonal|cross.?functional|stakeholder|presentation|written|verbal)/i;

// Seniority signals
const SENIORITY_KEYWORDS =
  /\b(\d+\+?\s*years?\s*(of\s*)?(experience|exp)|senior|lead|principal|staff|architect|junior|entry.?level|mid.?level|experienced)\b/i;

// Education signals
const EDUCATION_KEYWORDS =
  /\b(bachelor|master|phd|doctorate|degree|b\.?s\.?|m\.?s\.?|b\.?eng|m\.?eng|computer science|engineering|mathematics|physics|information (technology|systems))/i;

// Language (spoken)
const LANGUAGE_KEYWORDS =
  /\b(english|french|spanish|german|portuguese|mandarin|arabic|japanese|bilingual|fluent|proficient)\b/i;

// Domain knowledge
const DOMAIN_KEYWORDS =
  /\b(fintech|finance|banking|healthcare|e.?commerce|saas|b2b|b2c|marketplace|logistics|security|cybersecurity|machine learning|ml|ai|data science|analytics|devops|platform|infrastructure|mobile|embedded|blockchain|crypto)/i;

// Location / remote signals
const LOCATION_KEYWORDS = /\b(remote|hybrid|on.?site|office|relocat|visa|work permit)\b/i;

// Availability / contract type
const AVAILABILITY_KEYWORDS =
  /\b(full.?time|part.?time|contract|freelance|permanent|cdi|cdd|immediate|start date)\b/i;

// ── Helpers ──────────────────────────────────────────────────────────────────

function stableId(label: string, category: string): string {
  let h = 5381;
  const s = `${category}::${label}`;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h >>> 0;
  }
  return h.toString(36).padStart(7, "0");
}

function classifyCategory(text: string): JobRequirement["category"] {
  if (TECH_KEYWORDS.test(text)) return "technical_skill";
  if (SOFT_KEYWORDS.test(text)) return "soft_skill";
  if (SENIORITY_KEYWORDS.test(text)) return "seniority";
  if (EDUCATION_KEYWORDS.test(text)) return "education";
  if (LANGUAGE_KEYWORDS.test(text)) return "language";
  if (DOMAIN_KEYWORDS.test(text)) return "domain";
  if (LOCATION_KEYWORDS.test(text)) return "location";
  if (AVAILABILITY_KEYWORDS.test(text)) return "availability";
  if (/\d+\s*years?/i.test(text)) return "experience";
  return "experience"; // generic fallback
}

function makeRequirement(
  label: string,
  importance: JobRequirement["importance"],
  evidenceText?: string
): JobRequirement {
  const trimmed = label.trim();
  return {
    id: stableId(trimmed, importance),
    label: trimmed,
    category: classifyCategory(trimmed),
    importance,
    evidenceText,
  };
}

// Splits text into lines and strips common bullet characters.
function bulletLines(block: string): string[] {
  return block
    .split("\n")
    .map((l) => l.replace(/^[\s\-•·*►▸▪◦–—]+/, "").trim())
    .filter((l) => l.length > 5);
}

// Tries to detect the job title from the first few non-empty lines.
function detectTitle(lines: string[]): string | undefined {
  // Common explicit patterns
  for (const line of lines.slice(0, 6)) {
    const m = line.match(/^(?:job\s+)?title\s*[:–]\s*(.+)/i);
    if (m) return m[1].trim();
  }
  // First short line that looks like a title (no period, < 80 chars, not all caps company header)
  const candidate = lines.find(
    (l) => l.length < 80 && !l.endsWith(".") && !/^(about|we are|join|our)/i.test(l)
  );
  return candidate;
}

function detectCompany(lines: string[]): string | undefined {
  for (const line of lines.slice(0, 10)) {
    const m = line.match(/^(?:company|employer|organisation|organization)\s*[:–]\s*(.+)/i);
    if (m) return m[1].trim();
    const at = line.match(/^.+\s+(?:at|@)\s+(.+)$/i);
    if (at) return at[1].trim();
  }
  return undefined;
}

// ── Main parser ──────────────────────────────────────────────────────────────

export function parseJobText(rawText: string): ParsedJob {
  const requirements: JobRequirement[] = [];
  const seenIds = new Set<string>();

  function push(req: JobRequirement) {
    if (!seenIds.has(req.id) && req.label.length > 0) {
      seenIds.add(req.id);
      requirements.push(req);
    }
  }

  const lines = rawText.split("\n").map((l) => l.trim());
  const nonEmpty = lines.filter(Boolean);

  const title = detectTitle(nonEmpty);
  const company = detectCompany(nonEmpty);

  // Split into logical blocks by blank lines and classify each block.
  const blocks = rawText.split(/\n{2,}/);

  for (const block of blocks) {
    const firstLine = block.trim().split("\n")[0].trim();

    let blockImportance: JobRequirement["importance"] = "preferred";

    const isSectionHeading =
      SECTION_REQUIRED.test(firstLine) ||
      SECTION_PREFERRED.test(firstLine) ||
      SECTION_RESPONSIBILITIES.test(firstLine) ||
      SECTION_ABOUT_COMPANY.test(firstLine);

    if (SECTION_ABOUT_COMPANY.test(firstLine)) continue; // skip company description blocks
    if (SECTION_REQUIRED.test(firstLine)) blockImportance = "required";
    else if (SECTION_PREFERRED.test(firstLine)) blockImportance = "bonus";

    // When the first line is a known section heading, skip it; otherwise include all lines.
    const blockLines = block.split("\n");
    const contentLines = isSectionHeading ? blockLines.slice(1) : blockLines;
    const bodyLines = bulletLines(contentLines.join("\n"));

    for (const line of bodyLines) {
      let lineImportance = blockImportance;
      let lineText = line;

      if (/^(must.?have|required|mandatory)\s*[:\-]?\s*/i.test(line)) {
        lineImportance = "required";
        lineText = line.replace(/^(must.?have|required|mandatory)\s*[:\-]?\s*/i, "");
      } else if (/^(nice.?to.?have|preferred|bonus|optional)\s*[:\-]?\s*/i.test(line)) {
        lineImportance = "bonus";
        lineText = line.replace(/^(nice.?to.?have|preferred|bonus|optional)\s*[:\-]?\s*/i, "");
      }

      if (lineText.trim().length < 3) continue;
      push(makeRequirement(lineText, lineImportance, line));
    }
  }

  // Second pass: scan full text for seniority / availability signals not caught above
  const fullLower = rawText.toLowerCase();

  const seniorityMatch = rawText.match(/\d+\+?\s*years?\s*(?:of\s+)?(?:experience|exp)[^.;]*/gi);
  for (const m of seniorityMatch ?? []) {
    push(makeRequirement(m.trim(), "required", m.trim()));
  }

  if (AVAILABILITY_KEYWORDS.test(fullLower)) {
    const avMatch = rawText.match(
      /\b(full.?time|part.?time|contract|freelance|permanent|cdi|cdd|immediate)[^.;,]*/i
    );
    if (avMatch) push(makeRequirement(avMatch[0].trim(), "preferred", avMatch[0].trim()));
  }

  if (LOCATION_KEYWORDS.test(fullLower)) {
    const locMatch = rawText.match(/\b(remote|hybrid|on.?site|office)[^.;,]*/i);
    if (locMatch) push(makeRequirement(locMatch[0].trim(), "preferred", locMatch[0].trim()));
  }

  return {
    rawText,
    title,
    company,
    requirements,
    parsedAt: new Date().toISOString(),
  };
}
