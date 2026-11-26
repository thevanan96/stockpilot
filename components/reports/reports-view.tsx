"use client";

import { useMemo, useState } from "react";
import { format, startOfMonth, startOfYear, subDays, subMonths } from "date-fns";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, TableSkeleton } from "@/components/shared/data-table";
import { DateRangePicker, type RangePreset } from "@/components/shared/date-picker";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/filters";
import { PageBody, PageHeader } from "@/components/shared/page-header";
import {
  purchaseColumns,
  purchaseCsv,
  purchaseStats,
  salesColumns,
  salesCsv,
  salesStats,
  stockColumns,
  stockCsv,
  stockStats,
  type ReportStat,
} from "@/components/reports/report-definitions";
import { downloadCsv, toCsv } from "@/lib/csv";
import { formatDate } from "@/lib/format";
import { selectPurchaseReport, selectSalesReport, selectStockReport } from "@/lib/selectors";
import { useInventoryStore } from "@/store/inventory-store";
import { useHydrated } from "@/store/use-hydrated";
import type { DateRange } from "@/types";

type ReportKind = "stock" | "sales" | "purchases";

const PRESETS: RangePreset[] = [
  { label: "Last 7 days", range: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: "Last 30 days", range: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { label: "This month", range: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: "Last 3 months", range: () => ({ from: subMonths(new Date(), 3), to: new Date() }) },
  { label: "Last 6 months", range: () => ({ from: startOfMonth(subMonths(new Date(), 5)), to: new Date() }) },
  { label: "Year to date", range: () => ({ from: startOfYear(new Date()), to: new Date() }) },
];

const META: Record<ReportKind, { title: string; description: string }> = {
  stock: { title: "Stock movement", description: "Opening balance, receipts, shipments and adjustments per item — replayed from the ledger." },
  sales: { title: "Sales", description: "Invoices dated within the period, with status and value." },
  purchases: { title: "Purchases", description: "Purchase orders dated within the period, with status and value." },
};

export function ReportsView() {
  // Date ranges depend on the client's clock, so render only after hydration.
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <>
        <PageHeader title="Reports" description="Period reports built from the ledger and documents. Export any view as CSV." />
        <PageBody>
          <TableSkeleton columns={6} />
        </PageBody>
      </>
    );
  }
  return <Reports />;
}

function Reports() {
  const [kind, setKind] = useState<ReportKind>("stock");
  const [range, setRange] = useState<DateRange>(() => PRESETS[3].range());
  const [search, setSearch] = useState("");

  const items = useInventoryStore((s) => s.items);
  const movements = useInventoryStore((s) => s.movements);
  const sales = useInventoryStore((s) => s.sales);
  const customers = useInventoryStore((s) => s.customers);
  const purchases = useInventoryStore((s) => s.purchases);
  const suppliers = useInventoryStore((s) => s.suppliers);

  const stockRows = useMemo(() => selectStockReport({ items, movements }, range), [items, movements, range]);
  const salesRows = useMemo(() => selectSalesReport({ sales, customers }, range), [sales, customers, range]);
  const purchaseRows = useMemo(() => selectPurchaseReport({ purchases, suppliers }, range), [purchases, suppliers, range]);

  const stats: ReportStat[] =
    kind === "stock" ? stockStats(stockRows) : kind === "sales" ? salesStats(salesRows) : purchaseStats(purchaseRows);
  const rowCount = kind === "stock" ? stockRows.length : kind === "sales" ? salesRows.length : purchaseRows.length;

  const exportCsv = () => {
    const csv =
      kind === "stock" ? toCsv(stockRows, stockCsv) : kind === "sales" ? toCsv(salesRows, salesCsv) : toCsv(purchaseRows, purchaseCsv);
    const filename = `stockpilot-${kind}-${format(range.from, "yyyy-MM-dd")}_to_${format(range.to, "yyyy-MM-dd")}.csv`;
    downloadCsv(filename, csv);
    toast.success("CSV exported", { description: filename });
  };

  const empty = (
    <EmptyState
      icon={FileSpreadsheet}
      title="Nothing in this period"
      description="Widen the date range to include more documents."
      action={
        <Button variant="outline" onClick={() => setRange(PRESETS[5].range())}>
          Show year to date
        </Button>
      }
    />
  );

  return (
    <>
      <PageHeader
        title="Reports"
        description="Period reports built from the ledger and documents. Export any view as CSV."
        actions={
          <>
            <DateRangePicker value={range} onChange={setRange} presets={PRESETS} />
            <Button variant="outline" onClick={exportCsv} disabled={rowCount === 0}>
              <Download /> Export CSV
            </Button>
          </>
        }
      />
      <PageBody>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={kind} onValueChange={(v) => setKind(v as ReportKind)}>
            <TabsList className="h-9 bg-muted ring-1 ring-border ring-inset">
              <TabsTrigger value="stock" className="px-3">Stock</TabsTrigger>
              <TabsTrigger value="sales" className="px-3">Sales</TabsTrigger>
              <TabsTrigger value="purchases" className="px-3">Purchases</TabsTrigger>
            </TabsList>
          </Tabs>
          <SearchInput value={search} onChange={setSearch} placeholder={kind === "stock" ? "Search items…" : "Search documents…"} />
        </div>

        <section aria-labelledby="report-title" className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h2 id="report-title" className="text-sm font-semibold">
              {META[kind].title} report
              <span className="num ml-2 font-normal text-muted-foreground">
                {formatDate(range.from)} – {formatDate(range.to)}
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">{META[kind].description}</p>
          </div>

          <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-border shadow-card lg:grid-cols-4" style={{ gap: 1 }}>
            {stats.map((s) => (
              <div key={s.label} className="bg-card px-5 py-4">
                <dt className="text-xs text-muted-foreground">{s.label}</dt>
                <dd className="num mt-1 flex items-baseline gap-1.5">
                  <span className="text-lg font-semibold tracking-tight">{s.value}</span>
                  {s.hint && <span className="truncate text-xs text-subtle-foreground">{s.hint}</span>}
                </dd>
              </div>
            ))}
          </dl>

          {kind === "stock" ? (
            <DataTable key="stock" columns={stockColumns} data={stockRows} search={search} initialSorting={[{ id: "closingValue", desc: true }]} empty={empty} />
          ) : kind === "sales" ? (
            <DataTable key="sales" columns={salesColumns} data={salesRows} search={search} initialSorting={[{ id: "date", desc: true }]} empty={empty} />
          ) : (
            <DataTable key="purchases" columns={purchaseColumns} data={purchaseRows} search={search} initialSorting={[{ id: "date", desc: true }]} empty={empty} />
          )}
        </section>
      </PageBody>
    </>
  );
}
