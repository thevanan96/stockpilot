"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { formatINR, formatINRCompact } from "@/lib/format";
import type { MonthlyPoint } from "@/lib/selectors";

const config = {
  sales: { label: "Sales", color: "var(--chart-1)" },
  purchases: { label: "Purchases", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function SalesPurchasesChart({ data }: { data: MonthlyPoint[] }) {
  const totals = data.reduce((t, d) => ({ sales: t.sales + d.sales, purchases: t.purchases + d.purchases }), {
    sales: 0,
    purchases: 0,
  });

  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-card shadow-card" aria-labelledby="chart-title">
      <header className="flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="chart-title" className="text-sm font-semibold">
            Sales vs purchases
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Last 6 months · by document date, excluding drafts and cancellations</p>
        </div>
        <dl className="flex gap-5">
          {(["sales", "purchases"] as const).map((key) => (
            <div key={key}>
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2 rounded-[3px]" style={{ background: config[key].color }} aria-hidden />
                {config[key].label}
              </dt>
              <dd className="num mt-0.5 text-[15px] font-semibold tracking-tight">{formatINR(totals[key])}</dd>
            </div>
          ))}
        </dl>
      </header>
      <ChartContainer config={config} className="mt-2 aspect-auto h-64 w-full px-2 pb-3 sm:h-72 xl:h-auto xl:min-h-72 xl:flex-1">
        <BarChart data={data} barGap={4} barCategoryGap="28%" margin={{ top: 16, right: 12, left: 4, bottom: 0 }} accessibilityLayer>
          <CartesianGrid vertical={false} strokeDasharray="3 4" stroke="var(--border)" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tickMargin={4}
            tickFormatter={(v: number) => formatINRCompact(v)}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", radius: 6 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="min-w-44 rounded-lg border border-border bg-popover px-3 py-2.5 text-xs shadow-overlay">
                  <div className="mb-1.5 font-medium text-foreground">{label}</div>
                  {payload.map((p) => (
                    <div key={String(p.dataKey)} className="flex items-center justify-between gap-4 py-0.5">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="size-2 rounded-[3px]" style={{ background: p.color }} aria-hidden />
                        {config[p.dataKey as keyof typeof config]?.label}
                      </span>
                      <span className="num font-medium text-foreground">{formatINR(Number(p.value))}</span>
                    </div>
                  ))}
                </div>
              ) : null
            }
          />
          <Bar dataKey="sales" fill="var(--color-sales)" radius={[5, 5, 2, 2]} maxBarSize={28} animationDuration={700} />
          <Bar dataKey="purchases" fill="var(--color-purchases)" radius={[5, 5, 2, 2]} maxBarSize={28} animationDuration={700} />
        </BarChart>
      </ChartContainer>
    </section>
  );
}
