import type { Metadata } from "next";
import { Suspense } from "react";
import { StockView } from "@/components/stock/stock-view";

export const metadata: Metadata = { title: "Stock" };

export default function StockPage() {
  return (
    <Suspense>
      <StockView />
    </Suspense>
  );
}
