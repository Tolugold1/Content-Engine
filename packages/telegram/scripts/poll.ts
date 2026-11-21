/**
 * Local development without a public URL: removes the webhook and long-polls
 * for updates, feeding them to the same handler the webhook uses.
 *   pnpm telegram:poll
 */
import { createBot, getTelegram } from "../src/index";

const telegram = getTelegram();
const handleUpdate = createBot();
await telegram.deleteWebhook();
console.log("Polling Telegram for updates. Press Ctrl+C to stop.");

let offset = 0;
for (;;) {
  try {
    const updates = await telegram.getUpdates(offset);
    for (const update of updates) {
      offset = update.update_id + 1;
      await handleUpdate(update);
    }
  } catch (error) {
    console.error("[poll]", error);
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
}
