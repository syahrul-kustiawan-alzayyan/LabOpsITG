"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";

/** Menampilkan kode lacak (pengajuan/tiket) dengan tombol salin. */
export function CopyCode({ code, label = "Kode lacak" }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="code-panel">
      <span className="stat-label">{label}</span>
      <div className="code-row">
        <code className="code-value">{code}</code>
        <button type="button" className="btn btn-secondary btn-sm" onClick={copy}>
          <Icon name={copied ? "check" : "external"} size={14} /> {copied ? "Tersalin" : "Salin"}
        </button>
      </div>
    </div>
  );
}
