import { nanoid } from "nanoid";

import { runAnalysis } from "@/lib/analyze";
import { parseResumeHtml } from "@/lib/parsers/parse-resume-html";
import {
  buildAdaptedCvDocument,
  buildCvDocument,
  blockedClaims,
} from "@/lib/resumeforge/cv-document";
import {
  type ChatMessage,
  type ChatNeed,
  type ChatStatRow,
  type ValidationQuestion,
} from "@/lib/schemas/chat.schema";
import {
  type AdaptationSession,
  type AdaptationSessionSummary,
} from "@/lib/schemas/session.schema";
import { type AnalysisResponse } from "@/lib/types";

function isoNow(): string {
  return new Date().toISOString();
}

function toneFor(value: number): ChatStatRow["tone"] {
  if (value >= 80) return "good";
  if (value >= 60) return "warn";
  return "bad";
}

function sessionTitle(jobTitle: string | undefined, company: string | undefined): string {
  if (jobTitle && company) return `${jobTitle} — ${company}`;
  if (jobTitle) return jobTitle;
  return "Nouvelle adaptation";
}

const USER_BUBBLE_TRUNCATE_AT = 520;

function needsFromMissing(missingKeywords: string[]): ChatNeed[] {
  return missingKeywords.slice(0, 6).map((term, index) => ({
    term,
    level: index < 2 ? "required" : index < 5 ? "preferred" : "bonus",
  }));
}

function buildStatRows(sessionScore: AdaptationSession["score"]): ChatStatRow[] {
  return [
    {
      label: "Compétences clés",
      value: sessionScore.technicalFit,
      tone: toneFor(sessionScore.technicalFit),
      icon: "target",
    },
    {
      label: "Pertinence expérience",
      value: sessionScore.recruiterFit,
      tone: toneFor(sessionScore.recruiterFit),
      icon: "briefcase",
    },
    {
      label: "Mots-clés ATS",
      value: sessionScore.ats,
      tone: toneFor(sessionScore.ats),
      icon: "tag",
    },
    {
      label: "Séniorité",
      value: sessionScore.seniorityFit,
      tone: toneFor(sessionScore.seniorityFit),
      icon: "layers",
    },
    {
      label: "Marché / domaine",
      value: sessionScore.marketFit,
      tone: toneFor(sessionScore.marketFit),
      icon: "chart",
    },
  ];
}

function buildQuestions(blockers: string[], missingKeywords: string[]): ValidationQuestion[] {
  const blockerQuestions = blockers.slice(0, 2).map((blocker, index) => ({
    id: `question-${index}-${nanoid(6)}`,
    label: `Question ${index + 1}`,
    question: `Pouvez-vous confirmer une expérience réelle liée à "${blocker}" ?`,
    context:
      "Je ne l'ajouterai pas au CV sans preuve explicite. Si ce n'est pas vrai, on le laisse en risque d'entretien.",
    suggestedAnswers: [
      "Oui, j'ai une expérience vérifiable",
      "Non, ne pas l'ajouter",
      "Je veux reformuler sans le revendiquer",
    ],
  }));

  if (blockerQuestions.length > 0) return blockerQuestions;

  return missingKeywords.slice(0, 2).map((keyword, index) => ({
    id: `question-${index}-${nanoid(6)}`,
    label: `Clarification ${index + 1}`,
    question: `Le terme "${keyword}" existe-t-il déjà dans votre expérience, même s'il n'apparaît pas dans le CV ?`,
    context:
      "Une réponse positive peut devenir un fait validé par vous. Sinon, le mot-clé reste uniquement dans le diagnostic.",
    suggestedAnswers: ["Oui, c'est exact", "Non", "À discuter en entretien seulement"],
  }));
}

