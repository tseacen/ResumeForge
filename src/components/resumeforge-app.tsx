"use client";

import { useEffect, useReducer, useRef, useState } from "react";

import { ChatPane } from "@/components/chat/chat-pane";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { PreviewPane } from "@/components/preview/preview-pane";
import { SetupFlow } from "@/components/setup/setup-flow";
import { FALLBACK_MODELS } from "@/lib/llm/models-client";
import { devError, devLog, devTimer } from "@/lib/logger";
import {
  applyTailoredAnalysis,
  buildSessionFromAnalysis,
  completeSession,
  summarizeSession,
} from "@/lib/resumeforge/agent";
import { loadPersistedState, savePersistedState } from "@/lib/resumeforge/storage";
import { type ResumeForgePersistedState, type ResumeForgeState } from "@/lib/schemas/app.schema";
import { type AdaptationSession, type AppPhase } from "@/lib/schemas/session.schema";
import { type AIProviderId, type ProviderStatus } from "@/lib/schemas/settings.schema";
import { type AnalysisResponse } from "@/lib/types";

interface GenerateApiResponse extends AnalysisResponse {
  llm?: {
    used: boolean;
    providerName: string;
    model?: string;
    mock: boolean;
    errors: string[];
  };
}

const providerDefaults: Record<AIProviderId, ProviderStatus> = {
  "claude-code": "idle",
  "openai-codex": "idle",
  mock: "idle",
};

const initialState: ResumeForgeState = {
  version: 1,
  phase: "setup-ai",
  settings: {
    selectedProvider: "claude-code",
    onboardingCompleted: false,
    language: "fr",
    selectedModels: {},
  },
  masterResumeHtml: null,
  sessions: [],
  sessionArchive: [],
  activeSession: null,
  providerStatus: providerDefaults,
  previewMode: "original",
  error: null,
};

type Action =
  | { type: "hydrate"; state: ResumeForgePersistedState }
  | { type: "provider/select"; provider: AIProviderId }
  | { type: "provider/status"; provider: AIProviderId; status: ProviderStatus }
  | { type: "settings/model"; provider: AIProviderId; model: string }
  | { type: "setup/ai-complete" }
  | { type: "master/save"; html: string }
  | { type: "master/edit" }
  | { type: "session/new" }
  | { type: "session/create"; session: AdaptationSession }
  | { type: "session/apply-tailored"; analysis: AnalysisResponse }
  | {
      type: "session/complete";
      llmUsed?: boolean;
      providerName?: string;
      model?: string;
    }
  | { type: "session/select"; id: string }
  | { type: "session/delete"; id: string }
  | { type: "question/answer"; questionId: string; answer: string }
  | { type: "preview/mode"; mode: ResumeForgeState["previewMode"] }
  | { type: "settings/open" }
  | { type: "error"; message: string | null };

function phaseFromPersisted(state: ResumeForgePersistedState): AppPhase {
  if (!state.settings.onboardingCompleted) return "setup-ai";
  if (!state.masterResumeHtml) return "setup-cv";
  return state.activeSession?.phase ?? "ready-empty";
}

function persistedFromState(state: ResumeForgeState): ResumeForgePersistedState {
  return {
    version: 1,
    settings: state.settings,
    masterResumeHtml: state.masterResumeHtml,
    sessions: state.sessions,
    sessionArchive: state.sessionArchive,
    activeSession: state.activeSession,
  };
}

function upsertSession(
  state: ResumeForgeState,
  session: AdaptationSession
): Pick<ResumeForgeState, "sessions" | "sessionArchive" | "activeSession"> {
  const summary = summarizeSession(session);
  const sessions = [summary, ...state.sessions.filter((item) => item.id !== session.id)].slice(
    0,
    20
  );
  const sessionArchive = [
    session,
    ...state.sessionArchive.filter((item) => item.id !== session.id),
  ].slice(0, 20);
  return { sessions, sessionArchive, activeSession: session };
}

