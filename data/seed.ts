import { addDays, setHours, setMinutes, startOfDay, subDays } from "date-fns";
import { docNumber, uid } from "@/lib/id";
import type {
  Category,
  Customer,
  DocEvent,
  InventoryData,
  Item,
  LineItem,
  PurchaseOrder,
  PurchaseStatus,
  SaleStatus,
  SalesOrder,
  StockMovement,
  Supplier,
  Unit,
} from "@/types";

/*
 * Demo dataset, generated relative to "now" so the dashboard always shows
 * the last six months. Item specs declare the *target* on-hand quantity;
 * opening balances are back-solved so that replaying every document in the
 * ledger lands exactly on those targets (a few are intentionally low / out).
 */

/** Deterministic PRNG so every reset produces the same demo. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SUPPLIERS = [
  ["Apex Peripherals Pvt Ltd", "Rohan Mehta", "Bengaluru"],
  ["NetCore Distributors", "Priya Kulkarni", "Pune"],
  ["DataVault Storage Solutions", "Arjun Reddy", "Hyderabad"],
  ["Voltline Electricals", "Karthik Subramanian", "Chennai"],
  ["PaperTrail Office Supplies", "Neha Shah", "Mumbai"],
  ["Kaveri Trading Co.", "Lakshmi Narayanan", "Coimbatore"],
] as const;

const CUSTOMERS = [
  ["Nilgiri Tech Solutions", "Vignesh Kumar", "Coimbatore"],
  ["Brightpath Academy", "Ananya Iyer", "Chennai"],
  ["Sahyadri Co-working", "Siddharth Joshi", "Pune"],
  ["Coastal Logistics LLP", "Fathima Rahman", "Kochi"],
  ["Meridian Health Clinics", "Dr. Kavya Rao", "Bengaluru"],
  ["Indus Design Studio", "Harsh Patel", "Ahmedabad"],
  ["Greenleaf Organics", "Manoj Gowda", "Mysuru"],
  ["Orbit Fintech Pvt Ltd", "Sneha Varma", "Hyderabad"],
] as const;

// sku, name, category, unit, minLevel, cost, sell, supplierIndex, targetQty
type ItemSpec = [string, string, Category, Unit, number, number, number, number, number];
const ITEMS: ItemSpec[] = [
  ["PER-1001", "Wireless Mouse M220", "Peripherals", "pcs", 25, 420, 649, 0, 64],
  ["PER-1002", "Mechanical Keyboard K84", "Peripherals", "pcs", 10, 2150, 3299, 0, 18],
  ["PER-1003", '24" IPS Monitor', "Peripherals", "pcs", 6, 8900, 11999, 0, 4],
  ["PER-1004", "HD Webcam 1080p", "Peripherals", "pcs", 8, 1450, 2299, 0, 22],
  ["PER-1005", "USB-C Docking Station", "Peripherals", "pcs", 5, 5200, 7499, 0, 0],
  ["NET-2001", "Wi-Fi 6 Router AX1800", "Networking", "pcs", 6, 3400, 4999, 1, 15],
  ["NET-2002", "8-Port Gigabit Switch", "Networking", "pcs", 5, 1650, 2499, 1, 12],
  ["NET-2003", "Cat6 Patch Cable 2m", "Networking", "pcs", 50, 65, 129, 1, 38],
  ["NET-2004", "PoE Access Point", "Networking", "pcs", 4, 6100, 8499, 1, 9],
  ["STO-3001", "1TB NVMe SSD", "Storage", "pcs", 8, 4300, 5999, 2, 27],
  ["STO-3002", "2TB External HDD", "Storage", "pcs", 6, 4800, 6499, 2, 11],
  ["STO-3003", "64GB USB 3.2 Flash Drive", "Storage", "pcs", 30, 380, 599, 2, 85],
  ["STO-3004", "128GB SD Card", "Storage", "pcs", 15, 690, 999, 2, 0],
  ["CAB-4001", "USB-C to USB-C Cable 1m", "Cables & Power", "pcs", 40, 140, 299, 3, 120],
  ["CAB-4002", "HDMI 2.1 Cable 2m", "Cables & Power", "pcs", 25, 310, 549, 3, 46],
  ["CAB-4003", "6-Socket Surge Protector", "Cables & Power", "pcs", 12, 780, 1199, 3, 10],
  ["CAB-4004", "1kVA Line-Interactive UPS", "Cables & Power", "pcs", 4, 5600, 7999, 3, 7],
  ["OFF-5001", "A4 Copier Paper 75gsm", "Office Supplies", "ream", 40, 245, 349, 4, 140],
  ["OFF-5002", "Laser Toner Cartridge 88A", "Office Supplies", "pcs", 10, 1850, 2799, 4, 24],
  ["OFF-5003", "Ergonomic Mesh Chair", "Office Supplies", "pcs", 3, 7400, 10999, 5, 5],
];

/** [itemIndex, qty] — unit price defaults to the item's cost / sell price. */
type SpecLine = [number, number];

