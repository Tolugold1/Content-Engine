"use client";

import { captionLength, PLATFORM_INFO, type Platform } from "@content-engine/core";
import { Check, Copy, Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { saveCaptionAction } from "@/app/drafts/[id]/actions";
import { PlatformPill } from "./badges";

export function CaptionCard({
  draftId,
  platform,
  caption,
  editable,
}: {
  draftId: string;
  platform: Platform;
  caption: string;
  editable: boolean;
}) {
  const info = PLATFORM_INFO[platform];
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(caption);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const length = captionLength(editing ? text : caption);
  const over = length > info.captionLimit;

  async function copy() {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Couldn't reach the clipboard. Long-press the text to copy it.");
    }
  }

  function save() {
    startTransition(async () => {
      const result = await saveCaptionAction(draftId, platform, text);
      if (result.ok) {
        setEditing(false);
        setError(null);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-black/30 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PlatformPill platform={platform} />
          <span className="text-sm font-semibold text-cream">{info.label}</span>
          <span className="text-xs text-faint">{info.captionField}</span>
        </div>
        <span className={`text-xs tabular-nums ${over ? "text-bad" : "text-faint"}`}>
          {length}/{info.captionLimit}
        </span>
      </div>

      {editing ? (
        <>
          <label htmlFor={`caption-${platform}`} className="sr-only">
            {info.label} caption
          </label>
          <textarea
            id={`caption-${platform}`}
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={Math.min(8, Math.max(3, Math.ceil(text.length / 48)))}
            className="mt-3 w-full rounded-xl border border-gold/30 bg-black/50 px-3 py-2 text-sm leading-relaxed text-cream focus:border-gold/70 focus:outline-none"
          />
          <div className="mt-2 flex gap-2">
            <button type="button" className="btn btn-gold btn-sm" onClick={save} disabled={pending || over}>
              {pending ? "Saving…" : "Save caption"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setText(caption);
                setEditing(false);
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-cream/90">{caption}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>
              {copied ? <Check className="h-4 w-4 text-ok" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
              {copied ? "Copied" : "Copy"}
            </button>
            {editable && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" aria-hidden />
                Edit
              </button>
            )}
          </div>
        </>
      )}
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </div>
  );
}
