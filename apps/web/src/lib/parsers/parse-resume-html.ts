import * as cheerio from "cheerio";
import { type Element } from "domhandler";

import { type ParsedResume, type ResumeFact } from "@/lib/schemas/resume.schema";

// Section heading classifiers
const HEADING_SUMMARY = /^(summary|profile|about|objective|overview)/i;
const HEADING_EXPERIENCE = /^(experience|work|employment|career|history)/i;
const HEADING_SKILLS = /^(skills|technologies|tools|expertise|competenc|stack)/i;
const HEADING_EDUCATION = /^(education|academic|degree|qualification|formation)/i;
const HEADING_PROJECTS = /^(projects?|portfolio|side project|open.?source)/i;

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /[\+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}/;
// Matches quantified achievements: "50% reduction", "3 engineers", "2M users", etc.
const METRIC_RE =
  /\b\d[\d,]*\s*(?:%|percent|x|×|million|billion|k\b|M\b)?\s*(?:reduction|increase|improvement|users?|clients?|engineers?|team|months?|years?|projects?|deployments?|requests?|transactions?)/gi;

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "was",
  "with",
  "this",
  "that",
  "from",
  "have",
  "has",
  "are",
  "were",
  "been",
  "will",
  "would",
  "could",
  "should",
  "not",
  "all",
  "can",
  "our",
  "their",
  "also",
  "its",
  "which",
  "when",
  "then",
  "into",
  "over",
  "such",
  "more",
  "than",
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

// Stable ID: same content always produces the same ID so re-parsing is idempotent.
function stableId(category: string, text: string): string {
  let h = 5381;
  const s = `${category}::${text}`;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  return h.toString(36).padStart(7, "0");
}

function fact(
  category: ResumeFact["category"],
  text: string,
  confidence: number
): ResumeFact {
  const trimmed = text.trim();
  return {
    id: stableId(category, trimmed),
    source: "resume_html",
    category,
    text: trimmed,
    normalizedKeywords: normalizeKeywords(trimmed),
    confidence,
  };
}

// Returns all sibling elements until the next heading of the same or higher level.
function collectSectionNodes(
  $: cheerio.CheerioAPI,
  heading: Element
): cheerio.Cheerio<Element> {
  const tag = heading.tagName.toLowerCase(); // h2, h3, h4
  const level = parseInt(tag[1]);
  const stopSelector = Array.from({ length: level }, (_, i) => `h${i + 1}`).join(", ");

  const nodes: Element[] = [];
  let current = $(heading).next();
  while (current.length && !current.is(stopSelector)) {
    nodes.push(current[0]);
    current = current.next();
  }
  return $(nodes);
}

function extractExperienceSection(
  $: cheerio.CheerioAPI,
  nodes: cheerio.Cheerio<Element>,
  facts: ResumeFact[]
) {
  // Each job entry is typically a h3/h4 or a <p>/<div> with a role+company pattern.
  nodes.each((_, node) => {
    const el = $(node);

    // Sub-headings inside experience = individual job titles
    if (node.tagName && /^h[3-6]$/.test(node.tagName)) {
      const jobTitle = el.text().trim();
      if (jobTitle) facts.push(fact("experience", jobTitle, 1.0));
      return;
    }

    // Bullet points = responsibilities / achievements
    el.find("li").each((_, li) => {
      const bullet = $(li).text().trim();
      if (bullet.length > 10) {
        facts.push(fact("experience", bullet, 1.0));
      }
    });

    // Paragraphs that aren't bullets (company/date lines)
    if (node.tagName === "p") {
      const text = el.text().trim();
      if (text.length > 5 && !el.find("li").length) {
        facts.push(fact("experience", text, 0.9));
      }
    }
  });
}

function extractSkillsSection(
  $: cheerio.CheerioAPI,
  nodes: cheerio.Cheerio<Element>,
  facts: ResumeFact[]
) {
  // Skills can be comma-separated, list items, or badge-like spans
  const collected = new Set<string>();

  nodes.each((_, node) => {
    const el = $(node);

    el.find("li, span, code, strong").each((_, child) => {
      const skill = $(child).text().trim();
      if (skill.length > 1 && skill.length < 60 && !collected.has(skill)) {
        collected.add(skill);
        facts.push(fact("skill", skill, 1.0));
      }
    });

    // Fallback: plain text comma/slash separated
    if (!el.find("li, span, code, strong").length) {
      const text = el.text().trim();
      const items = text.split(/[,|\/•·]+/).map((s) => s.trim()).filter(Boolean);
      for (const item of items) {
        if (item.length > 1 && item.length < 60 && !collected.has(item)) {
          collected.add(item);
          facts.push(fact("skill", item, 0.9));
        }
      }
    }
  });
}

