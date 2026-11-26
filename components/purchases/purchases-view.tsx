"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, TableSkeleton } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { EntityCell } from "@/components/shared/entity-avatar";
import { FilterBar, SearchInput, SegmentedFilter, SelectFilter } from "@/components/shared/filters";
import { PageBody, PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { PurchaseDrawer } from "@/components/purchases/purchase-drawer";
import { docTotal, docUnits } from "@/lib/domain";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import { selectPartyMap } from "@/lib/selectors";
import { useInventoryStore } from "@/store/inventory-store";
import { useHydrated } from "@/store/use-hydrated";
import type { PurchaseOrder, PurchaseStatus } from "@/types";

interface PurchaseRow extends PurchaseOrder {
  supplierName: string;
  total: number;
  units: number;
}

const columns: ColumnDef<PurchaseRow>[] = [
  {
    accessorKey: "number",
    header: "PO no.",
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        <div className="font-mono text-[13px] font-medium">{row.original.number}</div>
        {/* Below lg the date column is hidden, so show the date here instead. */}
        <div className="num text-xs text-muted-foreground lg:hidden">{formatDate(row.original.date)}</div>
      </div>
    ),
  },
  {
    accessorKey: "supplierName",
    header: "Supplier",
    cell: ({ row }) => <EntityCell name={row.original.supplierName} />,
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ getValue }) => <span className="num whitespace-nowrap text-muted-foreground">{formatDate(getValue<string>())}</span>,
    enableGlobalFilter: false,
    meta: { className: "hidden lg:table-cell" },
  },
  {
    accessorKey: "units",
    header: "Units",
    cell: ({ getValue }) => <span className="text-muted-foreground">{formatNumber(getValue<number>())}</span>,
    enableGlobalFilter: false,
    meta: { align: "right", className: "hidden xl:table-cell" },
  },
  {
    accessorKey: "total",
    header: "Amount",
    cell: ({ getValue }) => <span className="font-medium">{formatINR(getValue<number>())}</span>,
    enableGlobalFilter: false,
    meta: { align: "right" },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    enableGlobalFilter: false,
    meta: { className: "w-32" },
  },
];

export function PurchasesView() {
  const hydrated = useHydrated();
  const purchases = useInventoryStore((s) => s.purchases);
  const suppliers = useInventoryStore((s) => s.suppliers);
  const router = useRouter();
  const pathname = usePathname();
  const selectedId = useSearchParams().get("po");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | PurchaseStatus>("all");
  const [supplierId, setSupplierId] = useState<string>("all");

  const rows = useMemo<PurchaseRow[]>(() => {
    const parties = selectPartyMap(suppliers);
    return purchases.map((p) => ({
      ...p,
      supplierName: parties.get(p.supplierId)?.name ?? "Unknown supplier",
      total: docTotal(p.lines),
      units: docUnits(p.lines),
    }));
  }, [purchases, suppliers]);

  const bySupplier = supplierId === "all" ? rows : rows.filter((r) => r.supplierId === supplierId);
  const filtered = status === "all" ? bySupplier : bySupplier.filter((r) => r.status === status);
  const count = (s: PurchaseStatus) => bySupplier.filter((r) => r.status === s).length;
  const selected = purchases.find((p) => p.id === selectedId);

  return (
    <>
      <PageHeader
        title="Purchases"
        description="Purchase orders raised with suppliers. Receiving a PO adds its quantities to stock."
        actions={
          <Button asChild>
            <Link href="/purchases/new">
              <Plus /> New purchase order
            </Link>
          </Button>
        }
      />
      <PageBody>
        <FilterBar>
          <SegmentedFilter
            label="Filter by status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All", count: hydrated ? bySupplier.length : undefined },
              { value: "pending", label: "Pending", count: hydrated ? count("pending") : undefined },
              { value: "received", label: "Received", count: hydrated ? count("received") : undefined },
              { value: "cancelled", label: "Cancelled", count: hydrated ? count("cancelled") : undefined },
            ]}
          />
          <div className="flex flex-col gap-2.5 sm:flex-row lg:ml-auto">
            <SelectFilter
              label="Filter by supplier"
              value={supplierId}
              onChange={setSupplierId}
              allLabel="All suppliers"
              options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
              className="lg:w-56"
            />
            <SearchInput value={search} onChange={setSearch} placeholder="Search PO or supplier…" />
          </div>
        </FilterBar>

        {!hydrated ? (
          <TableSkeleton columns={6} />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            search={search}
            initialSorting={[{ id: "date", desc: true }]}
            getRowId={(r) => r.id}
            onRowClick={(r) => router.replace(`${pathname}?po=${r.id}`, { scroll: false })}
            rowLabel={(r) => `Open ${r.number}`}
            empty={
              <EmptyState
                icon={Truck}
                title={purchases.length === 0 ? "No purchase orders yet" : "No purchase orders match"}
                description={
                  purchases.length === 0
                    ? "Raise a PO to restock items from a supplier."
                    : "Try a different status, supplier or search term."
                }
                action={
                  <Button asChild variant={purchases.length === 0 ? "default" : "outline"}>
                    <Link href="/purchases/new">
                      <Plus /> New purchase order
                    </Link>
                  </Button>
                }
              />
            }
          />
        )}
      </PageBody>

      <PurchaseDrawer purchase={hydrated ? selected : undefined} onClose={() => router.replace(pathname, { scroll: false })} />
    </>
  );
}
