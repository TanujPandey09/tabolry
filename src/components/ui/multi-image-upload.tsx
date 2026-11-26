"use client";

import * as React from "react";
import { Loader2, Plus, X } from "@/components/ui/icons";
import { toast } from "sonner";

interface MultiImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  folder?: "menu-items" | "branding";
  maxImages?: number;
}

export function MultiImageUpload({
  value,
  onChange,
  folder = "menu-items",
  maxImages = 4,
}: MultiImageUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  async function handleFilesSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = maxImages - value.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${maxImages} photos allowed per dish.`);
      return;
    }

    const selected = files.slice(0, remainingSlots);
    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of selected) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 5 MB limit`);
          continue;
        }
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Upload failed");
        }
        if (data.url) uploadedUrls.push(data.url);
      }

      if (uploadedUrls.length > 0) {
        onChange([...value, ...uploadedUrls]);
        toast.success(
          uploadedUrls.length === 1
            ? "Dish photo added"
            : `${uploadedUrls.length} dish photos added`
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload image");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeAt(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFilesSelect}
      />

      <div className="grid grid-cols-4 gap-2.5">
        {value.map((url, idx) => (
          <div
            key={`${url}-${idx}`}
            className="group relative aspect-square overflow-hidden rounded-xl border border-stone-200 bg-stone-50 shadow-2xs"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Dish photo ${idx + 1}`}
              className="h-full w-full object-cover"
            />
            {idx === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded-md bg-stone-950/75 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                Main
              </span>
            )}
            <button
              type="button"
              onClick={() => removeAt(idx)}
              aria-label="Remove photo"
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-stone-950/75 text-white opacity-90 transition hover:bg-red-600 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {value.length < maxImages && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-stone-300 bg-stone-50/60 p-2 text-center text-stone-500 transition hover:border-brand/50 hover:bg-brand/5 hover:text-brand cursor-pointer disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-brand" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
            <span className="text-[11px] font-semibold leading-tight">
              {uploading ? "Uploading" : `Add Photo`}
            </span>
            <span className="text-[10px] text-stone-400">
              {value.length}/{maxImages}
            </span>
          </button>
        )}
      </div>

      <p className="text-[11px] text-stone-400">
        Upload up to {maxImages} photos (JPG, PNG, WebP · max 5 MB each). First photo is shown on the menu card.
      </p>
    </div>
  );
}
