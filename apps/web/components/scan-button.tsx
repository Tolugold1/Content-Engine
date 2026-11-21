"use client";

import { RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { requestScanAction, type ActionResult } from "@/app/drafts/[id]/actions";

/** Asks the trend scout to run now instead of waiting for the schedule. */
export function ScanButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={pending}
        onClick={() => startTransition(async () => setResult(await requestScanAction()))}
      >
        <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} aria-hidden />
        {pending ? "Requesting…" : "Scan now"}
      </button>
      <span aria-live="polite" className={`text-xs ${result?.ok ? "text-ok" : "text-bad"}`}>
        {result ? (result.ok ? "Scan started" : result.error) : ""}
      </span>
    </span>
  );
}
