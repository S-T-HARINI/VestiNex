'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  value?: string;
  text?: string;
  className?: string;
  label?: string;
  children?: React.ReactNode;
}

export function CopyButton({ value, text, className = '', label, children }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const targetVal = value ?? text ?? '';

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(targetVal);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copied to clipboard' : (label || `Copy ${value}`)}
      className={`inline-flex items-center gap-1 text-foreground-secondary hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded px-1 py-0.5 ${className}`}
    >
      {children}
      {copied ? (
        <Check className="h-3 w-3 text-status-success shrink-0" />
      ) : (
        <Copy className="h-3 w-3 opacity-60 hover:opacity-100 shrink-0" />
      )}
    </button>
  );
}
