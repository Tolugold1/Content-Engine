import { eventsEnabled } from "@content-engine/config";
import { EVENT_SCHEMAS, type EventName, type EventPayloads } from "@content-engine/core";
import { eventType, Inngest } from "inngest";

export const inngest = new Inngest({ id: "content-engine" });

/** Typed event definitions, usable as function triggers and in waitForEvent. */
export const events = {
  scoutRequested: eventType("scout/requested", { schema: EVENT_SCHEMAS["scout/requested"] }),
  storySelected: eventType("story/selected", { schema: EVENT_SCHEMAS["story/selected"] }),
  draftReady: eventType("draft/ready", { schema: EVENT_SCHEMAS["draft/ready"] }),
  draftReviewed: eventType("draft/reviewed", { schema: EVENT_SCHEMAS["draft/reviewed"] }),
  draftCaptionEdited: eventType("draft/caption-edited", { schema: EVENT_SCHEMAS["draft/caption-edited"] }),
  draftPosted: eventType("draft/posted", { schema: EVENT_SCHEMAS["draft/posted"] }),
  screenshotReceived: eventType("metrics/screenshot-received", { schema: EVENT_SCHEMAS["metrics/screenshot-received"] }),
} as const;

/**
 * Validates and sends one event. When no Inngest server is configured
 * (sample mode), the event is logged instead so the dashboard still works.
 */
export async function sendEvent<E extends EventName>(name: E, data: EventPayloads[E]): Promise<void> {
  const payload = EVENT_SCHEMAS[name].parse(data);
  if (!eventsEnabled()) {
    console.info(`[event:${name}] (events disabled)`, JSON.stringify(payload));
    return;
  }
  await inngest.send({ name, data: payload });
}