function buildDiagnosticMessages(
  title: string,
  jobText: string,
  score: AdaptationSession["score"],
  questions: ValidationQuestion[]
): ChatMessage[] {
  const needs = needsFromMissing(score.missingKeywords);
  const blockersLine = score.blockers.length
    ? `${score.blockers.length} point${score.blockers.length > 1 ? "s" : ""} bloquant${score.blockers.length > 1 ? "s" : ""} détecté${score.blockers.length > 1 ? "s" : ""}.`
    : "Aucun bloqueur majeur détecté.";

  return [
    { kind: "step", id: "step-offer", label: "Étape 1 · Offre reçue", done: true },
    {
      kind: "assistant",
      id: "assistant-start",
      body: ["Bonjour. J'ai reçu l'offre et je la compare à votre CV maître."],
    },
    {
      kind: "user",
      id: "user-job",
      body: jobText,
      truncated: jobText.length > USER_BUBBLE_TRUNCATE_AT,
    },
    {
      kind: "assistant",
      id: "assistant-diagnostic",
      body: [
        `J'ai parcouru l'offre **${title}**. Voici le diagnostic initial avant adaptation :`,
        `${blockersLine} Je vais adapter uniquement les éléments déjà prouvés par votre CV ou explicitement validés par vous.`,
      ],
    },
    {
      kind: "stats",
      id: "stats-diagnostic",
      title: "Diagnostic initial",
      score: score.global,
      rows: buildStatRows(score),
      needs,
    },
    ...questions.map((question) => ({
      kind: "question" as const,
      id: `message-${question.id}`,
      question,
    })),
  ];
}

export function buildSessionFromAnalysis(
  jobText: string,
  analysis: AnalysisResponse
): AdaptationSession {
  const tailoredResume = parseResumeHtml(analysis.tailored.html);
  const originalDocument = buildCvDocument(analysis.resume);
  const adaptedDocument = buildAdaptedCvDocument(tailoredResume, analysis.tailored.audits);
  const title = sessionTitle(analysis.job.title, analysis.job.company);
  const now = isoNow();
  const questions = buildQuestions(analysis.score.blockers, analysis.score.missingKeywords);

  return {
    id: nanoid(12),
    title,
    company: analysis.job.company,
    createdAt: now,
    updatedAt: now,
    phase: "chat-diagnostic",
    jobText,
    parsedJob: analysis.job,
    parsedResume: analysis.resume,
    score: analysis.score,
    originalDocument,
    adaptedDocument,
    tailoredHtml: analysis.tailored.html,
    audits: analysis.tailored.audits,
    validationQuestions: questions,
    messages: buildDiagnosticMessages(title, jobText, analysis.score, questions),
  };
}

export function createSessionFromInputs(
  masterResumeHtml: string,
  jobText: string
): AdaptationSession {
  const analysis = runAnalysis(masterResumeHtml, jobText);
  return buildSessionFromAnalysis(jobText, analysis);
}

export function applyTailoredAnalysis(
  session: AdaptationSession,
  analysis: AnalysisResponse
): AdaptationSession {
  const tailoredResume = parseResumeHtml(analysis.tailored.html);
  const adaptedDocument = buildAdaptedCvDocument(tailoredResume, analysis.tailored.audits);
  return {
    ...session,
    parsedResume: analysis.resume,
    parsedJob: analysis.job,
    score: analysis.score,
    tailoredHtml: analysis.tailored.html,
    audits: analysis.tailored.audits,
    adaptedDocument,
    updatedAt: isoNow(),
  };
}

export function completeSession(
  session: AdaptationSession,
  options?: { llmUsed?: boolean; providerName?: string; model?: string }
): AdaptationSession {
  const blocked = blockedClaims(session.audits);
  const provenance = options?.llmUsed
    ? `Génération via **${options.providerName ?? "IA"}**${options.model ? ` (${options.model})` : ""}.`
    : "Génération en mode local déterministe (aucune IA configurée).";
  const completeMessages: ChatMessage[] = [
    ...session.messages,
    { kind: "step", id: "step-generate", label: "Étape 2 · CV adapté généré", done: true },
    { kind: "generating", id: "generation-done", label: "CV adapté prêt", done: true },
    {
      kind: "assistant",
      id: "assistant-complete",
      body: [
        `Le CV adapté est prêt avec un score de **${session.score.global}/100**.`,
        provenance,
        blocked.length
          ? `${blocked.length} revendication${blocked.length > 1 ? "s" : ""} non prouvée${blocked.length > 1 ? "s" : ""} a été bloquée pour éviter toute hallucination.`
          : "Aucune revendication non prouvée n'a été ajoutée.",
      ],
    },
  ];

  return {
    ...session,
    phase: "chat-adapted",
    updatedAt: isoNow(),
    messages: completeMessages,
  };
}

export function summarizeSession(session: AdaptationSession): AdaptationSessionSummary {
  return {
    id: session.id,
    title: session.title,
    company: session.company,
    score: session.score.global,
    status: session.phase === "chat-adapted" ? "adapted" : "diagnostic",
    updatedAt: session.updatedAt,
  };
}
