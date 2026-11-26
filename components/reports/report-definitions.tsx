import type { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EntityCell } from "@/components/shared/entity-avatar";
import type { CsvColumn } from "@/lib/csv";
import { formatDate, formatDelta, formatINR, formatNumber } from "@/lib/format";
import type { DocReportRow, StockReportRow } from "@/lib/selectors";
import { cn } from "@/lib/utils";
import type { PurchaseOrder, SalesOrder } from "@/types";

/** Table columns, CSV columns and summary stats for each report. */

export interface ReportStat {
  label: string;
  value: string;
  hint?: string;
}

const isoDay = (iso: string) => iso.slice(0, 10);

/* ------------------------------ Stock ------------------------------ */

const qty = (v: number, signed = false) => (
  <span className={cn(signed && v > 0 && "text-success-text", signed && v < 0 && "text-danger-text", v === 0 && "text-subtle-foreground")}>
    {signed ? formatDelta(v) : formatNumber(v)}
  </span>
);

export const stockColumns: ColumnDef<StockReportRow>[] = [
  {
    id: "item",
    accessorFn: (r) => `${r.item.name} ${r.item.sku}`,
    header: "Item",
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="font-medium sm:truncate">{row.original.item.name}</div>
        <div className="font-mono text-xs text-muted-foreground">{row.original.item.sku}</div>
      </div>
    ),
  },
  {
    id: "category",
    accessorFn: (r) => r.item.category,
    header: "Category",
    cell: ({ getValue }) => <span className="text-muted-foreground">{getValue<string>()}</span>,
    meta: { className: "hidden xl:table-cell" },
  },
  { accessorKey: "opening", header: "Opening", cell: ({ getValue }) => qty(getValue<number>()), meta: { align: "right", className: "hidden md:table-cell" }, enableGlobalFilter: false },
  { accessorKey: "received", header: "Received", cell: ({ getValue }) => qty(getValue<number>(), true), meta: { align: "right", className: "hidden sm:table-cell" }, enableGlobalFilter: false },
  { accessorKey: "sold", header: "Sold", cell: ({ getValue }) => qty(-getValue<number>(), true), meta: { align: "right", className: "hidden sm:table-cell" }, enableGlobalFilter: false },
  { accessorKey: "adjusted", header: "Adjusted", cell: ({ getValue }) => qty(getValue<number>(), true), meta: { align: "right", className: "hidden lg:table-cell" }, enableGlobalFilter: false },
  { accessorKey: "closing", header: "Closing", cell: ({ getValue }) => <span className="font-medium">{formatNumber(getValue<number>())}</span>, meta: { align: "right" }, enableGlobalFilter: false },
  { accessorKey: "closingValue", header: "Value", cell: ({ getValue }) => formatINR(getValue<number>()), meta: { align: "right" }, enableGlobalFilter: false },
];

export const stockCsv: CsvColumn<StockReportRow>[] = [
  { header: "SKU", value: (r) => r.item.sku },
  { header: "Item", value: (r) => r.item.name },
  { header: "Category", value: (r) => r.item.category },
  { header: "Unit", value: (r) => r.item.unit },
  { header: "Opening qty", value: (r) => r.opening },
  { header: "Received", value: (r) => r.received },
  { header: "Sold", value: (r) => r.sold },
  { header: "Adjusted", value: (r) => r.adjusted },
  { header: "Closing qty", value: (r) => r.closing },
  { header: "Unit cost (INR)", value: (r) => r.item.costPrice },
  { header: "Closing value (INR)", value: (r) => r.closingValue },
];

export function stockStats(rows: StockReportRow[]): ReportStat[] {
  const sum = (k: "opening" | "received" | "sold" | "adjusted" | "closing" | "closingValue") => rows.reduce((s, r) => s + r[k], 0);
  return [
    { label: "Opening units", value: formatNumber(sum("opening")) },
    { label: "Received", value: formatDelta(sum("received")), hint: "units in" },
    { label: "Sold", value: formatDelta(-sum("sold")), hint: "units out" },
    { label: "Closing value", value: formatINR(sum("closingValue")), hint: `${formatNumber(sum("closing"))} units` },
  ];
}

