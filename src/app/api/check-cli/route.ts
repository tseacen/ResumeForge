import { execFile } from "child_process";
import { promisify } from "util";
import { NextResponse } from "next/server";

const execFileAsync = promisify(execFile);

const CLI_BINARIES: Record<string, string[]> = {
  "claude-code": ["claude"],
  "openai-codex": ["codex"],
  mock: [],
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");

  if (!provider || !(provider in CLI_BINARIES)) {
    return NextResponse.json({ available: false, error: "Unknown provider" }, { status: 400 });
  }

  const binaries = CLI_BINARIES[provider];

  if (binaries.length === 0) {
    return NextResponse.json({ available: true });
  }

  for (const binary of binaries) {
    try {
      await execFileAsync("which", [binary]);
      return NextResponse.json({ available: true, binary });
    } catch {
      // not found, try next
    }
  }

  return NextResponse.json({ available: false });
}
