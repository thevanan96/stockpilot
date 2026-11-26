import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

// Soft, low-chroma tints that sit well beside the Iris accent in both themes.
const HUES = [277, 200, 160, 70, 25, 320, 240, 110];

function hueFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

/** Initials chip for customers and suppliers. */
export function EntityAvatar({ name, size = "sm", className }: { name: string; size?: "xs" | "sm" | "md"; className?: string }) {
  const hue = hueFor(name);
  return (
    <span
      aria-hidden
      style={{ "--h": hue } as React.CSSProperties}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight ring-1 ring-inset",
        "bg-[oklch(0.95_0.03_var(--h))] text-[oklch(0.42_0.1_var(--h))] ring-[oklch(0.42_0.1_var(--h)/0.12)]",
        "dark:bg-[oklch(0.32_0.06_var(--h))] dark:text-[oklch(0.88_0.07_var(--h))] dark:ring-[oklch(0.88_0.07_var(--h)/0.12)]",
        size === "xs" && "size-5 text-[9px]",
        size === "sm" && "size-7 text-[11px]",
        size === "md" && "size-9 text-[13px]",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/** Avatar + name (+ optional secondary line), used in table cells. */
export function EntityCell({ name, secondary }: { name: string; secondary?: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <EntityAvatar name={name} />
      <span className="min-w-0">
        <span className="block font-medium text-foreground sm:truncate">{name}</span>
        {secondary && <span className="block text-xs text-muted-foreground sm:truncate">{secondary}</span>}
      </span>
    </span>
  );
}
