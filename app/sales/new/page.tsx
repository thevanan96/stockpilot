import type { Metadata } from "next";
import { NewSaleView } from "@/components/sales/sale-form";

export const metadata: Metadata = { title: "New sale" };

export default function NewSalePage() {
  return <NewSaleView />;
}
