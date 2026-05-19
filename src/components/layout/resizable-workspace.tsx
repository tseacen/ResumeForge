"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

const HANDLE_WIDTH = 12;
const DEFAULT_RATIO = 0.45;
const STEP_PX = 32;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function readStoredRatio(storageKey: string): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return clamp(parsed, 0.28, 0.72);
}

interface ResizableWorkspaceProps {
  left: ReactNode;
  right: ReactNode;
  storageKey?: string;
  minLeftPx?: number;
  minRightPx?: number;
}

export function ResizableWorkspace({
  left,
  right,
  storageKey = "resumeforge.workspace.split",
  minLeftPx = 380,
  minRightPx = 460,
}: ResizableWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ratioRef = useRef(DEFAULT_RATIO);
  const [leftWidth, setLeftWidth] = useState(0);
  const [splitPercent, setSplitPercent] = useState(Math.round(DEFAULT_RATIO * 100));
  const [isDragging, setIsDragging] = useState(false);

  function usableWidth(): number {
    const container = containerRef.current;
    if (!container) return 0;
    return Math.max(0, container.getBoundingClientRect().width - HANDLE_WIDTH);
  }

  function leftBounds(width = usableWidth()) {
    if (width <= minLeftPx + minRightPx) {
      return {
        min: Math.max(260, Math.floor(width * 0.32)),
        max: Math.max(260, Math.floor(width * 0.68)),
      };
    }
    return {
      min: minLeftPx,
      max: width - minRightPx,
    };
  }

  function setWidthFromRatio(nextRatio: number) {
    const width = usableWidth();
    if (!width) return;
    const bounds = leftBounds(width);
    const nextWidth = clamp(Math.round(width * nextRatio), bounds.min, bounds.max);
    ratioRef.current = nextWidth / width;
    setLeftWidth(nextWidth);
    setSplitPercent(Math.round(ratioRef.current * 100));
  }

  function setWidthFromPointer(clientX: number) {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const width = Math.max(0, rect.width - HANDLE_WIDTH);
    const bounds = leftBounds(width);
    const nextWidth = clamp(Math.round(clientX - rect.left), bounds.min, bounds.max);
    ratioRef.current = width > 0 ? nextWidth / width : DEFAULT_RATIO;
    setLeftWidth(nextWidth);
    setSplitPercent(Math.round(ratioRef.current * 100));
  }

  function persistRatio() {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, ratioRef.current.toFixed(4));
  }

  useEffect(() => {
    ratioRef.current = readStoredRatio(storageKey) ?? DEFAULT_RATIO;
    setWidthFromRatio(ratioRef.current);

    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => setWidthFromRatio(ratioRef.current));
    observer.observe(container);
    return () => observer.disconnect();
    // We intentionally initialize once per workspace instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!isDragging) return;

    function handlePointerMove(event: PointerEvent) {
      event.preventDefault();
      setWidthFromPointer(event.clientX);
    }

    function handlePointerUp() {
      setIsDragging(false);
      persistRatio();
    }

    document.body.classList.add("cursor-col-resize", "select-none");
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });

    return () => {
      document.body.classList.remove("cursor-col-resize", "select-none");
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  function nudge(delta: number) {
    const width = usableWidth();
    const bounds = leftBounds(width);
    const nextWidth = clamp(leftWidth + delta, bounds.min, bounds.max);
    ratioRef.current = width > 0 ? nextWidth / width : DEFAULT_RATIO;
    setLeftWidth(nextWidth);
    setSplitPercent(Math.round(ratioRef.current * 100));
    persistRatio();
  }

  function resetSplit() {
    setWidthFromRatio(DEFAULT_RATIO);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
    }
  }

  if (!right) {
    return <div className="h-full min-h-0 flex-1">{left}</div>;
  }

  return (
    <div
      ref={containerRef}
      className="grid h-full min-h-0 flex-1 max-[980px]:block"
      style={{
        gridTemplateColumns:
          leftWidth > 0
            ? `${leftWidth}px ${HANDLE_WIDTH}px minmax(0, 1fr)`
            : `minmax(380px, 0.9fr) ${HANDLE_WIDTH}px minmax(520px, 1.1fr)`,
      }}
    >
      <div className="min-h-0 min-w-0">{left}</div>
      <button
        type="button"
        role="separator"
        aria-label="Redimensionner le chat et l'aperçu du CV"
        aria-orientation="vertical"
        aria-valuemin={20}
        aria-valuemax={80}
        aria-valuenow={splitPercent}
        title="Glisser pour redimensionner. Double-clic pour réinitialiser."
        className={`group relative h-full min-h-0 cursor-col-resize touch-none border-r border-l border-[var(--line)] bg-[var(--bg-2)] transition-colors hover:bg-[var(--panel)] focus-visible:bg-[var(--panel)] focus-visible:shadow-[var(--focus)] focus-visible:outline-none max-[980px]:hidden ${
          isDragging ? "bg-[var(--panel)]" : ""
        }`}
        onPointerDown={(event) => {
          event.preventDefault();
          setIsDragging(true);
          setWidthFromPointer(event.clientX);
        }}
        onDoubleClick={resetSplit}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            nudge(-STEP_PX);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            nudge(STEP_PX);
          }
          if (event.key === "Home") {
            event.preventDefault();
            setWidthFromRatio(0.34);
            persistRatio();
          }
          if (event.key === "End") {
            event.preventDefault();
            setWidthFromRatio(0.62);
            persistRatio();
          }
        }}
      >
        <span className="absolute top-1/2 left-1/2 h-11 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--line-3)] transition-all group-hover:h-14 group-hover:bg-[var(--accent)] group-focus-visible:h-14 group-focus-visible:bg-[var(--accent)]" />
      </button>
      <div className="min-h-0 min-w-0">{right}</div>
    </div>
  );
}
