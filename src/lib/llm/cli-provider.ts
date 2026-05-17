import { spawn } from "child_process";

import { devError, devLog } from "@/lib/logger";

import {
  type LLMCompletionParams,
  type LLMCompletionResult,
  type LLMMessage,
  type LLMProvider,
} from "./provider";

const DEFAULT_TIMEOUT_MS = 180_000;

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

interface SpawnResult {
  stdout: string;
  stderr: string;
}

function spawnWithStdin(
  command: string,
  args: string[],
  stdin: string | null,
  timeoutMs: number
): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      proc.kill("SIGTERM");
      reject(new Error(`${command} ${args[0] ?? ""} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });
    proc.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
    proc.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        reject(
          new Error(
            `${command} exited with code ${code}. stderr: ${stderr.trim().slice(0, 600)}`
          )
        );
      } else {
        resolve({ stdout, stderr });
      }
    });

    if (stdin !== null) {
      proc.stdin.write(stdin, "utf-8");
    }
    proc.stdin.end();
  });
}

export class ClaudeCliProvider implements LLMProvider {
  readonly name = "claude-cli";
  readonly isAvailable = true;
  private readonly model?: string;
  private readonly timeoutMs: number;

  constructor(model?: string, timeoutMs = DEFAULT_TIMEOUT_MS) {
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    const prompt = combineMessages(params.messages);
    const args = ["-p"];
    if (this.model) args.push("--model", this.model);

    devLog("llm/claude-cli", "invoking claude CLI", {
      model: this.model,
      promptChars: prompt.length,
    });

    let result: SpawnResult;
    try {
      result = await spawnWithStdin("claude", args, prompt, this.timeoutMs);
    } catch (err) {
      devError("llm/claude-cli", "spawn failed", err instanceof Error ? err.message : err);
      throw err;
    }

    const content = result.stdout.trim();
    if (!content) {
      throw new Error("claude CLI returned empty output");
    }
    return { content, model: this.model ?? "claude-cli" };
  }
}

export class CodexCliProvider implements LLMProvider {
  readonly name = "codex-cli";
  readonly isAvailable = true;
  private readonly model?: string;
  private readonly timeoutMs: number;

  constructor(model?: string, timeoutMs = DEFAULT_TIMEOUT_MS) {
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    const prompt = combineMessages(params.messages);
    const args = ["exec"];
    if (this.model) args.push("--model", this.model);
    args.push("-"); // read prompt from stdin

    devLog("llm/codex-cli", "invoking codex CLI", {
      model: this.model,
      promptChars: prompt.length,
    });

    let result: SpawnResult;
    try {
      result = await spawnWithStdin("codex", args, prompt, this.timeoutMs);
    } catch (err) {
      devError("llm/codex-cli", "spawn failed", err instanceof Error ? err.message : err);
      throw err;
    }

    const content = result.stdout.trim();
    if (!content) {
      throw new Error("codex CLI returned empty output");
    }
    return { content, model: this.model ?? "codex-cli" };
  }
}

export class GeminiCliProvider implements LLMProvider {
  readonly name = "gemini-cli";
  readonly isAvailable = true;
  private readonly model?: string;
  private readonly timeoutMs: number;

  constructor(model?: string, timeoutMs = DEFAULT_TIMEOUT_MS) {
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    const prompt = combineMessages(params.messages);
    // gemini CLI attend une valeur pour -p/--prompt (stdin seul ne suffit pas).
    const args: string[] = [];
    if (this.model) args.push("--model", this.model);
    args.push("-p", prompt);

    devLog("llm/gemini-cli", "invoking gemini CLI", {
      model: this.model,
      promptChars: prompt.length,
    });

    let result: SpawnResult;
    try {
      result = await spawnWithStdin("gemini", args, null, this.timeoutMs);
    } catch (err) {
      devError("llm/gemini-cli", "spawn failed", err instanceof Error ? err.message : err);
      throw err;
    }

    const content = result.stdout.trim();
    if (!content) {
      throw new Error("gemini CLI returned empty output");
    }
    return { content, model: this.model ?? "gemini-cli" };
  }
}
