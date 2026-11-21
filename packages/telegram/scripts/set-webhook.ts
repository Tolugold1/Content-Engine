/**
 * Points Telegram at the dashboard's webhook. Run after deploying:
 *   pnpm telegram:webhook
 */
import { env, requireFeature } from "@content-engine/config";
import { getTelegram } from "../src/index";

const keys = requireFeature("telegram");
const url = `${env().APP_URL}/api/telegram/webhook`;
if (!url.startsWith("https://")) {
  console.error(`APP_URL must be public https for webhooks (got ${url}). For local testing use: pnpm telegram:poll`);
  process.exit(1);
}
await getTelegram().setWebhook(url, keys.TELEGRAM_WEBHOOK_SECRET);
console.log(`Webhook set to ${url}`);
