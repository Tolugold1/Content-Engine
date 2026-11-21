import { env, requireFeature } from "@content-engine/config";
import { getRepository } from "@content-engine/db";
import { createReviewService, sendEvent } from "@content-engine/services";
import { TelegramClient } from "./client";
import { createUpdateHandler } from "./handler";

export * from "./client";
export * from "./callbacks";
export * from "./messages";
export { createUpdateHandler, type HandlerDeps } from "./handler";

let client: TelegramClient | undefined;

/** Process-wide Bot API client (throws a clear error if Telegram keys are missing). */
export function getTelegram(): TelegramClient {
  client ??= new TelegramClient(requireFeature("telegram").TELEGRAM_BOT_TOKEN);
  return client;
}

/** The production update handler: shared repository, review service and events. */
export function createBot() {
  const keys = requireFeature("telegram");
  return createUpdateHandler({
    repo: getRepository(),
    telegram: getTelegram(),
    reviews: createReviewService(),
    allowedChatId: keys.TELEGRAM_CHAT_ID,
    appUrl: env().APP_URL,
    onScreenshot: (input) => sendEvent("metrics/screenshot-received", input),
  });
}
