import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  tone?: "neutral" | "danger";
}

export function EmptyState({ icon: Icon, title, description, action, className, tone = "neutral" }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center animate-fade-up", className)}>
      <div
        className={cn(
          "relative mb-4 flex size-11 items-center justify-center rounded-xl ring-1 ring-border shadow-card",
          tone === "danger" ? "bg-danger-soft text-danger-text" : "bg-card text-muted-foreground",
        )}
      >
        <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-[radial-gradient(closest-side,var(--brand-soft),transparent)]" />
        <Icon className="size-5" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5 flex gap-2">{action}</div>}
    </div>
  );
}
