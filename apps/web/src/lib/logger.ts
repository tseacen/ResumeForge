const isDev = process.env.NODE_ENV !== "production";

type Level = "info" | "warn" | "error" | "debug";

const styles: Record<Level, string> = {
  info: "color:#5a7a4f;font-weight:600",
  warn: "color:#b5882e;font-weight:600",
  error: "color:#b5392f;font-weight:600",
  debug: "color:#6b6862",
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function format(level: Level, scope: string, message: string): unknown[] {
  const ts = new Date().toISOString().slice(11, 23);
  if (isBrowser()) {
    return [`%c[${scope}]%c ${ts} ${message}`, styles[level], "color:inherit"];
  }
  const tag = level.toUpperCase().padEnd(5);
  return [`[${tag}] [${scope}] ${ts} ${message}`];
}

/* eslint-disable no-console */
function emit(level: Level, scope: string, message: string, data?: unknown): void {
  if (!isDev) return;
  const args = format(level, scope, message);
  const sink =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : level === "debug"
          ? console.debug
          : console.log;
  if (data !== undefined) sink(...args, data);
  else sink(...args);
}
/* eslint-enable no-console */

export function devLog(scope: string, message: string, data?: unknown): void {
  emit("info", scope, message, data);
}

export function devWarn(scope: string, message: string, data?: unknown): void {
  emit("warn", scope, message, data);
}

export function devError(scope: string, message: string, data?: unknown): void {
  emit("error", scope, message, data);
}

export function devDebug(scope: string, message: string, data?: unknown): void {
  emit("debug", scope, message, data);
}

export function devTimer(scope: string, label: string): () => void {
  if (!isDev) return () => undefined;
  const start = performance.now();
  return () => {
    const ms = Math.round(performance.now() - start);
    emit("info", scope, `${label} (${ms} ms)`);
  };
}

export const IS_DEV = isDev;
