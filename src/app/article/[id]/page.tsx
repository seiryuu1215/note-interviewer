"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { getArticle, type GeneratedArticle } from "@/lib/storage";

export default function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [article, setArticle] = useState<GeneratedArticle | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = getArticle(id);
    if (!stored) {
      router.push("/");
      return;
    }
    setArticle(stored);
  }, [id, router]);

  const handleCopy = async () => {
    if (!article) return;
    const markdown = `# ${article.title}\n\n${article.content}`;
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!article) return null;

  const renderContent = (content: string) => {
    return content.split("\n").map((line, i) => {
      if (line.startsWith("### ")) {
        return (
          <h3 key={i} className="text-lg font-bold mt-6 mb-2 text-gray-900">
            {line.slice(4)}
          </h3>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h2 key={i} className="text-xl font-bold mt-8 mb-3 text-gray-900">
            {line.slice(3)}
          </h2>
        );
      }
      if (line.startsWith("# ")) {
        return null;
      }
      if (line.trim() === "") {
        return <br key={i} />;
      }
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} className="text-gray-700 leading-relaxed mb-1">
          {parts.map((part, j) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <strong key={j} className="font-bold text-gray-900">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push("/")}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            &larr; ホームに戻る
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              {copied ? "コピーしました！" : "Markdownをコピー"}
            </button>
            <button
              onClick={() => router.push("/")}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
            >
              新しい記事
            </button>
          </div>
        </div>

        {/* 記事本文 */}
        <article>
          <h1 className="text-2xl font-bold text-gray-900 mb-8">
            {article.title}
          </h1>
          <div>{renderContent(article.content)}</div>
        </article>

        {/* フッター */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-400">
            Note Interviewer で生成された記事
          </p>
          <button
            onClick={handleCopy}
            className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {copied ? "コピーしました！" : "Markdownをコピーしてnoteに貼り付け"}
          </button>
        </div>
      </div>
    </div>
  );
}
