"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import { ChatPane } from "@/components/chat/chat-pane";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { PreviewPane } from "@/components/preview/preview-pane";
import { SetupFlow } from "@/components/setup/setup-flow";
import { parseResumeHtml } from "@/lib/parsers/parse-resume-html";
import {
  completeSession,
  createSessionFromInputs,
  summarizeSession,
} from "@/lib/resumeforge/agent";
import { buildCvDocument } from "@/lib/resumeforge/cv-document";
import { loadPersistedState, savePersistedState } from "@/lib/resumeforge/storage";
import { FALLBACK_MODELS, fetchModelsForProvider } from "@/lib/llm/models-client";
import { type ResumeForgePersistedState, type ResumeForgeState } from "@/lib/schemas/app.schema";
import { type AdaptationSession, type AppPhase } from "@/lib/schemas/session.schema";
import { type AIProviderId, type ProviderStatus } from "@/lib/schemas/settings.schema";

const providerDefaults: Record<AIProviderId, ProviderStatus> = {
  "claude-code": "available",
  "openai-codex": "idle",
  mock: "available",
};

const initialState: ResumeForgeState = {
  version: 1,
  phase: "setup-ai",
  settings: { selectedProvider: "claude-code", onboardingCompleted: false, language: "fr" },
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
  | { type: "session/complete" }
  | { type: "session/select"; id: string }
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
    case "session/complete": {
      if (!state.activeSession) return state;
      const completed = completeSession(state.activeSession);
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

  type ModelsStatus = "idle" | "loading" | "loaded" | "error";
  const defaultModelsStatus: Record<AIProviderId, ModelsStatus> = {
    "claude-code": "idle",
    "openai-codex": "idle",
    mock: "idle",
  };
  const [providerApiKeys, setProviderApiKeys] = useState<Record<AIProviderId, string>>({
    "claude-code": "",
    "openai-codex": "",
    mock: "",
  });
  const [providerModels, setProviderModels] = useState<Record<AIProviderId, string[]>>({
    "claude-code": FALLBACK_MODELS["claude-code"],
    "openai-codex": FALLBACK_MODELS["openai-codex"],
    mock: [],
  });
  const [providerModelsStatus, setProviderModelsStatus] =
    useState<Record<AIProviderId, ModelsStatus>>(defaultModelsStatus);

  useEffect(() => {
    const persisted = loadPersistedState();
    if (persisted) dispatch({ type: "hydrate", state: persisted });
    didLoadRef.current = true;
  }, []);

  useEffect(() => {
    if (!didLoadRef.current) return;
    savePersistedState(persistedFromState(state));
  }, [state]);

  const masterDocument = useMemo(() => {
    if (!state.masterResumeHtml) return null;
    return buildCvDocument(parseResumeHtml(state.masterResumeHtml));
  }, [state.masterResumeHtml]);

  function handleApiKeyChange(provider: AIProviderId, key: string) {
    setProviderApiKeys((prev) => ({ ...prev, [provider]: key }));
    setProviderModelsStatus((prev) => ({ ...prev, [provider]: "idle" }));
  }

  const handleFetchModels = useCallback(
    async (provider: AIProviderId) => {
      const apiKey = providerApiKeys[provider];
      setProviderModelsStatus((prev) => ({ ...prev, [provider]: "loading" }));
      const result = await fetchModelsForProvider(provider, apiKey);
      setProviderModels((prev) => ({ ...prev, [provider]: result.models }));
      setProviderModelsStatus((prev) => ({
        ...prev,
        [provider]: result.ok ? (result.source === "api" ? "loaded" : "idle") : "error",
      }));
      if (result.models.length > 0 && !state.settings.selectedModels?.[provider]) {
        dispatch({ type: "settings/model", provider, model: result.models[0] });
      }
    },
    [providerApiKeys, state.settings.selectedModels]
  );

  function handleSelectModel(provider: AIProviderId, model: string) {
    dispatch({ type: "settings/model", provider, model });
  }

  function handleProviderTest(provider: AIProviderId) {
    dispatch({ type: "provider/status", provider, status: "checking" });
    fetch(`/api/check-cli?provider=${encodeURIComponent(provider)}`)
      .then((res) => res.json())
      .then((data: { available: boolean }) => {
        dispatch({
          type: "provider/status",
          provider,
          status: data.available ? "available" : "unavailable",
        });
      })
      .catch(() => {
        dispatch({ type: "provider/status", provider, status: "unavailable" });
      });
  }

  function handleSubmitJob(jobText: string) {
    if (!state.masterResumeHtml) {
      dispatch({ type: "session/new" });
      return;
    }

    try {
      const session = createSessionFromInputs(state.masterResumeHtml, jobText);
      dispatch({ type: "session/create", session });
    } catch (error) {
      dispatch({
        type: "error",
        message: error instanceof Error ? error.message : "Analyse impossible.",
      });
    }
  }

  function handleGenerate() {
    if (!state.activeSession || state.activeSession.phase === "chat-adapted") return;
    setIsGenerating(true);
    window.setTimeout(() => {
      dispatch({ type: "session/complete" });
      setIsGenerating(false);
    }, 900);
  }

  function handleExport() {
    if (!state.activeSession || state.activeSession.phase !== "chat-adapted") return;
    downloadHtml(state.activeSession.tailoredHtml, "resumeforge-adapted-cv.html");
  }

  const isSetup = state.phase === "setup-ai" || state.phase === "setup-cv";
  const activeDocument = state.activeSession?.originalDocument ?? masterDocument;
  const adaptedDocument = state.activeSession?.adaptedDocument ?? null;
  const adaptedReady = state.activeSession?.phase === "chat-adapted";

  return (
    <div className="grid min-h-screen grid-cols-[232px_minmax(0,1fr)] max-[980px]:grid-cols-1">
      <Sidebar
        sessions={state.sessions}
        activeSessionId={state.activeSession?.id ?? null}
        onNewSession={() => dispatch({ type: "session/new" })}
        onSelectSession={(id) => dispatch({ type: "session/select", id })}
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
            providerApiKeys={providerApiKeys}
            providerModels={providerModels}
            providerModelsStatus={providerModelsStatus}
            selectedModels={state.settings.selectedModels ?? {}}
            onSelectProvider={(provider) => dispatch({ type: "provider/select", provider })}
            onTestProvider={handleProviderTest}
            onApiKeyChange={handleApiKeyChange}
            onFetchModels={handleFetchModels}
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
                isGenerating={isGenerating}
                onSubmitJob={handleSubmitJob}
                onGenerate={handleGenerate}
                onAnswerQuestion={(questionId, answer) =>
                  dispatch({ type: "question/answer", questionId, answer })
                }
                onEditMasterResume={() => dispatch({ type: "master/edit" })}
              />
              {state.activeSession && (
                <PreviewPane
                  original={activeDocument}
                  adapted={adaptedDocument}
                  mode={state.previewMode}
                  adaptedReady={Boolean(adaptedReady)}
                  onModeChange={(mode) => dispatch({ type: "preview/mode", mode })}
                  onExport={handleExport}
                />
              )}
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
