"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Inline click-to-copy text, for use in tight contexts (table cells) where
 * CopyableField's label/dt would be redundant.
 * @param {{ value?: string | null, label: string, className?: string }} props
 */
export function CopyableText({ value, label, className }) {
  const [copied, setCopied] = useState(false);

  if (value == null || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      toast.success(`Copied ${label}`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "group -ml-1 inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-muted",
        className
      )}
    >
      <span>{value}</span>
      {copied ? (
        <Check className="size-3.5 shrink-0 text-emerald-600" />
      ) : (
        <Copy className="size-3.5 shrink-0 opacity-0 group-hover:opacity-60" />
      )}
    </button>
  );
}
