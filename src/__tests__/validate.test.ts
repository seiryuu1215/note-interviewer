import { describe, it, expect } from "vitest";
import {
  validateMessages,
  validateTitle,
  validateImages,
  safeErrorDetail,
} from "@/lib/validate";

describe("validateMessages", () => {
  it("正常なメッセージ配列を受け入れること", () => {
    const messages = [
      { role: "user", content: "こんにちは" },
      { role: "assistant", content: "はじめまして" },
    ];
    const result = validateMessages(messages);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data).toHaveLength(2);
    }
  });

  it("配列でない場合にエラーを返すこと", () => {
    const result = validateMessages("not an array");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("配列");
    }
  });

  it("空配列を受け入れること", () => {
    const result = validateMessages([]);
    expect(result.valid).toBe(true);
  });

  it("不正なroleを拒否すること", () => {
    const messages = [{ role: "system", content: "テスト" }];
    const result = validateMessages(messages);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("role");
    }
  });

  it("contentが空文字の場合にエラーを返すこと", () => {
    const messages = [{ role: "user", content: "" }];
    const result = validateMessages(messages);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("content");
    }
  });

  it("contentが10000文字を超える場合にエラーを返すこと", () => {
    const messages = [{ role: "user", content: "a".repeat(10001) }];
    const result = validateMessages(messages);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("10000");
    }
  });

  it("メッセージが30件を超える場合にエラーを返すこと", () => {
    const messages = Array.from({ length: 31 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `メッセージ${i}`,
    }));
    const result = validateMessages(messages);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("30");
    }
  });

  it("nullのメッセージを拒否すること", () => {
    const messages = [null];
    const result = validateMessages(messages);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("不正なメッセージ形式");
    }
  });
});

describe("validateTitle", () => {
  it("正常なタイトルでnullを返すこと", () => {
    expect(validateTitle("テスト記事")).toBeNull();
  });

  it("空文字の場合にエラーを返すこと", () => {
    expect(validateTitle("")).not.toBeNull();
  });

  it("スペースのみの場合にエラーを返すこと", () => {
    expect(validateTitle("   ")).not.toBeNull();
  });

  it("200文字を超える場合にエラーを返すこと", () => {
    const result = validateTitle("あ".repeat(201));
    expect(result).not.toBeNull();
    expect(result).toContain("200");
  });

  it("200文字ちょうどはnullを返すこと", () => {
    expect(validateTitle("あ".repeat(200))).toBeNull();
  });

  it("文字列でない場合にエラーを返すこと", () => {
    expect(validateTitle(123)).not.toBeNull();
    expect(validateTitle(null)).not.toBeNull();
    expect(validateTitle(undefined)).not.toBeNull();
  });
});

describe("validateImages", () => {
  it("null/undefinedの場合に空配列を返すこと", () => {
    expect(validateImages(null)).toEqual({ valid: true, data: [] });
    expect(validateImages(undefined)).toEqual({ valid: true, data: [] });
  });

  it("正常な画像データを受け入れること", () => {
    const images = ["data:image/png;base64,abc123"];
    const result = validateImages(images);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data).toHaveLength(1);
    }
  });

  it("配列でない場合にエラーを返すこと", () => {
    const result = validateImages("not an array");
    expect(result.valid).toBe(false);
  });

  it("5枚を超える場合にエラーを返すこと", () => {
    const images = Array.from(
      { length: 6 },
      () => "data:image/png;base64,abc"
    );
    const result = validateImages(images);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("5");
    }
  });

  it("data:image/で始まらない場合にエラーを返すこと", () => {
    const images = ["not-a-data-url"];
    const result = validateImages(images);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("data:image/");
    }
  });

  it("2MBを超える画像を拒否すること", () => {
    const largeImage =
      "data:image/" + "a".repeat(2 * 1024 * 1024 + 1);
    const result = validateImages([largeImage]);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("2MB");
    }
  });

  it("文字列でない要素を拒否すること", () => {
    const result = validateImages([123]);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("不正");
    }
  });
});

describe("safeErrorDetail", () => {
  it("通常のエラーメッセージを返すこと", () => {
    const error = new Error("タイムアウトしました");
    expect(safeErrorDetail(error)).toBe("タイムアウトしました");
  });

  it("APIキー関連のエラーを隠蔽すること", () => {
    const error = new Error("Invalid API key provided");
    expect(safeErrorDetail(error)).toBe("内部エラーが発生しました");
  });

  it("パス情報を含むエラーを隠蔽すること", () => {
    const error = new Error("File not found at /etc/secret");
    expect(safeErrorDetail(error)).toBe("内部エラーが発生しました");
  });

  it("Errorでないオブジェクトに対して汎用メッセージを返すこと", () => {
    expect(safeErrorDetail("string error")).toBe("内部エラーが発生しました");
    expect(safeErrorDetail(42)).toBe("内部エラーが発生しました");
    expect(safeErrorDetail(null)).toBe("内部エラーが発生しました");
  });

  it("key を含むエラーメッセージを隠蔽すること", () => {
    const error = new Error("Missing key in config");
    expect(safeErrorDetail(error)).toBe("内部エラーが発生しました");
  });
});
