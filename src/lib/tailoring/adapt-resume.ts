import * as cheerio from "cheerio";
import { type Element } from "domhandler";

import { parseResumeHtml } from "@/lib/parsers/parse-resume-html";
import { type ResumeFact } from "@/lib/schemas/resume.schema";
import {
  type TailoredResume,
  type TailoringAuditItem,
  type TailoringOperation,
  type TailoringPlan,
} from "@/lib/schemas/tailoring.schema";

const APPLY_SELECTOR = [
  "p",
  "li",
  "h3",
  "h4",
  "h5",
  "h6",
  "span",
  "strong",
  "em",
  "td",
  "dd",
  "dt",
  "div",
].join(", ");

const ALLOWED_SUPPORT_CATEGORIES = new Set<ResumeFact["category"]>([
  "summary",
  "experience",
  "project",
  "skill",
  "metric",
]);

const STOPWORDS = new Set([
  "about",
  "avec",
  "aux",
  "and",
  "are",
  "auf",
  "avec",
  "base",
  "bei",
  "built",
  "chez",
  "client",
  "clients",
  "code",
  "collaborated",
  "conception",
  "contribue",
  "contributed",
  "dans",
  "des",
  "die",
  "du",
  "delivered",
  "developed",
  "development",
  "engineer",
  "engineering",
  "equipe",
  "experience",
  "for",
  "from",
  "gestion",
  "have",
  "ingénieur",
  "les",
  "leur",
  "mise",
  "not",
  "our",
  "par",
  "pour",
  "project",
  "projects",
  "role",
  "service",
  "services",
  "software",
  "sur",
  "team",
  "the",
  "to",
  "und",
  "une",
  "using",
  "via",
  "web",
  "with",
  "work",
]);

const SENIORITY_TERMS = new Set([
  "architect",
  "architecte",
  "director",
  "directeur",
  "expert",
  "head",
  "lead",
  "leader",
  "manager",
  "principal",
  "senior",
  "staff",
]);

const MAX_REWRITE_RATIO = 1.35;
const MAX_REWRITE_EXTRA_CHARS = 140;

function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeToken(raw: string): string {
  return fold(raw).replace(/[._-]/g, "");
}

