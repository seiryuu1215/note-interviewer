"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getArticle, saveArticle, type GeneratedArticle } from "@/lib/storage";

type TitleSuggestion = {
  title: string;
  approach: string;
  reason: string;
};

export default function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [article, setArticle] = useState<GeneratedArticle | null>(null);
  const [copied, setCopied] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<TitleSuggestion[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);

  useEffect(() => {
    const stored = getArticle(id);
    if (!stored) {
      router.push("/");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only localStorage hydration
    setArticle(stored);
  }, [id, router]);

  const handleCopy = async () => {
    if (!article) return;
    const markdown = `# ${article.title}\n\n${article.content}`;
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = markdown;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOptimizeTitles = async () => {
    if (!article || optimizing) return;
    setOptimizing(true);
    setOptimizeError(null);
    setTitleSuggestions([]);

    try {
      const res = await fetch("/api/optimize-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: article.content,
          originalTitle: article.title,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.error || "タイトル最適化に失敗しました");
      }

      const result = await res.json();
      if (result.titles && Array.isArray(result.titles)) {
        setTitleSuggestions(result.titles);
      } else {
        throw new Error("タイトル候補を取得できませんでした");
      }
    } catch (e) {
      setOptimizeError(
        e instanceof Error ? e.message : "タイトル最適化に失敗しました"
      );
    } finally {
      setOptimizing(false);
    }
  };

  const handleSelectTitle = (newTitle: string) => {
    if (!article) return;
    const updated: GeneratedArticle = { ...article, title: newTitle };
    setArticle(updated);
    saveArticle(updated);
    setTitleSuggestions([]);
  };

  if (!article) return null;

  // 画像プレースホルダーを実際のbase64画像に置換（data:image/のみ許可）
  const safeImages = (article.images ?? []).filter((img) =>
    img.startsWith("data:image/")
  );
  const articleContent =
    safeImages.length > 0
      ? article.content.replace(
          /!\[写真(\d+)\]\(image-\d+\)/g,
          (_match: string, num: string) => {
            const index = parseInt(num, 10) - 1;
            if (index >= 0 && index < safeImages.length) {
              return `![写真${num}](${safeImages[index]})`;
            }
            return _match;
          }
        )
      : article.content;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8 pb-[env(safe-area-inset-bottom)]">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-2">
          <button
            onClick={() => router.push("/")}
            className="text-gray-500 hover:text-gray-700 text-sm min-h-[44px] flex items-center"
          >
            &larr; ホームに戻る
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors min-h-[44px]"
            >
              {copied ? "コピーしました！" : "Markdownをコピー"}
            </button>
            <button
              onClick={() => router.push("/")}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors min-h-[44px]"
            >
              新しい記事
            </button>
          </div>
        </div>

        {/* 記事本文 */}
        <article>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {article.title}
          </h1>

          {/* タイトル最適化ボタン */}
          <div className="mb-8">
            <button
              onClick={handleOptimizeTitles}
              disabled={optimizing}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {optimizing ? (
                <>
                  <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  タイトルを最適化中...
                </>
              ) : (
                "タイトルを最適化"
              )}
            </button>

            {/* エラー表示 */}
            {optimizeError && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {optimizeError}
              </p>
            )}

            {/* タイトル候補一覧 */}
            {titleSuggestions.length > 0 && (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-medium text-gray-700">
                  タイトル候補（クリックで変更）:
                </p>
                {titleSuggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectTitle(suggestion.title)}
                    className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    <p className="font-medium text-gray-900 mb-1">
                      {suggestion.title}
                    </p>
                    <p className="text-xs text-blue-600 mb-1">
                      {suggestion.approach}
                    </p>
                    <p className="text-xs text-gray-500">
                      {suggestion.reason}
                    </p>
                  </button>
                ))}
                <button
                  onClick={() => setTitleSuggestions([])}
                  className="text-xs text-gray-500 hover:text-gray-700 min-h-[44px]"
                >
                  候補を閉じる
                </button>
              </div>
            )}
          </div>

          <div className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-gray-900 prose-li:text-gray-700">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {articleContent}
            </ReactMarkdown>
          </div>
        </article>

        {/* フッター */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            Note Interviewer で生成された記事
          </p>
          <button
            onClick={handleCopy}
            className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium min-h-[44px]"
          >
            {copied ? "コピーしました！" : "Markdownをコピーしてnoteに貼り付け"}
          </button>
        </div>
      </div>
    </div>
  );
}
