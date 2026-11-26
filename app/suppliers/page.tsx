import type { Metadata } from "next";
import { PartiesView } from "@/components/parties/parties-view";

export const metadata: Metadata = { title: "Suppliers" };

export default function SuppliersPage() {
  return <PartiesView kind="supplier" />;
}
