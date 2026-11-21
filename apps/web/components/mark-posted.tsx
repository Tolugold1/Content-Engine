"use client";

import { PLATFORM_INFO, PLATFORMS, type Platform, type PostRecord } from "@content-engine/core";
import { ExternalLink } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { markPostedAction } from "@/app/drafts/[id]/actions";
import { PlatformPill } from "./badges";

/** After you post by hand, paste the link here so analytics can follow the post. */
export function MarkPosted({ draftId, posts }: { draftId: string; posts: PostRecord[] }) {
  const [platform, setPlatform] = useState<Platform>(() => PLATFORMS.find((p) => !posts.some((post) => post.platform === p)) ?? "tiktok");
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await markPostedAction(draftId, platform, url);
      setMessage(result.ok ? { ok: true, text: result.message } : { ok: false, text: result.error });
      if (result.ok) setUrl("");
    });
  }

  return (
    <div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {PLATFORMS.map((p) => {
          const post = posts.find((item) => item.platform === p);
          return (
            <li key={p} className="flex items-center justify-between rounded-xl border border-white/8 bg-black/25 px-3 py-2">
              <span className="flex items-center gap-2 text-sm">
                <PlatformPill platform={p} muted={!post} />
                <span className={post ? "text-cream" : "text-muted"}>{PLATFORM_INFO[p].label}</span>
              </span>
              {post ? (
                <a href={post.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-gold hover:underline">
                  View <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              ) : (
                <span className="text-xs text-faint">Not posted</span>
              )}
            </li>
          );
        })}
      </ul>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="posted-platform" className="sr-only">
          Platform
        </label>
        <select
          id="posted-platform"
          value={platform}
          onChange={(event) => setPlatform(event.target.value as Platform)}
          className="h-11 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-cream focus:border-gold/50 focus:outline-none"
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {PLATFORM_INFO[p].label}
            </option>
          ))}
        </select>
        <label htmlFor="posted-url" className="sr-only">
          Link to the post
        </label>
        <input
          id="posted-url"
          type="url"
          inputMode="url"
          required
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="Paste the post link"
          className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-cream placeholder:text-faint focus:border-gold/50 focus:outline-none"
        />
        <button type="submit" className="btn btn-gold" disabled={pending || !url}>
          {pending ? "Saving…" : "Mark as posted"}
        </button>
      </form>
      <p aria-live="polite" className={`mt-2 text-sm ${message?.ok ? "text-ok" : "text-bad"}`}>
        {message?.text ?? ""}
      </p>
    </div>
  );
}
