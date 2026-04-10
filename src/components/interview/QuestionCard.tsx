"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";

const VOICE_ENABLED_KEY = "note-interviewer-voice-enabled";

type QuestionCardProps = {
  question: string;
  isLoading: boolean;
};

/**
 * localStorageから音声ON/OFF設定を読み取る
 */
function getStoredVoiceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(VOICE_ENABLED_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * localStorageに音声ON/OFF設定を保存する
 */
function setStoredVoiceEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(VOICE_ENABLED_KEY, String(enabled));
  } catch {
    // localStorage が使えない環境では無視する
  }
}

export default function QuestionCard({ question, isLoading }: QuestionCardProps) {
  const { speak, stop, isSpeaking, isSupported } = useSpeechSynthesis();
  const [voiceEnabled, setVoiceEnabled] = useState(getStoredVoiceEnabled);
  const previousQuestionRef = useRef<string>("");

  // 音声ON/OFF切り替え時にlocalStorageへ保存する
  const toggleVoiceEnabled = useCallback(() => {
    setVoiceEnabled((prev) => {
      const next = !prev;
      setStoredVoiceEnabled(next);
      if (!next) {
        stop();
      }
      return next;
    });
  }, [stop]);

  // 質問が変わった時: 前の読み上げを停止し、ONなら新しい質問を読み上げる
  useEffect(() => {
    if (isLoading || !isSupported) return;
    if (question === previousQuestionRef.current) return;

    previousQuestionRef.current = question;
    stop();

    if (voiceEnabled && question) {
      // stopのcancel()が反映されるまで少し待つ
      const timerId = setTimeout(() => {
        speak(question);
      }, 100);
      return () => clearTimeout(timerId);
    }
  }, [question, isLoading, voiceEnabled, isSupported, speak, stop]);

  // 手動で再生/停止を切り替える
  const handleSpeakerClick = useCallback(() => {
    if (isSpeaking) {
      stop();
    } else if (question && !isLoading) {
      speak(question);
    }
  }, [isSpeaking, question, isLoading, speak, stop]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px] mx-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center px-6 py-8">
          <div className="inline-flex gap-1.5 mb-3">
            <span className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" />
            <span
              className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.15s" }}
            />
            <span
              className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.3s" }}
            />
          </div>
          <p className="text-gray-500 text-sm" role="status">
            考え中...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm animate-fade-in">
      {/* 音声コントロール（対応ブラウザのみ表示） */}
      {isSupported && (
        <div className="flex items-center justify-end gap-2 px-4 pt-3">
          {/* スピーカーボタン: 手動再生/停止 */}
          <button
            type="button"
            onClick={handleSpeakerClick}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-colors"
            aria-label={isSpeaking ? "読み上げを停止" : "質問を読み上げる"}
            title={isSpeaking ? "読み上げを停止" : "質問を読み上げる"}
          >
            {isSpeaking ? (
              <SpeakerOnIcon className="w-4 h-4" />
            ) : (
              <SpeakerOffIcon className="w-4 h-4" />
            )}
          </button>

          {/* 自動読み上げON/OFFトグル */}
          <button
            type="button"
            role="switch"
            aria-checked={voiceEnabled}
            aria-label="自動読み上げ"
            title={voiceEnabled ? "自動読み上げON" : "自動読み上げOFF"}
            onClick={toggleVoiceEnabled}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
              voiceEnabled ? "bg-blue-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                voiceEnabled ? "translate-x-4.5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      )}

      <div className="px-6 py-8 sm:px-8 sm:py-10 text-center">
        <p className="text-xl sm:text-2xl leading-relaxed text-gray-800 font-medium">
          {question}
        </p>
      </div>
    </div>
  );
}

/** スピーカーONアイコン（読み上げ中） */
function SpeakerOnIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.348 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
      <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

/** スピーカーOFFアイコン（停止中） */
function SpeakerOffIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.348 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06Z" />
      <path d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
