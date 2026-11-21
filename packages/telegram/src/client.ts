/** Minimal Telegram Bot API client (only the methods the engine uses). */

export interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface ReplyMarkup {
  inline_keyboard?: InlineButton[][];
  force_reply?: boolean;
  input_field_placeholder?: string;
}

export interface TelegramUser {
  id: number;
  first_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  chat: { id: number };
  from?: TelegramUser;
  text?: string;
  caption?: string;
  photo?: Array<{ file_id: string; width: number; height: number; file_size?: number }>;
  document?: { file_id: string; mime_type?: string };
}

export interface CallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface Update {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: CallbackQuery;
}

export class TelegramApiError extends Error {
  constructor(
    readonly method: string,
    readonly description: string,
    readonly errorCode?: number,
  ) {
    super(`Telegram ${method} failed: ${description}`);
    this.name = "TelegramApiError";
  }
}

export interface SendOptions {
  replyMarkup?: ReplyMarkup;
  disablePreview?: boolean;
}

export class TelegramClient {
  private readonly base: string;
  private readonly fileBase: string;

  constructor(token: string) {
    this.base = `https://api.telegram.org/bot${token}`;
    this.fileBase = `https://api.telegram.org/file/bot${token}`;
  }

  async call<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.base}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as { ok: boolean; result?: T; description?: string; error_code?: number };
    if (!json.ok) throw new TelegramApiError(method, json.description ?? response.statusText, json.error_code);
    return json.result as T;
  }

  sendMessage(chatId: string, html: string, options: SendOptions = {}) {
    return this.call<TelegramMessage>("sendMessage", {
      chat_id: chatId,
      text: html,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: options.disablePreview ?? true },
      reply_markup: options.replyMarkup,
    });
  }

  /** Sends a video by URL (Telegram fetches it). Captions are limited to 1024 characters. */
  sendVideo(chatId: string, videoUrl: string, captionHtml: string, options: SendOptions = {}) {
    return this.call<TelegramMessage>("sendVideo", {
      chat_id: chatId,
      video: videoUrl,
      caption: captionHtml,
      parse_mode: "HTML",
      supports_streaming: true,
      reply_markup: options.replyMarkup,
    });
  }

  editMessageCaption(chatId: string, messageId: number, captionHtml: string, replyMarkup?: ReplyMarkup) {
    return this.call<unknown>("editMessageCaption", {
      chat_id: chatId,
      message_id: messageId,
      caption: captionHtml,
      parse_mode: "HTML",
      reply_markup: replyMarkup ?? { inline_keyboard: [] },
    });
  }

  answerCallbackQuery(callbackQueryId: string, text?: string) {
    return this.call<boolean>("answerCallbackQuery", { callback_query_id: callbackQueryId, text });
  }

  /** Downloads a file the user sent (e.g. an analytics screenshot). */
  async downloadFile(fileId: string): Promise<{ bytes: Buffer; path: string }> {
    const file = await this.call<{ file_path?: string }>("getFile", { file_id: fileId });
    if (!file.file_path) throw new TelegramApiError("getFile", "file has no path");
    const response = await fetch(`${this.fileBase}/${file.file_path}`);
    if (!response.ok) throw new TelegramApiError("downloadFile", response.statusText, response.status);
    return { bytes: Buffer.from(await response.arrayBuffer()), path: file.file_path };
  }

  setWebhook(url: string, secretToken: string) {
    return this.call<boolean>("setWebhook", {
      url,
      secret_token: secretToken,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: true,
    });
  }

  deleteWebhook() {
    return this.call<boolean>("deleteWebhook", { drop_pending_updates: false });
  }

  getUpdates(offset: number, timeoutSeconds = 30) {
    return this.call<Update[]>("getUpdates", {
      offset,
      timeout: timeoutSeconds,
      allowed_updates: ["message", "callback_query"],
    });
  }
}
