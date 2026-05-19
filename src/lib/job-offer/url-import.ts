import * as cheerio from "cheerio";

import { devError, devLog } from "@/lib/logger";

const FETCH_TIMEOUT_MS = 15_000;
const MIN_JOB_TEXT_CHARS = 240;
const MAX_JOB_TEXT_CHARS = 16_000;

const REQUEST_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9,fr;q=0.8",
  "cache-control": "no-cache",
} as const;

const NOISE_LINE_RE =
  /^(sign in|join now|accept cookies|cookie policy|privacy policy|terms of use|jobs you may like|see more|show more)$/i;

type ImportSource = "linkedin-guest-api" | "html";

interface ExtractedJobContent {
  text: string;
  title: string | null;
  company: string | null;
}

export interface ImportedJobOffer {
  source: ImportSource;
  sourceUrl: string;
  resolvedUrl: string;
  sourceHost: string;
  title: string | null;
  company: string | null;
  jobText: string;
}

export class JobOfferImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JobOfferImportError";
  }
}

function withTimeoutSignal(timeoutMs: number): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  };
}

async function fetchText(url: string): Promise<{ text: string; finalUrl: string }> {
  const { signal, cleanup } = withTimeoutSignal(FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: REQUEST_HEADERS,
      redirect: "follow",
      cache: "no-store",
      signal,
    });
    if (!response.ok) {
      throw new JobOfferImportError(`URL responded with HTTP ${response.status}.`);
    }
    const text = await response.text();
    return { text, finalUrl: response.url || url };
  } catch (error) {
    if (error instanceof JobOfferImportError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new JobOfferImportError("URL fetch timed out.");
    }
    throw new JobOfferImportError(error instanceof Error ? error.message : "URL fetch failed.");
  } finally {
    cleanup();
  }
}

