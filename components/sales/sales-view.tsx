"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, TableSkeleton } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { EntityCell } from "@/components/shared/entity-avatar";
import { FilterBar, SearchInput, SegmentedFilter, SelectFilter } from "@/components/shared/filters";
import { PageBody, PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { SaleDrawer } from "@/components/sales/sale-drawer";
import { docTotal, docUnits } from "@/lib/domain";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import { selectPartyMap } from "@/lib/selectors";
import { useInventoryStore } from "@/store/inventory-store";
import { useHydrated } from "@/store/use-hydrated";
import type { SaleStatus, SalesOrder } from "@/types";

interface SaleRow extends SalesOrder {
  customerName: string;
  total: number;
  units: number;
}

const columns: ColumnDef<SaleRow>[] = [
  {
    accessorKey: "number",
    header: "Invoice",
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        <div className="font-mono text-[13px] font-medium">{row.original.number}</div>
        {/* Below lg the date column is hidden, so show the date here instead. */}
        <div className="num text-xs text-muted-foreground lg:hidden">{formatDate(row.original.date)}</div>
      </div>
    ),
  },
  {
    accessorKey: "customerName",
    header: "Customer",
    cell: ({ row }) => <EntityCell name={row.original.customerName} />,
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

export function SalesView() {
  const hydrated = useHydrated();
  const sales = useInventoryStore((s) => s.sales);
  const customers = useInventoryStore((s) => s.customers);
  const router = useRouter();
  const pathname = usePathname();
  const selectedId = useSearchParams().get("invoice");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | SaleStatus>("all");
  const [customerId, setCustomerId] = useState<string>("all");

  const rows = useMemo<SaleRow[]>(() => {
    const parties = selectPartyMap(customers);
    return sales.map((s) => ({
      ...s,
      customerName: parties.get(s.customerId)?.name ?? "Unknown customer",
      total: docTotal(s.lines),
      units: docUnits(s.lines),
    }));
  }, [sales, customers]);

  const byCustomer = customerId === "all" ? rows : rows.filter((r) => r.customerId === customerId);
  const filtered = status === "all" ? byCustomer : byCustomer.filter((r) => r.status === status);
  const count = (s: SaleStatus) => byCustomer.filter((r) => r.status === s).length;
  const selected = sales.find((s) => s.id === selectedId);

  return (
    <>
      <PageHeader
        title="Sales"
        description="Invoices move from draft to confirmed to fulfilled. Fulfilling ships stock out of the ledger."
        actions={
          <Button asChild>
            <Link href="/sales/new">
              <Plus /> New sale
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
              { value: "all", label: "All", count: hydrated ? byCustomer.length : undefined },
              { value: "draft", label: "Draft", count: hydrated ? count("draft") : undefined },
              { value: "confirmed", label: "Confirmed", count: hydrated ? count("confirmed") : undefined },
              { value: "fulfilled", label: "Fulfilled", count: hydrated ? count("fulfilled") : undefined },
              { value: "cancelled", label: "Cancelled", count: hydrated ? count("cancelled") : undefined },
            ]}
          />
          <div className="flex flex-col gap-2.5 sm:flex-row lg:ml-auto">
            <SelectFilter
              label="Filter by customer"
              value={customerId}
              onChange={setCustomerId}
              allLabel="All customers"
              options={customers.map((c) => ({ value: c.id, label: c.name }))}
              className="lg:w-56"
            />
            <SearchInput value={search} onChange={setSearch} placeholder="Search invoice or customer…" />
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
            onRowClick={(r) => router.replace(`${pathname}?invoice=${r.id}`, { scroll: false })}
            rowLabel={(r) => `Open ${r.number}`}
            empty={
              <EmptyState
                icon={Receipt}
                title={sales.length === 0 ? "No invoices yet" : "No invoices match"}
                description={
                  sales.length === 0 ? "Create a sale to invoice a customer." : "Try a different status, customer or search term."
                }
                action={
                  <Button asChild variant={sales.length === 0 ? "default" : "outline"}>
                    <Link href="/sales/new">
                      <Plus /> New sale
                    </Link>
                  </Button>
                }
              />
            }
          />
        )}
      </PageBody>

      <SaleDrawer sale={hydrated ? selected : undefined} onClose={() => router.replace(pathname, { scroll: false })} />
    </>
  );
}
