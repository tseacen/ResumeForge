import { execFile } from "child_process";
import { promisify } from "util";

import { ClaudeCliProvider, CodexCliProvider, GeminiCliProvider } from "@/lib/llm/cli-provider";
import { type LLMProvider } from "@/lib/llm/provider";
import { type AIProviderId } from "@/lib/schemas/settings.schema";

const execFileAsync = promisify(execFile);

const CLI_BINARY: Partial<Record<AIProviderId, string>> = {
  "claude-code": "claude",
  "openai-codex": "codex",
  "gemini-cli": "gemini",
};

async function locateBinary(binary: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("which", [binary]);
    const trimmed = stdout.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

export interface ResolvedProvider {
  provider: LLMProvider;
  binary: string;
  binaryPath: string;
  model?: string;
  providerLabel: string;
}

export interface ProviderResolutionError {
  error: "no_provider_selected" | "unsupported_provider" | "cli_not_installed";
  binary: string;
  message: string;
}

export async function resolveProvider(
  providerId: AIProviderId | undefined,
  model: string | undefined
): Promise<ResolvedProvider | ProviderResolutionError> {
  if (!providerId || providerId === "mock") {
    return {
      error: "no_provider_selected",
      binary: "",
      message:
        "Aucun moteur d'IA sélectionné. Configurez Claude Code ou OpenAI Codex dans les réglages.",
    };
  }
  const binary = CLI_BINARY[providerId];
  if (!binary) {
    return {
      error: "unsupported_provider",
      binary: "",
      message: "Moteur d'IA non supporté.",
    };
  }
  const binaryPath = await locateBinary(binary);
  if (!binaryPath) {
    return {
      error: "cli_not_installed",
      binary,
      message: `Le CLI '${binary}' est introuvable. Installez-le, vérifiez votre PATH puis réessayez.`,
    };
  }
  let provider: LLMProvider;
  let providerLabel: string;
  if (providerId === "claude-code") {
    provider = new ClaudeCliProvider(model);
    providerLabel = "Claude Code";
  } else if (providerId === "openai-codex") {
    provider = new CodexCliProvider(model);
    providerLabel = "OpenAI Codex";
  } else {
    provider = new GeminiCliProvider(model);
    providerLabel = "Gemini CLI";
  }
  return { provider, binary, binaryPath, model, providerLabel };
}

export function isResolutionError(
  resolved: ResolvedProvider | ProviderResolutionError
): resolved is ProviderResolutionError {
  return "error" in resolved;
}