function reducer(state: ResumeForgeState, action: Action): ResumeForgeState {
  switch (action.type) {
    case "hydrate": {
      const settings =
        action.state.settings.selectedProvider === "mock"
          ? { ...action.state.settings, selectedProvider: "claude-code" as const }
          : action.state.settings;

      return {
        ...state,
        ...action.state,
        settings,
        phase: phaseFromPersisted(action.state),
        providerStatus: providerDefaults,
        previewMode: action.state.activeSession?.phase === "chat-adapted" ? "adapted" : "original",
        error: null,
      };
    }
    case "provider/select":
      return { ...state, settings: { ...state.settings, selectedProvider: action.provider } };
    case "provider/status":
      return {
        ...state,
        providerStatus: { ...state.providerStatus, [action.provider]: action.status },
      };
    case "settings/model":
      return {
        ...state,
        settings: {
          ...state.settings,
          selectedModels: { ...state.settings.selectedModels, [action.provider]: action.model },
        },
      };
    case "setup/ai-complete":
      return {
        ...state,
        phase: "setup-cv",
        settings: { ...state.settings, onboardingCompleted: true },
      };
    case "master/save":
      return {
        ...state,
        masterResumeHtml: action.html,
        phase: "ready-empty",
        activeSession: null,
        previewMode: "original",
      };
    case "master/edit":
      return {
        ...state,
        phase: "setup-cv",
        activeSession: null,
        previewMode: "original",
        error: null,
      };
    case "session/new":
      return {
        ...state,
        phase: state.masterResumeHtml ? "ready-empty" : "setup-cv",
        activeSession: null,
        previewMode: "original",
        error: null,
      };
    case "session/create":
      return {
        ...state,
        ...upsertSession(state, action.session),
        phase: "chat-diagnostic",
        previewMode: "original",
        error: null,
      };
    case "session/apply-tailored": {
      if (!state.activeSession) return state;
      const updated = applyTailoredAnalysis(state.activeSession, action.analysis);
      return { ...state, ...upsertSession(state, updated) };
    }
    case "session/complete": {
      if (!state.activeSession) return state;
      const completed = completeSession(state.activeSession, {
        llmUsed: action.llmUsed,
        providerName: action.providerName,
        model: action.model,
      });
      return {
        ...state,
        ...upsertSession(state, completed),
        phase: "chat-adapted",
        previewMode: "adapted",
      };
    }
    case "session/select": {
      const selected = state.sessionArchive.find((session) => session.id === action.id);
      if (!selected) return state;
      return {
        ...state,
        activeSession: selected,
        phase: selected.phase,
        previewMode: selected.phase === "chat-adapted" ? "adapted" : "original",
      };
    }
    case "session/delete": {
      const sessions = state.sessions.filter((session) => session.id !== action.id);
      const sessionArchive = state.sessionArchive.filter((session) => session.id !== action.id);
      const wasActive = state.activeSession?.id === action.id;
      return {
        ...state,
        sessions,
        sessionArchive,
        activeSession: wasActive ? null : state.activeSession,
        phase: wasActive
          ? state.masterResumeHtml
            ? "ready-empty"
            : "setup-cv"
          : state.phase,
        previewMode: wasActive ? "original" : state.previewMode,
        error: null,
      };
    }
    case "question/answer": {
      if (!state.activeSession) return state;
      const updatedQuestions = state.activeSession.validationQuestions.map((question) =>
        question.id === action.questionId ? { ...question, answeredWith: action.answer } : question
      );
      const updatedMessages = state.activeSession.messages.map((message) =>
        message.kind === "question" && message.question.id === action.questionId
          ? { ...message, question: { ...message.question, answeredWith: action.answer } }
          : message
      );
      const updatedSession = {
        ...state.activeSession,
        validationQuestions: updatedQuestions,
        messages: updatedMessages,
        updatedAt: new Date().toISOString(),
      };
      return { ...state, ...upsertSession(state, updatedSession) };
    }
    case "preview/mode":
      return { ...state, previewMode: action.mode };
    case "settings/open":
      return { ...state, phase: "setup-ai" };
    case "error":
      return { ...state, error: action.message };
    default:
      return state;
  }
}

