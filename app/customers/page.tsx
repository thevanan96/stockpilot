import type { Metadata } from "next";
import { PartiesView } from "@/components/parties/parties-view";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  return <PartiesView kind="customer" />;
}
