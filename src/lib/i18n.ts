import { type AIProviderId } from "@/lib/schemas/settings.schema";

export const supportedLocales = ["en", "fr"] as const;
export type AppLocale = (typeof supportedLocales)[number];

type TranslationDictionary = Record<string, string>;
type InterpolationValues = Record<string, string | number>;

const en = {
  "lang.en": "EN",
  "lang.fr": "FR",

  "topbar.setup": "Setup",
  "topbar.newAdaptation": "New adaptation",
  "topbar.initial": "initial",
  "topbar.adaptation": "adaptation",
  "topbar.draft": "v3 · draft",
  "topbar.viaModel": "via {model}",
  "topbar.history": "History",
  "topbar.export": "Export",
  "topbar.reset": "Reset",
  "topbar.languageAria": "Select interface language",

  "sidebar.today": "Today",
  "sidebar.yesterday": "Yesterday",
  "sidebar.thisWeek": "This week",
  "sidebar.newAdaptation": "New adaptation",
  "sidebar.empty": "Your recent adaptations will appear here.",
  "sidebar.status.adapted": "Adapted",
  "sidebar.status.diagnosis": "Diagnosis",
  "sidebar.deleteTitle": "Delete this adaptation",
  "sidebar.deleteAria": "Delete {title}",
  "sidebar.deleteConfirm": "Permanently delete \"{title}\"? This action cannot be undone.",
  "sidebar.localSession": "Local session",
  "sidebar.localData": "Local data",
  "sidebar.settings": "Settings",

  "chat.showAll": "Show all",
  "chat.collapse": "Collapse",
  "chat.errorTitle": "The AI did not respond.",
  "chat.retry": "Retry",
  "chat.multipleAnswersAllowed": "Multiple answers allowed.",
  "chat.chooseOrType": "Choose an answer or type a custom reply.",
  "chat.customAnswerPlaceholder": "Custom answer…",
  "chat.confirmSelection": "Confirm selection",
  "chat.confirm": "Confirm",
  "chat.answerPrefix": "Answer",
  "chat.compatibilityTable": "Compatibility table",
  "chat.riskLabel": "Risk {risk}",
  "chat.risk.low": "low",
  "chat.risk.medium": "medium",
  "chat.risk.high": "high",
  "chat.strengths": "Strengths",
  "chat.weaknesses": "Weaknesses",
  "chat.blockers": "Blockers",
  "chat.missingKeywords": "Missing keywords:",
  "chat.interviewRisks": "Interview risks",
  "chat.adaptedCvGenerated": "Adapted CV generated",
  "chat.appliedCount": "{count} applied",
  "chat.blockedCount": "{count} blocked",
  "chat.safeChange": "Safe change",
  "chat.blockedChange": "Blocked change",
  "chat.notAddedUnsupported": "Not added — unsupported:",
  "chat.welcomeReady": "Ready",
  "chat.providerNotDetected": "{provider} not detected",
  "chat.welcomeTitle": "Which offer do you want to adapt today?",
  "chat.welcomeTitleAccent": "adapt",
  "chat.welcomeLede":
    "Paste the offer. I analyze it, ask useful questions if needed, then generate the compatibility table without inventing anything.",
  "chat.providerWarning":
    "{provider} is not detected. No analysis will run until the CLI is installed.",
  "chat.configure": "Configure",
  "chat.addMasterResumeWarning": "Add your master CV first to start an adaptation.",
  "chat.editMasterCv": "Edit master CV",
  "chat.urlImportSoon": "URL import — soon",
  "chat.sessionSoon": "Resume session — soon",
  "chat.pasteJobOffer": "Paste the job offer…",
  "chat.revisionPlaceholder": "Ask for a CV change (revert, keep, add…).",
  "chat.contextPlaceholder": "Add context or constraints for this adaptation…",
  "chat.processingPlaceholder": "Message received while processing…",
  "chat.attach": "Attach",
  "chat.dictate": "Dictate",
  "chat.readyToAdaptTitle": "Ready to adapt?",
  "chat.readyToAdaptLede": "Diagnosis complete. I can now adapt your CV for this role.",
  "chat.adaptCv": "Adapt CV",

  "setup.step.configureAi": "Configure AI",
  "setup.step.addBaseResume": "Add base resume",
  "setup.step.readyToAdapt": "Ready to adapt",
  "setup.eyebrowWelcome": "Welcome · first setup",
  "setup.ai.title": "Choose your adaptation engine.",
  "setup.ai.titleAccent": "engine",
  "setup.ai.lede":
    "ResumeForge relies on a local assistant. No data leaves your machine beyond calls to your configured AI.",
  "setup.provider.notTested": "Not tested",
  "setup.provider.testing": "Testing…",
  "setup.provider.available": "Available · CLI detected",
  "setup.provider.unavailable": "CLI not found",
  "setup.provider.test": "Test",
  "setup.provider.model": "Model",
  "setup.provider.enterModel": "Enter a model…",
  "setup.provider.customModelPlaceholder": "exact-model-name",
  "setup.ai.keyNote":
    "Your keys stay in the chosen CLI configuration. Local deterministic mode remains available for offline work.",
  "setup.ai.configureLater": "Configure later",
  "setup.ai.continue": "Continue",
  "setup.cv.eyebrow": "Step 2 · Base resume",
  "setup.cv.title": "Import your master resume.",
  "setup.cv.titleAccent": "master resume",
  "setup.cv.lede":
    "This is the base that ResumeForge will adapt for each job offer. Paste the HTML or drop a local file.",
  "setup.cv.tabPaste": "Paste HTML",
  "setup.cv.tabFile": "Drop a file",
  "setup.cv.dropDefault": "Drop your .html file",
  "setup.cv.dropHint": "Drag and drop your resume or click to choose a file.",
  "setup.cv.detected": "Detected",
  "setup.cv.waiting": "Waiting for a resume…",
  "setup.cv.kb": "KB",
  "setup.cv.preview": "Preview",
  "setup.cv.back": "Back",
  "setup.cv.saveStart": "Save & start",

  "preview.titleEmpty": "Resume — preview",
  "preview.emptyHeading": "Preview will appear here",
  "preview.emptyLede": "Add a master resume to preview it during adaptation.",
  "preview.titleDiff": "Smart diff",
  "preview.titleAdapted": "Adapted resume",
  "preview.titleOriginal": "Base resume",
  "preview.mode.original": "Original",
  "preview.mode.adapted": "Adapted",
  "preview.mode.diff": "Diff",
  "preview.beforeAfter": "Before / after",
  "preview.noAuditableChanges": "No auditable changes for this generation.",
  "preview.applied": "Applied",
  "preview.blocked": "Blocked",
  "preview.before": "Before",
  "preview.after": "After",
  "preview.cvTitle": "CV preview",

  "workspace.resizeAria": "Resize chat and CV preview",
  "workspace.resizeTitle": "Drag to resize. Double-click to reset.",

  "provider.claude-code": "Claude Code",
  "provider.openai-codex": "OpenAI Codex",
  "provider.gemini-cli": "Gemini CLI",

  "app.thinking.readingJob": "Reading job offer…",
  "app.thinking.identifyingSkills": "Identifying expected skills…",
  "app.thinking.comparingCv": "Comparing with your CV…",
  "app.thinking.detectingClarifications": "Detecting points to clarify…",
  "app.thinking.weightingDimensions": "Weighting compatibility dimensions…",
  "app.thinking.analyzingGaps": "Analyzing strengths and gaps…",
  "app.thinking.identifyingRisks": "Identifying interview risks…",
  "app.thinking.writingVerdict": "Writing verdict…",
  "app.thinking.selectingLines": "Selecting modifiable lines…",
  "app.thinking.rewriting": "Rewriting without adding facts…",
  "app.thinking.validatingEvidence": "Validating CV evidence…",
  "app.thinking.applyingHtml": "Applying changes to original HTML…",
  "app.thinking.importingJobUrl": "Importing job offer from URL…",
  "app.aiNoResponse": "The AI did not respond.",
  "app.jobOfferUrlImportFailed":
    "I couldn't import this URL. Paste the job offer text (title, responsibilities, stack, requirements), or try another direct job link.",
  "app.jobOfferUrlInvalid": "No valid job-offer URL detected in your message.",

  "agent.newAdaptation": "New adaptation",
  "agent.analyzing": "Analyzing…",
  "agent.readingJobOffer": "Reading job offer…",
  "agent.positionDetected": "Position detected: **{jobTitle}**{companyPart}.",
  "agent.companyPart": " — {company}",
  "agent.beforeScoring": "Before scoring compatibility, I need a few clarifications:",
  "agent.noAmbiguity": "No ambiguity detected. Moving directly to the compatibility table.",
  "agent.safeChangesApplied":
    "{count} safe change{plural} applied to the adapted CV.",
  "agent.noChangesApplied":
    "No changes were applied — nothing was safe enough to modify.",
  "agent.suggestionsBlocked":
    "{count} suggestion{plural} blocked to prevent unproven claims or broken layout.",
  "agent.noSuggestionsBlocked": "No suggestions blocked — the audit is clean.",
  "agent.noteCapturedDuringClarifications":
    "Noted. I keep this context while we finish the clarification step.",
  "agent.noteCapturedBeforeAdaptation":
    "Noted. I will use this in the next CV adaptation.",
  "agent.noteCapturedDuringProcessing":
    "Noted. I keep this context for the next step without restarting the current one.",
  "agent.revisionQueuedAfterCurrentRun":
    "Noted. I will apply this request right after the current generation finishes.",
  "agent.urlImportSuccess":
    "Offer imported from **{sourceHost}**. Starting analysis on the extracted text.",
} as const satisfies TranslationDictionary;

