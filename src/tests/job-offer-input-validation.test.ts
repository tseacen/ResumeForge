import { describe, expect, it } from "vitest";

import {
  extractJobOfferUrlCandidate,
  extractUrls,
  normalizeUrlToken,
} from "@/lib/job-offer/input-validation";

describe("job offer URL candidate detection", () => {
  it("extracts URLs from free text", () => {
    const urls = extractUrls(
      "See https://jobs.example.com/123 and also https://example.org/job/abc"
    );
    expect(urls).toHaveLength(2);
  });

  it("detects URL-only inputs as import candidates", () => {
    const candidate = extractJobOfferUrlCandidate(
      "https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4404534790",
    );
    expect(candidate).toContain("linkedin.com");
  });

  it("detects short note plus URL as candidate", () => {
    const candidate = extractJobOfferUrlCandidate(
      "please use this link https://www.linkedin.com/jobs/view/4404534790"
    );
    expect(candidate).toContain("/jobs/view/4404534790");
  });

  it("does not treat a full pasted offer as URL-only candidate", () => {
    const candidate = extractJobOfferUrlCandidate(
      "Source: https://jobs.example.com/data-engineer. Role: Senior Data Engineer. Responsibilities: design data pipelines, ensure data quality, collaborate with analytics stakeholders, optimize query performance, mentor peers, and support production operations.",
    );
    expect(candidate).toBeNull();
  });

  it("normalizes www URLs to https", () => {
    expect(normalizeUrlToken("www.example.com/job/42")).toBe(
      "https://www.example.com/job/42"
    );
  });
});
