"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          window.prompt(label, text);
        }
      }}
      className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-300 hover:ring-violet-500 dark:text-gray-200 dark:ring-gray-600"
    >
      {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
      {copied ? "Kopiert" : label}
    </button>
  );
}
