"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getProfile,
  saveProfile,
  getSessions,
  getArticles,
  getUsage,
  FREE_LIMIT,
  type UserProfile,
  type InterviewSession,
  type GeneratedArticle,
  type UsageData,
} from "@/lib/storage";

export default function Home() {
  const [title, setTitle] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [articles, setArticles] = useState<GeneratedArticle[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const router = useRouter();

  // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only localStorage hydration
  useEffect(() => {
    setProfile(getProfile());
    setSessions(getSessions());
    setArticles(getArticles());
    setUsage(getUsage());
  }, []);

  // モーダルのEscキー対応
  useEffect(() => {
    if (!showProfile) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowProfile(false);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [showProfile]);

  const startInterview = () => {
    const id = crypto.randomUUID();
    router.push(`/interview/${id}?title=${encodeURIComponent(title.trim())}`);
  };

  const handleStart = () => {
    if (!title.trim()) return;

    if (!profile) {
      setShowProfile(true);
      return;
    }

    startInterview();
  };

  const handleSaveProfile = () => {
    const newProfile: UserProfile = {
      name: profileName.trim() || "名無し",
      bio: profileBio.trim(),
      facts: profile?.facts ?? [],
      createdAt: profile?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveProfile(newProfile);
    setProfile(newProfile);
    setShowProfile(false);
    if (title.trim()) startInterview();
  };

  const handleSkipProfile = () => {
    const defaultProfile: UserProfile = {
      name: "名無し",
      bio: "",
      facts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveProfile(defaultProfile);
    setProfile(defaultProfile);
    setShowProfile(false);
    startInterview();
  };

  const activeSessions = sessions.filter((s) => s.status === "active");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 pb-[env(safe-area-inset-bottom)]">
      <div className="w-full max-w-lg">
        {/* ヘッダー */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Note Interviewer
          </h1>
          <p className="text-gray-500 text-lg">
            タイトルを決めるだけ。
            <br />
            AIがインタビューして、記事を自動生成します。
          </p>
        </div>

        {/* プロフィール表示 */}
        {profile && (
          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{profile.name}</p>
                {profile.bio && (
                  <p className="text-sm text-gray-500 mt-1">{profile.bio}</p>
                )}
                {profile.facts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {profile.facts.slice(0, 5).map((fact, i) => (
                      <span
                        key={i}
                        className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full"
                      >
                        {fact}
                      </span>
                    ))}
                    {profile.facts.length > 5 && (
                      <span className="text-xs text-gray-500">
                        +{profile.facts.length - 5}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setProfileName(profile.name);
                  setProfileBio(profile.bio);
                  setShowProfile(true);
                }}
                className="text-sm text-gray-500 hover:text-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                編集
              </button>
            </div>
          </div>
        )}

        {/* 使用量 */}
        {usage && (
          <div className="mb-6 text-center text-sm text-gray-500">
            今月の記事生成: {usage.monthlyArticles} / {FREE_LIMIT}（無料枠）
          </div>
        )}

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
            className="w-full py-3 bg-blue-600 text-white text-lg font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]"
          >
            インタビューを始める
          </button>
        </div>

        {/* 過去の記事 */}
        {articles.length > 0 && (
          <div className="mt-10">
            <h2 className="text-sm font-medium text-gray-700 mb-3">
              生成した記事
            </h2>
            <div className="space-y-2">
              {articles.map((article) => (
                <button
                  key={article.id}
                  onClick={() => router.push(`/article/${article.id}`)}
                  className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors min-h-[48px]"
                  title={article.title}
                >
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {article.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(article.createdAt).toLocaleDateString("ja-JP")}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 進行中のインタビュー */}
        {activeSessions.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-medium text-gray-700 mb-3">
              進行中のインタビュー
            </h2>
            <div className="space-y-2">
              {activeSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => router.push(`/interview/${session.id}`)}
                  className="w-full text-left p-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:border-yellow-300 transition-colors min-h-[48px]"
                  title={session.title}
                >
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {session.title}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {session.messages.filter((m) => m.role === "user").length}
                    問回答済み
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 使い方 */}
        <div className="mt-10 text-center">
          <div className="inline-flex flex-col gap-3 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold">
                1
              </span>
              タイトルを入力
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold">
                2
              </span>
              AIの質問に答える（5〜10問）
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold">
                3
              </span>
              記事が自動生成される
            </div>
          </div>
        </div>
      </div>

      {/* プロフィール設定モーダル */}
      {showProfile && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowProfile(false);
          }}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2
              id="profile-modal-title"
              className="text-lg font-bold text-gray-900 mb-4"
            >
              プロフィール設定
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              あなたの情報を保存して、より良いインタビューを実現します。
            </p>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="profile-name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  名前・ニックネーム
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="例: せいりゅう"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label
                  htmlFor="profile-bio"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  自己紹介（任意）
                </label>
                <textarea
                  id="profile-bio"
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  placeholder="例: フリーランスエンジニア / ダーツプロ"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSkipProfile}
                className="flex-1 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]"
              >
                スキップ
              </button>
              <button
                onClick={handleSaveProfile}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px]"
              >
                保存して始める
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
