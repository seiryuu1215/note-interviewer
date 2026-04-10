"use client";

import { useState } from "react";

type FlowSummaryProps = {
  messages: { role: "user" | "assistant"; content: string }[];
};

function truncate(text: string, maxLength: number): string {
  const trimmed = text.replace(/\n/g, " ").trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength) + "...";
}

export default function FlowSummary({ messages }: FlowSummaryProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Q&Aペアを構築する（assistant→userの順）
  const pairs: { question: string; answer: string }[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "assistant") {
      const nextMsg = messages[i + 1];
      if (nextMsg?.role === "user") {
        pairs.push({
          question: msg.content,
          answer: nextMsg.content,
        });
      }
    }
  }

  // 完了したQ&Aペアがなければ表示しない
  if (pairs.length === 0) return null;

  return (
    <div className="mx-4">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors py-2"
        aria-expanded={isOpen}
      >
        <span
          className={`inline-block transition-transform duration-200 ${
            isOpen ? "rotate-90" : ""
          }`}
        >
          ▶
        </span>
        これまでの流れ（{pairs.length}問）
      </button>

      {isOpen && (
        <div className="mt-1 space-y-2 pb-2 animate-fade-in">
          {pairs.map((pair, i) => (
            <div
              key={i}
              className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2"
            >
              <p className="font-medium text-gray-700">
                Q{i + 1}. {truncate(pair.question, 30)}
              </p>
              <p className="mt-0.5 text-gray-500">
                → {truncate(pair.answer, 30)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
