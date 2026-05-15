"use client";

import { Copy, Download, FileJson } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { type ResumeChangeAudit } from "@/lib/schemas/audit.schema";
import { type CompatibilityScore } from "@/lib/schemas/score.schema";

interface Props {
  html: string;
  audits: ResumeChangeAudit[];
  score?: CompatibilityScore;
}

export function ResumePreview({ html, audits, score }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    iframe.src = url;
    return () => URL.revokeObjectURL(url);
  }, [html]);

  function copyHtml() {
    void navigator.clipboard.writeText(html).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function download(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={copyHtml}>
          <Copy size={14} className="mr-1.5" />
          {copied ? "Copied!" : "Copy HTML"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => download(html, "tailored-resume.html", "text/html")}>
          <Download size={14} className="mr-1.5" />
          Download HTML
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            download(
              JSON.stringify({ audits, score: score ?? null }, null, 2),
              "resume-report.json",
              "application/json"
            )
          }
        >
          <FileJson size={14} className="mr-1.5" />
          Download JSON Report
        </Button>
      </div>

      <iframe
        ref={iframeRef}
        className="w-full rounded border bg-white"
        style={{ height: 600 }}
        title="Tailored resume preview"
        sandbox="allow-same-origin"
      />
    </div>
  );
}
