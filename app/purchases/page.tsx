import type { Metadata } from "next";
import { Suspense } from "react";
import { PurchasesView } from "@/components/purchases/purchases-view";

export const metadata: Metadata = { title: "Purchases" };

export default function PurchasesPage() {
  return (
    <Suspense>
      <PurchasesView />
    </Suspense>
  );
}
