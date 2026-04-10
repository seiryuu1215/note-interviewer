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
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

export default function Home() {
  const [theme, setTheme] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [articles, setArticles] = useState<GeneratedArticle[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const router = useRouter();

  // テーマ入力欄の音声認識
  const {
    isListening: isThemeListening,
    transcript: themeTranscript,
    startListening: startThemeListening,
    stopListening: stopThemeListening,
    resetTranscript: resetThemeTranscript,
    isSupported: isThemeSupported,
    error: themeVoiceError,
  } = useSpeechRecognition();

  // プロフィールモーダルの音声認識
  const {
    isListening: isBioListening,
    transcript: bioTranscript,
    startListening: startBioListening,
    stopListening: stopBioListening,
    resetTranscript: resetBioTranscript,
    isSupported: isBioSupported,
    error: bioVoiceError,
  } = useSpeechRecognition();

  useEffect(() => {
    setProfile(getProfile());
    setSessions(getSessions());
    setArticles(getArticles());
    setUsage(getUsage());
  }, []);

  // テーマ音声認識のテキスト反映
  useEffect(() => {
    if (themeTranscript) {
      setTheme(themeTranscript);
    }
  }, [themeTranscript]);

  // プロフィール音声認識のテキスト反映
  useEffect(() => {
    if (bioTranscript) {
      setProfileBio(bioTranscript);
    }
  }, [bioTranscript]);

  // モーダルのEscキー対応
  useEffect(() => {
    if (!showProfile) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowProfile(false);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [showProfile]);

  const analyzeAndStart = async (currentProfile: UserProfile) => {
    setIsAnalyzing(true);
    setAnalyzeError(null);

    try {
      const response = await fetch("/api/analyze-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: theme.trim(),
          profile: currentProfile,
        }),
      });

      if (!response.ok) {
        throw new Error("テーマの分析に失敗しました。もう一度お試しください。");
      }

      const data: unknown = await response.json();

      if (
        typeof data !== "object" ||
        data === null ||
        !("title" in data) ||
        !("firstQuestion" in data) ||
        typeof (data as Record<string, unknown>).title !== "string" ||
        typeof (data as Record<string, unknown>).firstQuestion !== "string"
      ) {
        throw new Error("テーマの分析結果が不正です。もう一度お試しください。");
      }

      const { title, firstQuestion } = data as {
        title: string;
        firstQuestion: string;
      };

      const id = crypto.randomUUID();
      router.push(
        `/interview/${id}?title=${encodeURIComponent(title)}&firstQuestion=${encodeURIComponent(firstQuestion)}`
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "テーマの分析に失敗しました。もう一度お試しください。";
      setAnalyzeError(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStart = () => {
    if (!theme.trim() || isAnalyzing) return;

    if (!profile) {
      setShowProfile(true);
      return;
    }

    void analyzeAndStart(profile);
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
    resetBioTranscript();
    if (theme.trim()) void analyzeAndStart(newProfile);
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
    resetBioTranscript();
    void analyzeAndStart(defaultProfile);
  };

  const toggleThemeVoice = () => {
    if (isThemeListening) {
      stopThemeListening();
    } else {
      resetThemeTranscript();
      startThemeListening();
    }
  };

  const toggleBioVoice = () => {
    if (isBioListening) {
      stopBioListening();
    } else {
      resetBioTranscript();
      startBioListening();
    }
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
            話すだけで、note記事ができる。
            <br />
            AIがあなたにインタビューします。
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

        {/* テーマ入力 */}
        <div className="space-y-4">
          <label
            htmlFor="theme"
            className="block text-sm font-medium text-gray-700"
          >
            何について書きたい？
          </label>
          <div className="relative">
            <input
              id="theme"
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
              placeholder="例: 最近の転職の話、趣味のこと..."
              className="w-full px-4 py-3 pr-12 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isAnalyzing}
              autoFocus
            />
            {isThemeSupported && (
              <button
                type="button"
                onClick={toggleThemeVoice}
                disabled={isAnalyzing}
                className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                  isThemeListening
                    ? "bg-red-100 text-red-600 animate-pulse"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                aria-label={isThemeListening ? "音声入力を停止" : "音声入力を開始"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
                  <path d="M17 11a1 1 0 0 1 2 0 7 7 0 0 1-6 6.93V20h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-2.07A7 7 0 0 1 5 11a1 1 0 0 1 2 0 5 5 0 0 0 10 0Z" />
                </svg>
              </button>
            )}
          </div>
          {themeVoiceError && (
            <p className="text-sm text-red-500">{themeVoiceError}</p>
          )}
          {analyzeError && (
            <p className="text-sm text-red-500">{analyzeError}</p>
          )}
          <button
            onClick={handleStart}
            disabled={!theme.trim() || isAnalyzing}
            className="w-full py-3 bg-blue-600 text-white text-lg font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px] flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                テーマを分析中...
              </>
            ) : (
              "インタビューを始める"
            )}
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
              書きたいテーマを話す
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold">
                2
              </span>
              AIの質問に声で答える
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
              声で自己紹介してください。テキスト入力もできます。
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
                <div className="relative">
                  <textarea
                    id="profile-bio"
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                    placeholder="例: フリーランスエンジニア / ダーツプロ"
                    rows={2}
                    className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  {isBioSupported && (
                    <button
                      type="button"
                      onClick={toggleBioVoice}
                      className={`absolute right-2 top-2 w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                        isBioListening
                          ? "bg-red-100 text-red-600 animate-pulse"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                      aria-label={
                        isBioListening
                          ? "音声入力を停止"
                          : "音声で自己紹介を入力"
                      }
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-4 h-4"
                      >
                        <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
                        <path d="M17 11a1 1 0 0 1 2 0 7 7 0 0 1-6 6.93V20h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-2.07A7 7 0 0 1 5 11a1 1 0 0 1 2 0 5 5 0 0 0 10 0Z" />
                      </svg>
                    </button>
                  )}
                </div>
                {bioVoiceError && (
                  <p className="text-sm text-red-500 mt-1">{bioVoiceError}</p>
                )}
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
