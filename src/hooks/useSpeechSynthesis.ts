"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** 音声読み上げフックの戻り値 */
interface UseSpeechSynthesisReturn {
  /** テキストを読み上げる */
  speak: (text: string) => void;
  /** 読み上げを停止する */
  stop: () => void;
  /** 読み上げ中かどうか */
  isSpeaking: boolean;
  /** ブラウザが音声合成に対応しているか */
  isSupported: boolean;
}

/**
 * ブラウザが音声合成に対応しているか判定する
 */
function checkSpeechSynthesisSupport(): boolean {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window;
}

/**
 * Web Speech Synthesis API をラップする音声読み上げカスタムフック
 *
 * - 日本語音声を優先選択する
 * - voiceschangedイベントで音声リストを再取得する
 * - アンマウント時にcancel()でクリーンアップする
 */
export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported] = useState(checkSpeechSynthesisSupport);

  // 日本語音声のキャッシュ
  const japaneseVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  // 音声リスト取得済みフラグ
  const voicesLoadedRef = useRef(false);

  /**
   * 利用可能な音声リストから日本語音声を探してキャッシュする
   */
  const loadJapaneseVoice = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return;

    voicesLoadedRef.current = true;
    const jaVoice = voices.find((voice) => voice.lang.startsWith("ja"));
    japaneseVoiceRef.current = jaVoice ?? null;
  }, []);

  // voiceschangedイベントで音声リストを再取得する
  useEffect(() => {
    if (!isSupported) return;

    // 初回読み込み（同期的に取得できる場合）
    loadJapaneseVoice();

    // 非同期で読み込まれる場合に備えてイベントリスナーを登録する
    const handleVoicesChanged = () => {
      loadJapaneseVoice();
    };
    window.speechSynthesis.addEventListener(
      "voiceschanged",
      handleVoicesChanged,
    );

    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        handleVoicesChanged,
      );
    };
  }, [isSupported, loadJapaneseVoice]);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) return;

      // 既存の読み上げを停止してから新しい読み上げを開始する
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ja-JP";
      utterance.rate = 1.0;

      // 日本語音声が見つかっていればそれを使う
      if (japaneseVoiceRef.current) {
        utterance.voice = japaneseVoiceRef.current;
      }

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
      };

      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [isSupported],
  );

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  // コンポーネントアンマウント時にクリーンアップする
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
  };
}
