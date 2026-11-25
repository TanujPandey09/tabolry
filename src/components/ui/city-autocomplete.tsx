"use client";

import * as React from "react";
import { Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LocationSuggestion } from "@/app/api/locations/search/route";

interface CityAutocompleteProps {
  id?: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  onChange: (cityValue: string) => void;
  onSelectLocation: (loc: LocationSuggestion) => void;
}

export function CityAutocomplete({
  id = "city",
  value,
  placeholder = "Type city (e.g. Pauri, Meerut, Mumbai)",
  required,
  className,
  onChange,
  onSelectLocation,
}: CityAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<LocationSuggestion[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const skipNextFetchRef = React.useRef(false);

  React.useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  React.useEffect(() => {
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }

    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/locations/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as { suggestions?: LocationSuggestion[] };
          const list = data.suggestions || [];
          setSuggestions(list);
          setOpen(list.length > 0);
        }
      } catch {
        // Ignore abort or transient network error
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          id={id}
          required={required}
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          onChange={(e) => {
            onChange(e.target.value.replace(/[^a-zA-Z\s.\-']/g, ""));
          }}
          className={cn("pr-9", className)}
        />
        {loading && (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-stone-400" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl"
        >
          {suggestions.map((loc, idx) => (
            <li key={`${loc.city}-${loc.state}-${loc.country}-${idx}`}>
              <button
                type="button"
                onClick={() => {
                  skipNextFetchRef.current = true;
                  onSelectLocation(loc);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-stone-100 cursor-pointer"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-stone-900">{loc.city}</p>
                  <p className="truncate text-xs text-stone-500">
                    {[loc.state, loc.country].filter(Boolean).join(", ")}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
