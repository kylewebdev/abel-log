"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Inbox,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const TEAM_NAV: NavItem[] = [
  { href: "/sales", label: "Sales", icon: Home },
  { href: "/team/recent", label: "Recent", icon: Inbox }
];

const MANAGEMENT_NAV: NavItem[] = [
  { href: "/sales", label: "Sales", icon: Home },
  { href: "/team/recent", label: "Recent", icon: Inbox }
];

function navItems(role: string) {
  return role === "MANAGEMENT" ? MANAGEMENT_NAV : TEAM_NAV;
}

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => {
    if (href === "/sales") {
      return pathname === "/sales" || pathname.startsWith("/sales/");
    }
    return pathname.startsWith(href);
  };
}

/** The sales-list link stays in the top bar at every viewport so focus screens
 *  still have an escape route. Secondary links move to the mobile tab bar. */
export function AppNav({ role }: { role: string }) {
  const items = navItems(role);
  const isActive = useIsActive();

  return (
    <nav className="flex items-center gap-1" aria-label="Primary">
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
              item.href !== "/sales" && "hidden md:inline-flex",
              active
                ? "bg-foreground/5 text-foreground"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            )}
          >
            <item.icon className="size-4" aria-hidden="true" />
            <span>{item.href === "/sales" ? "All sales" : item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Mobile: fixed thumb-zone tab bar.
 *
 * MUST render outside the app header. The header uses `backdrop-blur`, and a
 * `backdrop-filter` (like `transform`/`filter`) on an ancestor establishes a
 * containing block for `position: fixed` descendants — which would trap this
 * bar at the bottom of the header instead of the viewport.
 */
export function MobileTabBar({
  role,
  focus = false
}: {
  role: string;
  /** Checkout/task screens hide the tab bar so the page owns the thumb zone. */
  focus?: boolean;
}) {
  const items = navItems(role);
  const isActive = useIsActive();

  if (focus) {
    return null;
  }

  return (
    <nav
      className="pb-safe fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur md:hidden"
      aria-label="Primary"
    >
      <ul
        className="mx-auto grid max-w-lg"
        style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
      >
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 px-1 pb-2 pt-2.5 text-[0.7rem] font-bold transition-colors",
                  active ? "text-accent" : "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "absolute inset-x-5 top-0 h-0.5 rounded-full transition-colors",
                    active ? "bg-accent" : "bg-transparent"
                  )}
                />
                <item.icon
                  className="size-[1.45rem]"
                  strokeWidth={active ? 2.4 : 1.9}
                  aria-hidden="true"
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
