"use client";

import {
  ArrowUp,
  Check,
  CircleHelp,
  FileText,
  FolderOpen,
  Link,
  Mic,
  Paperclip,
  Pencil,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SAMPLE_JOB_TEXT } from "@/lib/resumeforge/sample-data";
import { type ChatMessage, type ValidationQuestion } from "@/lib/schemas/chat.schema";
import { type AdaptationSession } from "@/lib/schemas/session.schema";

interface ChatPaneProps {
  session: AdaptationSession | null;
  masterResumeReady: boolean;
  isGenerating: boolean;
  onSubmitJob: (jobText: string) => void;
  onGenerate: () => void;
  onAnswerQuestion: (questionId: string, answer: string) => void;
  onEditMasterResume: () => void;
}

const smallButton =
  "inline-flex h-7 items-center justify-center gap-[5px] rounded-md border border-[var(--line)] bg-[var(--card)] px-2.5 text-[12.5px] font-medium text-[var(--ink)] shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--line-2)] hover:bg-[var(--card-2)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";
const primarySmallButton =
  "inline-flex h-7 items-center justify-center gap-[5px] rounded-md border border-[var(--accent)] bg-[var(--accent)] px-2.5 text-[12.5px] font-medium text-white shadow-[var(--shadow-cta)] transition-colors hover:bg-[var(--accent-hover)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";
const primaryButton =
  "inline-flex h-[34px] items-center justify-center gap-[7px] rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-3.5 text-[13px] font-medium text-white shadow-[var(--shadow-cta)] transition-colors hover:bg-[var(--accent-hover)] active:translate-y-px";
const metricFillClass: Record<string, string> = {
  good: "bg-[var(--success)]",
  warn: "bg-[var(--warn)]",
  bad: "bg-[var(--danger)]",
};
const needChipClass: Record<string, string> = {
  required: "bg-[var(--danger-soft)] text-[var(--danger)]",
  preferred: "bg-[var(--warn-soft)] text-[var(--warn)]",
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

function StepBadge({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="inline-flex items-center gap-2.5 self-center rounded-full border border-[var(--line)] bg-[var(--card)] py-1.5 pr-3.5 pl-2 text-xs font-medium whitespace-nowrap text-[var(--muted)] shadow-[var(--shadow-sm)]">
      <span
        className={`grid h-[18px] w-[18px] place-items-center rounded-full font-[family-name:var(--font-mono)] text-[10px] font-semibold text-white ${
          done ? "bg-[var(--success)]" : "bg-[var(--accent)]"
        }`}
      >
        {done ? <Check size={10} /> : null}
      </span>
      {label}
    </div>
  );
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
        {body.map((line) => (
          <p key={line}>{markdownParts(line)}</p>
        ))}
      </div>
    </div>
  );
}

