import { BadgeCheck, CircleDollarSign, Clapperboard, PencilLine } from "lucide-react";
import type { Metadata } from "next";
import { CalibrationChart } from "@/components/calibration-chart";
import { StatTile } from "@/components/stat-tile";
import { compactNumber, formatUsd, STATUS_LABEL } from "@/lib/format";
import { getInsights } from "@/lib/data";

export const metadata: Metadata = { title: "Insights" };

const STAGE_LABEL: Record<string, string> = {
  triage: "Trend triage",
  reactions: "Reactions",
  research: "Research (web search)",
  script: "Script",
  script_revision: "Script revision",
  claim_check: "Claim check",
  metrics_vision: "Screenshot reading",
  voice: "Voice",
  trends: "X trends",
  metrics: "X metrics",
};

export default async function InsightsPage() {
  const insights = await getInsights(30);
  const maxStage = Math.max(0.0001, ...insights.spendByStage.map((row) => row.costUsd));

  return (
    <div className="space-y-10 pt-8 sm:pt-12">
      <header className="rise">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Insights · last {insights.days} days</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">How the engine is doing</h1>
        <p className="mt-3 max-w-xl text-muted">
          Cost per video, where the money goes, how often drafts pass first time, and whether the virality scores predict views.
        </p>
      </header>

      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Spend" value={formatUsd(insights.totalSpendUsd)} hint="Claude, voice and X data" icon={CircleDollarSign} />
        <StatTile
          label="Per posted video"
          value={insights.costPerPostedUsd === null ? "—" : formatUsd(insights.costPerPostedUsd)}
          hint={`${insights.postedCount} posted`}
          icon={Clapperboard}
        />
        <StatTile
          label="First-pass approval"
          value={insights.firstPassRate === null ? "—" : `${Math.round(insights.firstPassRate * 100)}%`}
          hint="Approved with no edits"
          icon={BadgeCheck}
        />
        <StatTile label="Your edits" value={String(insights.editsCount)} hint="Saved as writer feedback" icon={PencilLine} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="glass rounded-[24px] p-5 sm:p-6" aria-labelledby="spend-heading">
          <h2 id="spend-heading" className="font-display text-xl font-bold text-white">
            Spend by stage
          </h2>
          {insights.spendByStage.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No paid calls yet. Costs appear after the first scan.</p>
          ) : (
            <ul className="mt-5 space-y-4">
              {insights.spendByStage.map((row) => (
                <li key={`${row.provider}-${row.stage}-${row.model}`}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-cream">
                      {STAGE_LABEL[row.stage] ?? row.stage} <span className="text-xs text-faint">· {row.model}</span>
                    </span>
                    <span className="tabular-nums text-cream">
                      {formatUsd(row.costUsd)} <span className="text-xs text-faint">· {row.calls} calls</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 rounded-r bg-white/[0.04]">
                    <div className="h-2.5 rounded-r-[4px] bg-gold" style={{ width: `${Math.max(1, (row.costUsd / maxStage) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass rounded-[24px] p-5 sm:p-6" aria-labelledby="calibration-heading">
          <h2 id="calibration-heading" className="font-display text-xl font-bold text-white">
            Predicted virality vs. actual views
          </h2>
          <p className="mt-1 text-sm text-muted">Each dot is a posted video. Points rising to the right mean the scores are useful.</p>
          {insights.calibration.length === 0 ? (
            <p className="mt-6 text-sm text-muted">Appears once posted videos have metrics (24 hours after posting).</p>
          ) : (
            <>
              <div className="mt-4">
                <CalibrationChart points={insights.calibration} />
              </div>
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-gold">Show as a table</summary>
                <table className="mt-3 w-full text-left text-xs">
                  <thead className="text-muted">
                    <tr>
                      <th className="py-1 font-medium">Video</th>
                      <th className="py-1 text-right font-medium">Predicted</th>
                      <th className="py-1 text-right font-medium">Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.calibration.map((point) => (
                      <tr key={point.draftId} className="border-t border-white/5">
                        <td className="py-1.5 pr-3 text-cream">{point.title}</td>
                        <td className="py-1.5 text-right tabular-nums text-cream">{point.predicted.toFixed(1)}</td>
                        <td className="py-1.5 text-right tabular-nums text-cream">{compactNumber(point.views)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </>
          )}
        </section>
      </div>

      <section className="glass rounded-[24px] p-5 sm:p-6" aria-labelledby="status-heading">
        <h2 id="status-heading" className="font-display text-xl font-bold text-white">
          Drafts by outcome
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(STATUS_LABEL).map(([status, label]) => (
            <div key={status} className="rounded-2xl border border-white/8 bg-black/25 p-4">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="mt-1 font-display text-2xl font-bold tabular-nums text-white">{insights.draftsByStatus[status] ?? 0}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
