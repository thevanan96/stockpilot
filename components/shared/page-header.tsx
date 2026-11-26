import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  /** Primary / secondary actions, right-aligned on desktop. */
  actions?: React.ReactNode;
  /** Small element rendered above the title (e.g. a back link). */
  eyebrow?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, eyebrow, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-border px-4 pt-6 pb-5 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8 lg:pt-7",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        {eyebrow}
        <h1 className="text-[22px] leading-7 font-semibold tracking-[-0.02em] text-foreground">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Standard page body with consistent gutters. */
export function PageBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8", className)}>{children}</div>;
}
