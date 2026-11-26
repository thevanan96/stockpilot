"use client";

import { OctagonX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { useInventoryStore } from "@/store/inventory-store";

/** Route-level error boundary: recover by retrying or restoring demo data. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <EmptyState
        icon={OctagonX}
        tone="danger"
        title="Something went wrong"
        description="This view hit an unexpected error. Try again — if it keeps happening, restoring the demo data usually fixes a corrupted local copy."
        action={
          <>
            <Button variant="outline" onClick={() => reset()}>
              Try again
            </Button>
            <Button
              onClick={() => {
                useInventoryStore.getState().resetDemo();
                reset();
              }}
            >
              Restore demo data
            </Button>
          </>
        }
      />
    </div>
  );
}
