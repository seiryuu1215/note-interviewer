"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  SpeechRecognition,
  SpeechRecognitionEvent,
  SpeechRecognitionErrorEvent,
} from "@/types/speech";

/** 音声認識フックの戻り値 */
interface UseSpeechRecognitionReturn {
  /** 音声認識が動作中かどうか */
  isListening: boolean;
  /** 認識されたテキスト（interim結果を含む） */
  transcript: string;
  /** 音声認識を開始する */
  startListening: () => void;
  /** 音声認識を停止する */
  stopListening: () => void;
  /** 認識テキストをクリアする */
  resetTranscript: () => void;
  /** ブラウザが音声認識に対応しているか */
  isSupported: boolean;
  /** エラーメッセージ */
  error: string | null;
}

/**
 * エラーコードを日本語メッセージに変換する
 */
function getErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    "no-speech": "音声が検出されませんでした。もう一度お試しください。",
    aborted: "音声認識が中断されました。",
    "audio-capture": "マイクが見つかりません。マイクの接続を確認してください。",
    network: "ネットワークエラーが発生しました。接続を確認してください。",
    "not-allowed":
      "マイクの使用が許可されていません。ブラウザの設定を確認してください。",
    "service-not-available": "音声認識サービスが利用できません。",
    "bad-grammar": "音声認識の文法エラーが発生しました。",
    "language-not-supported": "指定された言語はサポートされていません。",
  };
  return errorMessages[errorCode] ?? `音声認識エラー: ${errorCode}`;
}

/**
 * ブラウザが音声認識に対応しているか判定する
 */
function checkSpeechRecognitionSupport(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * SpeechRecognitionインスタンスを生成する
 * Safari対応のためwebkitSpeechRecognitionにフォールバックする
 */
function createSpeechRecognition(): SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  const Constructor =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Constructor) return null;
  return new Constructor();
}

/**
 * Web Speech API をラップする音声認識カスタムフック
 *
 * - 日本語の音声をリアルタイムでテキスト変換する
 * - Safari対応（webkitSpeechRecognitionフォールバック）
 * - クリーンアップ時にabort()を呼び出す
 */
export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState(checkSpeechRecognitionSupport);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // 確定済みテキストを保持し、interim結果との重複を防ぐ
  const finalTranscriptRef = useRef("");

  /** 音声認識インスタンスを初期化してイベントハンドラを設定する */
  const initRecognition = useCallback((): SpeechRecognition | null => {
    const recognition = createSpeechRecognition();
    if (!recognition) return null;

    // 1発話ごとに停止する（ユーザーが明示的に再開する想定）
    recognition.continuous = false;
    // 途中結果もリアルタイムで反映する
    recognition.interimResults = true;
    recognition.lang = "ja-JP";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      if (finalText) {
        // 確定テキストをrefに蓄積する
        finalTranscriptRef.current += finalText;
      }

      // 確定済み + 現在のinterim結果を表示する（interimは毎回上書き）
      setTranscript(finalTranscriptRef.current + interimText);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // abortedは意図的な停止なのでエラー扱いしない
      if (event.error === "aborted") return;
      setError(getErrorMessage(event.error));
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    return recognition;
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError("お使いのブラウザは音声認識に対応していません。");
      return;
    }

    setError(null);

    // 既存のインスタンスがあれば停止する
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = initRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    setIsListening(true);

    try {
      recognition.start();
    } catch {
      // 既に開始済みの場合などのエラーをハンドルする
      setError("音声認識の開始に失敗しました。もう一度お試しください。");
      setIsListening(false);
    }
  }, [isSupported, initRecognition]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    finalTranscriptRef.current = "";
    setError(null);
  }, []);

  // コンポーネントアンマウント時にクリーンアップする
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error,
  };
}