function extractEducationSection(
  $: cheerio.CheerioAPI,
  nodes: cheerio.Cheerio<Element>,
  facts: ResumeFact[]
) {
  nodes.each((_, node) => {
    const el = $(node);
    const text = el.text().trim();
    if (text.length > 5) {
      el.find("li").each((_, li) => {
        const bullet = $(li).text().trim();
        if (bullet) facts.push(fact("education", bullet, 1.0));
      });

      if (!el.find("li").length && text) {
        facts.push(fact("education", text, 0.9));
      }
    }
  });
}

function extractProjectsSection(
  $: cheerio.CheerioAPI,
  nodes: cheerio.Cheerio<Element>,
  facts: ResumeFact[]
) {
  nodes.each((_, node) => {
    const el = $(node);

    if (node.tagName && /^h[3-6]$/.test(node.tagName)) {
      facts.push(fact("project", el.text().trim(), 1.0));
      return;
    }

    el.find("li").each((_, li) => {
      const text = $(li).text().trim();
      if (text.length > 10) facts.push(fact("project", text, 1.0));
    });

    if (!el.find("li").length) {
      const text = el.text().trim();
      if (text.length > 10) facts.push(fact("project", text, 0.9));
    }
  });
}

export function parseResumeHtml(html: string): ParsedResume {
  const $ = cheerio.load(html);
  const facts: ResumeFact[] = [];
  const seenIds = new Set<string>();

  function push(f: ResumeFact) {
    if (!seenIds.has(f.id) && f.text.length > 0) {
      seenIds.add(f.id);
      facts.push(f);
    }
  }

  // --- Identity ---
  const h1Text = $("h1").first().text().trim();
  if (h1Text) push(fact("identity", h1Text, 1.0));

  const bodyText = $.html();
  const emailMatch = bodyText.match(EMAIL_RE);
  if (emailMatch) push(fact("identity", `email:${emailMatch[0]}`, 1.0));

  // tel: link first, then fallback to regex scan
  const telHref = $("a[href^='tel:']").first().attr("href");
  const phone = telHref
    ? telHref.replace("tel:", "").trim()
    : (bodyText.match(PHONE_RE)?.[0] ?? null);
  if (phone) push(fact("identity", `phone:${phone}`, 0.9));

  // Location: look for common patterns (city, country in header/contact area)
  $("header, .contact, .header, #contact")
    .first()
    .find("p, span, li")
    .each((_, el) => {
      const t = $(el).text().trim();
      // Rough heuristic: short line that isn't an email or phone and contains a comma or flag
      if (t.length > 2 && t.length < 80 && !EMAIL_RE.test(t) && !PHONE_RE.test(t)) {
        push(fact("identity", `location:${t}`, 0.7));
      }
    });

  // --- Links ---
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const text = $(el).text().trim();
    if (href.startsWith("http") || href.startsWith("mailto:")) {
      push(fact("link", text ? `${text}: ${href}` : href, 1.0));
    }
  });

  // --- Sections ---
  $("h2, h3, h4").each((_, heading) => {
    const headingText = $(heading).text().trim();
    const nodes = collectSectionNodes($, heading);

    if (HEADING_SUMMARY.test(headingText)) {
      const text = nodes
        .map((_, n) => $(n).text())
        .get()
        .join(" ")
        .trim();
      if (text) push(fact("summary", text, 1.0));
    } else if (HEADING_EXPERIENCE.test(headingText)) {
      const tempFacts: ResumeFact[] = [];
      extractExperienceSection($, nodes, tempFacts);
      tempFacts.forEach(push);
    } else if (HEADING_SKILLS.test(headingText)) {
      const tempFacts: ResumeFact[] = [];
      extractSkillsSection($, nodes, tempFacts);
      tempFacts.forEach(push);
    } else if (HEADING_EDUCATION.test(headingText)) {
      const tempFacts: ResumeFact[] = [];
      extractEducationSection($, nodes, tempFacts);
      tempFacts.forEach(push);
    } else if (HEADING_PROJECTS.test(headingText)) {
      const tempFacts: ResumeFact[] = [];
      extractProjectsSection($, nodes, tempFacts);
      tempFacts.forEach(push);
    }
  });

  // --- Fallback summary if none found ---
  if (!facts.find((f) => f.category === "summary")) {
    const firstLongP = $("p")
      .toArray()
      .find((el) => $(el).text().trim().length > 80);
    if (firstLongP) push(fact("summary", $(firstLongP).text().trim(), 0.6));
  }

  // --- Metrics ---
  const fullText = $("body").text();
  const metricMatches = fullText.match(METRIC_RE) ?? [];
  for (const m of metricMatches) {
    push(fact("metric", m.trim(), 0.85));
  }

  return {
    rawHtml: html,
    facts,
    parsedAt: new Date().toISOString(),
  };
}

