# StockPilot

**A calm, modern inventory workspace**: stock, purchasing, sales and reports in one connected flow.

**Live demo:** https://stockpilot-woad-three.vercel.app

StockPilot is a front-end-only demo built as a trial task. Every quantity in the app comes from a single **stock ledger**. Receiving a purchase order or fulfilling an invoice writes ledger entries, and the dashboard, low-stock alerts, item history and reports are all derived from those entries. No login is needed: the app opens on a realistic six-month sample workspace stored in your browser.

## Features

| Area | What you can do |
| --- | --- |
| **Dashboard** | KPI cards (items, stock value with 30-day trend, open sales, pending purchases), a sales vs purchases chart for the last 6 months, low-stock alerts with one-click **Create PO**, an activity feed and stock value by category |
| **Sales** | Invoice list with status tabs, customer filter and search; **New sale** with customer picker, line items and live totals; confirm → fulfil → done; fulfilment is **blocked with a clear message** when stock is short |
| **Purchases** | PO list with status, supplier filter and search; **New PO** (prefilled from a low-stock item); **Mark as received** adds stock exactly once |
| **Stock** | Items table with status tabs (In stock / Low / Out), category filter, level gauge; item drawer with **full movement history** and running balance linked to source documents; add/edit item; manual stock adjustment |
| **Reports** | Stock movement, sales and purchase reports for any date range (with presets), summary strip, **CSV export** |
| **Directory** | Customers and suppliers with order counts, value and last order; add/edit |
| **Everywhere** | Light and dark themes, ⌘/Ctrl + K command palette (pages, items, invoices, POs, actions), loading skeletons, empty and error states, toasts, confirm dialogs, responsive layout down to 390px |

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (type-checks as part of the build) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |

Deploys to Vercel with zero configuration: import the repository and press deploy, or run `npx vercel --prod` from the project folder. There are no environment variables. The live demo above was deployed this way.

To start over at any time, use **Reset demo data** in the sidebar footer.

## Try this flow

This walk-through covers the core loop: **receive a PO → stock rises → fulfil a sale → a low-stock alert appears on the Dashboard.**

