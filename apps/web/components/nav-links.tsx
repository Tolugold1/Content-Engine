"use client";

import { Film, Inbox, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Studio", icon: LayoutDashboard },
  { href: "/review", label: "Review", icon: Inbox },
  { href: "/library", label: "Library", icon: Film },
] as const;

export function NavLinks({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();

  return (
    <nav className="ml-0.5 flex items-center gap-0.5 sm:ml-4 sm:gap-1" aria-label="Main">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-sm font-medium transition-colors sm:px-3 ${
              active ? "bg-gold/15 text-gold-light" : "text-muted hover:bg-white/5 hover:text-cream"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className={active ? "" : "sr-only sm:not-sr-only"}>{label}</span>
            {href === "/review" && pendingCount > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-bold text-ink">
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
