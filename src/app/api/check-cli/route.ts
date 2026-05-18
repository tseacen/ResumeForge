import { execFile } from "child_process";
import { promisify } from "util";

import { NextResponse } from "next/server";

import { devLog, devWarn } from "@/lib/logger";

const execFileAsync = promisify(execFile);

const CLI_BINARIES: Record<string, string[]> = {
  "claude-code": ["claude"],
  "openai-codex": ["codex"],
  "gemini-cli": ["gemini"],
  mock: [],
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");

  if (!provider || !(provider in CLI_BINARIES)) {
    devWarn("api/check-cli", "unknown provider requested", { provider });
    return NextResponse.json({ available: false, error: "Unknown provider" }, { status: 400 });
  }

  const binaries = CLI_BINARIES[provider];

  if (binaries.length === 0) {
    devLog("api/check-cli", "provider has no CLI binary — reporting available", { provider });
    return NextResponse.json({ available: true });
  }

  for (const binary of binaries) {
    try {
      const { stdout } = await execFileAsync("which", [binary]);
      devLog("api/check-cli", "CLI detected", { provider, binary, path: stdout.trim() });
      return NextResponse.json({ available: true, binary });
    } catch {
      // not found, try next
    }
  }

  devWarn("api/check-cli", "no CLI binary found for provider", { provider, binaries });
  return NextResponse.json({ available: false });
}
