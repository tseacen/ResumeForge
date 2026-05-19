import { describe, expect, it } from "vitest";

import {
  extractJobOfferTextFromHtml,
  extractLinkedInJobIdFromUrl,
} from "@/lib/job-offer/url-import";

describe("job offer URL import helpers", () => {
  it("extracts LinkedIn job ids from common URL formats", () => {
    expect(
      extractLinkedInJobIdFromUrl(
        "https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4404534790"
      )
    ).toBe("4404534790");
    expect(
      extractLinkedInJobIdFromUrl("https://www.linkedin.com/jobs/view/4404534790/")
    ).toBe("4404534790");
  });

  it("extracts meaningful text from JSON-LD JobPosting", () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "JobPosting",
              "title": "Senior Data Engineer",
              "description": "<p>Build and operate batch and streaming pipelines across multiple business domains. Collaborate with analysts, product teams, and platform engineers to deliver reliable datasets. Maintain production data quality, SLAs, and lineage documentation. Design observability dashboards, on-call procedures, and incident response workflows for data reliability.</p><p>Required: Python, SQL, cloud data warehouse, orchestration tooling, and experience scaling ETL/ELT systems in production with strict quality controls.</p>",
              "hiringOrganization": {
                "@type": "Organization",
                "name": "Acme Corp"
              }
            }
          </script>
        </head>
        <body></body>
      </html>
    `;
    const extracted = extractJobOfferTextFromHtml(html);
    expect(extracted.title).toContain("Senior Data Engineer");
    expect(extracted.company).toContain("Acme Corp");
    expect(extracted.text).toContain("batch and streaming pipelines");
  });

  it("falls back to DOM extraction when JSON-LD is absent", () => {
    const html = `
      <html>
        <head><title>Backend Engineer</title></head>
        <body>
          <main>
            <h1>Backend Engineer</h1>
            <section class="job-description">
              Build APIs in TypeScript and Node.js.
              Design reliable services with observability.
              Work with product and data teams.
              Improve CI/CD and deployment workflows.
            </section>
          </main>
        </body>
      </html>
    `;
    const extracted = extractJobOfferTextFromHtml(html);
    expect(extracted.text).toContain("Build APIs in TypeScript and Node.js");
    expect(extracted.text).toContain("deployment workflows");
  });
});