function cleanText(raw: string): string {
  const normalized = raw
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .filter((line) => !NOISE_LINE_RE.test(line))
    .join("\n");
  return normalized.replace(/\n{3,}/g, "\n\n").trim();
}

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trimEnd()}…`;
}

function normalizeType(rawType: unknown): string[] {
  if (typeof rawType === "string") return [rawType];
  if (Array.isArray(rawType)) {
    return rawType.filter((item): item is string => typeof item === "string");
  }
  return [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function jobPostingFromJsonLd(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = jobPostingFromJsonLd(item);
      if (found) return found;
    }
    return null;
  }
  const record = asRecord(value);
  if (!record) return null;

  const types = normalizeType(record["@type"]);
  if (types.some((item) => item.toLowerCase() === "jobposting")) return record;

  const graph = record["@graph"];
  if (graph) {
    const found = jobPostingFromJsonLd(graph);
    if (found) return found;
  }

  return null;
}

function extractFromJsonLd($: cheerio.CheerioAPI): ExtractedJobContent | null {
  const scripts = $("script[type='application/ld+json']").toArray();
  for (const script of scripts) {
    const raw = $(script).contents().text().trim();
    if (!raw) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      const posting = jobPostingFromJsonLd(parsed);
      if (!posting) continue;

      const title = typeof posting.title === "string" ? posting.title.trim() : null;
      const companyRecord = asRecord(posting.hiringOrganization);
      const company = companyRecord && typeof companyRecord.name === "string"
        ? companyRecord.name.trim()
        : null;

      const rawDescription = typeof posting.description === "string" ? posting.description : "";
      const description = cleanText(cheerio.load(`<div>${rawDescription}</div>`).text());
      if (description.length < MIN_JOB_TEXT_CHARS) continue;

      const preface = [title, company].filter((value): value is string => Boolean(value)).join(" — ");
      const text = preface ? `${preface}\n\n${description}` : description;
      return { text: truncate(text, MAX_JOB_TEXT_CHARS), title, company };
    } catch {
      continue;
    }
  }
  return null;
}

function longestTextBySelector($: cheerio.CheerioAPI, selectors: string[]): string {
  let best = "";
  for (const selector of selectors) {
    const nodes = $(selector).toArray();
    for (const node of nodes) {
      const text = cleanText($(node).text());
      if (text.length > best.length) {
        best = text;
      }
    }
  }
  return best;
}

export function extractJobOfferTextFromHtml(html: string): ExtractedJobContent {
  const $ = cheerio.load(html);

  const fromJsonLd = extractFromJsonLd($);
  if (fromJsonLd) return fromJsonLd;

  $("script,style,noscript,svg,header,footer,nav,form").remove();

  const title = cleanText($("h1").first().text()) || cleanText($("title").first().text()) || null;

  const company = cleanText(
    [
      $("[data-test-id='job-details-company-name']").first().text(),
      $(".topcard__org-name-link").first().text(),
      $(".jobs-unified-top-card__company-name").first().text(),
      $('[class*="company"]').first().text(),
    ]
      .filter((value) => value.trim().length > 0)
      .join(" ")
  ) || null;

  const prioritized = longestTextBySelector($, [
    ".show-more-less-html__markup",
    ".description__text",
    ".jobs-description",
    ".job-description",
    "[data-job-description]",
    "main article",
    "main",
    "article",
    "[role='main']",
  ]);

  const fallback = cleanText($("body").text());
  const description = prioritized.length >= MIN_JOB_TEXT_CHARS ? prioritized : fallback;
  const preface = [title, company].filter((value): value is string => Boolean(value)).join(" — ");
  const assembled = preface ? `${preface}\n\n${description}` : description;

  return {
    text: truncate(assembled, MAX_JOB_TEXT_CHARS),
    title,
    company,
  };
}

export function extractLinkedInJobIdFromUrl(rawUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!parsed.hostname.includes("linkedin.com")) return null;

  const currentJobId = parsed.searchParams.get("currentJobId");
  if (currentJobId && /^\d+$/.test(currentJobId)) return currentJobId;

  const viewMatch = parsed.pathname.match(/\/jobs\/view\/(\d+)/i);
  if (viewMatch?.[1]) return viewMatch[1];

  const guestMatch = parsed.pathname.match(/\/jobs-guest\/jobs\/api\/jobPosting\/(\d+)/i);
  if (guestMatch?.[1]) return guestMatch[1];

  return null;
}

function assertMinimumTextLength(text: string): void {
  if (text.trim().length < MIN_JOB_TEXT_CHARS) {
    throw new JobOfferImportError("The imported page does not contain enough job-offer text.");
  }
}

export async function importJobOfferFromUrl(rawUrl: string): Promise<ImportedJobOffer> {
  const parsed = new URL(rawUrl);
  const normalizedUrl = parsed.toString();
  const sourceHost = parsed.hostname;
  const linkedinJobId = extractLinkedInJobIdFromUrl(normalizedUrl);

  if (linkedinJobId) {
    try {
      const guestUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${linkedinJobId}`;
      const guest = await fetchText(guestUrl);
      const extracted = extractJobOfferTextFromHtml(guest.text);
      assertMinimumTextLength(extracted.text);
      devLog("job-offer/import", "imported from linkedin guest endpoint", {
        sourceHost,
        jobId: linkedinJobId,
        chars: extracted.text.length,
      });
      return {
        source: "linkedin-guest-api",
        sourceUrl: normalizedUrl,
        resolvedUrl: guest.finalUrl,
        sourceHost,
        title: extracted.title,
        company: extracted.company,
        jobText: extracted.text,
      };
    } catch (error) {
      devError("job-offer/import", "linkedin guest endpoint failed, falling back to page", {
        sourceHost,
        jobId: linkedinJobId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  const page = await fetchText(normalizedUrl);
  const extracted = extractJobOfferTextFromHtml(page.text);
  assertMinimumTextLength(extracted.text);
  devLog("job-offer/import", "imported from job page HTML", {
    sourceHost,
    chars: extracted.text.length,
  });
  return {
    source: "html",
    sourceUrl: normalizedUrl,
    resolvedUrl: page.finalUrl,
    sourceHost,
    title: extracted.title,
    company: extracted.company,
    jobText: extracted.text,
  };
}
