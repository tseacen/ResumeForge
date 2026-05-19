const URL_TOKEN_REGEX = /(?:https?:\/\/|www\.)[^\s]+/gi;
const MIN_MEANINGFUL_NON_URL_TOKENS = 5;
const LEADING_URL_WRAPPER_RE = /^<+/;
const TRAILING_URL_PUNCTUATION_RE = /[>\]),.;!?]+$/;

export function extractUrls(text: string): string[] {
  return text.match(URL_TOKEN_REGEX) ?? [];
}

function meaningfulNonUrlTokenCount(text: string): number {
  return text
    .replace(URL_TOKEN_REGEX, " ")
    .split(/\s+/)
    .map((token) => token.replace(/[^0-9A-Za-zÀ-ÖØ-öø-ÿ]/g, ""))
    .filter((token) => token.length >= 2).length;
}

export function normalizeUrlToken(raw: string): string {
  const trimmed = raw.trim().replace(LEADING_URL_WRAPPER_RE, "");
  const withoutTrailingPunctuation = trimmed.replace(TRAILING_URL_PUNCTUATION_RE, "");
  const normalized = withoutTrailingPunctuation.trim();
  if (normalized.startsWith("www.")) {
    return `https://${normalized}`;
  }
  return normalized;
}

export function extractJobOfferUrlCandidate(jobText: string): string | null {
  const urls = extractUrls(jobText);
  if (urls.length === 0) {
    return null;
  }

  const tokenCount = meaningfulNonUrlTokenCount(jobText);
  if (tokenCount >= MIN_MEANINGFUL_NON_URL_TOKENS) {
    return null;
  }

  return normalizeUrlToken(urls[0]);
}
