import { Skeleton } from "@/components/ui/skeleton";
import { PageBody, PageHeader } from "@/components/shared/page-header";

export function FormPageSkeleton({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} description="Loading…" />
      <PageBody>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" aria-busy="true">
          <div className="space-y-6">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </PageBody>
    </>
  );
}
