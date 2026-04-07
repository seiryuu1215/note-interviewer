import { memo } from "react";

type ChatBubbleProps = {
  role: "user" | "assistant";
  content: string;
};

function ChatBubble({ role, content }: ChatBubbleProps) {
  const isUser = role === "user";
  const label = isUser ? "あなた" : "インタビュアー";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
      aria-label={`${label}: ${content}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-blue-600 text-white rounded-br-md"
            : "bg-gray-100 text-gray-900 rounded-bl-md"
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

export default memo(ChatBubble);
