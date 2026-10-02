"use client";

import { useState } from "react";

export default function MarketCopyButton({
  text,
  label = "Copy",
  variant = "primary"
}: {
  text: string;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button className={`market-copy-button newsroom-action newsrom-action--${variant}`} type="button" onClick={copy}>
      {copied ? "Copied" : label}
    </button>
  );
}
