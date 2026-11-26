import Link from "next/link";
import { formatINR, formatNumber } from "@/lib/format";
import type { CategoryValue } from "@/lib/selectors";

export function CategoryCard({ data }: { data: CategoryValue[] }) {
  return (
    <section className="flex flex-col rounded-xl border border-border bg-card shadow-card" aria-labelledby="category-title">
      <header className="px-5 pt-5 pb-4">
        <h2 id="category-title" className="text-sm font-semibold">
          Stock value by category
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">On-hand quantity × cost price</p>
      </header>
      <ul className="space-y-4 px-5 pb-5">
        {data.map((c) => (
          <li key={c.category}>
            <Link href="/stock" className="group block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium group-hover:underline">{c.category}</span>
                <span className="num shrink-0 font-medium">{formatINR(c.value)}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <span
                    className="block h-full rounded-full bg-chart-1 transition-[width] duration-700 ease-out"
                    style={{ width: `${Math.max(c.share * 100, 2)}%` }}
                  />
                </span>
                <span className="num w-20 shrink-0 text-right text-xs text-muted-foreground">
                  {(c.share * 100).toFixed(0)}% · {formatNumber(c.units)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <footer className="num mt-auto flex items-baseline justify-between border-t border-border px-5 py-3.5 text-sm">
        <span className="text-muted-foreground">Total stock value</span>
        <span className="font-semibold">{formatINR(data.reduce((s, c) => s + c.value, 0))}</span>
      </footer>
    </section>
  );
}
