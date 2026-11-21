import { isConfigured, requireFeature } from "@content-engine/config";
import { createBot, type Update } from "@content-engine/telegram";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

let handleUpdate: ReturnType<typeof createBot> | undefined;

function secretMatches(received: string | null, expected: string): boolean {
  if (!received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * POST /api/telegram/webhook — Telegram calls this for every button tap and message.
 * Verified with the secret token set by `pnpm telegram:webhook`. Answers 200 once
 * verified, so Telegram does not retry an update that was already handled.
 */
export async function POST(request: Request) {
  if (!isConfigured("telegram")) return NextResponse.json({ ok: false }, { status: 503 });
  const { TELEGRAM_WEBHOOK_SECRET } = requireFeature("telegram");
  if (!secretMatches(request.headers.get("x-telegram-bot-api-secret-token"), TELEGRAM_WEBHOOK_SECRET)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  handleUpdate ??= createBot();
  try {
    await handleUpdate((await request.json()) as Update);
  } catch (error) {
    console.error("[telegram] update failed", error);
  }
  return NextResponse.json({ ok: true });
}
