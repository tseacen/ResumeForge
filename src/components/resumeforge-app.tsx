"use client";

import { useEffect, useReducer, useRef, useState } from "react";

import { ChatPane } from "@/components/chat/chat-pane";
import { ResizableWorkspace } from "@/components/layout/resizable-workspace";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { PreviewPane } from "@/components/preview/preview-pane";
import { SetupFlow } from "@/components/setup/setup-flow";
import { createTranslator, localeFromUnknown, providerDisplayName } from "@/lib/i18n";
import { adaptResume, analyzeJob, checkCli, scoreCompatibility } from "@/lib/llm/client";
import { fetchModelsForProvider } from "@/lib/llm/models-client";
import { devError, devLog, devTimer } from "@/lib/logger";
import {
  allClarificationsAnswered,
  answerClarification,
  applyJobAnalysis,
  applyScoreTable,
  applyTailoredResume,
  clearSessionThinking,
  initializeSession,
  setSessionError,
  setSessionThinking,
  summarizeSession,
} from "@/lib/resumeforge/agent";
import { loadPersistedState, savePersistedState } from "@/lib/resumeforge/storage";
import { type ResumeForgePersistedState, type ResumeForgeState } from "@/lib/schemas/app.schema";
import { type AdaptationSession, type AppPhase } from "@/lib/schemas/session.schema";
import { type AIProviderId, type ProviderStatus } from "@/lib/schemas/settings.schema";

const providerDefaults: Record<AIProviderId, ProviderStatus> = {
  "claude-code": "idle",
  "openai-codex": "idle",
  "gemini-cli": "idle",
  mock: "idle",
};

