import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Stock" };

export default function Page() {
  return (
    <>
      <PageHeader title="Stock" description="Items, levels and stock movements" />
      <PageBody>{null}</PageBody>
    </>
  );
}
