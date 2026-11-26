import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EntityAvatar } from "@/components/shared/entity-avatar";
import { PageBody, PageHeader } from "@/components/shared/page-header";
import { docTotal, docUnits } from "@/lib/domain";
import { formatINR, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LineItem } from "@/types";

/** Shared page frame for "New sale" / "New purchase order". */
export function DocumentFormLayout({
  backHref,
  backLabel,
  title,
  number,
  children,
  summary,
  onSubmit,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  number: string;
  children: React.ReactNode;
  summary: React.ReactNode;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
}) {
  return (
    <>
      <PageHeader
        eyebrow={
          <Link
            href={backHref}
            className="-ml-1 mb-1 inline-flex items-center gap-1 rounded-md px-1 text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-3.5" /> {backLabel}
          </Link>
        }
        title={title}
        description={
          <>
            Will be saved as <span className="font-mono text-foreground">{number}</span>
          </>
        }
      />
      <PageBody>
        <form onSubmit={onSubmit} noValidate className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">{children}</div>
          <aside className="lg:sticky lg:top-6">{summary}</aside>
        </form>
      </PageBody>
    </>
  );
}

export function FormCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card shadow-card", className)}>
      <header className="border-b border-border px-5 py-3.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Sticky order summary with live totals and the submit actions. */
export function DocumentSummary({
  partyLabel,
  partyName,
  lines,
  actions,
  footnote,
}: {
  partyLabel: string;
  partyName?: string;
  lines: LineItem[];
  actions: React.ReactNode;
  footnote?: React.ReactNode;
}) {
  const valid = lines.filter((l) => l.itemId && Number.isFinite(l.qty) && Number.isFinite(l.unitPrice));
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          {partyName ? (
            <EntityAvatar name={partyName} size="md" />
          ) : (
            <span className="size-9 rounded-full border border-dashed border-border-strong" aria-hidden />
          )}
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">{partyLabel}</div>
            <div className={cn("truncate text-sm font-medium", !partyName && "text-subtle-foreground")}>
              {partyName ?? "Not selected"}
            </div>
          </div>
        </div>
        <dl className="num space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Lines</dt>
            <dd>{valid.length}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Units</dt>
            <dd>{formatNumber(docUnits(valid))}</dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <dt className="font-medium">Total</dt>
            <dd className="text-xl font-semibold tracking-tight">{formatINR(docTotal(valid))}</dd>
          </div>
        </dl>
      </div>
      <div className="flex flex-col gap-2 border-t border-border bg-muted/40 p-4">{actions}</div>
      {footnote && <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">{footnote}</p>}
    </div>
  );
}
