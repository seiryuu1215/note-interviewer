import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

// SpeechRecognitionのモック
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = "";
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;

  start = vi.fn();
  stop = vi.fn(() => {
    this.onend?.();
  });
  abort = vi.fn();
}

beforeEach(() => {
  vi.clearAllMocks();
  // デフォルトではサポートなし
  Object.defineProperty(globalThis, "SpeechRecognition", {
    value: undefined,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, "webkitSpeechRecognition", {
    value: undefined,
    writable: true,
    configurable: true,
  });
});

describe("useSpeechRecognition", () => {
  it("SpeechRecognitionが未対応の場合にisSupportedがfalseであること", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isSupported).toBe(false);
  });

  it("SpeechRecognitionが対応の場合にisSupportedがtrueであること", () => {
    Object.defineProperty(globalThis, "SpeechRecognition", {
      value: MockSpeechRecognition,
      writable: true,
      configurable: true,
    });
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isSupported).toBe(true);
  });

  it("未対応環境でstartListeningを呼ぶとエラーが設定されること", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => {
      result.current.startListening();
    });
    expect(result.current.error).toContain("対応していません");
  });

  it("対応環境でstartListeningを呼ぶとisListeningがtrueになること", () => {
    Object.defineProperty(globalThis, "SpeechRecognition", {
      value: MockSpeechRecognition,
      writable: true,
      configurable: true,
    });
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => {
      result.current.startListening();
    });
    expect(result.current.isListening).toBe(true);
  });

  it("stopListeningを呼ぶとisListeningがfalseになること", () => {
    Object.defineProperty(globalThis, "SpeechRecognition", {
      value: MockSpeechRecognition,
      writable: true,
      configurable: true,
    });
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => {
      result.current.startListening();
    });
    act(() => {
      result.current.stopListening();
    });
    expect(result.current.isListening).toBe(false);
  });

  it("resetTranscriptでテキストとエラーがクリアされること", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => {
      result.current.startListening(); // エラーを発生させる
    });
    act(() => {
      result.current.resetTranscript();
    });
    expect(result.current.transcript).toBe("");
    expect(result.current.error).toBeNull();
  });
});
