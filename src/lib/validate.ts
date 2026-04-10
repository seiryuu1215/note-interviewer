// APIリクエストのバリデーションユーティリティ

import type { Message } from "./anthropic";

const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 10000;
const MAX_MESSAGES = 30;
const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB (base64文字列として)
const VALID_ROLES = new Set(["user", "assistant"]);

export function validateMessages(
  messages: unknown
): { valid: true; data: Message[] } | { valid: false; error: string } {
  if (!Array.isArray(messages)) {
    return { valid: false, error: "messagesは配列である必要があります" };
  }
  if (messages.length > MAX_MESSAGES) {
    return {
      valid: false,
      error: `messagesは最大${MAX_MESSAGES}件までです`,
    };
  }
  for (const m of messages) {
    if (!m || typeof m !== "object") {
      return { valid: false, error: "不正なメッセージ形式です" };
    }
    if (!VALID_ROLES.has(m.role)) {
      return {
        valid: false,
        error: "roleはuserまたはassistantのみ有効です",
      };
    }
    if (typeof m.content !== "string" || !m.content) {
      return { valid: false, error: "contentは必須の文字列です" };
    }
    if (m.content.length > MAX_CONTENT_LENGTH) {
      return {
        valid: false,
        error: `contentは最大${MAX_CONTENT_LENGTH}文字までです`,
      };
    }
  }
  return { valid: true, data: messages as Message[] };
}

export function validateTitle(title: unknown): string | null {
  if (typeof title !== "string" || !title.trim()) {
    return "titleは必須の文字列です";
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return `titleは最大${MAX_TITLE_LENGTH}文字までです`;
  }
  return null;
}

export function validateImages(
  images: unknown
): { valid: true; data: string[] } | { valid: false; error: string } {
  if (images === undefined || images === null) {
    return { valid: true, data: [] };
  }
  if (!Array.isArray(images)) {
    return { valid: false, error: "imagesは配列である必要があります" };
  }
  if (images.length > MAX_IMAGES) {
    return { valid: false, error: `画像は最大${MAX_IMAGES}枚までです` };
  }
  for (const img of images) {
    if (typeof img !== "string") {
      return { valid: false, error: "画像データが不正です" };
    }
    if (!img.startsWith("data:image/")) {
      return {
        valid: false,
        error: "画像はdata:image/形式である必要があります",
      };
    }
    if (img.length > MAX_IMAGE_SIZE) {
      return { valid: false, error: "画像サイズが大きすぎます（最大2MB）" };
    }
  }
  return { valid: true, data: images };
}

export function validateContent(content: unknown): string | null {
  if (typeof content !== "string" || !content.trim()) {
    return "contentは必須の文字列です";
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return `contentは最大${MAX_CONTENT_LENGTH}文字までです`;
  }
  return null;
}

/** エラーレスポンスから内部情報を除外する */
export function safeErrorDetail(error: unknown): string {
  if (error instanceof Error) {
    // APIキーやパスが含まれる可能性のある情報を除外
    const msg = error.message;
    if (msg.includes("API") || msg.includes("key") || msg.includes("/")) {
      return "内部エラーが発生しました";
    }
    return msg;
  }
  return "内部エラーが発生しました";
}
