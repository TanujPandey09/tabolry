import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LoadingState({
  message = "Loading...",
  description = "Syncing your restaurant data...",
}: {
  message?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="relative flex h-11 w-11 items-center justify-center">
        <div className="h-11 w-11 rounded-full border-[2.5px] border-stone-200 border-t-[#E15A2B] animate-spin" />
      </div>
      <h3 className="mt-4 text-sm font-bold tracking-tight text-stone-900">
        {message}
      </h3>
      <p className="mt-1 max-w-xs text-xs text-stone-500 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-52 rounded-lg bg-stone-200/80" />
          <div className="h-4 w-72 rounded-md bg-stone-200/50" />
        </div>
        <div className="flex gap-2.5">
          <div className="h-9 w-28 rounded-xl bg-stone-200/70" />
          <div className="h-9 w-36 rounded-xl bg-stone-200/70" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-stone-200/70 bg-white p-5 space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-3.5 w-24 rounded bg-stone-200/70" />
              <div className="h-8 w-8 rounded-lg bg-stone-100" />
            </div>
            <div className="h-8 w-16 rounded-md bg-stone-200/80" />
            <div className="h-3 w-28 rounded bg-stone-100" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-stone-200/70 bg-white p-6 space-y-4">
        <div className="h-5 w-44 rounded bg-stone-200/80" />
        <div className="space-y-2.5">
          <div className="h-14 w-full rounded-xl bg-stone-100" />
          <div className="h-14 w-full rounded-xl bg-stone-100/70" />
          <div className="h-14 w-full rounded-xl bg-stone-100/50" />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-44 rounded-lg bg-stone-200/80" />
          <div className="h-4 w-64 rounded-md bg-stone-200/50" />
        </div>
        <div className="h-10 w-36 rounded-xl bg-stone-200/80" />
      </div>

      <div className="rounded-2xl border border-stone-200/80 bg-white overflow-hidden">
        <div className="border-b border-stone-100 bg-stone-50/80 px-5 py-3.5 flex gap-4">
          <div className="h-9 flex-1 max-w-xs rounded-xl bg-stone-200/60" />
          <div className="h-9 w-32 rounded-xl bg-stone-200/50" />
        </div>
        <div className="divide-y divide-stone-100">
          {Array.from({ length: rows }).map((_, idx) => (
            <div key={idx} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="flex items-center gap-3.5 flex-1">
                <div className="h-12 w-12 rounded-xl bg-stone-100 shrink-0" />
                <div className="space-y-2 flex-1 max-w-sm">
                  <div className="h-4 w-40 rounded bg-stone-200/80" />
                  <div className="h-3 w-56 rounded bg-stone-100" />
                </div>
              </div>
              <div className="h-6 w-16 rounded-full bg-stone-100" />
              <div className="h-8 w-20 rounded-lg bg-stone-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/60 px-6 py-12 text-center">
      <AlertCircle className="h-8 w-8 text-red-600" />
      <h3 className="mt-3 text-base font-bold text-stone-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-stone-600">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-500">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-stone-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-stone-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/**
 * Standard Indian FSSAI-style dietary indicator badge (Veg / Non-Veg / Egg)
 */
export function DietaryIndicator({
  type,
  showLabel = false,
}: {
  type: "VEG" | "NON_VEG" | "EGG";
  showLabel?: boolean;
}) {
  const config =
    type === "VEG"
      ? { border: "border-emerald-600", dot: "bg-emerald-600", label: "Veg" }
      : type === "EGG"
        ? { border: "border-amber-600", dot: "bg-amber-600", label: "Egg" }
        : { border: "border-red-600", dot: "bg-red-600", label: "Non-Veg" };

  return (
    <span className="inline-flex items-center gap-1.5" title={config.label}>
      <span
        className={cn(
          "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border bg-white",
          config.border
        )}
      >
        <span className={cn("h-2 w-2 rounded-full", config.dot)} />
      </span>
      {showLabel && <span className="text-xs font-medium text-slate-600">{config.label}</span>}
    </span>
  );
}
