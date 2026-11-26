"use client";

import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  /** Free-text search applied across columns. */
  search?: string;
  initialSorting?: SortingState;
  pageSize?: number;
  getRowId?: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Accessible label for the row action, e.g. "Open INV-0004". */
  rowLabel?: (row: T) => string;
  /** Rendered in place of rows when nothing matches. */
  empty: React.ReactNode;
  className?: string;
}

/**
 * Calm, data-dense table: sticky header, comfortable rows, tabular numbers,
 * right-aligned numerics (via column meta), sorting and tidy pagination.
 */
export function DataTable<T>({
  columns,
  data,
  search = "",
  initialSorting = [],
  pageSize = 10,
  getRowId,
  onRowClick,
  rowLabel,
  empty,
  className,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });

  // TanStack Table returns new function references by design; it is not memoisable.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: search, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: true,
  });

  const rows = table.getRowModel().rows;
  const total = table.getFilteredRowModel().rows.length;
  const { pageIndex } = table.getState().pagination;
  const start = total === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min(total, (pageIndex + 1) * pageSize);

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card shadow-card", className)}>
      <div className="max-h-[min(640px,calc(100dvh-13rem))] overflow-auto scrollbar-thin">
        <table className="w-full border-separate md:min-w-[640px] border-spacing-0 text-sm">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const meta = header.column.columnDef.meta;
                  const sortable = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const SortIcon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ChevronsUpDown;
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      className={cn(
                        "sticky top-0 z-10 h-10 border-b border-border bg-muted/80 px-3 text-left text-xs font-medium whitespace-nowrap text-muted-foreground backdrop-blur-sm first:pl-4 last:pr-4 sm:px-4 sm:first:pl-5 sm:last:pr-5",
                        meta?.align === "right" && "text-right",
                        meta?.className,
                      )}
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            "group/sort -mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                            meta?.align === "right" && "flex-row-reverse",
                            sorted && "text-foreground",
                          )}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <SortIcon
                            className={cn(
                              "size-3 transition-opacity",
                              sorted ? "opacity-100" : "opacity-0 group-hover/sort:opacity-60 group-focus-visible/sort:opacity-60",
                            )}
                          />
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick(row.original);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                aria-label={rowLabel?.(row.original)}
                className={cn(
                  "group/row transition-colors duration-150 [&:last-child>td]:border-b-0",
                  onRowClick &&
                    "cursor-pointer outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:shadow-[inset_2px_0_0_var(--primary)]",
                )}
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta;
                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        "h-[52px] border-b border-border px-3 py-2 align-middle first:pl-4 last:pr-4 sm:px-4 sm:first:pl-5 sm:last:pr-5",
                        meta?.align === "right" && "num text-right",
                        meta?.className,
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && empty}
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
          <span className="num">
            {total > pageSize ? (
              <>
                <span className="text-foreground">{start}</span>–<span className="text-foreground">{end}</span> of{" "}
                {formatNumber(total)}
              </>
            ) : (
              <>
                {formatNumber(total)} {total === 1 ? "result" : "results"}
              </>
            )}
          </span>
          {table.getPageCount() > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="num mr-1.5 hidden sm:inline">
                Page {pageIndex + 1} of {table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Previous page"
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Next page"
              >
                <ChevronRight />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Placeholder rows while persisted data loads. */
export function TableSkeleton({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card" aria-busy="true" aria-label="Loading">
      <div className="flex h-10 items-center gap-6 border-b border-border bg-muted/80 px-5">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-2.5 w-16" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex h-[52px] items-center gap-6 border-b border-border px-5 last:border-b-0">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-3 w-40" />
          {Array.from({ length: columns - 2 }, (_, i) => (
            <Skeleton key={i} className={cn("h-3", i === columns - 3 ? "ml-auto w-14" : "w-20")} />
          ))}
        </div>
      ))}
    </div>
  );
}
