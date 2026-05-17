"use client";

import {
  ArrowRight,
  Check,
  ChevronDown,
  Code2,
  Eye,
  FileUp,
  Terminal,
  TestTube,
} from "lucide-react";
import { BsAnthropic, BsOpenai } from "react-icons/bs";

import { useRef, useState } from "react";

import { type AIProviderId, type ProviderStatus } from "@/lib/schemas/settings.schema";
import React from "react";

const pageClass =
  "mx-auto w-full max-w-[920px] flex-1 overflow-y-auto px-11 pt-9 pb-16 animate-[rf-fade_420ms_cubic-bezier(0.22,1,0.36,1)] max-[980px]:max-w-none max-[980px]:px-5 max-[980px]:pt-7 max-[980px]:pb-12";
const heroClass = "m-0 max-w-none pt-3 pb-7";
const eyebrowClass =
  "mb-3.5 inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-[var(--muted)] uppercase";
const h1Class =
  "m-0 mb-3.5 max-w-none text-balance font-[family-name:var(--font-display)] text-[38px] leading-[1.05] font-medium tracking-[-0.025em] text-[var(--ink)]";
const ledeClass = "m-0 max-w-[560px] text-pretty text-base leading-[1.55] text-[var(--ink-3)]";
const buttonClass =
  "inline-flex h-[34px] items-center justify-center gap-[7px] rounded-lg border border-[var(--line)] bg-[var(--card)] px-3.5 text-[13px] font-medium text-[var(--ink)] shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--line-2)] hover:bg-[var(--card-2)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";
const smallButtonClass =
  "inline-flex h-7 items-center justify-center gap-[5px] rounded-md border border-[var(--line)] bg-[var(--card)] px-2.5 text-[12.5px] font-medium text-[var(--ink)] shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--line-2)] hover:bg-[var(--card-2)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";
const primaryButtonClass =
  "inline-flex h-[42px] items-center justify-center gap-[7px] rounded-[10px] border border-[var(--accent)] bg-[var(--accent)] px-[18px] text-[14.5px] font-medium text-white shadow-[var(--shadow-cta)] transition-colors hover:bg-[var(--accent-hover)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";
const providerStatusClass: Record<ProviderStatus, string> = {
  idle: "border-[var(--line)] bg-[var(--bg-2)] text-[var(--muted)] [&>span]:bg-[var(--muted-2)]",
  checking:
    "border-[rgba(181,136,46,0.22)] bg-[var(--warn-soft)] text-[var(--warn)] [&>span]:animate-[rf-pulse_1.4s_ease-in-out_infinite] [&>span]:bg-[var(--warn)]",
  available:
    "border-[rgba(90,122,79,0.22)] bg-[var(--success-soft)] text-[var(--success)] [&>span]:bg-[var(--success)]",
  unavailable:
    "border-[rgba(181,57,47,0.22)] bg-[var(--danger-soft)] text-[var(--danger)] [&>span]:bg-[var(--danger)]",
};

export interface SetupFlowProps {
  step: "setup-ai" | "setup-cv";
  selectedProvider: AIProviderId;
  providerStatus: Record<AIProviderId, ProviderStatus>;
  providerModels: Record<AIProviderId, string[]>;
  selectedModels: Record<string, string>;
  onSelectProvider: (provider: AIProviderId) => void;
  onTestProvider: (provider: AIProviderId) => void;
  onSelectModel: (provider: AIProviderId, model: string) => void;
  onContinueFromAI: () => void;
  onBackToAI: () => void;
  onSaveMasterResume: (html: string) => void;
}

const providerMeta: Array<{
  id: Exclude<AIProviderId, "mock">;
  icon: React.ComponentType<{ size?: number }>;
  name: string;
  sub: string;
  desc: string;
  install: string;
  keyPlaceholder: string;
}> = [
    {
      id: "claude-code",
      icon: BsAnthropic,
      name: "Claude Code",
      sub: "Anthropic · CLI",
      desc: "Précis, prudent, excellent pour raisonner sur le contexte avant de réécrire.",
      install: "npm install -g @anthropic/claude-code",
      keyPlaceholder: "sk-ant-api03-…",
    },
    {
      id: "openai-codex",
      icon: BsOpenai,
      name: "OpenAI Codex",
      sub: "OpenAI · CLI",
      desc: "Rapide et créatif pour itérer plusieurs variantes de formulation.",
      install: "npm install -g @openai/codex",
      keyPlaceholder: "sk-proj-…",
    },
  ];

