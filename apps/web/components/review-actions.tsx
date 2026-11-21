"use client";

import { Check, X } from "lucide-react";
import { useState, useTransition } from "react";
import { approveDraftAction, rejectDraftAction, type ActionResult } from "@/app/drafts/[id]/actions";

const QUICK_REASONS = [
  "Only chatter, can't confirm",
  "Story is already old",
  "Tone is off",
  "Not for our audience",
];

export function ReviewActions({ draftId, blocked }: { draftId: string; blocked: boolean }) {
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<ActionResult | null>(null);

  function approve() {
    startTransition(async () => setResult(await approveDraftAction(draftId)));
  }

  function reject() {
    startTransition(async () => setResult(await rejectDraftAction(draftId, reason)));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-gold flex-1 sm:flex-none" onClick={approve} disabled={pending || blocked}>
          <Check className="h-4 w-4" aria-hidden />
          {pending && !rejecting ? "Approving…" : "Approve"}
        </button>
        <button
          type="button"
          className="btn btn-danger flex-1 sm:flex-none"
          onClick={() => setRejecting((open) => !open)}
          disabled={pending}
          aria-expanded={rejecting}
        >
          <X className="h-4 w-4" aria-hidden />
          Reject
        </button>
      </div>
      {blocked && (
        <p className="mt-3 text-sm text-warn">Approval is locked until every claim is supported by evidence.</p>
      )}

      {rejecting && (
        <div className="mt-4 rounded-2xl border border-bad/25 bg-bad/5 p-4">
          <label htmlFor="reject-reason" className="text-sm font-medium text-cream">
            Why? <span className="text-muted">The writer learns from this.</span>
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_REASONS.map((quick) => (
              <button
                key={quick}
                type="button"
                onClick={() => setReason(quick)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  reason === quick ? "border-bad/60 bg-bad/15 text-cream" : "border-white/10 text-muted hover:text-cream"
                }`}
              >
                {quick}
              </button>
            ))}
          </div>
          <textarea
            id="reject-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            placeholder="Or write your own reason"
            className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-cream placeholder:text-faint focus:border-gold/50 focus:outline-none"
          />
          <button type="button" className="btn btn-danger btn-sm mt-3" onClick={reject} disabled={pending || !reason.trim()}>
            {pending ? "Rejecting…" : "Confirm reject"}
          </button>
        </div>
      )}

      <p aria-live="polite" className={`mt-3 text-sm ${result?.ok ? "text-ok" : "text-bad"}`}>
        {result ? (result.ok ? result.message : result.error) : ""}
      </p>
    </div>
  );
}
