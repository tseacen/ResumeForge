"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { AuditPanel } from "@/components/audit-panel";
import { MissingKeywords } from "@/components/missing-keywords";
import { ReportTab } from "@/components/report-tab";
import { ResumePreview } from "@/components/resume-preview";
import { ScoreDashboard } from "@/components/score-dashboard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { type AnalysisResponse } from "@/lib/types";

export default function Home() {
  const [resumeHtml, setResumeHtml] = useState("");
  const [jobText, setJobText] = useState("");
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeHtml, jobText }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `Server error ${res.status}`);
      }
      setResult((await res.json()) as AnalysisResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  const canAnalyze = resumeHtml.trim().length > 0 && jobText.trim().length > 0 && !isAnalyzing;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 border-b bg-white px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-baseline gap-3">
          <h1 className="text-base font-semibold tracking-tight">CV Tailor</h1>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            Match your resume to any job offer — without fabricating facts.
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Resume HTML</label>
            <Textarea
              className="h-64 resize-none font-mono text-xs"
              placeholder="Paste your resume HTML here…"
              value={resumeHtml}
              onChange={(e) => setResumeHtml(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Job Description</label>
            <Textarea
              className="h-64 resize-none text-sm"
              placeholder="Paste the job offer text here…"
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
            />
          </div>
        </div>

        <Button onClick={handleAnalyze} disabled={!canAnalyze} className="w-full">
          {isAnalyzing ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Analyzing…
            </>
          ) : (
            "Analyze"
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-6">
            <ScoreDashboard score={result.score} />

            <Tabs defaultValue="report">
              <TabsList>
                <TabsTrigger value="report">Report</TabsTrigger>
                <TabsTrigger value="improved-cv">Improved CV</TabsTrigger>
                <TabsTrigger value="audit">
                  Audit
                  {result.auditReport.blockedItems.length > 0 && (
                    <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                      {result.auditReport.blockedItems.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="keywords">
                  Missing Keywords
                  {result.score.missingKeywords.length > 0 && (
                    <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white">
                      {result.score.missingKeywords.length > 9 ? "9+" : result.score.missingKeywords.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <div className="mt-4 rounded-lg border bg-white p-6">
                <TabsContent value="report" className="m-0">
                  <ReportTab score={result.score} job={result.job} />
                </TabsContent>
                <TabsContent value="improved-cv" className="m-0">
                  <ResumePreview
                    html={result.tailored.html}
                    audits={result.tailored.audits}
                    score={result.score}
                  />
                </TabsContent>
                <TabsContent value="audit" className="m-0">
                  <AuditPanel audits={result.tailored.audits} auditReport={result.auditReport} />
                </TabsContent>
                <TabsContent value="keywords" className="m-0">
                  <MissingKeywords missingKeywords={result.score.missingKeywords} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
}
