"use client";

import * as React from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  folder?: "menu" | "branding";
  label?: string;
  aspectHint?: string;
}

export function ImageUpload({
  value,
  onChange,
  folder = "menu",
  label = "Upload Image",
  aspectHint = "JPEG, PNG, or WebP up to 5 MB",
}: ImageUploadProps) {
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
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

      onChange(data.url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      {value ? (
        <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Uploaded preview"
            className="h-16 w-16 rounded-lg border border-slate-200 object-cover bg-white"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-700">{value}</p>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange("")}
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-4 py-5 text-sm text-slate-600 transition-colors hover:border-[#E15A2B]/40 hover:bg-[#E15A2B]/5 cursor-pointer disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-[#E15A2B]" />
          ) : (
            <ImageIcon className="h-5 w-5 text-slate-400" />
          )}
          <div className="text-left">
            <p className="font-medium text-slate-800">{uploading ? "Uploading..." : label}</p>
            <p className="text-xs text-slate-500">{aspectHint}</p>
          </div>
        </button>
      )}
    </div>
  );
}
