"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useInventoryStore } from "@/store/inventory-store";
import { cn } from "@/lib/utils";

export function ResetDemoButton({ rail = false }: { rail?: boolean }) {
  const [open, setOpen] = useState(false);
  const resetDemo = useInventoryStore((s) => s.resetDemo);

  const button = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Reset demo data"
      className={cn(
        "flex h-8 items-center gap-2.5 rounded-lg text-[13px] text-sidebar-foreground transition-colors duration-150 outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        rail ? "w-8 justify-center" : "px-2.5",
      )}
    >
      <RotateCcw className="size-4 text-subtle-foreground" />
      {!rail && "Reset demo data"}
    </button>
  );

  return (
    <>
      {rail ? (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            Reset demo data
          </TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Reset demo data?"
        description="All items, documents and stock movements will be replaced with the original sample data. Changes you made in this browser will be lost."
        confirmLabel="Reset data"
        tone="danger"
        onConfirm={() => {
          resetDemo();
          toast.success("Demo data restored", { description: "Everything is back to the original sample workspace." });
        }}
      />
    </>
  );
}
