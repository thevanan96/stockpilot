import type { LineItem, StockStatus } from "@/types";

/** Pure business rules shared by store actions and selectors. */

export function lineTotal(line: LineItem) {
  return line.qty * line.unitPrice;
}

export function docTotal(lines: LineItem[]) {
  return lines.reduce((sum, l) => sum + lineTotal(l), 0);
}

export function docUnits(lines: LineItem[]) {
  return lines.reduce((sum, l) => sum + l.qty, 0);
}

/** Low = quantity at or below the minimum level. */
export function stockStatus(quantity: number, minLevel: number): StockStatus {
  if (quantity <= 0) return "out";
  if (quantity <= minLevel) return "low";
  return "in_stock";
}

/** Sum quantities per item (a document may list the same item twice). */
export function qtyByItem(lines: LineItem[]) {
  const map = new Map<string, number>();
  for (const l of lines) map.set(l.itemId, (map.get(l.itemId) ?? 0) + l.qty);
  return map;
}

/** Suggested reorder quantity: bring stock back to twice the minimum level. */
export function suggestedReorderQty(quantity: number, minLevel: number) {
  return Math.max(minLevel * 2 - quantity, 1);
}
