"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeft, Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Kbd } from "@/components/shared/kbd";
import { LogoMark } from "@/components/layout/logo";
import { ThemeCycleButton, ThemeToggle } from "@/components/layout/theme-toggle";
import { NAV_SECTIONS, isActivePath, type NavItem } from "@/lib/nav";
import { useUiStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";

interface SidebarContentProps {
  /** Icon-only rail mode. */
  rail?: boolean;
  /** Called after a navigation (used to close the mobile sheet). */
  onNavigate?: () => void;
  showCollapseToggle?: boolean;
}

export function SidebarContent({ rail = false, onNavigate, showCollapseToggle }: SidebarContentProps) {
  const pathname = usePathname();
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const badges: Partial<Record<NonNullable<NavItem["badge"]>, number>> = {};

  return (
    <div className="flex h-full flex-col gap-4 px-3 py-3">
      {/* Brand */}
      <div className={cn("flex h-9 items-center gap-2.5", rail ? "justify-center" : "px-1.5")}>
        <Link
          href="/"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="StockPilot home"
        >
          <LogoMark />
          {!rail && (
            <span className="truncate text-[15px] font-semibold tracking-[-0.02em] text-foreground">StockPilot</span>
          )}
        </Link>
        {showCollapseToggle && !rail && (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
            className="ml-auto hidden size-7 items-center justify-center rounded-md text-subtle-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring outline-none lg:flex"
          >
            <PanelLeft className="size-4" />
          </button>
        )}
      </div>

      {/* Search / command palette trigger */}
      <RailTooltip label="Search" shortcut="Ctrl K" enabled={rail}>
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            setCommandOpen(true);
          }}
          aria-label="Search and run commands"
          className={cn(
            "group flex h-8 items-center gap-2 rounded-lg border border-sidebar-border bg-card text-muted-foreground shadow-card transition-colors duration-150 outline-none hover:border-border-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
            rail ? "w-8 justify-center self-center" : "px-2.5",
          )}
        >
          <Search className="size-3.5 shrink-0" />
          {!rail && (
            <>
              <span className="text-[13px]">Search…</span>
              <span className="ml-auto flex gap-0.5">
                <Kbd>Ctrl</Kbd>
                <Kbd>K</Kbd>
              </span>
            </>
          )}
        </button>
      </RailTooltip>

      {/* Navigation */}
      <nav aria-label="Main" className="flex flex-1 flex-col gap-5 overflow-y-auto scrollbar-thin">
        {NAV_SECTIONS.map((section, i) => (
          <div key={section.label ?? i} className="flex flex-col gap-0.5">
            {section.label && !rail && (
              <div className="px-2.5 pb-1 text-[11px] font-medium tracking-wide text-subtle-foreground uppercase">
                {section.label}
              </div>
            )}
            {section.label && rail && <div className="mx-auto mb-1 h-px w-5 bg-sidebar-border" aria-hidden />}
            {section.items.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={isActivePath(pathname, item.href)}
                rail={rail}
                badge={item.badge ? badges[item.badge] : undefined}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={cn("flex flex-col gap-2 border-t border-sidebar-border pt-3", rail && "items-center")}>
        {rail ? <ThemeCycleButton /> : <ThemeToggle />}
        {showCollapseToggle && rail && (
          <RailTooltip label="Expand sidebar" enabled>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
              className="hidden size-8 items-center justify-center rounded-lg text-subtle-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring outline-none lg:flex"
            >
              <PanelLeft className="size-4" />
            </button>
          </RailTooltip>
        )}
      </div>
    </div>
  );
}

function SidebarLink({
  item,
  active,
  rail,
  badge,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  rail: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const showBadge = badge !== undefined && badge > 0;

  return (
    <RailTooltip label={item.label} enabled={rail}>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        aria-label={rail ? item.label : undefined}
        className={cn(
          "group relative flex h-8 items-center gap-2.5 rounded-lg text-[13.5px] font-medium text-sidebar-foreground transition-colors duration-150 outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring",
          rail ? "w-8 justify-center self-center" : "px-2.5",
          active && "bg-sidebar-accent text-sidebar-accent-foreground",
        )}
      >
        <Icon
          className={cn(
            "size-4 shrink-0 text-subtle-foreground transition-colors group-hover:text-foreground",
            active && "text-primary group-hover:text-primary dark:text-brand-text dark:group-hover:text-brand-text",
          )}
        />
        {!rail && <span className="truncate">{item.label}</span>}
        {showBadge && !rail && (
          <span
            className="num ml-auto rounded-full bg-warning-soft px-1.5 py-px text-[11px] font-semibold text-warning-text"
            aria-label={`${badge} items need attention`}
          >
            {badge}
          </span>
        )}
        {showBadge && rail && (
          <span className="absolute top-1 right-1 size-1.5 rounded-full bg-warning" aria-hidden />
        )}
      </Link>
    </RailTooltip>
  );
}

function RailTooltip({
  label,
  shortcut,
  enabled,
  children,
}: {
  label: string;
  shortcut?: string;
  enabled: boolean;
  children: React.ReactElement;
}) {
  if (!enabled) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
        {shortcut && <span className="ml-1 text-background/60">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  );
}
