import type { EventName, EventPayloads } from "@content-engine/core";

/**
 * Sends an event to Inngest so the paused pipeline resumes and the Telegram
 * bot can update its message ("Approved on the dashboard").
 *
 * The database row is the source of truth, so a failed send is logged rather
 * than undoing the review; the pipeline also re-checks the row before posting.
 * Without INNGEST_EVENT_KEY (sample mode) events are only logged.
 */
export async function publishEvent<E extends EventName>(name: E, data: EventPayloads[E]): Promise<void> {
  const key = process.env.INNGEST_EVENT_KEY;
  if (!key) {
    console.info(`[event:${name}]`, JSON.stringify(data));
    return;
  }
  try {
    const response = await fetch(`https://inn.gs/e/${key}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, data }),
    });
    if (!response.ok) console.error(`[event:${name}] Inngest responded ${response.status}`);
  } catch (error) {
    console.error(`[event:${name}] failed to send`, error);
  }
}
