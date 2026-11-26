import {
  ChartColumn,
  Factory,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Optional live counter key rendered as a badge next to the label. */
  badge?: "lowStock";
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  { items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Operations",
    items: [
      { href: "/sales", label: "Sales", icon: ShoppingCart },
      { href: "/purchases", label: "Purchases", icon: Truck },
      { href: "/stock", label: "Stock", icon: Package, badge: "lowStock" },
    ],
  },
  {
    label: "Directory",
    items: [
      { href: "/customers", label: "Customers", icon: UserRound },
      { href: "/suppliers", label: "Suppliers", icon: Factory },
    ],
  },
  { label: "Insights", items: [{ href: "/reports", label: "Reports", icon: ChartColumn }] },
];

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
