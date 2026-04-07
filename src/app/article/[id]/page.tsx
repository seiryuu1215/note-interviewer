"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

  if (!article) return null;

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
          <h1 className="text-2xl font-bold text-gray-900 mb-8">
            {article.title}
          </h1>
          <div className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-gray-900 prose-li:text-gray-700">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {article.content}
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
