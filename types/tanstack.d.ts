import "@tanstack/react-table";
import type { RowData } from "@tanstack/react-table";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Right-align numeric columns. */
    align?: "left" | "right";
    /** Extra classes for both header and cells (e.g. responsive hiding). */
    className?: string;
  }
}
