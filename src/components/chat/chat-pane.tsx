"use client";

import {
  AlertCircle,
  ArrowUp,
  CircleHelp,
  FolderOpen,
  Link as LinkIcon,
  Mic,
  Paperclip,
  Pencil,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  type ChatMessage,
  type ClarificationQuestion,
  type ScoreTable,
} from "@/lib/schemas/chat.schema";
import { type AdaptationSession } from "@/lib/schemas/session.schema";

interface ChatPaneProps {
  session: AdaptationSession | null;
  masterResumeReady: boolean;
  providerReady: boolean;
  providerLabel: string;
  isBusy: boolean;
  onSubmitJob: (jobText: string) => void;
  onAnswerQuestion: (questionId: string, answer: string) => void;
  onAdaptCv: () => void;
  onRetry: () => void;
  onEditMasterResume: () => void;
  onOpenSettings: () => void;
}

const primaryButton =
  "inline-flex h-[34px] items-center justify-center gap-[7px] rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-3.5 text-[13px] font-medium text-white shadow-[var(--shadow-cta)] transition-colors hover:bg-[var(--accent-hover)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";

const toneFill: Record<string, string> = {
  good: "bg-[var(--success)]",
  warn: "bg-[var(--warn)]",
  bad: "bg-[var(--danger)]",
};

const needChipClass: Record<string, string> = {
  required: "bg-[var(--danger-soft)] text-[var(--danger)]",
  preferred: "bg-[var(--warn-soft)] text-[var(--warn)]",
  bonus: "bg-[var(--card-2)] text-[var(--ink-3)]",
};