function downloadHtml(html: string, filename: string): void {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ResumeForgeApp() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const didLoadRef = useRef(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const providerModels: Record<AIProviderId, string[]> = {
    "claude-code": FALLBACK_MODELS["claude-code"],
    "openai-codex": FALLBACK_MODELS["openai-codex"],
    mock: [],
  };

  useEffect(() => {
    const persisted = loadPersistedState();
    if (persisted) dispatch({ type: "hydrate", state: persisted });
    didLoadRef.current = true;
  }, []);

  useEffect(() => {
    if (!didLoadRef.current) return;
    savePersistedState(persistedFromState(state));
  }, [state]);

  // Auto-test the currently selected provider on mount and whenever the user changes it,
  // so the UI never shows a stale/optimistic "available" status.
  useEffect(() => {
    handleProviderTest(state.settings.selectedProvider);
  }, [state.settings.selectedProvider]);

  function handleSelectModel(provider: AIProviderId, model: string) {
    dispatch({ type: "settings/model", provider, model });
  }

  function handleProviderTest(provider: AIProviderId) {
    devLog("app", "provider test requested", { provider });
    dispatch({ type: "provider/status", provider, status: "checking" });
    fetch(`/api/check-cli?provider=${encodeURIComponent(provider)}`)
      .then((res) => res.json())
      .then((data: { available: boolean }) => {
        devLog("app", "provider test result", { provider, available: data.available });
        dispatch({
          type: "provider/status",
          provider,
          status: data.available ? "available" : "unavailable",
        });
      })
      .catch((err: unknown) => {
        devError("app", "provider test failed", err instanceof Error ? err.message : err);
        dispatch({ type: "provider/status", provider, status: "unavailable" });
      });
  }

  async function fetchAnalysis(resumeHtml: string, jobText: string): Promise<GenerateApiResponse> {
    devLog("app", "POST /api/generate", {
      provider: state.settings.selectedProvider,
      model: state.settings.selectedModels?.[state.settings.selectedProvider],
      resumeChars: resumeHtml.length,
      jobChars: jobText.length,
    });
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resumeHtml,
        jobText,
        provider: state.settings.selectedProvider,
        model: state.settings.selectedModels?.[state.settings.selectedProvider],
      }),
    });
    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const payload = (await response.json()) as { message?: string; error?: string };
        if (payload.message) detail = payload.message;
        else if (payload.error) detail = payload.error;
      } catch {
        const text = await response.text();
        if (text) detail = text.slice(0, 300);
      }
      devError("app", `/api/generate ${response.status}`, detail);
      // Re-check the CLI status so the setup screen reflects reality
      if (response.status === 503) {
        handleProviderTest(state.settings.selectedProvider);
      }
      throw new Error(detail);
    }
    const data = (await response.json()) as GenerateApiResponse;
    devLog("app", "/api/generate response", {
      score: data.score.global,
      audits: data.tailored.audits.length,
      llm: data.llm,
    });
    return data;
  }

  async function handleSubmitJob(jobText: string) {
    if (!state.masterResumeHtml) {
      devLog("app", "submit blocked — no master resume");
      dispatch({ type: "session/new" });
      return;
    }

    const endTimer = devTimer("app", "handleSubmitJob (diagnostic)");
    setIsGenerating(true);
    dispatch({ type: "error", message: null });
    try {
      const analysis = await fetchAnalysis(state.masterResumeHtml, jobText);
      const session = buildSessionFromAnalysis(jobText, analysis);
      dispatch({ type: "session/create", session });
      devLog("app", "session created", {
        id: session.id,
        title: session.title,
        score: session.score.global,
      });
    } catch (error) {
      devError("app", "submit failed", error instanceof Error ? error.message : error);
      dispatch({
        type: "error",
        message: error instanceof Error ? error.message : "Analyse impossible.",
      });
    } finally {
      endTimer();
      setIsGenerating(false);
    }
  }

  async function handleGenerate() {
    if (!state.activeSession || state.activeSession.phase === "chat-adapted") return;
    if (!state.masterResumeHtml) return;
    const endTimer = devTimer("app", "handleGenerate (tailoring)");
    setIsGenerating(true);
    dispatch({ type: "error", message: null });
    try {
      const analysis = await fetchAnalysis(state.masterResumeHtml, state.activeSession.jobText);
      dispatch({ type: "session/apply-tailored", analysis });
      dispatch({
        type: "session/complete",
        llmUsed: analysis.llm?.used ?? false,
        providerName: analysis.llm?.providerName,
        model: analysis.llm?.model,
      });
      devLog("app", "generation completed", { llmUsed: analysis.llm?.used ?? false });
    } catch (error) {
      devError("app", "generate failed", error instanceof Error ? error.message : error);
      dispatch({
        type: "error",
        message: error instanceof Error ? error.message : "Génération impossible.",
      });
    } finally {
      endTimer();
      setIsGenerating(false);
    }
  }

  function handleExport() {
    if (!state.activeSession || state.activeSession.phase !== "chat-adapted") return;
    downloadHtml(state.activeSession.tailoredHtml, "resumeforge-adapted-cv.html");
  }

  const isSetup = state.phase === "setup-ai" || state.phase === "setup-cv";
  const originalHtml = state.masterResumeHtml;
  const adaptedHtml = state.activeSession?.tailoredHtml ?? null;
  const audits = state.activeSession?.audits ?? [];
  const adaptedReady = state.activeSession?.phase === "chat-adapted";
  const providerReady = state.providerStatus[state.settings.selectedProvider] === "available";

  return (
    <div className="grid min-h-screen grid-cols-[232px_minmax(0,1fr)] max-[980px]:grid-cols-1">
      <Sidebar
        sessions={state.sessions}
        activeSessionId={state.activeSession?.id ?? null}
        onNewSession={() => dispatch({ type: "session/new" })}
        onSelectSession={(id) => dispatch({ type: "session/select", id })}
        onDeleteSession={(id) => dispatch({ type: "session/delete", id })}
        onOpenSettings={() => dispatch({ type: "settings/open" })}
      />
      <div className="flex h-screen min-w-0 flex-col overflow-hidden">
        <Topbar
          phase={state.phase}
          title={state.activeSession?.title ?? null}
          canExport={Boolean(adaptedReady)}
          onReset={() => dispatch({ type: "session/new" })}
          onExport={handleExport}
        />
        {isSetup ? (
          <SetupFlow
            step={state.phase === "setup-ai" ? "setup-ai" : "setup-cv"}
            selectedProvider={state.settings.selectedProvider}
            providerStatus={state.providerStatus}
            providerModels={providerModels}
            selectedModels={state.settings.selectedModels ?? {}}
            onSelectProvider={(provider) => dispatch({ type: "provider/select", provider })}
            onTestProvider={handleProviderTest}
            onSelectModel={handleSelectModel}
            onContinueFromAI={() => dispatch({ type: "setup/ai-complete" })}
            onBackToAI={() => dispatch({ type: "settings/open" })}
            onSaveMasterResume={(html) => dispatch({ type: "master/save", html })}
          />
        ) : (
          <main className="flex flex-1 overflow-y-auto p-0">
            {state.error && (
              <div className="absolute top-[76px] left-[260px] z-20 rounded-[10px] border border-[rgba(181,57,47,0.2)] bg-[var(--danger-soft)] px-3 py-2.5 text-[var(--danger)]">
                {state.error}
              </div>
            )}
            <div className="grid h-full min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(320px,440px)] max-[980px]:grid-cols-1">
              <ChatPane
                session={state.activeSession}
                masterResumeReady={Boolean(state.masterResumeHtml)}
                providerReady={providerReady}
                providerLabel={
                  state.settings.selectedProvider === "claude-code" ? "Claude Code" : "OpenAI Codex"
                }
                isGenerating={isGenerating}
                onSubmitJob={handleSubmitJob}
                onGenerate={handleGenerate}
                onAnswerQuestion={(questionId, answer) =>
                  dispatch({ type: "question/answer", questionId, answer })
                }
                onEditMasterResume={() => dispatch({ type: "master/edit" })}
                onOpenSettings={() => dispatch({ type: "settings/open" })}
              />
              {state.activeSession && (
                <PreviewPane
                  originalHtml={originalHtml}
                  adaptedHtml={adaptedHtml}
                  audits={audits}
                  mode={state.previewMode}
                  adaptedReady={Boolean(adaptedReady)}
                  onModeChange={(mode) => dispatch({ type: "preview/mode", mode })}
                  onExportHtml={handleExport}
                />
              )}
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
