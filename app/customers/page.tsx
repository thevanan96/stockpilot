import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Customers" };

export default function Page() {
  return (
    <>
      <PageHeader title="Customers" description="People and businesses you sell to" />
      <PageBody>{null}</PageBody>
    </>
  );
}