const initialState: ResumeForgeState = {
  version: 1,
  phase: "setup-ai",
  settings: {
    selectedProvider: "claude-code",
    onboardingCompleted: false,
    language: "en",
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
  | { type: "settings/language"; language: ResumeForgeState["settings"]["language"] }
  | { type: "setup/ai-complete" }
  | { type: "master/save"; html: string }
  | { type: "master/edit" }
  | { type: "session/new" }
  | { type: "session/replace"; session: AdaptationSession }
  | { type: "session/select"; id: string }
  | { type: "session/delete"; id: string }
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
          ? {
              ...action.state.settings,
              selectedProvider: "claude-code" as const,
              language: localeFromUnknown(action.state.settings.language),
            }
          : {
              ...action.state.settings,
              language: localeFromUnknown(action.state.settings.language),
            };

      return {
        ...state,
        ...action.state,
        settings,
        phase: phaseFromPersisted(action.state),
        providerStatus: providerDefaults,
        previewMode: action.state.activeSession?.phase === "chat-adapted" ? "diff" : "original",
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
    case "settings/language":
      return { ...state, settings: { ...state.settings, language: action.language } };
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
    case "session/replace":
      return {
        ...state,
        ...upsertSession(state, action.session),
        phase: action.session.phase,
        previewMode: action.session.phase === "chat-adapted" ? "diff" : state.previewMode,
        error: null,
      };
    case "session/select": {
      const selected = state.sessionArchive.find((session) => session.id === action.id);
      if (!selected) return state;
      return {
        ...state,
        activeSession: selected,
        phase: selected.phase,
        previewMode: selected.phase === "chat-adapted" ? "diff" : "original",
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
        previewMode: "original",
        error: null,
      };
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

export function ResumeForgeApp() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const t = createTranslator(state.settings.language);
  const analyzeThinkingPhases = [
    t("app.thinking.readingJob"),
    t("app.thinking.identifyingSkills"),
    t("app.thinking.comparingCv"),
    t("app.thinking.detectingClarifications"),
  ];
  const scoreThinkingPhases = [
    t("app.thinking.weightingDimensions"),
    t("app.thinking.analyzingGaps"),
    t("app.thinking.identifyingRisks"),
    t("app.thinking.writingVerdict"),
  ];
  const adaptThinkingPhases = [
    t("app.thinking.selectingLines"),
    t("app.thinking.rewriting"),
    t("app.thinking.validatingEvidence"),
    t("app.thinking.applyingHtml"),
  ];
  const didLoadRef = useRef(false);
  const [providerModels, setProviderModels] = useState<Record<AIProviderId, string[]>>({
    "claude-code": [],
    "openai-codex": [],
    "gemini-cli": [],
    mock: [],
  });

  useEffect(() => {
    const persisted = loadPersistedState();
    if (persisted) dispatch({ type: "hydrate", state: persisted });
    didLoadRef.current = true;
  }, []);

  useEffect(() => {
    if (!didLoadRef.current) return;
    savePersistedState(persistedFromState(state));
  }, [state]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = state.settings.language;
  }, [state.settings.language]);

  // Récupère les modèles disponibles au montage pour tous les providers.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [claude, openai, gemini] = await Promise.all([
        fetchModelsForProvider("claude-code"),
        fetchModelsForProvider("openai-codex"),
        fetchModelsForProvider("gemini-cli"),
      ]);
      if (cancelled) return;
      devLog("app", "models bootstrap", {
        claude: { source: claude.source, count: claude.models.length, warning: claude.warning },
        openai: { source: openai.source, count: openai.models.length, warning: openai.warning },
        gemini: { source: gemini.source, count: gemini.models.length, warning: gemini.warning },
      });
      setProviderModels((prev) => ({
        ...prev,
        "claude-code": claude.models,
        "openai-codex": openai.models,
        "gemini-cli": gemini.models,
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Rafraîchit le provider sélectionné (test CLI + liste des modèles).
  useEffect(() => {
    const provider = state.settings.selectedProvider;
    handleProviderTest(provider);
    if (provider === "mock") return;
    let cancelled = false;
    (async () => {
      const result = await fetchModelsForProvider(provider);
      if (cancelled) return;
      devLog("app", "models refresh", {
        provider,
        source: result.source,
        count: result.models.length,
        warning: result.warning,
      });
      setProviderModels((prev) => ({ ...prev, [provider]: result.models }));
    })();
    return () => {
      cancelled = true;
    };
  }, [state.settings.selectedProvider]);

  function handleSelectModel(provider: AIProviderId, model: string) {
    dispatch({ type: "settings/model", provider, model });
  }

  function handleProviderTest(provider: AIProviderId) {
    devLog("app", "provider test requested", { provider });
    dispatch({ type: "provider/status", provider, status: "checking" });
    checkCli(provider)
      .then((available) => {
        dispatch({
          type: "provider/status",
          provider,
          status: available ? "available" : "unavailable",
        });
      })
      .catch((err: unknown) => {
        devError("app", "provider test failed", err instanceof Error ? err.message : err);
        dispatch({ type: "provider/status", provider, status: "unavailable" });
      });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Thinking animation : tourne sur des labels prédéfinis pendant l'attente
  // ──────────────────────────────────────────────────────────────────────────
  const thinkingTimerRef = useRef<number | null>(null);

  function startThinkingRotation(
    sessionId: string,
    phases: string[],
    intervalMs: number,
    targetPhase: AdaptationSession["phase"]
  ): void {
    let index = 0;
    if (thinkingTimerRef.current !== null) {
      window.clearInterval(thinkingTimerRef.current);
      thinkingTimerRef.current = null;
    }
    thinkingTimerRef.current = window.setInterval(() => {
      index = (index + 1) % phases.length;
      // On lit l'état le plus récent via le closure ref pattern :
      latestSessionRef.current = withThinkingLabel(latestSessionRef.current, sessionId, phases[index], targetPhase);
      const updated = latestSessionRef.current;
      if (updated) dispatch({ type: "session/replace", session: updated });
    }, intervalMs);
  }

  function stopThinkingRotation(): void {
    if (thinkingTimerRef.current !== null) {
      window.clearInterval(thinkingTimerRef.current);
      thinkingTimerRef.current = null;
    }
  }

  // Référence vive vers la session active pour que les setInterval lisent toujours du frais.
  const latestSessionRef = useRef<AdaptationSession | null>(null);
  useEffect(() => {
    latestSessionRef.current = state.activeSession;
  }, [state.activeSession]);

  function withThinkingLabel(
    session: AdaptationSession | null,
    sessionId: string,
    label: string,
    phase: AdaptationSession["phase"]
  ): AdaptationSession | null {
    if (!session || session.id !== sessionId) return session;
    return setSessionThinking(session, label, phase);
  }

  function clearTransientMessages(session: AdaptationSession): AdaptationSession {
    return {
      ...session,
      messages: session.messages.filter((m) => m.kind !== "thinking" && m.kind !== "error"),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Étape 1 : analyse de l'offre + détection des clarifications
  // ──────────────────────────────────────────────────────────────────────────
  const [isBusy, setIsBusy] = useState(false);

  async function runJobAnalysis(sessionForAnalysis: AdaptationSession) {
    if (!state.masterResumeHtml) {
      return;
    }
    setIsBusy(true);

    const endTimer = devTimer("app", "analyze-job");
    const session = setSessionThinking(
      clearTransientMessages(sessionForAnalysis),
      analyzeThinkingPhases[0],
      "chat-analyzing"
    );
    latestSessionRef.current = session;
    dispatch({ type: "session/replace", session });

    startThinkingRotation(session.id, analyzeThinkingPhases, 1800, "chat-analyzing");

    try {
      const analysis = await analyzeJob({
        resumeHtml: state.masterResumeHtml,
        jobText: session.jobText,
        provider: state.settings.selectedProvider,
        model: state.settings.selectedModels?.[state.settings.selectedProvider],
        language: state.settings.language,
      });
      stopThinkingRotation();

      const fresh = latestSessionRef.current;
      if (!fresh || fresh.id !== session.id) return;
      const next = applyJobAnalysis(clearSessionThinking(fresh), analysis, state.settings.language);
      latestSessionRef.current = next;
      dispatch({ type: "session/replace", session: next });

      if (next.phase === "chat-scoring") {
        // Pas de questions : on enchaîne directement
        await runScoring(next);
      }
    } catch (err) {
      stopThinkingRotation();
      const message = err instanceof Error ? err.message : t("app.aiNoResponse");
      devError("app", "analyze-job failed", message);
      if (state.providerStatus[state.settings.selectedProvider] !== "available") {
        handleProviderTest(state.settings.selectedProvider);
      }
      const fresh = latestSessionRef.current;
      if (fresh && fresh.id === session.id) {
        const errored = setSessionError(clearSessionThinking(fresh), message);
        latestSessionRef.current = errored;
        dispatch({ type: "session/replace", session: errored });
      }
    } finally {
      endTimer();
      setIsBusy(false);
    }
  }

  async function handleSubmitJob(jobText: string) {
    if (!state.masterResumeHtml) {
      dispatch({ type: "session/new" });
      return;
    }
    const session = initializeSession(jobText, state.settings.language);
    latestSessionRef.current = session;
    dispatch({ type: "session/replace", session });
    await runJobAnalysis(session);
  }

  function jobAnalysisFromSession(session: AdaptationSession) {
    return {
      jobTitle: session.jobTitle ?? session.title,
      company: session.company ?? null,
      summary: session.jobSummary ?? "",
      clarifications: session.clarifications.map((q) => ({
        id: q.id,
        label: q.label,
        question: q.question,
        context: q.context,
        responseMode: q.responseMode,
        suggestedAnswers: q.suggestedAnswers,
      })),
    };
  }

  function answersFromSession(session: AdaptationSession) {
    return session.clarifications
      .filter((q): q is typeof q & { answeredWith: string } => Boolean(q.answeredWith))
      .map((q) => ({ id: q.id, question: q.question, answer: q.answeredWith }));
  }

  function compatibilityReportFromSession(session: AdaptationSession) {
    if (!session.scoreTable) return null;
    return {
      global: session.scoreTable.global,
      riskLevel: session.scoreTable.riskLevel,
      rows: session.scoreTable.rows.map(({ label, value, rationale }) => ({
        label,
        value,
        rationale,
      })),
      strengths: session.scoreTable.strengths,
      weaknesses: session.scoreTable.weaknesses,
      blockers: session.scoreTable.blockers,
      missingKeywords: session.scoreTable.missingKeywords,
      interviewRisks: session.scoreTable.interviewRisks,
      verdict: session.scoreTable.verdict,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Étape 2 : scoring (déclenché soit auto, soit après réponse aux questions)
  // ──────────────────────────────────────────────────────────────────────────
  async function runScoring(sessionForScoring: AdaptationSession) {
    if (!state.masterResumeHtml) return;
    setIsBusy(true);
    const endTimer = devTimer("app", "score");

    const scoringSession = setSessionThinking(
      clearTransientMessages(sessionForScoring),
      scoreThinkingPhases[0],
      "chat-scoring"
    );
    latestSessionRef.current = scoringSession;
    dispatch({ type: "session/replace", session: scoringSession });

    startThinkingRotation(scoringSession.id, scoreThinkingPhases, 1800, "chat-scoring");

    try {
      const report = await scoreCompatibility({
        resumeHtml: state.masterResumeHtml,
        jobText: scoringSession.jobText,
        jobAnalysis: jobAnalysisFromSession(scoringSession),
        answers: answersFromSession(scoringSession),
        provider: state.settings.selectedProvider,
        model: state.settings.selectedModels?.[state.settings.selectedProvider],
        language: state.settings.language,
      });
      stopThinkingRotation();

      const fresh = latestSessionRef.current;
      if (!fresh || fresh.id !== scoringSession.id) return;
      const scored = applyScoreTable(clearSessionThinking(fresh), report);
      latestSessionRef.current = scored;
      dispatch({ type: "session/replace", session: scored });
    } catch (err) {
      stopThinkingRotation();
      const message = err instanceof Error ? err.message : t("app.aiNoResponse");
      devError("app", "score failed", message);
      const fresh = latestSessionRef.current;
      if (fresh && fresh.id === scoringSession.id) {
        const errored = setSessionError(clearSessionThinking(fresh), message);
        latestSessionRef.current = errored;
        dispatch({ type: "session/replace", session: errored });
      }
    } finally {
      endTimer();
      setIsBusy(false);
    }
  }

  function handleAnswerClarification(questionId: string, answer: string) {
    const current = latestSessionRef.current;
    if (!current) return;
    const updated = answerClarification(current, questionId, answer);
    latestSessionRef.current = updated;
    dispatch({ type: "session/replace", session: updated });

    if (allClarificationsAnswered(updated) && updated.phase === "chat-clarifying") {
      runScoring(updated);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Étape 3 : génération du CV adapté, appliquée localement au HTML original
  // ──────────────────────────────────────────────────────────────────────────
  async function runAdaptation(sessionForAdaptation: AdaptationSession) {
    const compatibilityReport = compatibilityReportFromSession(sessionForAdaptation);
    if (!state.masterResumeHtml || !compatibilityReport) return;

    setIsBusy(true);
    const endTimer = devTimer("app", "adapt-cv");

    const adaptingSession = setSessionThinking(
      clearTransientMessages(sessionForAdaptation),
      adaptThinkingPhases[0],
      "chat-scored"
    );
    latestSessionRef.current = adaptingSession;
    dispatch({ type: "session/replace", session: adaptingSession });

    startThinkingRotation(adaptingSession.id, adaptThinkingPhases, 1800, "chat-scored");

    try {
      const tailoredResume = await adaptResume({
        resumeHtml: state.masterResumeHtml,
        jobText: adaptingSession.jobText,
        jobAnalysis: jobAnalysisFromSession(adaptingSession),
        compatibilityReport,
        answers: answersFromSession(adaptingSession),
        provider: state.settings.selectedProvider,
        model: state.settings.selectedModels?.[state.settings.selectedProvider],
        language: state.settings.language,
      });
      stopThinkingRotation();

      const fresh = latestSessionRef.current;
      if (!fresh || fresh.id !== adaptingSession.id) return;
      const adapted = applyTailoredResume(
        clearSessionThinking(fresh),
        tailoredResume,
        state.settings.language
      );
      latestSessionRef.current = adapted;
      dispatch({ type: "session/replace", session: adapted });
    } catch (err) {
      stopThinkingRotation();
      const message = err instanceof Error ? err.message : t("app.aiNoResponse");
      devError("app", "adapt CV failed", message);
      const fresh = latestSessionRef.current;
      if (fresh && fresh.id === adaptingSession.id) {
        const errored = setSessionError(clearSessionThinking(fresh), message);
        latestSessionRef.current = errored;
        dispatch({ type: "session/replace", session: errored });
      }
    } finally {
      endTimer();
      setIsBusy(false);
    }
  }

  function handleAdaptCv() {
    if (isBusy) return;
    const current = latestSessionRef.current;
    if (!current || !current.scoreTable) return;
    void runAdaptation(current);
  }

  function handleRetry() {
    if (isBusy || !state.masterResumeHtml) return;
    const current = latestSessionRef.current;
    if (!current) return;
    const hasError = current.messages.some((message) => message.kind === "error");
    if (!hasError) return;

    if (current.phase === "chat-analyzing") {
      void runJobAnalysis(current);
      return;
    }

    if (current.phase === "chat-scoring") {
      void runScoring(current);
      return;
    }

    if (current.phase === "chat-scored" && current.scoreTable) {
      void runAdaptation(current);
      return;
    }

    if (current.phase === "chat-clarifying" && allClarificationsAnswered(current)) {
      void runScoring(current);
    }
  }

  const isSetup = state.phase === "setup-ai" || state.phase === "setup-cv";
  const providerReady = state.providerStatus[state.settings.selectedProvider] === "available";

  return (
    <div className="grid min-h-screen grid-cols-[232px_minmax(0,1fr)] max-[980px]:grid-cols-1">
      <Sidebar
        locale={state.settings.language}
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
          locale={state.settings.language}
          title={state.activeSession?.title ?? null}
          activeModel={
            state.settings.selectedModels?.[state.settings.selectedProvider] ??
            state.settings.selectedProvider
          }
          canExport={false}
          onLanguageChange={(language) => dispatch({ type: "settings/language", language })}
          onReset={() => dispatch({ type: "session/new" })}
          onExport={() => {}}
        />
        {isSetup ? (
          <SetupFlow
            locale={state.settings.language}
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
            <ResizableWorkspace
              locale={state.settings.language}
              left={
                <ChatPane
                  locale={state.settings.language}
                  session={state.activeSession}
                  masterResumeReady={Boolean(state.masterResumeHtml)}
                  providerReady={providerReady}
                  providerLabel={providerDisplayName(
                    state.settings.language,
                    state.settings.selectedProvider
                  )}
                  isBusy={isBusy}
                  onSubmitJob={handleSubmitJob}
                  onAnswerQuestion={handleAnswerClarification}
                  onAdaptCv={handleAdaptCv}
                  onRetry={handleRetry}
                  onEditMasterResume={() => dispatch({ type: "master/edit" })}
                  onOpenSettings={() => dispatch({ type: "settings/open" })}
                />
              }
              right={
                state.activeSession ? (
                  <PreviewPane
                    locale={state.settings.language}
                    originalHtml={state.masterResumeHtml}
                    adaptedHtml={state.activeSession.tailoredResume?.adaptedHtml ?? null}
                    audit={state.activeSession.tailoredResume?.audit ?? []}
                    mode={state.previewMode}
                    onModeChange={(mode) => dispatch({ type: "preview/mode", mode })}
                  />
                ) : null
              }
            />
          </main>
        )}
      </div>
    </div>
  );
}
