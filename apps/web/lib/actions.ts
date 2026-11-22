"use server";

import { Platform } from "@content-engine/core";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { describeError } from "@/lib/api";
import { assertOwner } from "@/lib/auth/session";
import { reviews } from "@/lib/service";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

const DraftId = z.string().min(1).max(64);

/** Runs one service call and refreshes every page that shows drafts. */
async function run(task: () => Promise<string>): Promise<ActionResult> {
  try {
    await assertOwner();
    const message = await task();
    revalidatePath("/", "layout");
    return { ok: true, message };
  } catch (error) {
    revalidatePath("/", "layout");
    return { ok: false, error: describeError(error) };
  }
}

export async function approveDraftAction(id: string): Promise<ActionResult> {
  return run(async () => {
    await reviews().review(DraftId.parse(id), { decision: "approved", channel: "web" });
    return "Approved. Your posting kit is ready, and Telegram has been updated.";
  });
}

export async function rejectDraftAction(id: string, reason: string): Promise<ActionResult> {
  return run(async () => {
    await reviews().review(DraftId.parse(id), { decision: "rejected", channel: "web", reason: z.string().max(500).parse(reason) });
    return "Rejected. The reason is saved for the writer to learn from.";
  });
}

export async function saveCaptionAction(id: string, platform: string, text: string): Promise<ActionResult> {
  return run(async () => {
    await reviews().editCaption(DraftId.parse(id), Platform.parse(platform), z.string().max(70_000).parse(text), "web");
    return "Caption saved.";
  });
}

export async function markPostedAction(id: string, platform: string, url: string): Promise<ActionResult> {
  return run(async () => {
    await reviews().recordPost(DraftId.parse(id), Platform.parse(platform), z.string().max(2_000).parse(url));
    return "Marked as posted. Metrics will be checked in 24 hours.";
  });
}

export async function requestScanAction(): Promise<ActionResult> {
  return run(async () => {
    await reviews().requestScan("dashboard");
    return "Scan requested. New drafts will show up here and on Telegram.";
  });
}
