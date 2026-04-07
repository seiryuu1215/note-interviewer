"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ChatBubble from "@/components/ChatBubble";
import {
  getSession,
  saveSession,
  getProfile,
  updateProfileFacts,
  incrementUsage,
  type InterviewSession,
} from "@/lib/storage";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function InterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [shouldEnd, setShouldEnd] = useState(false);
  const [generating, setGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // 既存セッションを復元 or 新規作成
    const existing = getSession(id);
    if (existing) {
      setSession(existing);
      if (existing.messages.length > 0) return;
    }

    const title = searchParams.get("title");
    if (!title && !existing) {
      router.push("/");
      return;
    }

    const newSession: InterviewSession = existing ?? {
      id,
      title: title!,
      messages: [],
      status: "active",
      createdAt: new Date().toISOString(),
    };

    setSession(newSession);
    saveSession(newSession);
    fetchFirstQuestion(newSession.title, newSession);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages]);

  const buildApiMessages = (
    title: string,
    messages: Message[]
  ): Message[] => {
    const profile = getProfile();
    const contextParts: string[] = [
      `「${title}」というタイトルで記事を書きたいです。インタビューをお願いします。`,
    ];
    if (profile) {
      contextParts.push(`\n【ユーザー情報】名前: ${profile.name}`);
      if (profile.bio) contextParts.push(`自己紹介: ${profile.bio}`);
      if (profile.facts.length > 0)
        contextParts.push(`既知の情報: ${profile.facts.join(", ")}`);
    }
    return [
      { role: "user" as const, content: contextParts.join("\n") },
      ...messages,
    ];
  };

  const fetchFirstQuestion = async (
    title: string,
    currentSession: InterviewSession
  ) => {
    setLoading(true);
    try {
      const apiMessages = buildApiMessages(title, []);
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, messages: apiMessages }),
      });
      const result = await res.json();
      const updated: InterviewSession = {
        ...currentSession,
        messages: [{ role: "assistant", content: result.message }],
      };
      setSession(updated);
      saveSession(updated);
    } catch {
      // retry可能
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !session || loading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const updatedMessages = [...session.messages, userMessage];
    const updated: InterviewSession = {
      ...session,
      messages: updatedMessages,
    };
    setSession(updated);
    saveSession(updated);
    setInput("");
    setLoading(true);

    try {
      const apiMessages = buildApiMessages(session.title, updatedMessages);
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: session.title, messages: apiMessages }),
      });
      const result = await res.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: result.message,
      };
      const finalMessages = [...updatedMessages, assistantMessage];
      const finalSession: InterviewSession = {
        ...session,
        messages: finalMessages,
      };
      setSession(finalSession);
      saveSession(finalSession);

      if (result.shouldEnd) {
        setShouldEnd(true);
      }
    } catch {
      // error
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleGenerate = async () => {
    if (!session) return;

    // 使用量チェック
    const { allowed } = incrementUsage("article");
    if (!allowed) {
      alert("今月の無料枠（3記事）を使い切りました。");
      return;
    }

    setGenerating(true);

    try {
      // 記事生成と事実抽出を並行実行
      const [articleRes, factsRes] = await Promise.all([
        fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: session.title,
            messages: session.messages,
          }),
        }),
        fetch("/api/extract-facts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: session.messages }),
        }),
      ]);

      const article = await articleRes.json();
      const facts = await factsRes.json();

      // プロフィールに事実を蓄積
      if (facts.facts?.length > 0) {
        updateProfileFacts(facts.facts);
      }

      // セッション完了
      const completedSession: InterviewSession = {
        ...session,
        status: "completed",
      };
      saveSession(completedSession);

      // 記事を保存
      const { saveArticle } = await import("@/lib/storage");
      saveArticle({
        id,
        sessionId: session.id,
        title: article.title,
        content: article.content,
        createdAt: new Date().toISOString(),
      });

      incrementUsage("interview");
      router.push(`/article/${id}`);
    } catch {
      setGenerating(false);
    }
  };

  if (!session) return null;

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
          {session.title}
        </h2>
        <button
          onClick={() => setShouldEnd(true)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          終了する
        </button>
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {session.messages.map((msg, i) => (
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

      {/* 記事生成ボタン */}
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