function StepRail({ current }: { current: 1 | 2 | 3 }) {
  const steps = ["Configurer l'IA", "Ajouter le CV de base", "Prêt à adapter"];
  return (
    <div className="mb-6 flex w-fit items-center rounded-full border border-[var(--line)] bg-[var(--bg-2)] p-1.5 max-[980px]:w-full max-[980px]:flex-col max-[980px]:items-stretch max-[980px]:rounded-[18px]">
      {steps.map((label, index) => {
        const step = index + 1;
        const isActive = current === step;
        const isDone = current > step;
        return (
          <div className="flex flex-none items-center max-[980px]:w-full" key={label}>
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-[7px] pr-3.5 pl-2.5 text-[13px] font-medium whitespace-nowrap transition-colors ${isActive
                ? "bg-[var(--card)] text-[var(--ink)] shadow-[var(--shadow-sm)]"
                : isDone
                  ? "text-[var(--ink-2)]"
                  : "text-[var(--muted)]"
                }`}
            >
              <span
                className={`grid h-5 w-5 place-items-center rounded-full border font-[family-name:var(--font-mono)] text-[11px] font-semibold ${isActive
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : isDone
                    ? "border-[var(--success)] bg-[var(--success)] text-white"
                    : "border-[var(--line)] bg-[var(--card)] text-[var(--muted)]"
                  }`}
              >
                {isDone ? <Check size={11} strokeWidth={2.4} /> : step}
              </span>
              {label}
            </div>
            {index < steps.length - 1 && (
              <div className="mx-[-4px] h-px w-[18px] flex-none bg-[var(--line-2)] max-[980px]:hidden" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ModelSelect({
  models,
  selected,
  onSelect,
}: {
  models: string[];
  selected: string;
  onSelect: (model: string) => void;
}) {
  return (
    <div className="relative">
      <select
        className="w-full appearance-none rounded-[8px] border border-[var(--line)] bg-[var(--card)] py-2 pr-8 pl-3 font-[family-name:var(--font-mono)] text-[12px] text-[var(--ink-2)] outline-none transition-colors focus:border-[var(--accent)] focus:shadow-[var(--focus)]"
        value={selected}
        onChange={(e) => {
          e.stopPropagation();
          onSelect(e.target.value);
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {models.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
        <option value="__custom__">Saisir un modèle…</option>
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[var(--muted)]"
        size={13}
      />
    </div>
  );
}

function ProviderCard({
  id,
  name,
  sub,
  desc,
  install,
  selected,
  status,
  models,
  selectedModel,
  onSelect,
  onTest,
  onSelectModel,
}: {
  id: AIProviderId;
  name: string;
  sub: string;
  desc: string;
  install: string;
  selected: boolean;
  status: ProviderStatus;
  models: string[];
  selectedModel: string;
  onSelect: (provider: AIProviderId) => void;
  onTest: (provider: AIProviderId) => void;
  onSelectModel: (provider: AIProviderId, model: string) => void;
}) {
  const [customModel, setCustomModel] = useState("");
  const isCustom = selectedModel === "__custom__";

  return (
    <div
      className={`relative w-full cursor-pointer rounded-[14px] border bg-[var(--card)] px-[22px] pt-5 pb-[18px] text-left shadow-[var(--shadow-sm)] transition-all duration-180 hover:-translate-y-0.5 hover:border-[var(--line-2)] hover:shadow-[var(--shadow-md)] ${selected
        ? "border-[var(--accent)] shadow-[0_0_0_3px_var(--accent-ring),var(--shadow-sm)]"
        : "border-[var(--line)]"
        }`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onSelect(id);
      }}
    >
      <div
        className={`absolute top-3.5 right-3.5 grid h-[22px] w-[22px] place-items-center rounded-full bg-[var(--accent)] text-white transition-all duration-180 ${selected ? "scale-100 opacity-100" : "scale-75 opacity-0"
          }`}
      >
        <Check size={13} strokeWidth={2.4} />
      </div>

      <div className="mb-3.5 flex items-center gap-3.5">
        <div
          className={`grid h-11 w-11 flex-none place-items-center rounded-[10px] ${id === "openai-codex"
            ? "bg-[#1f1e1b] text-[#fbfaf6]"
            : "bg-[var(--accent-tint)] text-[var(--accent)]"
            }`}
        >
          {React.createElement(providerMeta.find((p) => p.id === id)?.icon ?? Terminal, { size: 17 })}
        </div>
        <div>
          <div className="font-[family-name:var(--font-display)] text-[17px] leading-[1.1] font-medium tracking-[-0.01em] text-[var(--ink)]">
            {name}
          </div>
          <div className="mt-0.5 font-[family-name:var(--font-mono)] text-xs text-[var(--muted)]">
            {sub}
          </div>
        </div>
      </div>

      <p className="m-0 mb-4 text-[13.5px] leading-normal text-[var(--ink-3)]">{desc}</p>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-[11px] py-[5px] text-[12.5px] font-medium ${providerStatusClass[status]}`}
        >
          <span className="h-1.5 w-1.5 rounded-full" />
          {status === "idle"
            ? "Non testé"
            : status === "checking"
              ? "Test en cours…"
              : status === "available"
                ? "Disponible · CLI détecté"
                : "CLI introuvable"}
        </span>
        <button
          className={smallButtonClass}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTest(id);
          }}
        >
          <TestTube size={12} /> Tester
        </button>
      </div>

      {status === "unavailable" && (
        <code className="mt-2.5 block rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-2 py-1.5 font-[family-name:var(--font-mono)] text-[11px] text-[var(--muted)]">
          {install}
        </code>
      )}

      {/* Model row — always visible */}
      {models.length > 0 && (
        <div
          className="mt-4 border-t border-dashed border-[var(--line)] pt-3.5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.1em] text-[var(--muted)] uppercase">
            <Terminal size={10} /> Modèle
          </div>
          {selected ? (
            <>
              <ModelSelect
                models={models}
                selected={selectedModel}
                onSelect={(m) => onSelectModel(id, m)}
              />
              {isCustom && (
                <input
                  type="text"
                  className="mt-1.5 w-full rounded-[8px] border border-[var(--line)] bg-[var(--card-2)] px-3 py-[7px] font-[family-name:var(--font-mono)] text-[12px] text-[var(--ink-2)] outline-none transition-colors focus:border-[var(--accent)] focus:bg-[var(--card)] focus:shadow-[var(--focus)]"
                  placeholder="nom-exact-du-modèle"
                  value={customModel}
                  onChange={(e) => {
                    setCustomModel(e.target.value);
                    if (e.target.value) onSelectModel(id, e.target.value);
                  }}
                />
              )}
            </>
          ) : (
            <div className="rounded-[8px] border border-[var(--line)] bg-[var(--bg-2)] px-3 py-[7px] font-[family-name:var(--font-mono)] text-[12px] text-[var(--muted)]">
              {selectedModel || models[0]}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SetupAI(props: SetupFlowProps) {
  return (
    <main className={pageClass}>
      <div className={heroClass}>
        <div className={eyebrowClass}>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> Bienvenue · première
          configuration
        </div>
        <h1 className={h1Class}>
          Choisissez votre <em className="font-medium text-[var(--accent)] italic">moteur</em>{" "}
          d&apos;adaptation.
        </h1>
        <p className={ledeClass}>
          ResumeForge s&apos;appuie sur un assistant local. Aucune donnée ne quitte votre machine
          au-delà des appels à votre IA configurée.
        </p>
      </div>
      <StepRail current={1} />
      <div className="mt-2 grid grid-cols-2 gap-3.5 max-[980px]:grid-cols-1">
        {providerMeta.map((provider) => (
          <ProviderCard
            key={provider.id}
            {...provider}
            selected={props.selectedProvider === provider.id}
            status={props.providerStatus[provider.id]}
            models={props.providerModels[provider.id]}
            selectedModel={
              props.selectedModels[provider.id] ?? props.providerModels[provider.id][0] ?? ""
            }
            onSelect={props.onSelectProvider}
            onTest={props.onTestProvider}
            onSelectModel={props.onSelectModel}
          />
        ))}
      </div>
      <div className="mt-[22px] flex items-start gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--bg-2)] px-4 py-3.5 text-[13px] leading-[1.55] text-[var(--ink-3)]">
        <Terminal
          className="h-[26px] w-[26px] flex-none rounded-[7px] border border-[var(--line)] bg-[var(--card)] p-[5px] text-[var(--muted)]"
          size={15}
        />
        <span>
          Vos clés restent dans la configuration du CLI choisi. Le mode local déterministe reste
          disponible pour travailler hors-ligne.
        </span>
      </div>
      <div className="mt-7 flex justify-end gap-2.5">
        <button className={buttonClass} type="button" onClick={props.onContinueFromAI}>
          Configurer plus tard
        </button>
        <button className={primaryButtonClass} type="button" onClick={props.onContinueFromAI}>
          Continuer <ArrowRight size={14} />
        </button>
      </div>
    </main>
  );
}

function SetupCV({ onBackToAI, onSaveMasterResume }: SetupFlowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"paste" | "file">("paste");
  const [html, setHtml] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const hasContent = html.trim().length > 100;

  function handleFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setHtml(String(event.target?.result ?? ""));
      setFileName(file.name);
    };
    reader.readAsText(file);
  }

  return (
    <main className={pageClass}>
      <div className={heroClass}>
        <div className={eyebrowClass}>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> Étape 2 · CV de base
        </div>
        <h1 className={h1Class}>
          Importez votre <em className="font-medium text-[var(--accent)] italic">CV maître</em>.
        </h1>
        <p className={ledeClass}>
          C&apos;est la base que ResumeForge adaptera à chaque offre. Collez le HTML ou déposez un
          fichier local.
        </p>
      </div>
      <StepRail current={2} />
      <div className="overflow-hidden rounded-[14px] border border-[var(--line)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
        <div className="flex gap-1 border-b border-[var(--line)] bg-[var(--bg-2)] px-2 pt-2">
          <button
            className={`inline-flex items-center gap-[7px] rounded-t-md border-b-2 px-3.5 pt-[9px] pb-2.5 text-[13px] font-medium transition-colors hover:text-[var(--ink-2)] ${tab === "paste"
              ? "border-[var(--accent)] bg-[var(--card)] text-[var(--ink)]"
              : "border-transparent text-[var(--muted)]"
              }`}
            type="button"
            onClick={() => setTab("paste")}
          >
            <Code2 size={13} /> Coller le HTML
          </button>
          <button
            className={`inline-flex items-center gap-[7px] rounded-t-md border-b-2 px-3.5 pt-[9px] pb-2.5 text-[13px] font-medium transition-colors hover:text-[var(--ink-2)] ${tab === "file"
              ? "border-[var(--accent)] bg-[var(--card)] text-[var(--ink)]"
              : "border-transparent text-[var(--muted)]"
              }`}
            type="button"
            onClick={() => setTab("file")}
          >
            <FileUp size={13} /> Déposer un fichier
          </button>
        </div>
        <div className="p-[18px]">
          {tab === "paste" ? (
            <textarea
              className="h-auto min-h-[260px] w-full resize-y rounded-[10px] border border-[var(--line)] bg-[var(--card-2)] px-4 py-3.5 font-[family-name:var(--font-mono)] text-[12.5px] leading-[1.55] text-[var(--ink-2)] transition-colors outline-none focus:border-[var(--accent)] focus:bg-[var(--card)] focus:shadow-[var(--focus)]"
              value={html}
              onChange={(event) => setHtml(event.target.value)}
              placeholder={
                "<!doctype html>\n<html>\n  <body>\n    <header>\n      <h1>Votre Nom</h1>\n      <p class=\"contact\">email@exemple.com · Ville</p>\n    </header>\n    <section>\n      <h2>Résumé</h2>\n      <p>…</p>\n    </section>\n    <section>\n      <h2>Expérience</h2>\n      <h3>Rôle · Société</h3>\n      <ul>\n        <li>…</li>\n      </ul>\n    </section>\n  </body>\n</html>"
              }
              spellCheck={false}
            />
          ) : (
            <button
              className={`grid min-h-[260px] w-full place-items-center content-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed p-10 text-center text-[var(--muted)] transition-colors ${dragOver
                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                : "border-[var(--line-2)] bg-[var(--card-2)]"
                }`}
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                handleFile(event.dataTransfer.files[0]);
              }}
            >
              <FileUp className="h-[52px] w-[52px] rounded-xl border border-[var(--line)] bg-[var(--bg-2)] p-3.5 text-[var(--ink-2)]" />
              <strong className="font-[family-name:var(--font-display)] text-[17px] font-medium tracking-[-0.01em] text-[var(--ink)]">
                {fileName ?? "Déposez votre fichier .html"}
              </strong>
              <span className="max-w-[340px] text-[13px] leading-normal text-[var(--muted)]">
                Glissez-déposez votre CV ou cliquez pour choisir un fichier.
              </span>
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[var(--line)] bg-[var(--bg-2)] px-4 py-3 text-[12.5px] text-[var(--muted)]">
          <div className="inline-flex flex-wrap items-center gap-2">
            {hasContent ? (
              <>
                <span className="inline-flex items-center gap-1 text-[var(--success)]">
                  <Check size={12} /> Détecté
                </span>
                <span>·</span>
                <span className="font-[family-name:var(--font-mono)]">
                  {(html.length / 1024).toFixed(1)} ko
                </span>
              </>
            ) : (
              "En attente d'un CV…"
            )}
          </div>
          <button className={smallButtonClass} type="button" disabled={!hasContent}>
            <Eye size={12} /> Aperçu
          </button>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".html,.htm,.txt"
        hidden
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <div className="mt-7 flex justify-between gap-2.5">
        <button className={buttonClass} type="button" onClick={onBackToAI}>
          Retour
        </button>
        <button
          className={primaryButtonClass}
          type="button"
          disabled={!hasContent}
          onClick={() => onSaveMasterResume(html)}
        >
          Enregistrer & commencer <ArrowRight size={14} />
        </button>
      </div>
    </main>
  );
}

export function SetupFlow(props: SetupFlowProps) {
  return props.step === "setup-ai" ? <SetupAI {...props} /> : <SetupCV {...props} />;
}
