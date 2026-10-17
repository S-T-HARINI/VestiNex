import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseDateSafe(date: string | Date | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
  let str = String(date).trim();
  // If string is an ISO/SQL timestamp without timezone indicator, treat as UTC
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(str)) {
    if (!str.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(str)) {
      str = str.replace(' ', 'T') + 'Z';
    }
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(date: string | Date | undefined): string {
  if (!date) return "—";
  const d = parseDateSafe(date);
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(d) + " UTC";
}

export function formatTimeRelative(date: string | Date | undefined): string {
  if (!date) return "—";
  const d = parseDateSafe(date);
  if (!d) return "—";
  const now = new Date();
  const diffSec = Math.round((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}
