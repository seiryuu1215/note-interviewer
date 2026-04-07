"use client";

import { useState } from "react";

type ArticlePreviewProps = {
  title: string;
  content: string;
  onBack: () => void;
};

export default function ArticlePreview({
  title,
  content,
  onBack,
}: ArticlePreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const markdown = `# ${title}\n\n${content}`;
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          &larr; 戻る
        </button>
        <button
          onClick={handleCopy}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          {copied ? "コピーしました！" : "Markdownをコピー"}
        </button>
      </div>

      <article className="prose prose-gray max-w-none">
        <h1 className="text-2xl font-bold mb-6">{title}</h1>
        <div className="whitespace-pre-wrap leading-relaxed text-gray-800">
          {content}
        </div>
      </article>
    </div>
  );
}
