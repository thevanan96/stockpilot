import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Sales" };

export default function Page() {
  return (
    <>
      <PageHeader title="Sales" description="Invoices and sales orders" />
      <PageBody>{null}</PageBody>
    </>
  );
}
