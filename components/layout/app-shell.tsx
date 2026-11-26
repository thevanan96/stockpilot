"use client";

import { Menu, Search } from "lucide-react";
import Link from "next/link";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { SidebarContent } from "@/components/layout/sidebar";
import { LogoMark } from "@/components/layout/logo";
import { ThemeCycleButton } from "@/components/layout/theme-toggle";
import { CommandPalette } from "@/components/layout/command-palette";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useUiStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";

/**
 * Layout chrome:
 * - < md: sticky top bar + slide-in navigation sheet
 * - md–lg: icon rail
 * - ≥ lg: full sidebar (collapsible to the rail)
 * Content sits on an elevated panel inset from the canvas.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const rail = collapsed || !isDesktop;

  return (
    <div className="flex min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-card px-3 py-2 shadow-overlay focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <aside
        aria-label="Sidebar"
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 bg-sidebar transition-[width] duration-200 ease-out md:block",
          rail ? "w-[60px]" : "w-60",
        )}
      >
        <SidebarContent rail={rail} showCollapseToggle />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:py-2 md:pr-2">
        <MobileHeader />
        <main
          id="main"
          className="flex min-w-0 flex-1 flex-col bg-card md:rounded-xl md:border md:border-border md:shadow-card"
        >
          {children}
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}

function MobileHeader() {
  const open = useUiStore((s) => s.mobileNavOpen);
  const setOpen = useUiStore((s) => s.setMobileNavOpen);
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Menu className="size-5" />
      </button>
      <Link href="/" className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <LogoMark className="size-6" />
        <span className="text-[15px] font-semibold tracking-[-0.02em]">StockPilot</span>
      </Link>
      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          aria-label="Search"
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Search className="size-[18px]" />
        </button>
        <ThemeCycleButton className="size-9" />
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 gap-0 bg-sidebar p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Move between StockPilot sections</SheetDescription>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