export type TranslationKey = keyof typeof en;

const fr = {
  "lang.en": "EN",
  "lang.fr": "FR",

  "topbar.setup": "Configuration",
  "topbar.newAdaptation": "Nouvelle adaptation",
  "topbar.initial": "initiale",
  "topbar.adaptation": "adaptation",
  "topbar.draft": "v3 · brouillon",
  "topbar.viaModel": "via {model}",
  "topbar.history": "Historique",
  "topbar.export": "Exporter",
  "topbar.reset": "Réinitialiser",
  "topbar.languageAria": "Choisir la langue de l’interface",

  "sidebar.today": "Aujourd’hui",
  "sidebar.yesterday": "Hier",
  "sidebar.thisWeek": "Cette semaine",
  "sidebar.newAdaptation": "Nouvelle adaptation",
  "sidebar.empty": "Vos adaptations récentes apparaîtront ici.",
  "sidebar.status.adapted": "Adapté",
  "sidebar.status.diagnosis": "Diagnostic",
  "sidebar.deleteTitle": "Supprimer cette adaptation",
  "sidebar.deleteAria": "Supprimer {title}",
  "sidebar.deleteConfirm":
    "Supprimer définitivement \"{title}\" ? Cette action est irréversible.",
  "sidebar.localSession": "Session locale",
  "sidebar.localData": "Données locales",
  "sidebar.settings": "Réglages",

  "chat.showAll": "Tout afficher",
  "chat.collapse": "Réduire",
  "chat.errorTitle": "L’IA n’a pas répondu.",
  "chat.retry": "Réessayer",
  "chat.multipleAnswersAllowed": "Plusieurs réponses autorisées.",
  "chat.chooseOrType": "Choisissez une réponse ou saisissez une réponse personnalisée.",
  "chat.customAnswerPlaceholder": "Réponse personnalisée…",
  "chat.confirmSelection": "Confirmer la sélection",
  "chat.confirm": "Confirmer",
  "chat.answerPrefix": "Réponse",
  "chat.compatibilityTable": "Table de compatibilité",
  "chat.riskLabel": "Risque {risk}",
  "chat.risk.low": "faible",
  "chat.risk.medium": "moyen",
  "chat.risk.high": "élevé",
  "chat.strengths": "Forces",
  "chat.weaknesses": "Faiblesses",
  "chat.blockers": "Blocages",
  "chat.missingKeywords": "Mots-clés manquants :",
  "chat.interviewRisks": "Risques en entretien",
  "chat.adaptedCvGenerated": "CV adapté généré",
  "chat.appliedCount": "{count} appliqué{plural}",
  "chat.blockedCount": "{count} bloqué{plural}",
  "chat.safeChange": "Changement sûr",
  "chat.blockedChange": "Changement bloqué",
  "chat.notAddedUnsupported": "Non ajouté — non justifié :",
  "chat.welcomeReady": "Prêt",
  "chat.providerNotDetected": "{provider} non détecté",
  "chat.welcomeTitle": "Quelle offre veux-tu adapter aujourd’hui ?",
  "chat.welcomeTitleAccent": "adapter",
  "chat.welcomeLede":
    "Colle l’offre. Je l’analyse, je pose les questions utiles si nécessaire, puis je génère la table de compatibilité sans rien inventer.",
  "chat.providerWarning":
    "{provider} n’est pas détecté. Aucune analyse ne sera lancée tant que le CLI n’est pas installé.",
  "chat.configure": "Configurer",
  "chat.addMasterResumeWarning":
    "Ajoute d’abord ton CV maître pour démarrer une adaptation.",
  "chat.editMasterCv": "Modifier le CV maître",
  "chat.urlImportSoon": "Import URL — bientôt",
  "chat.sessionSoon": "Session CV — bientôt",
  "chat.pasteJobOffer": "Collez l’offre d’emploi…",
  "chat.revisionPlaceholder":
    "Demande une retouche du CV (revert, ne change pas, ajoute…).",
  "chat.contextPlaceholder": "Ajoute un contexte ou une contrainte pour cette adaptation…",
  "chat.processingPlaceholder": "Message reçu pendant le traitement…",
  "chat.attach": "Joindre",
  "chat.dictate": "Dicter",
  "chat.readyToAdaptTitle": "Prêt à adapter ?",
  "chat.readyToAdaptLede":
    "Diagnostic terminé. Je peux maintenant adapter ton CV pour ce poste.",
  "chat.adaptCv": "Adapter le CV",

  "setup.step.configureAi": "Configurer l’IA",
  "setup.step.addBaseResume": "Ajouter le CV de base",
  "setup.step.readyToAdapt": "Prêt à adapter",
  "setup.eyebrowWelcome": "Bienvenue · première configuration",
  "setup.ai.title": "Choisis ton moteur d’adaptation.",
  "setup.ai.titleAccent": "moteur",
  "setup.ai.lede":
    "ResumeForge s’appuie sur un assistant local. Aucune donnée ne quitte ta machine, hors appels vers l’IA configurée.",
  "setup.provider.notTested": "Non testé",
  "setup.provider.testing": "Test en cours…",
  "setup.provider.available": "Disponible · CLI détecté",
  "setup.provider.unavailable": "CLI introuvable",
  "setup.provider.test": "Tester",
  "setup.provider.model": "Modèle",
  "setup.provider.enterModel": "Entrer un modèle…",
  "setup.provider.customModelPlaceholder": "nom-exact-du-modele",
  "setup.ai.keyNote":
    "Tes clés restent dans la configuration du CLI choisi. Le mode déterministe local reste disponible hors ligne.",
  "setup.ai.configureLater": "Configurer plus tard",
  "setup.ai.continue": "Continuer",
  "setup.cv.eyebrow": "Étape 2 · CV de base",
  "setup.cv.title": "Importe ton CV maître.",
  "setup.cv.titleAccent": "CV maître",
  "setup.cv.lede":
    "C’est la base que ResumeForge adaptera pour chaque offre. Colle le HTML ou dépose un fichier local.",
  "setup.cv.tabPaste": "Coller le HTML",
  "setup.cv.tabFile": "Déposer un fichier",
  "setup.cv.dropDefault": "Dépose ton fichier .html",
  "setup.cv.dropHint": "Glisse-dépose ton CV ou clique pour choisir un fichier.",
  "setup.cv.detected": "Détecté",
  "setup.cv.waiting": "En attente d’un CV…",
  "setup.cv.kb": "ko",
  "setup.cv.preview": "Aperçu",
  "setup.cv.back": "Retour",
  "setup.cv.saveStart": "Enregistrer et démarrer",

  "preview.titleEmpty": "CV — aperçu",
  "preview.emptyHeading": "L’aperçu apparaîtra ici",
  "preview.emptyLede": "Ajoute un CV maître pour le prévisualiser pendant l’adaptation.",
  "preview.titleDiff": "Diff intelligent",
  "preview.titleAdapted": "CV adapté",
  "preview.titleOriginal": "CV de base",
  "preview.mode.original": "Original",
  "preview.mode.adapted": "Adapté",
  "preview.mode.diff": "Diff",
  "preview.beforeAfter": "Avant / après",
  "preview.noAuditableChanges": "Aucun changement auditable pour cette génération.",
  "preview.applied": "Appliqué",
  "preview.blocked": "Bloqué",
  "preview.before": "Avant",
  "preview.after": "Après",
  "preview.cvTitle": "Aperçu du CV",

  "workspace.resizeAria": "Redimensionner le chat et l’aperçu du CV",
  "workspace.resizeTitle": "Glisser pour redimensionner. Double-clic pour réinitialiser.",

  "provider.claude-code": "Claude Code",
  "provider.openai-codex": "OpenAI Codex",
  "provider.gemini-cli": "Gemini CLI",

  "app.thinking.readingJob": "Lecture de l’offre…",
  "app.thinking.identifyingSkills": "Identification des compétences attendues…",
  "app.thinking.comparingCv": "Comparaison avec ton CV…",
  "app.thinking.detectingClarifications": "Détection des points à clarifier…",
  "app.thinking.weightingDimensions": "Pondération des dimensions de compatibilité…",
  "app.thinking.analyzingGaps": "Analyse des forces et écarts…",
  "app.thinking.identifyingRisks": "Identification des risques d’entretien…",
  "app.thinking.writingVerdict": "Rédaction du verdict…",
  "app.thinking.selectingLines": "Sélection des lignes modifiables…",
  "app.thinking.rewriting": "Réécriture sans ajouter de faits…",
  "app.thinking.validatingEvidence": "Validation des preuves du CV…",
  "app.thinking.applyingHtml": "Application des changements au HTML d’origine…",
  "app.thinking.importingJobUrl": "Import de l’offre depuis l’URL…",
  "app.aiNoResponse": "L’IA n’a pas répondu.",
  "app.jobOfferUrlImportFailed":
    "Je n’ai pas réussi à importer cette URL. Colle le texte de l’offre (titre, missions, stack, exigences) ou essaie un lien direct vers l’annonce.",
  "app.jobOfferUrlInvalid": "Aucune URL d’offre valide détectée dans ton message.",

  "agent.newAdaptation": "Nouvelle adaptation",
  "agent.analyzing": "Analyse en cours…",
  "agent.readingJobOffer": "Lecture de l’offre…",
  "agent.positionDetected": "Poste détecté : **{jobTitle}**{companyPart}.",
  "agent.companyPart": " — {company}",
  "agent.beforeScoring":
    "Avant d’évaluer la compatibilité, j’ai besoin de quelques clarifications :",
  "agent.noAmbiguity":
    "Aucune ambiguïté détectée. Je passe directement à la table de compatibilité.",
  "agent.safeChangesApplied":
    "{count} changement{plural} sûr{plural} appliqué{plural} au CV adapté.",
  "agent.noChangesApplied":
    "Aucun changement n’a été appliqué : rien n’était assez sûr à modifier.",
  "agent.suggestionsBlocked":
    "{count} suggestion{plural} bloquée{plural} pour éviter des affirmations non prouvées ou une mise en page cassée.",
  "agent.noSuggestionsBlocked": "Aucune suggestion bloquée : audit propre.",
  "agent.noteCapturedDuringClarifications":
    "Noté. Je garde ce contexte pendant qu’on termine les clarifications.",
  "agent.noteCapturedBeforeAdaptation":
    "Noté. J’utiliserai ça lors de la prochaine adaptation du CV.",
  "agent.noteCapturedDuringProcessing":
    "Noté. Je garde ce contexte pour la suite sans relancer l’étape en cours.",
  "agent.revisionQueuedAfterCurrentRun":
    "Noté. J’appliquerai cette demande juste après la génération en cours.",
  "agent.urlImportSuccess":
    "Offre importée depuis **{sourceHost}**. Je lance l’analyse sur le texte extrait.",
} as const satisfies Record<TranslationKey, string>;

const dictionaries: Record<AppLocale, TranslationDictionary> = { en, fr };

export type Translator = (key: TranslationKey, values?: InterpolationValues) => string;

function format(
  template: string,
  values?: InterpolationValues
): string {
  if (!values) return template;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, rawKey: string) => {
    const value = values[rawKey];
    return value == null ? "" : String(value);
  });
}

export function translate(
  locale: AppLocale,
  key: TranslationKey,
  values?: InterpolationValues
): string {
  const dictionary = dictionaries[locale] ?? dictionaries.en;
  const template = dictionary[key] ?? dictionaries.en[key];
  return format(template, values);
}

export function createTranslator(locale: AppLocale): Translator {
  return (key, values) => translate(locale, key, values);
}

export function localeFromUnknown(value: unknown): AppLocale {
  return value === "fr" ? "fr" : "en";
}

export function providerDisplayName(locale: AppLocale, provider: AIProviderId): string {
  const key: TranslationKey =
    provider === "claude-code"
      ? "provider.claude-code"
      : provider === "openai-codex"
        ? "provider.openai-codex"
        : "provider.gemini-cli";
  return translate(locale, key);
}
