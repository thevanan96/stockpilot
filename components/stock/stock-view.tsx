"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Clock, Ellipsis, PackageSearch, Pencil, Plus, SlidersHorizontal, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, TableSkeleton } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar, SearchInput, SegmentedFilter, SelectFilter } from "@/components/shared/filters";
import { PageBody, PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ItemDrawer } from "@/components/stock/item-drawer";
import { ItemFormDialog } from "@/components/stock/item-form-dialog";
import { AdjustStockDialog } from "@/components/stock/adjust-stock-dialog";
import { StockLevel } from "@/components/stock/stock-level";
import { formatINR, formatNumber } from "@/lib/format";
import { useItemsWithStock } from "@/store/hooks";
import { useHydrated } from "@/store/use-hydrated";
import { CATEGORIES, type Category, type Item, type ItemWithStock, type StockStatus } from "@/types";

type StatusFilter = "all" | StockStatus;

export function StockView() {
  const hydrated = useHydrated();
  const items = useItemsWithStock();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState<Category | "all">("all");
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  // The open drawer lives in the URL so other pages can deep-link to an item.
  const selectedId = searchParams.get("item");
  const selected = items.find((i) => i.id === selectedId);
  const adjusting = items.find((i) => i.id === adjustingId) ?? null;
  const openItem = (id: string) => router.replace(`${pathname}?item=${id}`, { scroll: false });
  const closeItem = () => router.replace(pathname, { scroll: false });

  const inCategory = useMemo(
    () => (category === "all" ? items : items.filter((i) => i.category === category)),
    [items, category],
  );
  const filtered = useMemo(
    () => (status === "all" ? inCategory : inCategory.filter((i) => i.status === status)),
    [inCategory, status],
  );
  const count = (s: StockStatus) => inCategory.filter((i) => i.status === s).length;
  const totalValue = filtered.reduce((sum, i) => sum + i.stockValue, 0);

  const columns = useMemo<ColumnDef<ItemWithStock>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Item",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-medium text-foreground sm:truncate">{row.original.name}</div>
            <div className="font-mono text-xs text-muted-foreground">{row.original.sku}</div>
          </div>
        ),
      },
      { accessorKey: "sku", header: "SKU", enableHiding: true, meta: { className: "hidden" } },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ getValue }) => <span className="text-muted-foreground">{getValue<string>()}</span>,
        meta: { className: "hidden md:table-cell" },
      },
      {
        accessorKey: "quantity",
        header: "Quantity",
        cell: ({ row }) => <StockLevel item={row.original} />,
        meta: { align: "right" },
        enableGlobalFilter: false,
      },
      {
        accessorKey: "minLevel",
        header: "Min level",
        cell: ({ getValue }) => <span className="text-muted-foreground">{formatNumber(getValue<number>())}</span>,
        meta: { align: "right", className: "hidden sm:table-cell" },
        enableGlobalFilter: false,
      },
      {
        accessorKey: "stockValue",
        header: "Value",
        cell: ({ getValue }) => formatINR(getValue<number>()),
        meta: { align: "right", className: "hidden lg:table-cell" },
        enableGlobalFilter: false,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        sortingFn: (a, b) => STATUS_ORDER[a.original.status] - STATUS_ORDER[b.original.status],
        enableGlobalFilter: false,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        size: 52,
        enableSorting: false,
        cell: ({ row }) => (
          <RowActions
            item={row.original}
            onOpen={() => openItem(row.original.id)}
            onEdit={() => setEditing(row.original)}
            onAdjust={() => setAdjustingId(row.original.id)}
          />
        ),
        meta: { align: "right", className: "hidden sm:table-cell" },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openItem only depends on the stable router/pathname
    [pathname],
  );

  return (
    <>
      <PageHeader
        title="Stock"
        description="Every quantity here is derived from the stock ledger — receipts, shipments and adjustments."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus /> New item
          </Button>
        }
      />
      <PageBody>
        <FilterBar>
          <SegmentedFilter
            label="Filter by stock status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All", count: hydrated ? inCategory.length : undefined },
              { value: "in_stock", label: "In stock", count: hydrated ? count("in_stock") : undefined },
              { value: "low", label: "Low", count: hydrated ? count("low") : undefined },
              { value: "out", label: "Out", count: hydrated ? count("out") : undefined },
            ]}
          />
          <div className="flex flex-col gap-2.5 sm:flex-row lg:ml-auto">
            <SelectFilter
              label="Filter by category"
              value={category}
              onChange={setCategory}
              allLabel="All categories"
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <SearchInput value={search} onChange={setSearch} placeholder="Search name or SKU…" />
          </div>
        </FilterBar>

        {!hydrated ? (
          <TableSkeleton columns={6} />
        ) : (
          <>
            <DataTable
              columns={columns}
              data={filtered}
              search={search}
              initialSorting={[{ id: "name", desc: false }]}
              getRowId={(r) => r.id}
              onRowClick={(r) => openItem(r.id)}
              rowLabel={(r) => `Open ${r.name}`}
              empty={
                <EmptyState
                  icon={PackageSearch}
                  title={items.length === 0 ? "No items yet" : "No items match these filters"}
                  description={
                    items.length === 0
                      ? "Add your first product to start tracking stock."
                      : "Try a different search, status or category."
                  }
                  action={
                    items.length === 0 ? (
                      <Button onClick={() => setEditing("new")}>
                        <Plus /> New item
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearch("");
                          setStatus("all");
                          setCategory("all");
                        }}
                      >
                        Clear filters
                      </Button>
                    )
                  }
                />
              }
            />
            {filtered.length > 0 && (
              <p className="num -mt-3 text-right text-xs text-muted-foreground">
                Stock value of {formatNumber(filtered.length)} items at cost:{" "}
                <span className="font-medium text-foreground">{formatINR(totalValue)}</span>
              </p>
            )}
          </>
        )}
      </PageBody>

      <ItemDrawer
        item={hydrated ? selected : undefined}
        onClose={closeItem}
        onEdit={(i) => setEditing(i)}
        onAdjust={(i) => setAdjustingId(i.id)}
      />
      <ItemFormDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        item={editing === "new" || editing === null ? undefined : editing}
        onSaved={(saved) => editing === "new" && openItem(saved.id)}
      />
      <AdjustStockDialog item={adjusting} onOpenChange={(o) => !o && setAdjustingId(null)} />
    </>
  );
}

const STATUS_ORDER: Record<StockStatus, number> = { out: 0, low: 1, in_stock: 2 };

function RowActions({
  item,
  onOpen,
  onEdit,
  onAdjust,
}: {
  item: ItemWithStock;
  onOpen: () => void;
  onEdit: () => void;
  onAdjust: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${item.name}`}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          className="text-muted-foreground opacity-70 group-hover/row:opacity-100 data-[state=open]:opacity-100"
        >
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={onOpen}>
          <Clock /> View history
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onAdjust}>
          <SlidersHorizontal /> Adjust stock
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil /> Edit item
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/purchases/new?item=${item.id}`}>
            <Truck /> Create purchase order
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
