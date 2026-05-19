import { nanoid } from "nanoid";

import {
  type ChatMessage,
  type ClarificationQuestion,
  type ScoreTable,
  type ScoreTableRow,
} from "@/lib/schemas/chat.schema";
import {
  type AdaptationSession,
  type AdaptationSessionSummary,
} from "@/lib/schemas/session.schema";
import { type TailoredResume } from "@/lib/schemas/tailoring.schema";

const USER_BUBBLE_TRUNCATE_AT = 520;

function isoNow(): string {
  return new Date().toISOString();
}

export function sessionTitle(jobTitle?: string | null, company?: string | null): string {
  if (jobTitle && company) return `${jobTitle} — ${company}`;
  if (jobTitle) return jobTitle;
  return "Nouvelle adaptation";
}

export function toneFor(value: number): ScoreTableRow["tone"] {
  if (value >= 75) return "good";
  if (value >= 55) return "warn";
  return "bad";
}

// ──────────────────────────────────────────────────────────────────────────────
// CREATION
// ──────────────────────────────────────────────────────────────────────────────

export function initializeSession(jobText: string): AdaptationSession {
  const now = isoNow();
  const userMessage: ChatMessage = {
    kind: "user",
    id: `user-${nanoid(6)}`,
    body: jobText,
    truncated: jobText.length > USER_BUBBLE_TRUNCATE_AT,
  };
  return {
    id: nanoid(12),
    title: "Analyse en cours…",
    createdAt: now,
    updatedAt: now,
    phase: "chat-analyzing",
    jobText,
    clarifications: [],
    messages: [
      userMessage,
      { kind: "thinking", id: `thinking-${nanoid(6)}`, label: "Lecture de l'offre…" },
    ],
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// APPLY JOB ANALYSIS (étape 1)
// ──────────────────────────────────────────────────────────────────────────────

export function applyJobAnalysis(
  session: AdaptationSession,
  analysis: {
    jobTitle: string;
    company: string | null;
    summary: string;
    clarifications: Array<Omit<ClarificationQuestion, "answeredWith">>;
  }
): AdaptationSession {
  const clarifications: ClarificationQuestion[] = analysis.clarifications.map((q) => ({
    ...q,
    answeredWith: undefined,
  }));
  const hasQuestions = clarifications.length > 0;

  const messages: ChatMessage[] = [
    ...session.messages.filter((m) => m.kind !== "thinking"),
    {
      kind: "assistant",
      id: `assistant-summary-${nanoid(6)}`,
      body: [
        `Poste détecté : **${analysis.jobTitle}**${
          analysis.company ? ` — ${analysis.company}` : ""
        }.`,
        analysis.summary,
        hasQuestions
          ? "Avant de scorer la compatibilité, j'aurais besoin de quelques précisions :"
          : "Aucune ambiguïté détectée. Je passe directement au tableau de compatibilité.",
      ],
    },
  ];

  if (hasQuestions) {
    messages.push({
      kind: "clarifications",
      id: `clarifications-${nanoid(6)}`,
      questions: clarifications,
    });
  }

  return {
    ...session,
    title: sessionTitle(analysis.jobTitle, analysis.company),
    company: analysis.company ?? undefined,
    jobTitle: analysis.jobTitle,
    jobSummary: analysis.summary,
    clarifications,
    phase: hasQuestions ? "chat-clarifying" : "chat-scoring",
    updatedAt: isoNow(),
    messages,
  };
}

export function setSessionThinking(
  session: AdaptationSession,
  label: string,
  phase?: AdaptationSession["phase"]
): AdaptationSession {
  const withoutThinking = session.messages.filter((m) => m.kind !== "thinking");
  return {
    ...session,
    phase: phase ?? session.phase,
    updatedAt: isoNow(),
    messages: [...withoutThinking, { kind: "thinking", id: `thinking-${nanoid(6)}`, label }],
  };
}

export function clearSessionThinking(session: AdaptationSession): AdaptationSession {
  return {
    ...session,
    messages: session.messages.filter((m) => m.kind !== "thinking"),
    updatedAt: isoNow(),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// ANSWER A CLARIFICATION
// ──────────────────────────────────────────────────────────────────────────────

export function answerClarification(
  session: AdaptationSession,
  questionId: string,
  answer: string
): AdaptationSession {
  const clarifications = session.clarifications.map((q) =>
    q.id === questionId ? { ...q, answeredWith: answer } : q
  );
  const messages = session.messages.map((m) => {
    if (m.kind !== "clarifications") return m;
    return {
      ...m,
      questions: m.questions.map((q) =>
        q.id === questionId ? { ...q, answeredWith: answer } : q
      ),
    };
  });
  return { ...session, clarifications, messages, updatedAt: isoNow() };
}

export function allClarificationsAnswered(session: AdaptationSession): boolean {
  if (session.clarifications.length === 0) return true;
  return session.clarifications.every((q) => typeof q.answeredWith === "string" && q.answeredWith.length > 0);
}

// ──────────────────────────────────────────────────────────────────────────────
// APPLY SCORE (étape 2)
// ──────────────────────────────────────────────────────────────────────────────

export function applyScoreTable(
  session: AdaptationSession,
  report: {
    global: number;
    riskLevel: "low" | "medium" | "high";
    verdict: string;
    rows: Array<{ label: string; value: number; rationale: string }>;
    strengths: string[];
    weaknesses: string[];
    blockers: string[];
    missingKeywords: Array<{ term: string; level: "required" | "preferred" | "bonus"; reason?: string }>;
    interviewRisks: string[];
  }
): AdaptationSession {
  const table: ScoreTable = {
    global: report.global,
    riskLevel: report.riskLevel,
    verdict: report.verdict,
    rows: report.rows.map((r) => ({ ...r, tone: toneFor(r.value) })),
    strengths: report.strengths,
    weaknesses: report.weaknesses,
    blockers: report.blockers,
    missingKeywords: report.missingKeywords,
    interviewRisks: report.interviewRisks,
  };

  const messages: ChatMessage[] = [
    ...session.messages.filter((m) => m.kind !== "thinking"),
    {
      kind: "score-table",
      id: `score-${nanoid(6)}`,
      table,
    },
    {
      kind: "assistant",
      id: `assistant-verdict-${nanoid(6)}`,
      body: [report.verdict],
    },
  ];

  return {
    ...session,
    scoreTable: table,
    phase: "chat-scored",
    updatedAt: isoNow(),
    messages,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// APPLY TAILORED RESUME (étape 3)
// ──────────────────────────────────────────────────────────────────────────────

export function applyTailoredResume(
  session: AdaptationSession,
  tailoredResume: TailoredResume
): AdaptationSession {
  const applied = tailoredResume.audit.filter((item) => item.status === "applied").length;
  const blocked = tailoredResume.audit.filter((item) => item.status === "blocked").length;
  const messages: ChatMessage[] = [
    ...session.messages.filter((m) => m.kind !== "thinking"),
    {
      kind: "adaptation-result",
      id: `adaptation-${nanoid(6)}`,
      result: tailoredResume,
    },
    {
      kind: "assistant",
      id: `assistant-adapted-${nanoid(6)}`,
      body: [
        applied > 0
          ? `${applied} modification${applied > 1 ? "s" : ""} sûre${
              applied > 1 ? "s" : ""
            } appliquée${applied > 1 ? "s" : ""} au CV adapté.`
          : "Aucune modification n'a été appliquée, car rien n'était assez sûr à changer.",
        blocked > 0
          ? `${blocked} proposition${blocked > 1 ? "s" : ""} bloquée${
              blocked > 1 ? "s" : ""
            } pour éviter d'ajouter une information non prouvée ou de casser le rendu.`
          : "Aucune proposition bloquée : l'audit est propre.",
      ],
    },
  ];

  return {
    ...session,
    tailoredResume,
    phase: "chat-adapted",
    updatedAt: isoNow(),
    messages,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ──────────────────────────────────────────────────────────────────────────────

export function setSessionError(session: AdaptationSession, message: string): AdaptationSession {
  const cleaned = session.messages.filter((m) => m.kind !== "thinking" && m.kind !== "error");
  return {
    ...session,
    updatedAt: isoNow(),
    messages: [...cleaned, { kind: "error", id: `error-${nanoid(6)}`, message }],
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// SUMMARY (sidebar)
// ──────────────────────────────────────────────────────────────────────────────

export function summarizeSession(session: AdaptationSession): AdaptationSessionSummary {
  const status: AdaptationSessionSummary["status"] =
    session.phase === "chat-adapted"
      ? "adapted"
      : session.phase === "chat-scored"
        ? "scored"
        : session.phase === "chat-scoring"
          ? "scoring"
          : session.phase === "chat-clarifying"
            ? "clarifying"
            : "analyzing";

  return {
    id: session.id,
    title: session.title,
    company: session.company,
    score: session.scoreTable?.global,
    status,
    updatedAt: session.updatedAt,
  };
}
