export type ID = string;
/** ISO-8601 timestamp string. */
export type ISODate = string;

export const CATEGORIES = ["Peripherals", "Networking", "Storage", "Cables & Power", "Office Supplies"] as const;
export type Category = (typeof CATEGORIES)[number];

export const UNITS = ["pcs", "box", "pack", "ream", "roll"] as const;
export type Unit = (typeof UNITS)[number];

export interface Item {
  id: ID;
  sku: string;
  name: string;
  category: Category;
  unit: Unit;
  /** Low-stock threshold: quantity <= minLevel is "low". */
  minLevel: number;
  costPrice: number;
  sellPrice: number;
  preferredSupplierId?: ID;
  createdAt: ISODate;
}

export type StockStatus = "in_stock" | "low" | "out";

/** Item joined with its ledger-derived quantity. Never persisted. */
export interface ItemWithStock extends Item {
  quantity: number;
  status: StockStatus;
  stockValue: number;
}

/* ------------------------------------------------------------------ */
/* Stock ledger — the single source of truth for quantities.           */
/* ------------------------------------------------------------------ */

export type MovementType = "opening" | "purchase_receipt" | "sale_fulfilment" | "adjustment";
export type DocKind = "OPEN" | "PO" | "SO" | "ADJ";

export interface DocRef {
  kind: DocKind;
  id: ID;
  number: string;
}

export interface StockMovement {
  id: ID;
  type: MovementType;
  itemId: ID;
  qtyDelta: number;
  refDoc: DocRef;
  note?: string;
  timestamp: ISODate;
}

/* ------------------------------------------------------------------ */
/* Parties                                                             */
/* ------------------------------------------------------------------ */

export interface Party {
  id: ID;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  createdAt: ISODate;
}
export type Customer = Party;
export type Supplier = Party;

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

export interface LineItem {
  itemId: ID;
  qty: number;
  unitPrice: number;
}

export const SALE_STATUSES = ["draft", "confirmed", "fulfilled", "cancelled"] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

export interface SalesOrder {
  id: ID;
  number: string;
  customerId: ID;
  date: ISODate;
  status: SaleStatus;
  lines: LineItem[];
  notes?: string;
  createdAt: ISODate;
  confirmedAt?: ISODate;
  fulfilledAt?: ISODate;
  cancelledAt?: ISODate;
}

export const PURCHASE_STATUSES = ["pending", "received", "cancelled"] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

export interface PurchaseOrder {
  id: ID;
  number: string;
  supplierId: ID;
  date: ISODate;
  expectedDate?: ISODate;
  status: PurchaseStatus;
  lines: LineItem[];
  notes?: string;
  createdAt: ISODate;
  receivedAt?: ISODate;
  cancelledAt?: ISODate;
}

/** Lifecycle events for documents that do not move stock (stock moves live in the ledger). */
export type DocEventKind =
  | "sale.created"
  | "sale.confirmed"
  | "sale.cancelled"
  | "po.created"
  | "po.cancelled"
  | "item.created";

export interface DocEvent {
  id: ID;
  kind: DocEventKind;
  refId: ID;
  refNumber: string;
  timestamp: ISODate;
}

export interface Counters {
  sale: number;
  po: number;
  adj: number;
}

/** Everything persisted by the store. */
export interface InventoryData {
  items: Item[];
  movements: StockMovement[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: SalesOrder[];
  purchases: PurchaseOrder[];
  events: DocEvent[];
  counters: Counters;
}

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; details?: string[] };

export interface DateRange {
  from: Date;
  to: Date;
}
