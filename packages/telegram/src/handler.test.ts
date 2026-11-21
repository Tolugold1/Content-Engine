import { MemoryRepository } from "@content-engine/db";
import { createReviewService } from "@content-engine/services";
import { describe, expect, it, vi } from "vitest";
import { decodeCallback, encodeCallback } from "./callbacks";
import type { Update } from "./client";
import { createUpdateHandler } from "./handler";
import { draftCaption, escapeHtml, postingKitMessages } from "./messages";

const CHAT = "42";

async function setup() {
  const repo = new MemoryRepository();
  const [draft] = await repo.listDrafts({ status: "pending_review" });
  if (!draft) throw new Error("no pending sample draft");
  const telegram = {
    sendMessage: vi.fn(async () => ({ message_id: 1, chat: { id: Number(CHAT) } })),
    answerCallbackQuery: vi.fn(async () => true),
  };
  const onScreenshot = vi.fn(async () => undefined);
  const handle = createUpdateHandler({
    repo,
    telegram,
    reviews: createReviewService(repo),
    allowedChatId: CHAT,
    appUrl: "https://studio.example.com",
    onScreenshot,
  });
  let id = 0;
  const callback = (data: string): Update => ({
    update_id: ++id,
    callback_query: { id: `cb${id}`, from: { id: 1 }, data, message: { message_id: 9, chat: { id: Number(CHAT) } } },
  });
  const text = (body: string, chat = CHAT): Update => ({
    update_id: ++id,
    message: { message_id: id, chat: { id: Number(chat) }, text: body },
  });
  return { repo, draft, telegram, onScreenshot, handle, callback, text };
}

describe("callback codes", () => {
  it("round-trips every action within 64 bytes", () => {
    const draftId = "0b4f1c1e-8a7e-4b8e-9a51-6f5d3a6f1c2b";
    for (const action of [
      { type: "approve", draftId },
      { type: "quickReject", draftId, reasonIndex: 2 },
      { type: "editPlatform", draftId, platform: "instagram" },
      { type: "markPosted", draftId, platform: "x" },
    ] as const) {
      expect(decodeCallback(encodeCallback(action))).toEqual(action);
    }
    expect(decodeCallback("ep:abc:myspace")).toBeNull();
  });
});

describe("Telegram update handler", () => {
  it("approves from a button and reports a conflict on the second tap", async () => {
    const { repo, draft, telegram, handle, callback } = await setup();
    await handle(callback(encodeCallback({ type: "approve", draftId: draft.id })));
    expect((await repo.getDraft(draft.id))?.status).toBe("approved");
    await handle(callback(encodeCallback({ type: "approve", draftId: draft.id })));
    expect(telegram.answerCallbackQuery).toHaveBeenLastCalledWith(expect.any(String), "Already approved on Telegram.");
  });

  it("asks for a reason, then rejects with the typed text", async () => {
    const { repo, draft, handle, callback, text } = await setup();
    await handle(callback(encodeCallback({ type: "reject", draftId: draft.id })));
    await handle(text("Too old now"));
    const updated = await repo.getDraft(draft.id);
    expect(updated?.status).toBe("rejected");
    expect(updated?.review?.reason).toBe("Too old now");
  });

  it("edits a caption through a reply", async () => {
    const { repo, draft, handle, callback, text } = await setup();
    await handle(callback(encodeCallback({ type: "editPlatform", draftId: draft.id, platform: "x" })));
    await handle(text("New X caption #GoldenGist"));
    const updated = await repo.getDraft(draft.id);
    expect(updated?.captions.x).toBe("New X caption #GoldenGist");
    expect(updated?.edits.at(-1)?.channel).toBe("telegram");
  });

  it("records a post link after approval", async () => {
    const { repo, draft, handle, callback, text } = await setup();
    await handle(callback(encodeCallback({ type: "approve", draftId: draft.id })));
    await handle(callback(encodeCallback({ type: "markPosted", draftId: draft.id, platform: "tiktok" })));
    await handle(text("https://www.tiktok.com/@tolugold/video/1"));
    expect((await repo.getDraft(draft.id))?.status).toBe("posted");
  });

  it("forwards analytics screenshots when one is requested", async () => {
    const { repo, draft, onScreenshot, handle } = await setup();
    await repo.setChatSession({
      chatId: CHAT,
      action: "metrics_screenshot",
      draftId: draft.id,
      platform: null,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    await handle({
      update_id: 99,
      message: {
        message_id: 5,
        chat: { id: Number(CHAT) },
        photo: [
          { file_id: "small", width: 90, height: 160 },
          { file_id: "big", width: 1080, height: 1920 },
        ],
      },
    });
    expect(onScreenshot).toHaveBeenCalledWith(expect.objectContaining({ draftId: draft.id, fileId: "big" }));
  });

  it("ignores messages from other chats", async () => {
    const { telegram, handle, text } = await setup();
    await handle(text("hello", "999"));
    expect(telegram.sendMessage).not.toHaveBeenCalled();
  });
});

describe("message builders", () => {
  it("escapes HTML and keeps captions under Telegram's limit", async () => {
    const { draft } = await setup();
    expect(escapeHtml("<b>&</b>")).toBe("&lt;b&gt;&amp;&lt;/b&gt;");
    expect(draftCaption({ ...draft, title: "x".repeat(2000) }).length).toBeLessThanOrEqual(1024);
    expect(postingKitMessages(draft, "18:30")).toHaveLength(6);
  });
});
