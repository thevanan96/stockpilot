"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Boxes, IndianRupee, Plus, Receipt, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageBody, PageHeader } from "@/components/shared/page-header";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { CategoryCard } from "@/components/dashboard/category-card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LowStockCard } from "@/components/dashboard/low-stock-card";
import { SalesPurchasesChart } from "@/components/dashboard/sales-purchases-chart";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import {
  byId,
  selectActivity,
  selectKpis,
  selectLowStock,
  selectMonthlyTotals,
  selectStockByCategory,
} from "@/lib/selectors";
import { useInventoryStore } from "@/store/inventory-store";
import { useHydrated } from "@/store/use-hydrated";

function greeting(date: Date) {
  const h = date.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function DashboardView() {
  const hydrated = useHydrated();
  if (!hydrated) return <DashboardSkeleton />;
  return <Dashboard />;
}

function Dashboard() {
  const items = useInventoryStore((s) => s.items);
  const movements = useInventoryStore((s) => s.movements);
  const sales = useInventoryStore((s) => s.sales);
  const purchases = useInventoryStore((s) => s.purchases);
  const events = useInventoryStore((s) => s.events);
  const customers = useInventoryStore((s) => s.customers);
  const suppliers = useInventoryStore((s) => s.suppliers);

  const kpis = selectKpis(items, movements, sales, purchases);
  const lowStock = selectLowStock(items, movements);
  const monthly = selectMonthlyTotals(sales, purchases, 6);
  const activity = selectActivity(movements, events).slice(0, 8);
  const categories = selectStockByCategory(items, movements);
  const now = new Date();

  const lookups = {
    sales: byId(sales),
    purchases: byId(purchases),
    customers: byId(customers),
    suppliers: byId(suppliers),
    items: byId(items),
  };

  return (
    <>
      <PageHeader
        title={greeting(now)}
        description={`${format(now, "EEEE, d MMMM")} · Here's how your inventory looks right now.`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/purchases/new">
                <Truck /> New PO
              </Link>
            </Button>
            <Button asChild>
              <Link href="/sales/new">
                <Plus /> New sale
              </Link>
            </Button>
          </>
        }
      />
      <PageBody>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <KpiCard
            label="Total items"
            icon={Boxes}
            value={kpis.totalItems}
            format={formatNumber}
            detail={
              <>
                {formatNumber(kpis.totalUnits)} units on hand
                {kpis.lowStockCount + kpis.outOfStockCount > 0 && (
                  <span className="text-warning-text"> · {kpis.lowStockCount + kpis.outOfStockCount} need attention</span>
                )}
              </>
            }
            href="/stock"
          />
          <KpiCard
            label="Stock value"
            icon={IndianRupee}
            value={kpis.stockValue}
            format={formatINR}
            trend={kpis.stockValueChange}
            trendLabel="Change in stock value over the last 30 days"
            detail="vs 30 days ago"
            href="/reports"
          />
          <KpiCard
            label="Open sales"
            icon={Receipt}
            value={kpis.openSales.value}
            format={formatINR}
            detail={`${kpis.openSales.confirmed} confirmed · ${kpis.openSales.drafts} draft`}
            href="/sales"
          />
          <KpiCard
            label="Pending purchases"
            icon={Truck}
            value={kpis.pendingPurchases.value}
            format={formatINR}
            detail={
              kpis.pendingPurchases.count === 0 ? (
                "No open purchase orders"
              ) : (
                <>
                  {kpis.pendingPurchases.count} open {kpis.pendingPurchases.count === 1 ? "PO" : "POs"}
                  {kpis.pendingPurchases.overdue > 0 ? (
                    <span className="text-danger-text"> · {kpis.pendingPurchases.overdue} overdue</span>
                  ) : (
                    kpis.pendingPurchases.nextExpected && ` · next due ${formatDate(kpis.pendingPurchases.nextExpected)}`
                  )}
                </>
              )
            }
            href="/purchases"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="min-w-0 xl:col-span-2">
            <SalesPurchasesChart data={monthly} />
          </div>
          <LowStockCard items={lowStock} />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="min-w-0 xl:col-span-2">
            <ActivityFeed entries={activity} lookups={lookups} />
          </div>
          <CategoryCard data={categories} />
        </div>
      </PageBody>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <PageHeader title="Dashboard" description="Loading your workspace…" />
      <PageBody>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-busy="true" aria-label="Loading">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[124px] rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-[360px] rounded-xl xl:col-span-2" />
          <Skeleton className="h-[360px] rounded-xl" />
        </div>
      </PageBody>
    </>
  );
}
