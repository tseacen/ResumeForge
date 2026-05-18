import { Command } from "@tauri-apps/plugin-shell";

import {
  type LLMCompletionParams,
  type LLMCompletionResult,
  type LLMMessage,
  type LLMProvider,
} from "./provider";

function combineMessages(messages: LLMMessage[]): string {
  const lines: string[] = [];
  for (const message of messages) {
    if (message.role === "system") {
      lines.push(`# System\n${message.content}`);
    } else if (message.role === "user") {
      lines.push(`# User\n${message.content}`);
    } else {
      lines.push(`# Assistant (previous)\n${message.content}`);
    }
  }
  lines.push(
    "# Response\nRespond with ONLY the JSON object described above. No prose, no markdown fences, no commentary."
  );
  return lines.join("\n\n");
}

async function executeCommand(
  program: "claude" | "codex" | "gemini",
  args: string[]
): Promise<string> {
  const command = Command.create(program, args);
  const result = await command.execute();
  if (result.code !== 0) {
    const stderr = (result.stderr ?? "").toString().trim().slice(0, 600);
    throw new Error(
      `${program} a terminé avec le code ${result.code ?? "?"}. ${stderr || "(stderr vide)"}`
    );
  }
  const stdout = (result.stdout ?? "").toString().trim();
  if (!stdout) throw new Error(`${program} a renvoyé une sortie vide.`);
  return stdout;
}

export class TauriClaudeProvider implements LLMProvider {
  readonly name = "claude-cli-tauri";
  readonly isAvailable = true;
  private readonly model?: string;

  constructor(model?: string) {
    this.model = model;
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    const prompt = combineMessages(params.messages);
    const args = ["-p"];
    if (this.model) args.push("--model", this.model);
    args.push(prompt);
    const content = await executeCommand("claude", args);
    return { content, model: this.model ?? "claude-cli" };
  }
}

export class TauriCodexProvider implements LLMProvider {
  readonly name = "codex-cli-tauri";
  readonly isAvailable = true;
  private readonly model?: string;

  constructor(model?: string) {
    this.model = model;
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    const prompt = combineMessages(params.messages);
    const args = ["exec"];
    if (this.model) args.push("--model", this.model);
    args.push(prompt);
    const content = await executeCommand("codex", args);
    return { content, model: this.model ?? "codex-cli" };
  }
}

export class TauriGeminiProvider implements LLMProvider {
  readonly name = "gemini-cli-tauri";
  readonly isAvailable = true;
  private readonly model?: string;

  constructor(model?: string) {
    this.model = model;
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    const prompt = combineMessages(params.messages);
    const args = ["-p"];
    if (this.model) args.push("--model", this.model);
    args.push(prompt);
    const content = await executeCommand("gemini", args);
    return { content, model: this.model ?? "gemini-cli" };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Détection CLI via `which`
// ──────────────────────────────────────────────────────────────────────────────

export async function checkCliAvailableViaShell(
  binary: "claude" | "codex" | "gemini"
): Promise<boolean> {
  try {
    const command = Command.create("which", [binary]);
    const result = await command.execute();
    if (result.code !== 0) return false;
    const path = (result.stdout ?? "").toString().trim();
    return path.length > 0;
  } catch {
    return false;
  }
}
