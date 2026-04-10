"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

type VoiceInputProps = {
  onSend: (text: string) => void;
  disabled: boolean;
};

export default function VoiceInput({ onSend, disabled }: VoiceInputProps) {
  const [textValue, setTextValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error: speechError,
  } = useSpeechRecognition();

  // 音声認識非対応ならテキスト入力をデフォルト表示
  const [showTextInput, setShowTextInput] = useState(!isSupported);

  // テキスト入力モードに切り替えたらフォーカス
  useEffect(() => {
    if (showTextInput) {
      textareaRef.current?.focus();
    }
  }, [showTextInput]);

  const handleMicToggle = useCallback(() => {
    if (disabled) return;
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  }, [disabled, isListening, stopListening, resetTranscript, startListening]);

  const handleSendVoice = useCallback(() => {
    const text = transcript.trim();
    if (!text) return;
    stopListening();
    onSend(text);
    resetTranscript();
  }, [transcript, stopListening, onSend, resetTranscript]);

  const handleSendText = useCallback(() => {
    const text = textValue.trim();
    if (!text) return;
    onSend(text);
    setTextValue("");
    // テキストエリアの高さをリセット
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [textValue, onSend]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  return (
    <div className="px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {/* 音声認識エラー */}
      {speechError && (
        <p className="text-xs text-[var(--error)] text-center mb-2" role="alert">
          {speechError}
        </p>
      )}

      {/* 音声認識のトランスクリプト表示 */}
      {!showTextInput && transcript && (
        <div className="mb-3 p-3 bg-[var(--card-bg)] rounded-xl text-sm text-[var(--foreground)] min-h-[44px] border border-[var(--card-border)]">
          {transcript}
        </div>
      )}

      {/* 音声で送信ボタン（トランスクリプトがある場合） */}
      {!showTextInput && transcript.trim() && !isListening && (
        <div className="flex justify-center mb-3">
          <button
            onClick={handleSendVoice}
            disabled={disabled}
            className="px-6 py-2 bg-[var(--accent)] text-white rounded-full text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40 min-h-[44px]"
          >
            この内容で送信
          </button>
        </div>
      )}

      {/* テキスト入力モード */}
      {showTextInput ? (
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={textValue}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="回答を入力...（Shift+Enterで改行）"
            rows={1}
            className="flex-1 px-4 py-2.5 border border-[var(--input-border)] rounded-xl resize-none bg-[var(--input-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent placeholder:text-[var(--muted)]"
            style={{ maxHeight: "120px" }}
            disabled={disabled}
            aria-label="回答を入力"
          />
          <button
            onClick={handleSendText}
            disabled={!textValue.trim() || disabled}
            className="px-4 py-2.5 bg-[var(--accent)] text-white rounded-xl hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 min-h-[44px]"
            aria-label="送信"
          >
            送信
          </button>
        </div>
      ) : (
        /* マイクボタン（主動線） */
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleMicToggle}
            disabled={disabled}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
              isListening
                ? "bg-[var(--error)] text-white"
                : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            aria-label={isListening ? "録音を停止" : "タップして話す"}
          >
            {/* 録音中のパルスアニメーション */}
            {isListening && (
              <>
                <span className="absolute inset-0 rounded-full bg-[var(--error)] animate-mic-pulse opacity-50" />
                <span
                  className="absolute inset-0 rounded-full bg-[var(--error)] animate-mic-pulse opacity-30"
                  style={{ animationDelay: "0.5s" }}
                />
              </>
            )}
            {/* マイクアイコン */}
            <svg
              className="w-8 h-8 relative z-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 10v2a7 7 0 0 1-14 0v-2"
              />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
          <p className="text-xs text-[var(--muted)]">
            {isListening ? "聞いています..." : "タップして話す"}
          </p>
        </div>
      )}

      {/* モード切替リンク */}
      <div className="text-center mt-3">
        <button
          onClick={() => {
            if (!showTextInput && isListening) {
              stopListening();
            }
            setShowTextInput((prev) => !prev);
          }}
          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] underline transition-colors"
        >
          {showTextInput
            ? isSupported
              ? "音声で入力する"
              : "音声入力はお使いのブラウザに対応していません"
            : "テキストで入力する"}
        </button>
      </div>
    </div>
  );
}
