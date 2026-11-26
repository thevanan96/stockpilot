import { useId } from "react";
import { cn } from "@/lib/utils";

/** StockPilot mark: a navigation arrow on an indigo tile. */
export function LogoMark({ className }: { className?: string }) {
  // Unique gradient id: several marks can be mounted at once (sidebar + mobile header).
  const gradientId = useId();
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("size-7 shrink-0 drop-shadow-[0_1px_1px_oklch(0.3_0.15_277/0.25)]", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#4338CA" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${gradientId})`} />
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" stroke="white" strokeOpacity="0.15" fill="none" />
      <path d="M16 7.5 22.5 23 16 19.6 9.5 23 16 7.5Z" fill="white" />
    </svg>
  );
}
