import { Send } from "lucide-react";
import Link from "next/link";
import { isConfigured } from "@content-engine/config";
import { isSampleMode, listDrafts } from "@/lib/data";
import { NavLinks } from "./nav-links";

export async function SiteHeader() {
  const pending = await listDrafts({ status: "pending_review" });
  const telegramConnected = isConfigured("telegram");

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-ink/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Golden Gist Studio home">
          <span className="coin h-8 w-8 text-sm">G</span>
          <span className="hidden leading-tight sm:block">
            <span className="block font-display text-[15px] font-bold text-white">Golden Gist</span>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-muted">Studio · Tolugold</span>
          </span>
        </Link>
        <NavLinks pendingCount={pending.length} />
        <div className="ml-auto flex items-center gap-2">
          {isSampleMode() && (
            <span className="hidden rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-muted md:inline">Sample data</span>
          )}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              telegramConnected ? "border-ok/30 text-ok" : "border-white/10 text-muted"
            }`}
            title={
              telegramConnected ? "Every finished draft is still sent to Telegram" : "Set TELEGRAM_BOT_TOKEN to turn on Telegram alerts"
            }
          >
            <Send className="h-3 w-3" aria-hidden />
            <span className="hidden sm:inline">{telegramConnected ? "Telegram alerts on" : "Telegram not connected"}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