1. **Dashboard.** *Low stock alerts* lists 5 items. *USB-C Docking Station* and *128GB SD Card* are out of stock, and *24" IPS Monitor* (4 / 6) is low.
2. **Sales → INV-0014** (Indus Design Studio, 6 × 24" IPS Monitor). Click **Fulfil order**. It is blocked: *"Not enough stock to fulfil INV-0014 — 24" IPS Monitor: need 6, only 4 available."* The drawer shows the shortage inline, with a *Create PO* shortcut.
3. **Purchases → PO-0010** (Apex Peripherals: 10 docking stations and 8 monitors). Click **Mark as received** and confirm. The toast reports **+18 units**. The button disappears, so the PO can't be received twice.
4. **Stock.** The monitor now shows **12** and the docking station **10**. Open either item: the drawer history shows the new *Received · PO-0010* movement and the running balance.
5. **Sales → INV-0014 → Fulfil order** again. This time it succeeds. The monitor drops to **6**, which equals its minimum level, and a warning toast appears: *"24" IPS Monitor is running low"* with a **Create PO** action.
6. **Dashboard.** The monitor is back in *Low stock alerts*, the activity feed shows *Received PO-0010* and *Fulfilled INV-0014*, and the KPIs and badge counts have updated.

Bonus: **INV-0015** (40 × Wireless Mouse) pushes the mouse from 64 to 24, below its minimum of 25. Low-stock alerts appear the moment stock moves.

## Architecture

```
app/                  Routes (App Router). Thin server pages that set metadata and render a view.
components/
  ui/                 shadcn/ui primitives (Radix), lightly tuned to the design system
  layout/             App shell: sidebar / rail / mobile sheet, command palette, theme switch
  shared/             DataTable, StatusBadge, KpiCard-style pieces, EmptyState, filters, pickers…
  documents/          Shared sale/PO building blocks: line-item editor, drawer, timeline, form layout
  dashboard/ stock/ sales/ purchases/ reports/ parties/   Feature views
data/seed.ts          Deterministic six-month demo dataset
lib/
  domain.ts           Pure business rules (totals, stock status, reorder suggestion)
  selectors.ts        Memoised derived data (stock levels, KPIs, activity, reports)
  schemas.ts          zod schemas shared by all forms
  format.ts csv.ts id.ts nav.ts utils.ts
store/                Zustand store (the only place data changes), hydration helpers
types/                Domain types
```

### Data model

- `Item`: catalogue data only (SKU, name, category, unit, minimum level, cost and sell price, preferred supplier). **It has no quantity field.**
- `StockMovement` (the ledger): `{ id, type, itemId, qtyDelta, refDoc, timestamp }`. The `type` is `opening | purchase_receipt | sale_fulfilment | adjustment`, and `refDoc` points to the PO, invoice or adjustment that caused the movement.
- `SalesOrder` (`draft → confirmed → fulfilled`, or `cancelled`) and `PurchaseOrder` (`pending → received`, or `cancelled`), each with `lines: { itemId, qty, unitPrice }[]`.
- `DocEvent`: lifecycle events that don't move stock (created, confirmed, cancelled). The activity feed merges these with ledger movements.
- `Customer` / `Supplier`: simple contact records.

### The ledger approach

- **Quantity is derived, never stored.** On-hand quantity is the sum of an item's `qtyDelta` values. Because no stored figure exists, nothing can drift out of sync with the history.
- **Only store actions write to the ledger.** `receivePurchase`, `fulfilSale`, `adjustStock` and `addItem` (opening balance) each write the ledger entries **and** the document status change in a single `set`, so the two always change together.
- **Guarded, idempotent transitions:**
  - A PO is received only from `pending`, and an invoice is fulfilled only from `confirmed`, so neither can be applied twice.
  - Cancelling is allowed only before stock moves, so a cancel never has to reverse anything.
  - Fulfilment checks every line, aggregated per item, against stock on hand. If any line is short, nothing is written and the shortages come back in the result.
- **Actions return results**, not exceptions: `{ ok: true, data } | { ok: false, error, details }`. Views turn them into toasts or inline messages.
- **Low stock (`quantity <= minLevel`) is a selector**, so it updates on the Dashboard, the sidebar badge and the Stock tabs the moment a movement lands.
- **Business logic stays out of components.** Components select raw slices, call selectors in `lib/selectors.ts` (memoised on input references) and dispatch store actions.
- **Seed data is consistent with the ledger.** The demo declares each item's *target* quantity, then back-solves opening balances so that replaying every receipt, shipment and adjustment lands exactly on the target. That is how the low-stock items are guaranteed on first load.

### Persistence and hydration

The store uses Zustand's `persist` middleware (localStorage, versioned) with `skipHydration`. A small `StoreHydrator` rehydrates after the first client render, and views render skeletons until `useHydrated()` is true. Server HTML and the first client render therefore always match: no hydration mismatches and no flash of seed data.

### Swapping in a real API

The UI only talks to the store's typed actions and to selectors, so the backend can change without touching views:

1. Keep the action signatures (`receivePurchase(id): ActionResult<PurchaseOrder>` and so on) and make them `async`, calling REST or tRPC endpoints such as `POST /purchase-orders/:id/receive`.
2. Move the ledger rules to the server. Receiving or fulfilling becomes **one database transaction** that inserts `stock_movements` rows and updates the document status, with a unique constraint or status check as the idempotency guard. Fulfilment uses `SELECT … FOR UPDATE` (or a quantity check constraint) so two concurrent shipments can't oversell.
3. Expose on-hand quantity as a database view (`SUM(qty_delta) GROUP BY item_id`) or a cached column maintained inside the same transaction. Selectors then read server data, for example via TanStack Query, instead of the persisted store.
4. Replace `persist` with query caching and optimistic updates. Components stay the same.

## Design system

The tokens live in `app/globals.css` and are used everywhere through Tailwind:

- **Colour:** a cool neutral scale (hue 270) with one accent, *Iris* indigo, plus semantic **success** (emerald), **warning** (amber) and **danger** (red). Each semantic colour has a solid, a soft-background and a text tone tuned separately for light and dark.
  - Light mode is a grey canvas with an elevated white content panel.
  - Dark mode is designed rather than inverted: a near-black canvas, a slightly lifted panel, hairline alpha borders instead of shadows, and lifted accent tones for contrast.
- **Type:** Geist Sans and Mono. Sizes are 12 / 13 / 14 (base) / 16 / 20–22 / 26. Weights are 400 / 500 / 600 with tight tracking on headings, and every number uses `tabular-nums`.
- **Space and shape:** 4px spacing grid, 52px table rows, radius 8px for controls, about 11px for cards and 14px for overlays. Borders come first, with soft elevation on cards and overlays.
- **Motion:** 150ms for hover and focus, 200–250ms for drawers, dialogs and count-ups, and animated chart bars. All motion respects `prefers-reduced-motion`.
- **Accessibility:**
  - Visible focus rings everywhere and a skip link.
  - Keyboard-operable table rows (Enter/Space), labelled icon buttons, `aria-sort` on sortable headers.
  - Radix focus management in dialogs and drawers.
  - AA-contrast text tones in both themes.

## Tech stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui (Radix) · lucide-react · Recharts (shadcn chart styling) · Zustand + persist · TanStack Table v8 · react-hook-form + zod · date-fns · next-themes · Geist via `next/font`.

## Notes and trade-offs

- **Prices exclude tax.** Order total is Σ qty × unit price. GST handling would add a tax-rate field per line and a tax summary.
- **Fulfilled invoices and received POs are final.** Reversing them needs a returns / credit-note flow that writes compensating ledger entries. That's the natural next feature.
- **One location.** Godowns and transfers were out of scope. The ledger would gain a `locationId`, and a transfer would be a pair of movements.
- **Data lives in this browser only** (localStorage). Use *Reset demo data* to start over.
- **The seed is generated relative to today**, so the six-month chart always has data. It is written to storage on the first visit and stays stable after that.
