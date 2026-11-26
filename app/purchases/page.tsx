import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Purchases" };

export default function Page() {
  return (
    <>
      <PageHeader title="Purchases" description="Purchase orders from suppliers" />
      <PageBody>{null}</PageBody>
    </>
  );
}
