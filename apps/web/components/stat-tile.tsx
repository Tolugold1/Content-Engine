import type { LucideIcon } from "lucide-react";
import { TiltCard } from "./tilt-card";

export function StatTile({ label, value, hint, icon: Icon }: { label: string; value: string; hint: string; icon: LucideIcon }) {
  return (
    <TiltCard className="glass rounded-[22px] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">{label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-gold/10">
          <Icon className="h-4 w-4 text-gold" aria-hidden />
        </span>
      </div>
      <p className="pop mt-3 font-display text-3xl font-bold tabular-nums text-white sm:text-4xl">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </TiltCard>
  );
}
