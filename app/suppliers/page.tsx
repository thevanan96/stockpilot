import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Suppliers" };

export default function Page() {
  return (
    <>
      <PageHeader title="Suppliers" description="Vendors you purchase from" />
      <PageBody>{null}</PageBody>
    </>
  );
}
