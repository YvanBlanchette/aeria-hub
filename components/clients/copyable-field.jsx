"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A read-only field whose value can be clicked to copy to the clipboard.
 * @param {{ label: string, value?: string | null, className?: string }} props
 */
export function CopyableField({ label, value, className }) {
  const [copied, setCopied] = useState(false);
  const hasValue = value != null && value !== "";

  async function handleCopy() {
    if (!hasValue) return;
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      toast.success(`Copied ${label.toLowerCase()}`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  }

  return (
    <div className={className}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!hasValue}
          className={cn(
            "group -ml-1 inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-left text-sm",
            hasValue ? "hover:bg-muted cursor-pointer" : "cursor-default text-muted-foreground"
          )}
        >
          <span className="whitespace-pre-wrap">{hasValue ? value : "—"}</span>
          {hasValue &&
            (copied ? (
              <Check className="size-3.5 shrink-0 text-emerald-600" />
            ) : (
              <Copy className="size-3.5 shrink-0 opacity-0 group-hover:opacity-60" />
            ))}
        </button>
      </dd>
    </div>
  );
}
