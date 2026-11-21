import { Platform, QUICK_REJECT_REASONS } from "@content-engine/core";

/**
 * Inline-button payloads. Telegram limits callback data to 64 bytes, so each
 * action is a short code: "a:<draftId>", "ep:<draftId>:<platform>", ...
 */
export type CallbackAction =
  | { type: "approve"; draftId: string }
  | { type: "reject"; draftId: string }
  | { type: "quickReject"; draftId: string; reasonIndex: number }
  | { type: "editPick"; draftId: string }
  | { type: "editPlatform"; draftId: string; platform: Platform }
  | { type: "markPosted"; draftId: string; platform: Platform };

const CODES = {
  approve: "a",
  reject: "r",
  quickReject: "q",
  editPick: "e",
  editPlatform: "ep",
  markPosted: "p",
} as const satisfies Record<CallbackAction["type"], string>;

export function encodeCallback(action: CallbackAction): string {
  const parts: string[] = [CODES[action.type], action.draftId];
  if (action.type === "quickReject") parts.push(String(action.reasonIndex));
  if (action.type === "editPlatform" || action.type === "markPosted") parts.push(action.platform);
  const data = parts.join(":");
  if (Buffer.byteLength(data) > 64) throw new Error(`Callback data too long: ${data}`);
  return data;
}

export function decodeCallback(data: string | undefined): CallbackAction | null {
  if (!data) return null;
  const [code, draftId, extra] = data.split(":");
  if (!code || !draftId) return null;
  switch (code) {
    case CODES.approve:
      return { type: "approve", draftId };
    case CODES.reject:
      return { type: "reject", draftId };
    case CODES.editPick:
      return { type: "editPick", draftId };
    case CODES.quickReject: {
      const reasonIndex = Number(extra);
      return Number.isInteger(reasonIndex) && QUICK_REJECT_REASONS[reasonIndex] ? { type: "quickReject", draftId, reasonIndex } : null;
    }
    case CODES.editPlatform:
    case CODES.markPosted: {
      const platform = Platform.safeParse(extra);
      if (!platform.success) return null;
      return code === CODES.editPlatform
        ? { type: "editPlatform", draftId, platform: platform.data }
        : { type: "markPosted", draftId, platform: platform.data };
    }
    default:
      return null;
  }
}
