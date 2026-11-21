import type { AiContext } from "@content-engine/ai";
import { env, isConfigured } from "@content-engine/config";
import { SCHEDULE, type UsageRecord } from "@content-engine/core";
import { getRepository } from "@content-engine/db";
import { getTelegram, type TelegramClient } from "@content-engine/telegram";

/** Shared helpers for Inngest functions. Everything is resolved lazily so missing keys fail only the step that needs them. */

export const repo = () => getRepository();

export function aiContext(trendId: string | null): AiContext {
  return { trendId, recordUsage: (record) => repo().recordUsage(record) };
}

export async function recordUsage(trendId: string | null, usage: Omit<UsageRecord, "trendId"> | null | undefined): Promise<void> {
  if (usage) await repo().recordUsage({ ...usage, trendId });
}

/** Telegram is optional: without it the dashboard still works and the bot steps are skipped. */
export function telegramOrNull(): { client: TelegramClient; chatId: string } | null {
  return isConfigured("telegram") ? { client: getTelegram(), chatId: env().TELEGRAM_CHAT_ID! } : null;
}

export function renderOptions() {
  const values = env();
  return { browserExecutable: values.REMOTION_BROWSER_EXECUTABLE ?? null, licenseKey: values.REMOTION_LICENSE_KEY ?? null };
}

export function localTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: SCHEDULE.timezone }).format(
    new Date(iso),
  );
}