// supplierIndex, daysAgo, status, lines
const PURCHASES: [number, number, PurchaseStatus, SpecLine[]][] = [
  [0, 172, "received", [[0, 60], [1, 15], [3, 20]]],
  [2, 158, "received", [[9, 20], [11, 80], [12, 30]]],
  [4, 140, "received", [[17, 150], [18, 20]]],
  [1, 118, "received", [[5, 12], [6, 10], [7, 60]]],
  [3, 96, "received", [[13, 100], [14, 50], [15, 15]]],
  [0, 88, "received", [[2, 10], [4, 8]]],
  [2, 62, "received", [[9, 15], [10, 10]]],
  [3, 30, "cancelled", [[16, 6]]],
  [1, 12, "pending", [[8, 6], [7, 150]]],
  [0, 3, "pending", [[4, 10], [2, 8]]],
];

// customerIndex, daysAgo, status, lines
const SALES: [number, number, SaleStatus, SpecLine[]][] = [
  [0, 165, "fulfilled", [[0, 10], [3, 4]]],
  [1, 150, "fulfilled", [[17, 40], [11, 25]]],
  [4, 134, "fulfilled", [[9, 6], [1, 3]]],
  [2, 121, "fulfilled", [[17, 30], [18, 6]]],
  [7, 108, "fulfilled", [[5, 5], [6, 4], [7, 40]]],
  [3, 92, "cancelled", [[16, 2]]],
  [5, 80, "fulfilled", [[2, 6], [4, 5], [14, 10]]],
  [0, 66, "fulfilled", [[13, 30], [15, 8], [12, 12]]],
  [6, 55, "fulfilled", [[11, 20], [12, 18]]],
  [4, 40, "fulfilled", [[9, 8], [10, 4], [4, 3]]],
  [1, 28, "fulfilled", [[17, 35], [19, 2]]],
  [7, 18, "cancelled", [[8, 3]]],
  [2, 9, "draft", [[6, 3], [7, 20]]],
  [5, 4, "confirmed", [[2, 6]]],
  [3, 1, "confirmed", [[0, 40]]],
];

// itemIndex, qtyDelta, daysAgo, reason
const ADJUSTMENTS: [number, number, number, string][] = [
  [14, -2, 70, "Damaged in transit"],
  [11, 5, 45, "Cycle count correction"],
  [19, -1, 20, "Display unit written off"],
];

