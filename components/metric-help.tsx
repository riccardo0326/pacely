"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { METRIC_GLOSSARY, type MetricTerm } from "@/lib/ui/metric-glossary";
import { cn } from "@/lib/utils";

const MetricHelpContext = createContext<{
  openId: string | null;
  setOpenId: (id: string | null) => void;
}>({
  openId: null,
  setOpenId: () => {},
});

export function MetricHelpProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <MetricHelpContext.Provider value={{ openId, setOpenId }}>
      {children}
    </MetricHelpContext.Provider>
  );
}

const TOOLTIP_WIDTH = 256;

function subscribeNever() {
  return () => {};
}

function useIsClient() {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

function coordsFromButton(button: HTMLButtonElement): {
  centered: boolean;
  top: number;
  left: number;
} {
  const rect = button.getBoundingClientRect();
  if (window.innerWidth < 640) {
    return { centered: true, top: 0, left: 0 };
  }
  let left = rect.left;
  if (left + TOOLTIP_WIDTH > window.innerWidth - 8) {
    left = rect.right - TOOLTIP_WIDTH;
  }
  left = Math.max(8, Math.min(left, window.innerWidth - TOOLTIP_WIDTH - 8));
  return { centered: false, top: rect.bottom + 4, left };
}

export function MetricHelp({
  term,
  className,
}: {
  term: MetricTerm;
  className?: string;
}) {
  const entry = METRIC_GLOSSARY[term];
  const tooltipId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { openId, setOpenId } = useContext(MetricHelpContext);
  const open = openId === tooltipId;
  const isClient = useIsClient();
  const [coords, setCoords] = useState<{
    centered: boolean;
    top: number;
    left: number;
  }>({ centered: true, top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) {
      return;
    }
    setCoords(coordsFromButton(button));
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenId(null);
      }
    }
    function onReposition() {
      updatePosition();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, setOpenId, updatePosition]);

  const panel = (
    <span
      id={tooltipId}
      role="tooltip"
      className={cn(
        "z-50 w-64 rounded-lg border border-border bg-card p-2.5 text-left text-xs font-normal normal-case tracking-normal text-foreground shadow-md",
        coords.centered
          ? "fixed top-1/2 left-1/2 max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2"
          : "fixed",
      )}
      style={
        coords.centered
          ? undefined
          : { top: coords.top, left: coords.left, width: TOOLTIP_WIDTH }
      }
    >
      <span className="font-medium">
        {entry.abbr} · {entry.title}
      </span>
      <span className="mt-1 block leading-relaxed text-muted-foreground">
        {entry.body}
      </span>
    </span>
  );

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Cos'è ${entry.abbr}: ${entry.title}`}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={() => {
          if (open) {
            setOpenId(null);
            return;
          }
          const button = buttonRef.current;
          if (button) {
            setCoords(coordsFromButton(button));
          }
          setOpenId(tooltipId);
        }}
        className="inline-flex size-4 items-center justify-center rounded-full border border-border text-[10px] font-medium text-muted-foreground hover:border-foreground hover:text-foreground"
      >
        ?
      </button>
      {open && isClient
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Chiudi spiegazione"
                className="fixed inset-0 z-40 bg-black/30 sm:bg-transparent"
                onClick={() => setOpenId(null)}
              />
              {panel}
            </>,
            document.body,
          )
        : null}
    </span>
  );
}

export function MetricLabel({
  term,
  className,
}: {
  term: MetricTerm;
  className?: string;
}) {
  const entry = METRIC_GLOSSARY[term];
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span>{entry.abbr}</span>
      <MetricHelp term={term} />
    </span>
  );
}
