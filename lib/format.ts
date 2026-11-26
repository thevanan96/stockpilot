import { format, formatDistanceToNowStrict, isToday, isYesterday } from "date-fns";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPrecise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrCompact = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const num = new Intl.NumberFormat("en-IN");

/** ₹1,23,456 — whole rupees unless there are paise. */
export function formatINR(value: number) {
  return Number.isInteger(value) ? inr.format(value) : inrPrecise.format(value);
}

/** ₹1.2L / ₹3.4Cr — for axes and dense summaries. */
export function formatINRCompact(value: number) {
  return inrCompact.format(value);
}

export function formatNumber(value: number) {
  return num.format(value);
}

/** +12 / −4 with a true minus sign. */
export function formatDelta(value: number) {
  if (value > 0) return `+${num.format(value)}`;
  if (value < 0) return `−${num.format(Math.abs(value))}`;
  return "0";
}

export function formatPercent(value: number) {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(1)}%`;
}

export function formatDate(iso: string | Date) {
  return format(new Date(iso), "d MMM yyyy");
}

export function formatDateTime(iso: string | Date) {
  return format(new Date(iso), "d MMM yyyy, h:mm a");
}

/** "Today, 3:20 PM" / "Yesterday" / "3 days ago" / "12 Aug". */
export function formatRelative(iso: string | Date) {
  const d = new Date(iso);
  if (isToday(d)) return `Today, ${format(d, "h:mm a")}`;
  if (isYesterday(d)) return `Yesterday, ${format(d, "h:mm a")}`;
  const diffDays = (Date.now() - d.getTime()) / 86_400_000;
  if (diffDays < 7) return formatDistanceToNowStrict(d, { addSuffix: true });
  return format(d, "d MMM");
}

/** Two-letter initials for avatar chips. */
export function initials(name: string) {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "?";
}
