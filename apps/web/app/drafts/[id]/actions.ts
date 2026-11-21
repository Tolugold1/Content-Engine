"use server";

import { Platform, ReviewConflictError, ReviewRuleError } from "@content-engine/core";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordPost, reviewDraft, updateCaption } from "@/lib/store";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

const DraftId = z.string().min(1).max(64);

async function run(task: () => Promise<string>): Promise<ActionResult> {
  try {
    const message = await task();
    revalidatePath("/", "layout");
    return { ok: true, message };
  } catch (error) {
    if (error instanceof ReviewConflictError || error instanceof ReviewRuleError) {
      revalidatePath("/", "layout");
      return { ok: false, error: error.message };
    }
    if (error instanceof z.ZodError) return { ok: false, error: "That input doesn't look right." };
    console.error(error);
    return { ok: false, error: "Something went wrong. Try again." };
  }
}

export async function approveDraftAction(id: string): Promise<ActionResult> {
  return run(async () => {
    await reviewDraft(DraftId.parse(id), { decision: "approved", channel: "web" });
    return "Approved. Your posting kit is ready, and Telegram has been updated.";
  });
}

export async function rejectDraftAction(id: string, reason: string): Promise<ActionResult> {
  return run(async () => {
    await reviewDraft(DraftId.parse(id), { decision: "rejected", channel: "web", reason: z.string().max(500).parse(reason) });
    return "Rejected. The reason is saved for the writer to learn from.";
  });
}

export async function saveCaptionAction(id: string, platform: string, text: string): Promise<ActionResult> {
  return run(async () => {
    await updateCaption(DraftId.parse(id), Platform.parse(platform), z.string().max(70_000).parse(text));
    return "Caption saved.";
  });
}

export async function markPostedAction(id: string, platform: string, url: string): Promise<ActionResult> {
  return run(async () => {
    await recordPost(DraftId.parse(id), Platform.parse(platform), z.string().max(2_000).parse(url));
    return "Marked as posted. Metrics will be checked in 24 hours.";
  });
}