function claimTokens(text: string): Set<string> {
  const matches = fold(text).match(/[a-z0-9][a-z0-9+#._-]{1,}/g) ?? [];
  const tokens = new Set<string>();
  for (const match of matches) {
    const token = normalizeToken(match);
    if (token.length < 3 || STOPWORDS.has(token) || /^\d+$/.test(token)) continue;
    tokens.add(token);
  }
  return tokens;
}

function metricTokens(text: string): Set<string> {
  const matches = text.match(/\b\d[\d.,]*(?:\s?(?:%|x|k|m|m\+|million|millions|billion|users?|clients?|engineers?|requests?|stars?))?\b/gi) ?? [];
  return new Set(matches.map((value) => fold(value).replace(/\s+/g, "")));
}

function supportText(facts: ResumeFact[], answers: Array<{ answer: string }>): string {
  return [...facts.map((fact) => fact.text), ...answers.map((answer) => answer.answer)].join("\n");
}

function addAudit(
  operation: TailoringOperation,
  status: TailoringAuditItem["status"],
  validationNotes: string[]
): TailoringAuditItem {
  return {
    id: operation.id,
    status,
    targetKind: operation.targetKind,
    originalText: operation.originalText,
    rewrittenText: operation.rewrittenText,
    reason: operation.reason,
    sourceFactIds: operation.sourceFactIds,
    matchedKeywords: operation.matchedKeywords,
    validationNotes,
  };
}

function validationNotesForOperation(params: {
  operation: TailoringOperation;
  resumeFacts: ResumeFact[];
  supportTokens: Set<string>;
  supportMetrics: Set<string>;
}): string[] {
  const { operation, resumeFacts, supportTokens, supportMetrics } = params;
  const notes: string[] = [];
  const sourceFacts = operation.sourceFactIds
    .map((id) => resumeFacts.find((fact) => fact.id === id))
    .filter((fact): fact is ResumeFact => Boolean(fact));

  if (sourceFacts.length !== operation.sourceFactIds.length) {
    notes.push("Some source facts referenced by the AI do not exist in the parsed CV.");
  }

  if (!sourceFacts.some((fact) => ALLOWED_SUPPORT_CATEGORIES.has(fact.category))) {
    notes.push("The change is not backed by a modifiable fact from the CV.");
  }

  if (operation.targetKind === "other") {
    notes.push("Target section is too vague to apply the change safely.");
  }

  const originalText = normalizeSpaces(operation.originalText);
  const rewrittenText = normalizeSpaces(operation.rewrittenText);
  if (originalText === rewrittenText) {
    notes.push("No meaningful change detected.");
  }

  if (
    rewrittenText.length > originalText.length * MAX_REWRITE_RATIO &&
    rewrittenText.length - originalText.length > MAX_REWRITE_EXTRA_CHARS
  ) {
    notes.push("Rewrite is too long and could break CV layout proportions.");
  }

  const unsupportedTokens = [...claimTokens(rewrittenText)].filter(
    (token) => !supportTokens.has(token)
  );
  if (unsupportedTokens.length > 0) {
    notes.push(`Unsupported terms blocked: ${unsupportedTokens.slice(0, 8).join(", ")}.`);
  }

  const newMetrics = [...metricTokens(rewrittenText)].filter((metric) => !supportMetrics.has(metric));
  if (newMetrics.length > 0) {
    notes.push(`Unsupported metrics blocked: ${newMetrics.slice(0, 5).join(", ")}.`);
  }

  const unsupportedSeniority = [...claimTokens(rewrittenText)].filter(
    (token) => SENIORITY_TERMS.has(token) && !claimTokens(originalText).has(token)
  );
  if (unsupportedSeniority.length > 0) {
    notes.push(`Unsupported seniority signal: ${unsupportedSeniority.join(", ")}.`);
  }

  return notes;
}

function findElementByExactText(
  $: cheerio.CheerioAPI,
  originalText: string,
  usedChangeIds: Set<string>
): Element | null {
  const target = normalizeSpaces(originalText);
  const matches: Array<{ element: Element; score: number }> = [];

  $(APPLY_SELECTOR).each((_, element) => {
    const candidate = element as Element;
    const $element = $(candidate);
    if ($element.attr("data-rf-change-id") && usedChangeIds.has($element.attr("data-rf-change-id")!)) {
      return;
    }
    if (normalizeSpaces($element.text()) !== target) return;

    const tagName = candidate.tagName?.toLowerCase() ?? "";
    const childPenalty = $element.children().length * 4;
    const headerPenalty = $element.parents("header").length > 0 || tagName === "h1" ? 100 : 0;
    const sectionTitlePenalty = tagName === "h2" ? 100 : 0;
    matches.push({ element: candidate, score: childPenalty + headerPenalty + sectionTitlePenalty });
  });

  matches.sort((a, b) => a.score - b.score);
  return matches[0]?.element ?? null;
}

function markElement($: cheerio.CheerioAPI, element: Element, operation: TailoringOperation) {
  const $element = $(element);
  const currentClass = $element.attr("class");
  $element.text(operation.rewrittenText);
  $element.attr(
    "class",
    [currentClass, "rf-tailored-change"].filter(Boolean).join(" ")
  );
  $element.attr("data-rf-change-id", operation.id);
  $element.attr("data-rf-change-kind", operation.targetKind);
}

function serializeHtml($: cheerio.CheerioAPI, originalHtml: string): string {
  const hadDocumentShell = /<!doctype|<html[\s>]|<body[\s>]/i.test(originalHtml);
  if (hadDocumentShell) return $.html();
  return $("body").html() ?? $.root().html() ?? originalHtml;
}

export function applyTailoringPlan(params: {
  originalHtml: string;
  plan: TailoringPlan;
  answers?: Array<{ id: string; question: string; answer: string }>;
}): TailoredResume {
  const answers = params.answers ?? [];
  const parsedResume = parseResumeHtml(params.originalHtml);
  const corpus = supportText(parsedResume.facts, answers);
  const supportTokens = claimTokens(corpus);
  const supportMetrics = metricTokens(corpus);
  const $ = cheerio.load(params.originalHtml);
  const usedChangeIds = new Set<string>();
  const audit: TailoringAuditItem[] = [];

  for (const operation of params.plan.operations) {
    const notes = validationNotesForOperation({
      operation,
      resumeFacts: parsedResume.facts,
      supportTokens,
      supportMetrics,
    });

    if (notes.length > 0) {
      audit.push(addAudit(operation, "blocked", notes));
      continue;
    }

    const element = findElementByExactText($, operation.originalText, usedChangeIds);
    if (!element) {
      audit.push(
        addAudit(operation, "blocked", [
          "Original text was not found in the CV HTML.",
        ])
      );
      continue;
    }

    markElement($, element, operation);
    usedChangeIds.add(operation.id);
    audit.push(addAudit(operation, "applied", ["Change applied to the original HTML."]));
  }

  return {
    adaptedHtml: serializeHtml($, params.originalHtml),
    summary: params.plan.summary,
    audit,
    skippedKeywords: params.plan.skippedKeywords,
    generatedAt: new Date().toISOString(),
  };
}
