import * as React from "react";
import { cn } from "@/lib/utils";

interface TabloryLogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  showBadge?: boolean;
  className?: string;
}

export function TabloryLogo({
  size = "md",
  showWordmark = true,
  showBadge = false,
  className,
}: TabloryLogoProps) {
  const boxSize =
    size === "sm" ? "h-8 w-8 rounded-lg" : size === "lg" ? "h-11 w-11 rounded-2xl" : "h-9 w-9 rounded-xl";
  const textSize =
    size === "sm" ? "text-lg" : size === "lg" ? "text-2xl" : "text-xl";

  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden shadow-sm shadow-orange-950/10",
          boxSize
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/favicon.png"
          alt="Tablory"
          className="h-full w-full object-cover scale-110"
        />
      </div>

      {showWordmark && (
        <div className="flex items-center gap-2">
          <span className={cn("font-extrabold tracking-tight text-stone-950 leading-none", textSize)}>
            Tabl<span className="text-brand">ory</span>
          </span>
          {showBadge && (
            <span className="hidden sm:inline-flex items-center rounded-md border border-stone-200 bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-600">
              Hospitality OS
            </span>
          )}
        </div>
      )}
    </div>
  );
}
