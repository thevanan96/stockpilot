"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable, TableSkeleton } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { EntityCell } from "@/components/shared/entity-avatar";
import { FilterBar, SearchInput, SelectFilter } from "@/components/shared/filters";
import { PageBody, PageHeader } from "@/components/shared/page-header";
import { PartyFormDialog } from "@/components/parties/party-form-dialog";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import type { PartyFormValues } from "@/lib/schemas";
import { selectCustomerStats, selectSupplierStats, type PartyStats } from "@/lib/selectors";
import { useInventoryStore } from "@/store/inventory-store";
import { useHydrated } from "@/store/use-hydrated";
import type { Party } from "@/types";

type Kind = "customer" | "supplier";

interface PartyRow extends Party, PartyStats {}

const COPY = {
  customer: {
    title: "Customers",
    description: "Businesses you sell to, with their order history.",
    docs: "Invoices",
    total: "Order value",
    newHref: "/sales/new",
    newLabel: "New sale",
  },
  supplier: {
    title: "Suppliers",
    description: "Vendors you purchase from, with their order history.",
    docs: "POs",
    total: "Order value",
    newHref: "/purchases/new",
    newLabel: "New purchase order",
  },
} as const;

function buildColumns(kind: Kind): ColumnDef<PartyRow>[] {
  const copy = COPY[kind];
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <EntityCell name={row.original.name} secondary={row.original.contactName} />,
    },
    { accessorKey: "contactName", header: "Contact", meta: { className: "hidden" } },
    {
      accessorKey: "city",
      header: "City",
      cell: ({ getValue }) => <span className="text-muted-foreground">{getValue<string>()}</span>,
      meta: { className: "hidden md:table-cell" },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <a
          href={`mailto:${row.original.email}`}
          onClick={(e) => e.stopPropagation()}
          className="rounded text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          {row.original.email}
        </a>
      ),
      meta: { className: "hidden xl:table-cell" },
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ getValue }) => <span className="num whitespace-nowrap text-muted-foreground">{getValue<string>()}</span>,
      meta: { className: "hidden lg:table-cell" },
    },
    {
      accessorKey: "orders",
      header: copy.docs,
      cell: ({ getValue }) => formatNumber(getValue<number>()),
      meta: { align: "right", className: "hidden sm:table-cell" },
      enableGlobalFilter: false,
    },
    {
      accessorKey: "total",
      header: copy.total,
      cell: ({ getValue }) => <span className="font-medium">{formatINR(getValue<number>())}</span>,
      meta: { align: "right" },
      enableGlobalFilter: false,
    },
    {
      accessorKey: "lastOrder",
      header: "Last order",
      cell: ({ getValue }) => {
        const v = getValue<string | undefined>();
        return <span className="text-muted-foreground">{v ? formatDate(v) : "—"}</span>;
      },
      sortUndefined: "last",
      meta: { align: "right", className: "hidden md:table-cell" },
      enableGlobalFilter: false,
    },
  ];
}

export function PartiesView({ kind }: { kind: Kind }) {
  const hydrated = useHydrated();
  const copy = COPY[kind];
  const parties = useInventoryStore((s) => (kind === "customer" ? s.customers : s.suppliers));
  const sales = useInventoryStore((s) => s.sales);
  const purchases = useInventoryStore((s) => s.purchases);
  const store = useInventoryStore.getState();

  const [search, setSearch] = useState("");
  const [city, setCity] = useState<string>("all");
  const [editing, setEditing] = useState<Party | "new" | null>(null);

  const columns = useMemo(() => buildColumns(kind), [kind]);
  const rows = useMemo<PartyRow[]>(() => {
    const stats = kind === "customer" ? selectCustomerStats(sales) : selectSupplierStats(purchases);
    return parties.map((p) => ({ ...p, orders: 0, total: 0, ...stats.get(p.id) }));
  }, [kind, parties, sales, purchases]);

  const cities = [...new Set(parties.map((p) => p.city))].sort();
  const filtered = city === "all" ? rows : rows.filter((r) => r.city === city);

  const save = (values: PartyFormValues) => {
    const isNew = editing === "new";
    const result =
      kind === "customer"
        ? isNew
          ? store.addCustomer(values)
          : store.updateCustomer((editing as Party).id, values)
        : isNew
          ? store.addSupplier(values)
          : store.updateSupplier((editing as Party).id, values);
    if (!result.ok) return toast.error(result.error);
    toast.success(isNew ? `${values.name} added` : "Changes saved");
    setEditing(null);
  };

  return (
    <>
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={copy.newHref}>{copy.newLabel}</Link>
            </Button>
            <Button onClick={() => setEditing("new")}>
              <Plus /> New {kind}
            </Button>
          </>
        }
      />
      <PageBody>
        <FilterBar>
          <SelectFilter
            label="Filter by city"
            value={city}
            onChange={setCity}
            allLabel="All cities"
            options={cities.map((c) => ({ value: c, label: c }))}
          />
          <SearchInput value={search} onChange={setSearch} placeholder={`Search ${copy.title.toLowerCase()}…`} className="lg:ml-auto" />
        </FilterBar>

        {!hydrated ? (
          <TableSkeleton columns={6} />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            search={search}
            initialSorting={[{ id: "total", desc: true }]}
            getRowId={(r) => r.id}
            onRowClick={(r) => setEditing(r)}
            rowLabel={(r) => `Edit ${r.name}`}
            empty={
              <EmptyState
                icon={UserRound}
                title={parties.length === 0 ? `No ${copy.title.toLowerCase()} yet` : `No ${copy.title.toLowerCase()} match`}
                description={parties.length === 0 ? `Add your first ${kind} to get started.` : "Try another search or city."}
                action={
                  <Button onClick={() => setEditing("new")}>
                    <Plus /> New {kind}
                  </Button>
                }
              />
            }
          />
        )}
      </PageBody>

      <PartyFormDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        noun={kind}
        party={editing === "new" || editing === null ? undefined : editing}
        onSubmit={save}
      />
    </>
  );
}
