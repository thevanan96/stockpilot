import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Reports" };

export default function Page() {
  return (
    <>
      <PageHeader title="Reports" description="Stock, sales and purchase reports" />
      <PageBody>{null}</PageBody>
    </>
  );
}