function UserBubble({ body, truncated }: { body: string; truncated: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const shown = truncated && !expanded ? `${body.slice(0, 220)}...` : body;
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

function StatsCard({ message }: { message: Extract<ChatMessage, { kind: "stats" }> }) {
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
          {message.title}
        </div>
        <div className="inline-flex items-baseline gap-1.5">
          <span className="font-[family-name:var(--font-display)] text-[32px] leading-none font-medium tracking-[-0.03em] text-[var(--ink)]">
            {message.score}
          </span>
          <em className="font-[family-name:var(--font-mono)] text-[13px] text-[var(--muted)] not-italic">
            /100
          </em>
        </div>
      </div>
      <div className="px-[18px] pt-2 pb-4">
        {message.rows.map((row) => (
          <div
            className="grid grid-cols-[140px_1fr_48px] items-center gap-3.5 border-t border-dashed border-[var(--line)] py-2.5 text-[13px] first:border-t-0"
            key={row.label}
          >
            <div className="font-medium text-[var(--ink-2)]">{row.label}</div>
            <div className="h-[5px] overflow-hidden rounded-full bg-[var(--bg-2)]">
              <span
                className={`block h-full rounded-full transition-[width] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${metricFillClass[row.tone] ?? "bg-[var(--accent)]"}`}
                style={{ width: animated ? `${row.value}%` : 0 }}
              />
            </div>
            <strong className="text-right font-[family-name:var(--font-mono)] text-[13px] font-medium text-[var(--ink)]">
              {row.value}
            </strong>
          </div>
        ))}
      </div>
      {message.needs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2.5 border-t border-[var(--line)] bg-[var(--bg-2)] px-[18px] py-3 text-xs text-[var(--muted)]">
          <span className="font-medium">Manquants détectés :</span>
          {message.needs.map((need) => (
            <em
              className={`rounded-full border border-[var(--line)] px-2.5 py-[3px] font-[family-name:var(--font-mono)] text-[11.5px] font-medium not-italic ${needChipClass[need.level] ?? "bg-[var(--card)] text-[var(--ink-3)]"}`}
              key={need.term}
            >
              {need.term}
            </em>
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  question,
  onAnswerQuestion,
}: {
  question: ValidationQuestion;
  onAnswerQuestion: (questionId: string, answer: string) => void;
}) {
  return (
    <div className="rounded-[10px] border border-l-[3px] border-[var(--line)] border-l-[var(--accent)] bg-[var(--card-2)] px-4 py-3.5">
      <div className="mb-2 flex items-center gap-2 text-[11.5px] font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
        <CircleHelp className="text-[var(--accent)]" size={13} />
        {question.label}
      </div>
      <div className="m-0 mb-1 font-[family-name:var(--font-display)] text-base leading-[1.4] font-medium tracking-[-0.01em] text-[var(--ink)]">
        {question.question}
      </div>
      <p className="m-0 text-[13px] leading-normal text-[var(--muted)]">{question.context}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {question.suggestedAnswers.map((answer) => (
          <button
            className="rounded-full border border-[var(--line)] bg-[var(--card)] px-[11px] py-[5px] text-[12.5px] font-medium text-[var(--ink-2)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
            key={answer}
            type="button"
            onClick={() => onAnswerQuestion(question.id, answer)}
          >
            {answer}
          </button>
        ))}
      </div>
      {question.answeredWith && (
        <div className="mt-2.5 text-[12.5px] text-[var(--success)]">
          Réponse enregistrée : {question.answeredWith}
        </div>
      )}
    </div>
  );
}

function GeneratingCard({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-4 py-3.5">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--accent-tint)] text-[var(--accent)]">
        {done ? <Check size={14} /> : <Sparkles size={14} />}
      </span>
      <div>
        <strong className="text-[13.5px] font-semibold text-[var(--ink)]">{label}</strong>
        {!done && (
          <div className="mt-2 h-[3px] w-[220px] overflow-hidden rounded-full bg-[var(--bg-2)]">
            <i className="block h-full w-[45%] animate-[rf-slide_1.1s_ease-in-out_infinite] rounded-full bg-[var(--accent)]" />
          </div>
        )}
      </div>
    </div>
  );
}

function ActionPaste({ onSubmitJob }: { onSubmitJob: (jobText: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="rounded-[14px] border border-[var(--line)] bg-[var(--card)] px-[18px] py-4 shadow-[var(--shadow-sm)]">
      <div className="mb-2.5 flex items-center gap-2 font-[family-name:var(--font-display)] text-[15px] font-medium tracking-[-0.01em] text-[var(--ink)]">
        <FileText className="h-7 w-7 rounded-[7px] bg-[var(--accent-tint)] p-[7px] text-[var(--accent)]" />
        Description du poste
      </div>
      <textarea
        className="min-h-[120px] w-full resize-y rounded-[10px] border border-[var(--line)] bg-[var(--card-2)] px-[13px] py-[11px] text-[13.5px] leading-[1.55] text-[var(--ink-2)] outline-none focus:border-[var(--accent)] focus:bg-[var(--card)] focus:shadow-[var(--focus)]"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Collez ici l'offre d'emploi complète..."
      />
      <div className="mt-2.5 flex items-center justify-between gap-3 text-xs text-[var(--muted)]">
        <span>Le texte est traité localement par votre moteur configuré.</span>
        <div className="flex gap-1.5">
          <button className={smallButton} type="button">
            <FolderOpen size={12} /> Depuis fichier
          </button>
          <button
            className={primarySmallButton}
            type="button"
            disabled={value.trim().length < 40}
            onClick={() => onSubmitJob(value)}
          >
            <ArrowUp size={12} /> Lancer l&apos;analyse
          </button>
        </div>
      </div>
    </div>
  );
}

function Welcome({
  onSubmitJob,
  onEditMasterResume,
  masterResumeReady,
}: {
  onSubmitJob: (jobText: string) => void;
  onEditMasterResume: () => void;
  masterResumeReady: boolean;
}) {
  return (
    <div className="flex min-h-full items-center justify-center px-7 pt-10 pb-20">
      <div className="w-full max-w-[720px] text-center">
        <div className="mb-[18px] inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-[var(--muted)] uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> Prêt
        </div>
        <h1 className="m-0 mb-3.5 font-[family-name:var(--font-display)] text-[40px] leading-[1.05] font-medium tracking-[-0.03em] text-balance text-[var(--ink)]">
          Quelle offre <em className="font-medium text-[var(--accent)] italic">adapter</em>{" "}
          aujourd&apos;hui ?
        </h1>
        <p className="mx-auto mt-0 mb-[30px] max-w-[540px] text-[15.5px] leading-[1.55] text-pretty text-[var(--ink-3)]">
          Collez une description de poste pour commencer. Je vais comparer à votre CV, vous poser
          quelques questions, puis générer une version adaptée — sans rien inventer.
        </p>
        {!masterResumeReady && (
          <div className="mx-auto mt-[18px] max-w-[520px] rounded-[10px] border border-[rgba(181,136,46,0.22)] bg-[var(--warn-soft)] px-3 py-2.5 text-[var(--warn)]">
            Ajoutez d&apos;abord votre CV maître pour lancer une adaptation.
          </div>
        )}
        <div className="mx-auto grid max-w-[560px] grid-cols-2 gap-2.5 text-left max-[980px]:grid-cols-1">
          <button
            className="rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-4 py-3.5 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-[var(--line-2)] hover:shadow-[var(--shadow-md)] disabled:cursor-not-allowed disabled:opacity-50 [&_span]:block [&_span]:text-[12.5px] [&_span]:leading-[1.45] [&_span]:text-[var(--muted)] [&_strong]:mb-[3px] [&_strong]:block [&_strong]:text-[13.5px] [&_strong]:font-medium [&_strong]:text-[var(--ink)] [&_svg]:hidden"
            type="button"
            onClick={() => onSubmitJob(SAMPLE_JOB_TEXT)}
            disabled={!masterResumeReady}
          >
            <FileText size={16} />
            <strong>Coller une offre</strong>
            <span>Charge un exemple complet pour tester le flux.</span>
          </button>
          <button
            className="rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-4 py-3.5 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-[var(--line-2)] hover:shadow-[var(--shadow-md)] disabled:cursor-not-allowed disabled:opacity-50 [&_span]:block [&_span]:text-[12.5px] [&_span]:leading-[1.45] [&_span]:text-[var(--muted)] [&_strong]:mb-[3px] [&_strong]:block [&_strong]:text-[13.5px] [&_strong]:font-medium [&_strong]:text-[var(--ink)] [&_svg]:hidden"
            type="button"
            disabled
          >
            <Link size={16} />
            <strong>Depuis une URL</strong>
            <span>LinkedIn, Welcome to the Jungle, Lever, Ashby.</span>
          </button>
          <button
            className="rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-4 py-3.5 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-[var(--line-2)] hover:shadow-[var(--shadow-md)] disabled:cursor-not-allowed disabled:opacity-50 [&_span]:block [&_span]:text-[12.5px] [&_span]:leading-[1.45] [&_span]:text-[var(--muted)] [&_strong]:mb-[3px] [&_strong]:block [&_strong]:text-[13.5px] [&_strong]:font-medium [&_strong]:text-[var(--ink)] [&_svg]:hidden"
            type="button"
            disabled
          >
            <FolderOpen size={16} />
            <strong>Reprendre une session</strong>
            <span>Voir vos adaptations récentes.</span>
          </button>
          <button
            className="rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-4 py-3.5 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-[var(--line-2)] hover:shadow-[var(--shadow-md)] disabled:cursor-not-allowed disabled:opacity-50 [&_span]:block [&_span]:text-[12.5px] [&_span]:leading-[1.45] [&_span]:text-[var(--muted)] [&_strong]:mb-[3px] [&_strong]:block [&_strong]:text-[13.5px] [&_strong]:font-medium [&_strong]:text-[var(--ink)] [&_svg]:hidden"
            type="button"
            onClick={onEditMasterResume}
          >
            <Pencil size={16} />
            <strong>Modifier le CV de base</strong>
            <span>Mettre à jour le CV maître avant adaptation.</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function TypingMessage({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <AssistantAvatar />
      <div className="min-w-0 flex-1 text-[14.5px] leading-[1.6] text-[var(--ink-2)]">
        <div className="flex items-center gap-1.5 text-[var(--muted)]">
          <span className="h-[5px] w-[5px] animate-[rf-dot_1s_infinite_alternate] rounded-full bg-[var(--accent)]" />
          <span className="h-[5px] w-[5px] animate-[rf-dot_1s_infinite_alternate] rounded-full bg-[var(--accent)] [animation-delay:120ms]" />
          <span className="h-[5px] w-[5px] animate-[rf-dot_1s_infinite_alternate] rounded-full bg-[var(--accent)] [animation-delay:240ms]" />
          {label}
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
          className="max-h-[140px] min-h-[26px] flex-1 resize-none border-0 bg-transparent px-1 py-3 text-[14.5px] leading-normal text-[var(--ink)] outline-none placeholder:text-[var(--muted-2)]"
          ref={ref}
          value={value}
          disabled={disabled}
          rows={1}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Collez l'offre d'emploi, ou demandez une modification..."
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
          >
            <Paperclip size={15} />
          </button>
          <button
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)]"
            type="button"
            title="Dicter"
          >
            <Mic size={15} />
          </button>
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent)] text-white shadow-[var(--shadow-cta)] hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:bg-[var(--line-2)] disabled:shadow-none"
            disabled={value.trim().length < 20}
            onClick={submit}
          >
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
      <div className="mx-auto mt-2 flex max-w-[760px] items-center justify-between px-1 text-[11.5px] text-[var(--muted)]">
        <span>
          Mode local ·{" "}
          <span className="font-[family-name:var(--font-mono)] text-[var(--success)]">
            ● connecté
          </span>
        </span>
        <span>
          <span className="rounded border border-[var(--line)] bg-[var(--bg-2)] px-[5px] py-px font-[family-name:var(--font-mono)] text-[10.5px] text-[var(--muted-2)] max-[1080px]:hidden">
            ⏎
          </span>{" "}
          envoyer ·{" "}
          <span className="rounded border border-[var(--line)] bg-[var(--bg-2)] px-[5px] py-px font-[family-name:var(--font-mono)] text-[10.5px] text-[var(--muted-2)] max-[1080px]:hidden">
            ⇧⏎
          </span>{" "}
          nouvelle ligne
        </span>
      </div>
    </div>
  );
}

export function ChatPane({
  session,
  masterResumeReady,
  isGenerating,
  onSubmitJob,
  onGenerate,
  onAnswerQuestion,
  onEditMasterResume,
}: ChatPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [session?.messages.length, isGenerating]);

  if (!session) {
    return (
      <section className="flex min-h-0 min-w-0 flex-col border-r border-[var(--line)] bg-[var(--bg)]">
        <div className="min-h-0 flex-1 overflow-auto px-6 pt-6 pb-2">
          <Welcome
            onSubmitJob={onSubmitJob}
            onEditMasterResume={onEditMasterResume}
            masterResumeReady={masterResumeReady}
          />
        </div>
        <Composer disabled={!masterResumeReady} onSubmitJob={onSubmitJob} />
      </section>
    );
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-col border-r border-[var(--line)] bg-[var(--bg)]">
      <div className="min-h-0 flex-1 overflow-auto px-6 pt-6 pb-2" ref={scrollRef}>
        <div className="mx-auto flex max-w-[760px] flex-col gap-[22px]">
          {session.messages.map((message) => {
            if (message.kind === "step")
              return <StepBadge key={message.id} label={message.label} done={message.done} />;
            if (message.kind === "assistant")
              return <AssistantBubble key={message.id} body={message.body} />;
            if (message.kind === "assistant-typing")
              return <TypingMessage key={message.id} label={message.label} />;
            if (message.kind === "user")
              return (
                <UserBubble key={message.id} body={message.body} truncated={message.truncated} />
              );
            if (message.kind === "stats") return <StatsCard key={message.id} message={message} />;
            if (message.kind === "question")
              return (
                <QuestionCard
                  key={message.id}
                  question={message.question}
                  onAnswerQuestion={onAnswerQuestion}
                />
              );
            if (message.kind === "generating")
              return <GeneratingCard key={message.id} label={message.label} done={message.done} />;
            return null;
          })}
          {isGenerating && <GeneratingCard label="réécriture des sections prouvées" done={false} />}
          {session.phase === "chat-diagnostic" && !isGenerating && (
            <div className="flex items-center justify-between gap-3.5 rounded-[14px] border border-[var(--line)] bg-[var(--card)] p-[18px] shadow-[var(--shadow-sm)]">
              <div>
                <strong>Diagnostic prêt.</strong>
                <span className="mt-0.5 block text-[13px] text-[var(--muted)]">
                  Générez une version adaptée en gardant les revendications non prouvées bloquées.
                </span>
              </div>
              <button className={primaryButton} type="button" onClick={onGenerate}>
                Générer le CV adapté
              </button>
            </div>
          )}
          {session.phase === "chat-diagnostic" && <ActionPaste onSubmitJob={onSubmitJob} />}
        </div>
      </div>
      <Composer onSubmitJob={onSubmitJob} />
    </section>
  );
}
