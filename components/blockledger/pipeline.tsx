"use client";

import * as React from "react";
import { Check, Circle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepState = "pending" | "running" | "done" | "failed" | "skipped";

export interface PipelineStep {
  id: string;
  label: string;
  /** Shown once the step resolves, e.g. the resulting CID or hash. */
  detail?: string;
  state: StepState;
}

/**
 * The mint pipeline visualiser: hash → pin file → pin metadata → mint →
 * anchor → audit. Makes the otherwise invisible chain of work legible.
 */
export function PipelineProgress({
  steps,
  className,
}: {
  steps: PipelineStep[];
  className?: string;
}) {
  return (
    <ol className={cn("space-y-0", className)}>
      {steps.map((step, i) => (
        <li key={step.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <StepIcon state={step.state} />
            {i < steps.length - 1 ? (
              <span
                className={cn(
                  "w-px flex-1 bg-border",
                  step.state === "done" && "bg-emerald-500/40"
                )}
              />
            ) : null}
          </div>
          <div className={cn("min-w-0 flex-1", i < steps.length - 1 && "pb-3")}>
            <p
              className={cn(
                "text-sm leading-6",
                step.state === "pending" && "text-muted-foreground",
                step.state === "running" && "font-medium",
                step.state === "failed" && "font-medium text-red-300"
              )}
            >
              {step.label}
            </p>
            {step.detail ? (
              <p className="font-mono text-[11px] break-all text-muted-foreground">
                {step.detail}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function StepIcon({ state }: { state: StepState }) {
  const base =
    "flex size-6 shrink-0 items-center justify-center rounded-full border";
  switch (state) {
    case "done":
      return (
        <span
          className={cn(base, "border-emerald-500/40 bg-emerald-500/15 text-emerald-300")}
        >
          <Check className="size-3.5" />
        </span>
      );
    case "running":
      return (
        <span className={cn(base, "border-sky-500/40 bg-sky-500/15 text-sky-300")}>
          <Loader2 className="size-3.5 animate-spin" />
        </span>
      );
    case "failed":
      return (
        <span className={cn(base, "border-red-500/40 bg-red-500/15 text-red-300")}>
          <X className="size-3.5" />
        </span>
      );
    case "skipped":
      return (
        <span
          className={cn(base, "border-dashed border-amber-500/40 text-amber-300/80")}
        >
          <Circle className="size-2 fill-current" />
        </span>
      );
    default:
      return (
        <span className={cn(base, "border-border text-muted-foreground/50")}>
          <Circle className="size-2 fill-current" />
        </span>
      );
  }
}
