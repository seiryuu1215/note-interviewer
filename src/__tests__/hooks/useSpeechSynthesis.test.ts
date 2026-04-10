import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";

// SpeechSynthesisUtteranceのモック
class MockSpeechSynthesisUtterance {
  text: string;
  lang = "";
  rate = 1;
  voice: unknown = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
  value: MockSpeechSynthesisUtterance,
  writable: true,
  configurable: true,
});

// SpeechSynthesisのモック
const mockSpeak = vi.fn();
const mockCancel = vi.fn();
const mockGetVoices = vi.fn(() => []);
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(globalThis, "speechSynthesis", {
    value: {
      speak: mockSpeak,
      cancel: mockCancel,
      getVoices: mockGetVoices,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    },
    writable: true,
    configurable: true,
  });
});

describe("useSpeechSynthesis", () => {
  it("speechSynthesisが対応環境でisSupportedがtrueであること", () => {
    const { result } = renderHook(() => useSpeechSynthesis());
    expect(result.current.isSupported).toBe(true);
  });

  it("speakを呼ぶとisSpeakingがtrueになること", () => {
    const { result } = renderHook(() => useSpeechSynthesis());
    act(() => {
      result.current.speak("テスト");
    });
    expect(result.current.isSpeaking).toBe(true);
    expect(mockCancel).toHaveBeenCalled();
    expect(mockSpeak).toHaveBeenCalled();
  });

  it("stopを呼ぶとisSpeakingがfalseになりcancelが呼ばれること", () => {
    const { result } = renderHook(() => useSpeechSynthesis());
    act(() => {
      result.current.speak("テスト");
    });
    act(() => {
      result.current.stop();
    });
    expect(result.current.isSpeaking).toBe(false);
    expect(mockCancel).toHaveBeenCalled();
  });

  it("voiceschangedイベントリスナーが登録されること", () => {
    renderHook(() => useSpeechSynthesis());
    expect(mockAddEventListener).toHaveBeenCalledWith(
      "voiceschanged",
      expect.any(Function)
    );
  });

  it("日本語音声が見つかった場合にキャッシュされること", () => {
    mockGetVoices.mockReturnValue([
      { lang: "en-US", name: "English" },
      { lang: "ja-JP", name: "Japanese" },
    ]);
    const { result } = renderHook(() => useSpeechSynthesis());
    act(() => {
      result.current.speak("テスト");
    });
    expect(mockSpeak).toHaveBeenCalled();
  });

  it("アンマウント時にcancelが呼ばれること", () => {
    const { unmount } = renderHook(() => useSpeechSynthesis());
    unmount();
    expect(mockCancel).toHaveBeenCalled();
  });
});