function markdownParts(text: string) {
  const parts: React.ReactNode[] = [];
  const matcher = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = matcher.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const segment = match[0];
    if (segment.startsWith("**")) parts.push(<strong key={index}>{segment.slice(2, -2)}</strong>);
    else
      parts.push(
        <em
          key={index}
          className="rounded bg-[var(--accent-soft)] px-1.5 py-px font-[family-name:var(--font-mono)] text-[13px] font-medium text-[var(--accent)] not-italic"
        >
          {segment.slice(1, -1)}
        </em>
      );
    last = match.index + segment.length;
    index += 1;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function AssistantAvatar() {
  return (
    <div className="mt-0.5 grid h-[30px] w-[30px] flex-none place-items-center rounded-full bg-[var(--accent-tint)] text-[var(--accent)]">
      <Sparkles size={14} strokeWidth={1.8} />
    </div>
  );
}

function AssistantBubble({ body }: { body: string[] }) {
  return (
    <div className="flex items-start gap-3.5">
      <AssistantAvatar />
      <div className="min-w-0 flex-1 text-[14.5px] leading-[1.6] text-[var(--ink-2)] [&_p]:mt-0 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_strong]:text-[var(--ink)]">
        {body.map((line, i) => (
          <p key={i}>{markdownParts(line)}</p>
        ))}
      </div>
    </div>
  );
}

function UserBubble({ body, truncated }: { body: string; truncated: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const shown = truncated && !expanded ? `${body.slice(0, 220)}…` : body;
  return (
    <div className="flex justify-end">
      <div className="max-w-[78%] rounded-[18px_18px_4px_18px] border border-[var(--line)] bg-[var(--card)] px-4 py-[11px] text-[14.5px] leading-[1.55] whitespace-pre-wrap text-[var(--ink)] shadow-[var(--shadow-sm)]">
        {shown}
        {truncated && (
          <button
            className="mt-1.5 block text-xs font-semibold text-[var(--accent)]"
            type="button"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Réduire" : "Tout afficher"}
          </button>
        )}
      </div>
    </div>
  );
}

function ThinkingLine({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <AssistantAvatar />
      <div className="min-w-0 flex-1 text-[14.5px] leading-[1.6]">
        <div
          key={label}
          className="flex items-center gap-2 truncate font-[family-name:var(--font-mono)] text-[13px] tracking-tight text-[var(--muted)] animate-[rf-fadein_0.45s_ease-out]"
        >
          <span className="flex items-center gap-[3px]">
            <span className="h-[5px] w-[5px] animate-[rf-dot_1s_infinite_alternate] rounded-full bg-[var(--accent)]" />
            <span className="h-[5px] w-[5px] animate-[rf-dot_1s_infinite_alternate] rounded-full bg-[var(--accent)] [animation-delay:120ms]" />
            <span className="h-[5px] w-[5px] animate-[rf-dot_1s_infinite_alternate] rounded-full bg-[var(--accent)] [animation-delay:240ms]" />
          </span>
          <span className="truncate">{label}</span>
        </div>
      </div>
    </div>
  );
}

function ErrorBox({
  message,
  canRetry,
  onRetry,
}: {
  message: string;
  canRetry: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[12px] border border-[rgba(181,57,47,0.25)] bg-[var(--danger-soft)] px-4 py-3.5 text-[var(--danger)]">
      <AlertCircle size={18} className="mt-px flex-none" strokeWidth={2} />
      <div className="min-w-0 flex-1">
        <strong className="block text-[13px] font-semibold">L&apos;IA n&apos;a pas répondu.</strong>
        <p className="m-0 mt-1 text-[13px] leading-[1.55] break-words text-[rgba(181,57,47,0.95)]">
          {message}
        </p>
        <div className="mt-2.5">
          <button
            type="button"
            className="inline-flex h-7 items-center justify-center rounded-md border border-[rgba(181,57,47,0.35)] bg-[var(--card)] px-2.5 text-[12px] font-medium text-[var(--danger)] transition-colors hover:bg-[var(--card-2)] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onRetry}
            disabled={!canRetry}
          >
            Réessayer
          </button>
        </div>
      </div>
    </div>
  );
}

function ClarificationCard({
  question,
  onAnswer,
}: {
  question: ClarificationQuestion;
  onAnswer: (questionId: string, answer: string) => void;
}) {
  const [custom, setCustom] = useState("");
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const answered = Boolean(question.answeredWith);
  const isMultiple = question.responseMode === "multiple";

  function toggleSuggestedAnswer(answer: string) {
    setSelectedAnswers((previous) =>
      previous.includes(answer) ? previous.filter((item) => item !== answer) : [...previous, answer]
    );
  }

  function submitMultipleAnswer() {
    const freeText = custom.trim();
    const merged = freeText.length > 0 ? [...selectedAnswers, freeText] : selectedAnswers;
    if (merged.length === 0) return;
    onAnswer(question.id, merged.join(" ; "));
    setCustom("");
    setSelectedAnswers([]);
  }

  return (
    <div
      className={`rounded-[10px] border border-l-[3px] bg-[var(--card-2)] px-4 py-3.5 transition-opacity ${
        answered
          ? "border-[var(--success)]/40 border-l-[var(--success)] opacity-80"
          : "border-[var(--line)] border-l-[var(--accent)]"
      }`}
    >
      <div className="mb-2 flex items-center gap-2 text-[11.5px] font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
        <CircleHelp className="text-[var(--accent)]" size={13} />
        {question.label}
      </div>
      <div className="m-0 mb-1 font-[family-name:var(--font-display)] text-base leading-[1.4] font-medium tracking-[-0.01em] text-[var(--ink)]">
        {question.question}
      </div>
      <p className="m-0 text-[13px] leading-normal text-[var(--muted)]">{question.context}</p>
      {!answered && (
        <>
          <p className="mt-2 text-[11.5px] text-[var(--muted)]">
            {isMultiple
              ? "Plusieurs réponses possibles."
              : "Choisissez une réponse ou saisissez une précision."}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {question.suggestedAnswers.map((answer) => (
              <button
                className={`rounded-full border px-[11px] py-[5px] text-[12.5px] font-medium transition-colors ${
                  isMultiple && selectedAnswers.includes(answer)
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--line)] bg-[var(--card)] text-[var(--ink-2)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                }`}
                key={answer}
                type="button"
                onClick={() => {
                  if (isMultiple) {
                    toggleSuggestedAnswer(answer);
                    return;
                  }
                  onAnswer(question.id, answer);
                }}
              >
                {answer}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            <input
              className="flex-1 rounded-md border border-[var(--line)] bg-[var(--card)] px-2.5 py-1.5 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:shadow-[var(--focus)]"
              placeholder="Réponse libre…"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && custom.trim().length > 0) {
                  if (isMultiple) {
                    submitMultipleAnswer();
                    return;
                  }
                  onAnswer(question.id, custom.trim());
                  setCustom("");
                }
              }}
            />
            <button
              type="button"
              className="rounded-md border border-[var(--accent)] bg-[var(--accent)] px-3 text-[12.5px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isMultiple ? selectedAnswers.length === 0 && custom.trim().length === 0 : custom.trim().length === 0}
              onClick={() => {
                if (isMultiple) {
                  submitMultipleAnswer();
                  return;
                }
                onAnswer(question.id, custom.trim());
                setCustom("");
              }}
            >
              {isMultiple ? "Valider la sélection" : "Valider"}
            </button>
          </div>
        </>
      )}
      {answered && (
        <div className="mt-2.5 text-[12.5px] text-[var(--success)]">
          ✓ Réponse : {question.answeredWith}
        </div>
      )}
    </div>
  );
}

function ScoreTableCard({ table }: { table: ScoreTable }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setAnimated(true), 80);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--line)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-center justify-between gap-3.5 border-b border-[var(--line)] px-[18px] pt-3.5 pb-3">
        <div className="flex items-center gap-2.5 font-[family-name:var(--font-display)] text-[15px] font-medium tracking-[-0.01em] text-[var(--ink)]">
          <TrendingUp className="h-[26px] w-[26px] rounded-[7px] bg-[var(--accent-tint)] p-1.5 text-[var(--accent)]" />
          Tableau de compatibilité
          <span
            className={`ml-2 rounded-full border px-2 py-[2px] text-[10.5px] font-medium tracking-wider uppercase ${
              table.riskLevel === "low"
                ? "border-[var(--success)]/30 bg-[var(--success-soft)] text-[var(--success)]"
                : table.riskLevel === "medium"
                  ? "border-[var(--warn)]/30 bg-[var(--warn-soft)] text-[var(--warn)]"
                  : "border-[var(--danger)]/30 bg-[var(--danger-soft)] text-[var(--danger)]"
            }`}
          >
            Risque {table.riskLevel}
          </span>
        </div>
        <div className="inline-flex items-baseline gap-1.5">
          <span className="font-[family-name:var(--font-display)] text-[32px] leading-none font-medium tracking-[-0.03em] text-[var(--ink)]">
            {table.global}
          </span>
          <em className="font-[family-name:var(--font-mono)] text-[13px] text-[var(--muted)] not-italic">
            /100
          </em>
        </div>
      </div>
      <div className="px-[18px] pt-2 pb-3">
        {table.rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[160px_1fr_48px] items-center gap-3.5 border-t border-dashed border-[var(--line)] py-2.5 text-[13px] first:border-t-0"
          >
            <div className="font-medium text-[var(--ink-2)]">
              {row.label}
              {row.rationale && (
                <div className="mt-0.5 text-[11.5px] leading-[1.4] font-normal text-[var(--muted)]">
                  {row.rationale}
                </div>
              )}
            </div>
            <div className="h-[5px] overflow-hidden rounded-full bg-[var(--bg-2)]">
              <span
                className={`block h-full rounded-full transition-[width] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${toneFill[row.tone] ?? "bg-[var(--accent)]"}`}
                style={{ width: animated ? `${row.value}%` : 0 }}
              />
            </div>
            <strong className="text-right font-[family-name:var(--font-mono)] text-[13px] font-medium text-[var(--ink)]">
              {row.value}
            </strong>
          </div>
        ))}
      </div>
      {(table.strengths.length > 0 || table.weaknesses.length > 0 || table.blockers.length > 0) && (
        <div className="grid grid-cols-1 gap-3 border-t border-[var(--line)] bg-[var(--bg-2)] px-[18px] py-3 text-[12.5px] md:grid-cols-3">
          {table.strengths.length > 0 && (
            <div>
              <div className="mb-1 text-[10.5px] font-semibold tracking-wider text-[var(--success)] uppercase">
                Forces
              </div>
              <ul className="m-0 list-none space-y-1 p-0 text-[var(--ink-2)]">
                {table.strengths.map((s, i) => (
                  <li key={i} className="leading-[1.45]">
                    • {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {table.weaknesses.length > 0 && (
            <div>
              <div className="mb-1 text-[10.5px] font-semibold tracking-wider text-[var(--warn)] uppercase">
                Faiblesses
              </div>
              <ul className="m-0 list-none space-y-1 p-0 text-[var(--ink-2)]">
                {table.weaknesses.map((s, i) => (
                  <li key={i} className="leading-[1.45]">
                    • {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {table.blockers.length > 0 && (
            <div>
              <div className="mb-1 text-[10.5px] font-semibold tracking-wider text-[var(--danger)] uppercase">
                Bloqueurs
              </div>
              <ul className="m-0 list-none space-y-1 p-0 text-[var(--ink-2)]">
                {table.blockers.map((s, i) => (
                  <li key={i} className="leading-[1.45]">
                    • {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {table.missingKeywords.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] bg-[var(--bg-2)] px-[18px] py-3 text-xs text-[var(--muted)]">
          <span className="font-medium">Mots-clés manquants :</span>
          {table.missingKeywords.map((need) => (
            <em
              key={need.term}
              title={need.reason}
              className={`rounded-full border border-[var(--line)] px-2.5 py-[3px] font-[family-name:var(--font-mono)] text-[11.5px] font-medium not-italic ${needChipClass[need.level] ?? "bg-[var(--card)] text-[var(--ink-3)]"}`}
            >
              {need.term}
            </em>
          ))}
        </div>
      )}
      {table.interviewRisks.length > 0 && (
        <div className="border-t border-[var(--line)] bg-[var(--card-2)] px-[18px] py-3 text-[12.5px] text-[var(--ink-2)]">
          <div className="mb-1 text-[10.5px] font-semibold tracking-wider text-[var(--muted)] uppercase">
            Risques d&apos;entretien
          </div>
          <ul className="m-0 list-none space-y-0.5 p-0">
            {table.interviewRisks.map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Welcome({
  onEditMasterResume,
  onOpenSettings,
  masterResumeReady,
  providerReady,
  providerLabel,
}: {
  onEditMasterResume: () => void;
  onOpenSettings: () => void;
  masterResumeReady: boolean;
  providerReady: boolean;
  providerLabel: string;
}) {
  return (
    <div className="flex min-h-full items-center justify-center px-7 pt-10 pb-20">
      <div className="w-full max-w-[720px]">
        <div className="mb-[18px] inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-[var(--muted)] uppercase">
          <span
            className={`h-1.5 w-1.5 rounded-full ${providerReady ? "bg-[var(--accent)]" : "bg-[var(--warn)]"}`}
          />
          {providerReady ? "Prêt" : `${providerLabel} non détecté`}
        </div>
        <h1 className="m-0 mb-3.5 font-[family-name:var(--font-display)] text-[40px] leading-[1.05] font-medium tracking-[-0.03em] text-balance text-[var(--ink)]">
          Quelle offre <em className="font-medium text-[var(--accent)] italic">adapter</em>{" "}
          aujourd&apos;hui ?
        </h1>
        <p className="mt-0 mb-[24px] max-w-[540px] text-[15.5px] leading-[1.55] text-pretty text-[var(--ink-3)]">
          Collez l&apos;offre. J&apos;analyse, je vous pose les questions utiles si besoin, puis je
          génère le tableau de compatibilité — sans rien inventer.
        </p>
        {!providerReady && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-[10px] border border-[rgba(181,136,46,0.22)] bg-[var(--warn-soft)] px-3 py-2.5 text-[var(--warn)]">
            <span>
              <strong>{providerLabel}</strong> n&apos;est pas détecté. Aucune analyse ne sera lancée
              tant que le CLI n&apos;est pas installé.
            </span>
            <button
              className="ml-auto inline-flex items-center gap-1 rounded-md border border-[rgba(181,136,46,0.32)] bg-[var(--card)] px-2 py-1 text-[12px] font-medium text-[var(--ink-2)] whitespace-nowrap hover:bg-[var(--card-2)]"
              type="button"
              onClick={onOpenSettings}
            >
              Configurer
            </button>
          </div>
        )}
        {!masterResumeReady && (
          <div className="mb-4 rounded-[10px] border border-[rgba(181,136,46,0.22)] bg-[var(--warn-soft)] px-3 py-2.5 text-[var(--warn)]">
            Ajoutez d&apos;abord votre CV maître pour lancer une adaptation.
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2 text-[13px] text-[var(--muted)]">
          <button
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--card-2)] px-2.5 py-1 hover:border-[var(--line-2)] hover:text-[var(--ink-2)]"
            type="button"
            onClick={onEditMasterResume}
          >
            <Pencil size={13} /> Modifier le CV de base
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-[var(--line)] px-2.5 py-1 text-[var(--muted-2)]">
            <LinkIcon size={13} /> Import URL — bientôt
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-[var(--line)] px-2.5 py-1 text-[var(--muted-2)]">
            <FolderOpen size={13} /> Reprendre une session — bientôt
          </span>
        </div>
      </div>
    </div>
  );
}

function Composer({
  disabled,
  onSubmitJob,
}: {
  disabled?: boolean;
  onSubmitJob: (jobText: string) => void;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 140)}px`;
  }, [value]);

  function submit() {
    if (value.trim().length < 20) return;
    onSubmitJob(value);
    setValue("");
  }

  return (
    <div className="flex-none bg-[linear-gradient(180deg,rgba(250,249,245,0)_0%,var(--bg)_30%)] px-6 pt-3.5 pb-5">
      <div className="mx-auto flex max-w-[760px] items-end gap-2.5 rounded-[20px] border border-[var(--line)] bg-[var(--card)] py-1.5 pr-2 pl-4 shadow-[var(--shadow-md)] transition-shadow focus-within:border-[var(--line-2)] focus-within:shadow-[var(--shadow-lg)]">
        <textarea
          className="max-h-[140px] min-h-[26px] flex-1 resize-none border-0 bg-transparent px-1 py-3 text-[14.5px] leading-normal text-[var(--ink)] outline-none placeholder:text-[var(--muted-2)] disabled:opacity-50"
          ref={ref}
          value={value}
          disabled={disabled}
          rows={1}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Collez l'offre d'emploi…"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <div className="flex items-center gap-1 pb-1.5">
          <button
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)]"
            type="button"
            title="Joindre"
            disabled={disabled}
          >
            <Paperclip size={15} />
          </button>
          <button
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)]"
            type="button"
            title="Dicter"
            disabled={disabled}
          >
            <Mic size={15} />
          </button>
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent)] text-white shadow-[var(--shadow-cta)] hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:bg-[var(--line-2)] disabled:shadow-none"
            disabled={disabled || value.trim().length < 20}
            onClick={submit}
          >
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function renderMessage(
  message: ChatMessage,
  onAnswerQuestion: (id: string, answer: string) => void,
  canRetry: boolean,
  onRetry: () => void
) {
  switch (message.kind) {
    case "assistant":
      return <AssistantBubble key={message.id} body={message.body} />;
    case "user":
      return <UserBubble key={message.id} body={message.body} truncated={message.truncated} />;
    case "thinking":
      return <ThinkingLine key="thinking" label={message.label} />;
    case "clarifications":
      return (
        <div key={message.id} className="flex flex-col gap-2.5">
          {message.questions.map((q) => (
            <ClarificationCard key={q.id} question={q} onAnswer={onAnswerQuestion} />
          ))}
        </div>
      );
    case "score-table":
      return <ScoreTableCard key={message.id} table={message.table} />;
    case "error":
      return <ErrorBox key={message.id} message={message.message} canRetry={canRetry} onRetry={onRetry} />;
    case "step":
      return null;
    default:
      return null;
  }
}

export function ChatPane({
  session,
  masterResumeReady,
  providerReady,
  providerLabel,
  isBusy,
  onSubmitJob,
  onAnswerQuestion,
  onAdaptCv,
  onRetry,
  onEditMasterResume,
  onOpenSettings,
}: ChatPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [session?.messages.length, isBusy]);

  if (!session) {
    return (
      <section className="flex min-h-0 min-w-0 flex-col border-r border-[var(--line)] bg-[var(--bg)]">
        <div className="min-h-0 flex-1 overflow-auto px-6 pt-6 pb-2">
          <Welcome
            onEditMasterResume={onEditMasterResume}
            onOpenSettings={onOpenSettings}
            masterResumeReady={masterResumeReady}
            providerReady={providerReady}
            providerLabel={providerLabel}
          />
        </div>
        <Composer disabled={!masterResumeReady || !providerReady} onSubmitJob={onSubmitJob} />
      </section>
    );
  }

  const showAdaptButton = session.phase === "chat-scored";

  return (
    <section className="flex min-h-0 min-w-0 flex-col border-r border-[var(--line)] bg-[var(--bg)]">
      <div className="min-h-0 flex-1 overflow-auto px-6 pt-6 pb-2" ref={scrollRef}>
        <div className="mx-auto flex max-w-[760px] flex-col gap-[22px]">
          {session.messages.map((message) =>
            renderMessage(message, onAnswerQuestion, !isBusy, onRetry)
          )}
          {showAdaptButton && (
            <div className="flex items-center justify-between gap-3.5 rounded-[14px] border border-[var(--line)] bg-[var(--card)] p-[18px] shadow-[var(--shadow-sm)]">
              <div>
                <strong className="text-[14px] text-[var(--ink)]">Prêt à adapter ?</strong>
                <span className="mt-0.5 block text-[13px] text-[var(--muted)]">
                  Le diagnostic est terminé. Je peux maintenant adapter votre CV à cette offre.
                </span>
              </div>
              <button className={primaryButton} type="button" onClick={onAdaptCv}>
                Adapter le CV
              </button>
            </div>
          )}
        </div>
      </div>
      <Composer disabled={isBusy} onSubmitJob={onSubmitJob} />
    </section>
  );
}