export function createSeedData(now: Date = new Date()): InventoryData {
  const rand = mulberry32(20261126);
  const id = (prefix: string) => uid(prefix, rand);
  /** A business-hours timestamp `days` before now, never in the future. */
  const at = (days: number, hour = 10) => {
    const d = setMinutes(setHours(startOfDay(subDays(now, days)), hour), Math.floor(rand() * 50));
    return (d > now ? now : d).toISOString();
  };
  const plus = (iso: string, days: number, hour: number) => {
    const d = setHours(addDays(new Date(iso), days), hour);
    return (d > now ? now : d).toISOString();
  };

  const suppliers: Supplier[] = SUPPLIERS.map(([name, contactName, city], i) => partyFrom(id("sup"), name, contactName, city, at(200 - i)));
  const customers: Customer[] = CUSTOMERS.map(([name, contactName, city], i) => partyFrom(id("cus"), name, contactName, city, at(195 - i)));

  const items: Item[] = ITEMS.map(([sku, name, category, unit, minLevel, costPrice, sellPrice, sup]) => ({
    id: id("itm"),
    sku,
    name,
    category,
    unit,
    minLevel,
    costPrice,
    sellPrice,
    preferredSupplierId: suppliers[sup].id,
    createdAt: at(185),
  }));

  const movements: StockMovement[] = [];
  const events: DocEvent[] = [];
  const net = new Array<number>(items.length).fill(0);
  const toLines = (spec: SpecLine[], price: "costPrice" | "sellPrice"): LineItem[] =>
    spec.map(([i, qty]) => ({ itemId: items[i].id, qty, unitPrice: items[i][price] }));

  const purchases: PurchaseOrder[] = PURCHASES.map(([sup, days, status, spec], i) => {
    const date = at(days, 11);
    const po: PurchaseOrder = {
      id: id("po"),
      number: docNumber("PO", i + 1),
      supplierId: suppliers[sup].id,
      date,
      expectedDate: plus(date, 5, 12),
      status,
      lines: toLines(spec, "costPrice"),
      createdAt: date,
    };
    events.push({ id: id("evt"), kind: "po.created", refId: po.id, refNumber: po.number, timestamp: date });
    if (status === "received") {
      po.receivedAt = plus(date, 3, 15);
      for (const [itemIdx, qty] of spec) {
        net[itemIdx] += qty;
        movements.push({
          id: id("mov"),
          type: "purchase_receipt",
          itemId: items[itemIdx].id,
          qtyDelta: qty,
          refDoc: { kind: "PO", id: po.id, number: po.number },
          timestamp: po.receivedAt,
        });
      }
    }
    if (status === "cancelled") {
      po.cancelledAt = plus(date, 2, 16);
      events.push({ id: id("evt"), kind: "po.cancelled", refId: po.id, refNumber: po.number, timestamp: po.cancelledAt });
    }
    return po;
  });

  const sales: SalesOrder[] = SALES.map(([cus, days, status, spec], i) => {
    const date = at(days, 12);
    const so: SalesOrder = {
      id: id("so"),
      number: docNumber("INV", i + 1),
      customerId: customers[cus].id,
      date,
      status,
      lines: toLines(spec, "sellPrice"),
      createdAt: date,
    };
    events.push({ id: id("evt"), kind: "sale.created", refId: so.id, refNumber: so.number, timestamp: date });
    if (status !== "draft") {
      so.confirmedAt = plus(date, 0, 13);
      events.push({ id: id("evt"), kind: "sale.confirmed", refId: so.id, refNumber: so.number, timestamp: so.confirmedAt });
    }
    if (status === "fulfilled") {
      so.fulfilledAt = plus(date, 1, 16);
      for (const [itemIdx, qty] of spec) {
        net[itemIdx] -= qty;
        movements.push({
          id: id("mov"),
          type: "sale_fulfilment",
          itemId: items[itemIdx].id,
          qtyDelta: -qty,
          refDoc: { kind: "SO", id: so.id, number: so.number },
          timestamp: so.fulfilledAt,
        });
      }
    }
    if (status === "cancelled") {
      so.cancelledAt = plus(date, 1, 11);
      events.push({ id: id("evt"), kind: "sale.cancelled", refId: so.id, refNumber: so.number, timestamp: so.cancelledAt });
    }
    return so;
  });

  ADJUSTMENTS.forEach(([itemIdx, qtyDelta, days, note], i) => {
    net[itemIdx] += qtyDelta;
    const adjId = id("adj");
    movements.push({
      id: id("mov"),
      type: "adjustment",
      itemId: items[itemIdx].id,
      qtyDelta,
      refDoc: { kind: "ADJ", id: adjId, number: docNumber("ADJ", i + 1) },
      note,
      timestamp: at(days, 17),
    });
  });

  // Back-solve opening balances so the ledger lands on each target quantity.
  const openingAt = at(182, 9);
  ITEMS.forEach((spec, i) => {
    const opening = spec[8] - net[i];
    if (opening <= 0) return;
    movements.push({
      id: id("mov"),
      type: "opening",
      itemId: items[i].id,
      qtyDelta: opening,
      refDoc: { kind: "OPEN", id: items[i].id, number: "Opening" },
      note: "Opening balance",
      timestamp: openingAt,
    });
  });

  movements.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return {
    items,
    movements,
    customers,
    suppliers,
    sales,
    purchases,
    events,
    counters: { sale: SALES.length, po: PURCHASES.length, adj: ADJUSTMENTS.length },
  };
}

function partyFrom(id: string, name: string, contactName: string, city: string, createdAt: string) {
  const handle = contactName.toLowerCase().replace(/^dr\.\s*/, "").split(" ")[0];
  const domain = name.toLowerCase().replace(/(pvt ltd|llp|co\.)/g, "").replace(/[^a-z]/g, "");
  const digits = Array.from(name).reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 100000, 7);
  return {
    id,
    name,
    contactName,
    email: `${handle}@${domain}.in`,
    phone: `+91 98${String(digits).padStart(5, "0").slice(0, 3)} ${String(digits * 7).padStart(5, "0").slice(-5)}`,
    city,
    createdAt,
  };
}
