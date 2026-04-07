"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [title, setTitle] = useState("");
  const router = useRouter();

  const handleStart = () => {
    if (!title.trim()) return;
    const id = crypto.randomUUID();
    sessionStorage.setItem(
      `interview-${id}`,
      JSON.stringify({ title: title.trim(), messages: [] })
    );
    router.push(`/interview/${id}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-lg">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Note Interviewer
          </h1>
          <p className="text-gray-500 text-lg">
            タイトルを決めるだけ。
            <br />
            AIがインタビューして、記事を自動生成します。
          </p>
        </div>

        {/* タイトル入力 */}
        <div className="space-y-4">
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700"
          >
            記事タイトル
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
            placeholder="例: 25歳でフリーランスになって学んだこと"
            className="w-full px-4 py-3 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
            autoFocus
          />
          <button
            onClick={handleStart}
            disabled={!title.trim()}
            className="w-full py-3 bg-blue-600 text-white text-lg font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            インタビューを始める
          </button>
        </div>

        {/* 使い方 */}
        <div className="mt-12 text-center">
          <div className="inline-flex flex-col gap-3 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold">
                1
              </span>
              タイトルを入力
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold">
                2
              </span>
              AIの質問に答える（5〜10問）
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold">
                3
              </span>
              記事が自動生成される
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
