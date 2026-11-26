import type { Metadata } from "next";
import { Suspense } from "react";
import { NewPurchaseView } from "@/components/purchases/purchase-form";

export const metadata: Metadata = { title: "New purchase order" };

export default function NewPurchasePage() {
  return (
    <Suspense>
      <NewPurchaseView />
    </Suspense>
  );
}