/* --------------------------- Documents --------------------------- */

function docColumns<T extends SalesOrder | PurchaseOrder>(numberLabel: string, partyLabel: string): ColumnDef<DocReportRow<T>>[] {
  return [
    {
      id: "number",
      accessorFn: (r) => r.doc.number,
      header: numberLabel,
      cell: ({ getValue }) => <span className="font-mono text-[13px] font-medium">{getValue<string>()}</span>,
    },
    {
      id: "date",
      accessorFn: (r) => r.doc.date,
      header: "Date",
      cell: ({ getValue }) => <span className="text-muted-foreground">{formatDate(getValue<string>())}</span>,
      enableGlobalFilter: false,
      meta: { className: "hidden sm:table-cell" },
    },
    {
      accessorKey: "partyName",
      header: partyLabel,
      cell: ({ getValue }) => <EntityCell name={getValue<string>()} />,
      meta: { className: "hidden md:table-cell" },
    },
    {
      id: "status",
      accessorFn: (r) => r.doc.status,
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.doc.status} />,
      enableGlobalFilter: false,
    },
    { accessorKey: "units", header: "Units", cell: ({ getValue }) => formatNumber(getValue<number>()), meta: { align: "right", className: "hidden lg:table-cell" }, enableGlobalFilter: false },
    { accessorKey: "total", header: "Amount", cell: ({ getValue }) => <span className="font-medium">{formatINR(getValue<number>())}</span>, meta: { align: "right" }, enableGlobalFilter: false },
  ];
}

function docCsv<T extends SalesOrder | PurchaseOrder>(numberLabel: string, partyLabel: string): CsvColumn<DocReportRow<T>>[] {
  return [
    { header: numberLabel, value: (r) => r.doc.number },
    { header: "Date", value: (r) => isoDay(r.doc.date) },
    { header: partyLabel, value: (r) => r.partyName },
    { header: "Status", value: (r) => r.doc.status },
    { header: "Lines", value: (r) => r.doc.lines.length },
    { header: "Units", value: (r) => r.units },
    { header: "Amount (INR)", value: (r) => r.total },
  ];
}

export const salesColumns = docColumns<SalesOrder>("Invoice", "Customer");
export const salesCsv = docCsv<SalesOrder>("Invoice", "Customer");
export const purchaseColumns = docColumns<PurchaseOrder>("PO no.", "Supplier");
export const purchaseCsv = docCsv<PurchaseOrder>("PO no.", "Supplier");

export function salesStats(rows: DocReportRow<SalesOrder>[]): ReportStat[] {
  const billed = rows.filter((r) => r.doc.status === "confirmed" || r.doc.status === "fulfilled");
  const revenue = billed.reduce((s, r) => s + r.total, 0);
  return [
    { label: "Invoices", value: formatNumber(rows.length), hint: `${rows.filter((r) => r.doc.status === "cancelled").length} cancelled` },
    { label: "Billed revenue", value: formatINR(revenue), hint: "confirmed + fulfilled" },
    { label: "Average invoice", value: formatINR(billed.length ? Math.round(revenue / billed.length) : 0) },
    { label: "Units shipped", value: formatNumber(rows.filter((r) => r.doc.status === "fulfilled").reduce((s, r) => s + r.units, 0)) },
  ];
}

export function purchaseStats(rows: DocReportRow<PurchaseOrder>[]): ReportStat[] {
  const live = rows.filter((r) => r.doc.status !== "cancelled");
  const received = rows.filter((r) => r.doc.status === "received");
  return [
    { label: "Purchase orders", value: formatNumber(rows.length), hint: `${rows.length - live.length} cancelled` },
    { label: "Total ordered", value: formatINR(live.reduce((s, r) => s + r.total, 0)) },
    { label: "Received value", value: formatINR(received.reduce((s, r) => s + r.total, 0)), hint: `${received.length} POs` },
    { label: "Units received", value: formatNumber(received.reduce((s, r) => s + r.units, 0)) },
  ];
}
