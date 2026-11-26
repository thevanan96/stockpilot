import { z } from "zod";
import { CATEGORIES, UNITS } from "@/types";

const amount = (label: string) =>
  z.number({ error: `Enter ${label}` }).min(0, `${label[0].toUpperCase()}${label.slice(1)} can't be negative`);

const wholeNumber = (label: string) =>
  z
    .number({ error: `Enter ${label}` })
    .int("Use a whole number")
    .min(0, `${label[0].toUpperCase()}${label.slice(1)} can't be negative`);

export const itemSchema = z.object({
  name: z.string().trim().min(2, "Enter an item name"),
  sku: z
    .string()
    .trim()
    .min(3, "SKU needs at least 3 characters")
    .max(20, "Keep SKUs under 20 characters")
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and dashes only"),
  category: z.enum(CATEGORIES, { error: "Choose a category" }),
  unit: z.enum(UNITS, { error: "Choose a unit" }),
  minLevel: wholeNumber("a minimum level"),
  costPrice: amount("a cost price"),
  sellPrice: amount("a selling price"),
  preferredSupplierId: z.string().optional(),
  openingQty: wholeNumber("an opening quantity"),
});
export type ItemFormValues = z.infer<typeof itemSchema>;

export const ADJUSTMENT_REASONS = [
  "Cycle count correction",
  "Damaged goods",
  "Lost or stolen",
  "Customer return",
  "Other",
] as const;

export const adjustmentSchema = z.object({
  direction: z.enum(["add", "remove"]),
  qty: z.number({ error: "Enter a quantity" }).int("Use a whole number").min(1, "Quantity must be at least 1"),
  reason: z.enum(ADJUSTMENT_REASONS),
  note: z.string().trim().max(120, "Keep the note under 120 characters").optional(),
});
export type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;

export const lineSchema = z.object({
  itemId: z.string().min(1, "Choose an item"),
  qty: z.number({ error: "Qty" }).int("Whole numbers only").min(1, "Min 1"),
  unitPrice: z.number({ error: "Price" }).min(0, "Can't be negative"),
});

const linesSchema = z
  .array(lineSchema)
  .min(1, "Add at least one line item")
  .refine((lines) => new Set(lines.map((l) => l.itemId)).size === lines.length, {
    error: "Each item can only appear once — adjust the quantity instead",
  });

export const saleSchema = z.object({
  customerId: z.string().min(1, "Choose a customer"),
  date: z.string().min(1, "Choose a date"),
  lines: linesSchema,
  notes: z.string().trim().max(500).optional(),
});
export type SaleFormValues = z.infer<typeof saleSchema>;

export const purchaseSchema = z.object({
  supplierId: z.string().min(1, "Choose a supplier"),
  date: z.string().min(1, "Choose an order date"),
  expectedDate: z.string().optional(),
  lines: linesSchema,
  notes: z.string().trim().max(500).optional(),
});
export type PurchaseFormValues = z.infer<typeof purchaseSchema>;

export const partySchema = z.object({
  name: z.string().trim().min(2, "Enter a name"),
  contactName: z.string().trim().min(2, "Enter a contact person"),
  email: z.email("Enter a valid email"),
  phone: z.string().trim().min(8, "Enter a phone number"),
  city: z.string().trim().min(2, "Enter a city"),
});
export type PartyFormValues = z.infer<typeof partySchema>;
