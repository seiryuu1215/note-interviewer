"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import ChatBubble from "@/components/ChatBubble";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type InterviewData = {
  title: string;
  messages: Message[];
};

export default function InterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<InterviewData | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [shouldEnd, setShouldEnd] = useState(false);
  const [generating, setGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // セッションからデータを読み込み、初回質問を取得
  useEffect(() => {
    const stored = sessionStorage.getItem(`interview-${id}`);
    if (!stored) {
      router.push("/");
      return;
    }
    const parsed: InterviewData = JSON.parse(stored);
    setData(parsed);

    // 初回質問を取得
    if (parsed.messages.length === 0) {
      fetchFirstQuestion(parsed.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  const fetchFirstQuestion = async (title: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          messages: [
            {
              role: "user",
              content: `「${title}」というタイトルで記事を書きたいです。インタビューをお願いします。`,
            },
          ],
        }),
      });
      const result = await res.json();
      const newMessages: Message[] = [
        { role: "assistant", content: result.message },
      ];
      const updated = { title, messages: newMessages };
      setData(updated);
      sessionStorage.setItem(`interview-${id}`, JSON.stringify(updated));
    } catch {
      // エラー時はリトライできるようにする
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !data || loading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const updatedMessages = [...data.messages, userMessage];
    const updated = { ...data, messages: updatedMessages };
    setData(updated);
    setInput("");
    setLoading(true);

    try {
      // APIに送るメッセージを構築（初回コンテキスト含む）
      const apiMessages = [
        {
          role: "user" as const,
          content: `「${data.title}」というタイトルで記事を書きたいです。インタビューをお願いします。`,
        },
        ...updatedMessages,
      ];

      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: data.title, messages: apiMessages }),
      });
      const result = await res.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: result.message,
      };
      const finalMessages = [...updatedMessages, assistantMessage];
      const finalData = { ...data, messages: finalMessages };
      setData(finalData);
      sessionStorage.setItem(`interview-${id}`, JSON.stringify(finalData));

      if (result.shouldEnd) {
        setShouldEnd(true);
      }
    } catch {
      // エラーハンドリング
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleGenerate = async () => {
    if (!data) return;
    setGenerating(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          messages: data.messages,
        }),
      });
      const result = await res.json();

      sessionStorage.setItem(
        `article-${id}`,
        JSON.stringify({
          title: result.title,
          content: result.content,
        })
      );
      router.push(`/article/${id}`);
    } catch {
      setGenerating(false);
    }
  };

  const handleEndEarly = () => {
    setShouldEnd(true);
  };

  if (!data) return null;

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <button
          onClick={() => router.push("/")}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          &larr; 戻る
        </button>
        <h2 className="text-sm font-medium text-gray-700 truncate max-w-[60%]">
          {data.title}
        </h2>
        <button
          onClick={handleEndEarly}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          終了する
        </button>
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {data.messages.map((msg, i) => (
          <ChatBubble key={i} role={msg.role} content={msg.content} />
        ))}
        {loading && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 記事生成ボタン（終了判定後） */}
      {shouldEnd && (
        <div className="px-4 py-3 bg-green-50 border-t border-green-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-green-700">
              インタビュー完了！記事を生成しますか？
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {generating ? "生成中..." : "記事を生成"}
            </button>
          </div>
        </div>
      )}

      {/* 入力エリア */}
      {!shouldEnd && (
        <div className="px-4 py-3 border-t border-gray-200">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="回答を入力..."
              rows={1}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              送信
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
