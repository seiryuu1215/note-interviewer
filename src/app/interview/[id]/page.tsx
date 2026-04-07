"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ChatBubble from "@/components/ChatBubble";
import {
  getSession,
  saveSession,
  saveArticle,
  getProfile,
  updateProfileFacts,
  incrementUsage,
  canGenerateArticle,
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
  const [error, setError] = useState<string | null>(null);
  const [shouldEnd, setShouldEnd] = useState(false);
  const [generating, setGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const buildApiMessages = useCallback(
    (title: string, messages: Message[]): Message[] => {
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
    },
    []
  );

  const fetchFirstQuestion = useCallback(
    async (title: string, currentSession: InterviewSession) => {
      setLoading(true);
      setError(null);
      try {
        const apiMessages = buildApiMessages(title, []);
        const controller = new AbortController();
        abortRef.current = controller;
        const res = await fetch("/api/interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, messages: apiMessages }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || err.error || "API エラー");
        }
        const result = await res.json();
        const updated: InterviewSession = {
          ...currentSession,
          messages: [{ role: "assistant", content: result.message }],
        };
        setSession(updated);
        saveSession(updated);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(
          e instanceof Error ? e.message : "質問の取得に失敗しました"
        );
      } finally {
        setLoading(false);
        abortRef.current = null;
        inputRef.current?.focus();
      }
    },
    [buildApiMessages]
  );

  useEffect(() => {
    const existing = getSession(id);

    // 完了済みセッション → 記事ページへリダイレクト
    if (existing?.status === "completed") {
      router.push(`/article/${id}`);
      return;
    }

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

    return () => {
      abortRef.current?.abort();
    };
  }, [id, searchParams, router, fetchFirstQuestion]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages.length]);

  const handleSend = async () => {
    if (!input.trim() || !session || loading) return;

    setError(null);
    const userMessage: Message = { role: "user", content: input.trim() };
    const updatedMessages = [...session.messages, userMessage];
    const updated: InterviewSession = {
      ...session,
      messages: updatedMessages,
    };
    setSession(updated);
    saveSession(updated);
    setInput("");

    // テキストエリアの高さをリセット
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    setLoading(true);

    try {
      const apiMessages = buildApiMessages(session.title, updatedMessages);
      const controller = new AbortController();
      abortRef.current = controller;
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: session.title, messages: apiMessages }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.error || "API エラー");
      }
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
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(
        e instanceof Error ? e.message : "回答の送信に失敗しました"
      );
    } finally {
      setLoading(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  };

  const handleGenerate = async () => {
    if (!session) return;

    if (!canGenerateArticle()) {
      setError("今月の無料枠（3記事）を使い切りました。");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const [articleRes, factsRes] = await Promise.all([
        fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: session.title,
            messages: session.messages,
          }),
          signal: controller.signal,
        }),
        fetch("/api/extract-facts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: session.messages }),
          signal: controller.signal,
        }),
      ]);

      if (!articleRes.ok) {
        const err = await articleRes.json();
        throw new Error(err.detail || err.error || "記事生成に失敗しました");
      }

      const article = await articleRes.json();

      if (!article.title || !article.content) {
        throw new Error("記事データが不完全です。もう一度お試しください。");
      }

      // 事実抽出（失敗しても記事生成は続行）
      try {
        const facts = await factsRes.json();
        if (facts.facts?.length > 0) {
          updateProfileFacts(facts.facts);
        }
      } catch {
        // 事実抽出の失敗は無視
      }

      // セッション完了
      const completedSession: InterviewSession = {
        ...session,
        status: "completed",
      };
      saveSession(completedSession);

      // 記事を保存（重複防止済み）
      saveArticle({
        id,
        sessionId: session.id,
        title: article.title,
        content: article.content,
        createdAt: new Date().toISOString(),
      });

      // 使用量カウント（成功後）
      incrementUsage("article");
      incrementUsage("interview");

      router.push(`/article/${id}`);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "記事生成に失敗しました");
      setGenerating(false);
    } finally {
      abortRef.current = null;
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  if (!session) return null;

  return (
    <div className="flex flex-col h-dvh max-w-2xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <button
          onClick={() => {
            abortRef.current?.abort();
            router.push("/");
          }}
          className="text-gray-500 hover:text-gray-700 text-sm min-h-[44px] min-w-[44px] flex items-center"
        >
          &larr; 戻る
        </button>
        <h2
          className="text-sm font-medium text-gray-700 truncate max-w-[60%]"
          title={session.title}
        >
          {session.title}
        </h2>
        {!shouldEnd ? (
          <button
            onClick={() => setShouldEnd(true)}
            className="text-xs text-gray-500 hover:text-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-end"
          >
            終了する
          </button>
        ) : (
          <div className="w-11" />
        )}
      </div>

      {/* メッセージ一覧 */}
      <div
        className="flex-1 overflow-y-auto px-4 py-6"
        role="log"
        aria-label="インタビュー"
      >
        {session.messages.map((msg, i) => (
          <ChatBubble key={`${id}-${i}`} role={msg.role} content={msg.content} />
        ))}
        {loading && (
          <div
            className="flex justify-start mb-4"
            role="status"
            aria-label="回答を生成中"
          >
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

      {/* エラー表示 */}
      {error && (
        <div
          className="px-4 py-2 bg-red-50 border-t border-red-200"
          role="alert"
        >
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 記事生成ボタン */}
      {shouldEnd && !generating && (
        <div className="px-4 py-3 bg-green-50 border-t border-green-200 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between">
            <p className="text-sm text-green-700">
              インタビュー完了！記事を生成しますか？
            </p>
            <button
              onClick={handleGenerate}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors min-h-[44px]"
            >
              記事を生成
            </button>
          </div>
        </div>
      )}

      {/* 生成中のローディング */}
      {generating && (
        <div
          className="px-4 py-4 bg-green-50 border-t border-green-200 pb-[env(safe-area-inset-bottom)]"
          role="status"
          aria-label="記事を生成中"
        >
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-green-700">
              記事を生成しています...（30秒ほどかかります）
            </p>
          </div>
        </div>
      )}

      {/* 入力エリア */}
      {!shouldEnd && (
        <div className="px-4 py-3 border-t border-gray-200 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="回答を入力...（Shift+Enterで改行）"
              rows={1}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
              style={{ maxHeight: "120px" }}
              disabled={loading}
              aria-label="回答を入力"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 min-h-[44px]"
              aria-label="送信"
            >
              送信
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
