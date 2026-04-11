"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getProfile,
  getPreferences,
  savePreferences,
  getMemory,
  saveMemory,
  getUsage,
  applyCoupon,
  setAdmin,
  isAdmin as checkIsAdmin,
  FREE_LIMIT,
  DEFAULT_PREFERENCES,
  DEFAULT_MEMORY,
  type UserPreferences,
  type UserMemory,
} from "@/lib/storage";

type ToneOption = { value: UserPreferences["interviewTone"]; label: string; desc: string };
type DepthOption = { value: UserPreferences["interviewDepth"]; label: string; desc: string };
type StyleOption = { value: UserPreferences["articleStyle"]; label: string; desc: string };

const TONE_OPTIONS: ToneOption[] = [
  { value: "casual", label: "フランク", desc: "気軽な会話調" },
  { value: "polite", label: "丁寧", desc: "礼儀正しく" },
  { value: "provocative", label: "挑発的", desc: "考えさせる" },
];

const DEPTH_OPTIONS: DepthOption[] = [
  { value: "light", label: "さらっと", desc: "3〜5問" },
  { value: "normal", label: "ふつう", desc: "5〜10問" },
  { value: "deep", label: "とことん", desc: "10〜15問" },
];

const STYLE_OPTIONS: StyleOption[] = [
  { value: "emotional", label: "エモい", desc: "感情的で共感を呼ぶ" },
  { value: "logical", label: "論理的", desc: "明快で構造的" },
  { value: "humorous", label: "ユーモア", desc: "軽快で楽しい" },
];

const FIRST_PERSON_OPTIONS = ["僕", "私", "俺", "わたし", "自分"];

// localStorageからの初期値読み込み（クライアントサイドのみ）
function readInitialState() {
  if (typeof window === "undefined") {
    return {
      preferences: { ...DEFAULT_PREFERENCES },
      memory: { ...DEFAULT_MEMORY },
      isAdminUser: false,
      remainingArticles: 0,
      hasProfile: false,
    };
  }
  const profile = getProfile();
  const prefs = getPreferences();
  const mem = getMemory();
  const admin = checkIsAdmin();
  const usage = getUsage();
  const limit = FREE_LIMIT + (profile?.bonusArticles ?? 0);
  return {
    preferences: prefs,
    memory: mem,
    isAdminUser: admin,
    remainingArticles: Math.max(0, limit - usage.monthlyArticles),
    hasProfile: !!profile,
  };
}

type SettingsState = {
  preferences: UserPreferences;
  memory: UserMemory;
  isAdminUser: boolean;
  remainingArticles: number;
  hasProfile: boolean;
};

export default function SettingsPage() {
  const router = useRouter();
  // useState(initializer)で初回レンダー時に1回だけ読み込む
  const [initialState] = useState<SettingsState>(() => readInitialState());

  const [preferences, setPreferences] = useState<UserPreferences>(() => initialState.preferences);
  const [memory, setMemory] = useState<UserMemory>(() => initialState.memory);
  const [ngWordInput, setNgWordInput] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminMessage, setAdminMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(() => initialState.isAdminUser);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [remainingArticles, setRemainingArticles] = useState(() => initialState.remainingArticles);

  const handleSave = useCallback(() => {
    savePreferences(preferences);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [preferences]);

  const handleAddNgWord = useCallback(() => {
    const word = ngWordInput.trim();
    if (!word || preferences.ngWords.includes(word)) {
      setNgWordInput("");
      return;
    }
    setPreferences((prev) => ({
      ...prev,
      ngWords: [...prev.ngWords, word],
    }));
    setNgWordInput("");
  }, [ngWordInput, preferences.ngWords]);

  const handleRemoveNgWord = useCallback((word: string) => {
    setPreferences((prev) => ({
      ...prev,
      ngWords: prev.ngWords.filter((w) => w !== word),
    }));
  }, []);

  const handleApplyCoupon = useCallback(() => {
    if (!couponCode.trim()) return;
    const result = applyCoupon(couponCode);
    setCouponMessage({
      type: result.success ? "success" : "error",
      text: result.message,
    });
    if (result.success) {
      setCouponCode("");
      const profile = getProfile();
      const usage = getUsage();
      const limit = FREE_LIMIT + (profile?.bonusArticles ?? 0);
      setRemainingArticles(Math.max(0, limit - usage.monthlyArticles));
    }
    setTimeout(() => setCouponMessage(null), 3000);
  }, [couponCode]);

  const handleAdminAuth = useCallback(() => {
    if (!adminPassword.trim()) return;
    const success = setAdmin(adminPassword);
    if (success) {
      setIsAdminUser(true);
      setAdminMessage({ type: "success", text: "管理者として認証されました" });
    } else {
      setAdminMessage({ type: "error", text: "パスワードが正しくありません" });
    }
    setAdminPassword("");
    setTimeout(() => setAdminMessage(null), 3000);
  }, [adminPassword]);

  const handleResetMemory = useCallback(() => {
    saveMemory({ ...DEFAULT_MEMORY });
    setMemory({ ...DEFAULT_MEMORY });
    setShowResetConfirm(false);
  }, []);

  if (!initialState.hasProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-[var(--foreground)] mb-4">設定</h1>
          <p className="text-[var(--muted)] mb-6">
            まずはホーム画面でプロフィールを設定してください。
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] min-h-[44px]"
          >
            ホームへ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 px-4">
      <div className="max-w-lg mx-auto pt-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push("/")}
            className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm min-h-[44px] min-w-[44px] flex items-center"
          >
            &larr; ホーム
          </button>
          <h1 className="text-xl font-bold text-[var(--foreground)]">設定</h1>
          <div className="w-11" />
        </div>

        {/* インタビュー設定 */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <span className="text-base">&#x270D;&#xFE0F;</span>
            インタビュー設定
          </h2>

          {/* 質問のトーン */}
          <div className="mb-4">
            <label className="block text-sm text-[var(--foreground)] mb-2">
              質問のトーン
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TONE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPreferences((p) => ({ ...p, interviewTone: opt.value }))}
                  className={`p-3 rounded-xl border text-center transition-colors ${
                    preferences.interviewTone === opt.value
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground)] hover:border-[var(--accent)]/50"
                  }`}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 深掘りの深さ */}
          <div className="mb-4">
            <label className="block text-sm text-[var(--foreground)] mb-2">
              深掘りの深さ
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DEPTH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPreferences((p) => ({ ...p, interviewDepth: opt.value }))}
                  className={`p-3 rounded-xl border text-center transition-colors ${
                    preferences.interviewDepth === opt.value
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground)] hover:border-[var(--accent)]/50"
                  }`}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 記事スタイル */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <span className="text-base">&#x1F4D6;</span>
            記事スタイル
          </h2>

          {/* 一人称 */}
          <div className="mb-4">
            <label className="block text-sm text-[var(--foreground)] mb-2">
              一人称
            </label>
            <div className="flex flex-wrap gap-2">
              {FIRST_PERSON_OPTIONS.map((fp) => (
                <button
                  key={fp}
                  onClick={() => setPreferences((p) => ({ ...p, firstPerson: fp }))}
                  className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                    preferences.firstPerson === fp
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground)] hover:border-[var(--accent)]/50"
                  }`}
                >
                  {fp}
                </button>
              ))}
            </div>
          </div>

          {/* テイスト */}
          <div className="mb-4">
            <label className="block text-sm text-[var(--foreground)] mb-2">
              テイスト
            </label>
            <div className="grid grid-cols-3 gap-2">
              {STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPreferences((p) => ({ ...p, articleStyle: opt.value }))}
                  className={`p-3 rounded-xl border text-center transition-colors ${
                    preferences.articleStyle === opt.value
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground)] hover:border-[var(--accent)]/50"
                  }`}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* NGワード */}
          <div className="mb-4">
            <label className="block text-sm text-[var(--foreground)] mb-2">
              NGワード
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={ngWordInput}
                onChange={(e) => setNgWordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddNgWord();
                  }
                }}
                placeholder="避けたい表現を入力"
                className="flex-1 px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] placeholder:text-[var(--muted)] text-sm"
              />
              <button
                onClick={handleAddNgWord}
                disabled={!ngWordInput.trim()}
                className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-sm min-h-[44px]"
              >
                追加
              </button>
            </div>
            {preferences.ngWords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {preferences.ngWords.map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--error)]/10 text-[var(--error)] rounded-full text-xs"
                  >
                    {word}
                    <button
                      onClick={() => handleRemoveNgWord(word)}
                      className="hover:opacity-70 text-sm leading-none"
                      aria-label={`${word}を削除`}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* クーポン */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <span className="text-base">&#x1F3AB;</span>
            クーポン
          </h2>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApplyCoupon();
                }
              }}
              placeholder="クーポンコードを入力"
              className="flex-1 px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] placeholder:text-[var(--muted)] text-sm"
            />
            <button
              onClick={handleApplyCoupon}
              disabled={!couponCode.trim()}
              className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-sm min-h-[44px]"
            >
              適用
            </button>
          </div>
          {couponMessage && (
            <p className={`text-sm mb-2 ${couponMessage.type === "success" ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
              {couponMessage.text}
            </p>
          )}
          <p className="text-sm text-[var(--muted)]">
            {isAdminUser ? (
              "管理者モード: 無制限"
            ) : (
              <>残り枠: {remainingArticles}記事 / 月</>
            )}
          </p>
        </section>

        {/* 管理者 */}
        <section className="mb-8">
          <button
            onClick={() => setShowAdmin(!showAdmin)}
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            {showAdmin ? "\u25BC" : "\u25B6"} 管理者
          </button>
          {showAdmin && (
            <div className="mt-3 p-4 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)]">
              {isAdminUser ? (
                <p className="text-sm text-[var(--success)]">管理者として認証済み（全機能無制限）</p>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAdminAuth();
                        }
                      }}
                      placeholder="管理者パスワード"
                      className="flex-1 px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--input-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] placeholder:text-[var(--muted)] text-sm"
                    />
                    <button
                      onClick={handleAdminAuth}
                      disabled={!adminPassword.trim()}
                      className="px-4 py-2 bg-[var(--foreground)] text-[var(--background)] rounded-lg hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-sm min-h-[44px]"
                    >
                      認証
                    </button>
                  </div>
                  {adminMessage && (
                    <p className={`text-sm mt-2 ${adminMessage.type === "success" ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
                      {adminMessage.text}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        {/* AI記憶 */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <span className="text-base">&#x1F9E0;</span>
            AI記憶
          </h2>
          <div className="p-4 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] space-y-3">
            <div>
              <p className="text-xs text-[var(--muted)] mb-1">過去のテーマ</p>
              <p className="text-sm text-[var(--foreground)]">
                {memory.topics.length > 0
                  ? memory.topics.join(", ")
                  : "まだ記録がありません"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted)] mb-1">記憶済みエピソード</p>
              <p className="text-sm text-[var(--foreground)]">
                {memory.keyEpisodes.length}件
              </p>
              {memory.keyEpisodes.length > 0 && (
                <div className="mt-1 space-y-1">
                  {memory.keyEpisodes.slice(-5).map((ep, i) => (
                    <p key={i} className="text-xs text-[var(--muted)]">
                      {ep.theme}: {ep.summary}
                    </p>
                  ))}
                  {memory.keyEpisodes.length > 5 && (
                    <p className="text-xs text-[var(--muted)]">
                      ...他{memory.keyEpisodes.length - 5}件
                    </p>
                  )}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-[var(--muted)] mb-1">文体パターン</p>
              <p className="text-sm text-[var(--foreground)]">
                {memory.writingPatterns || "まだ分析されていません"}
              </p>
            </div>
            {memory.avoidTopics.length > 0 && (
              <div>
                <p className="text-xs text-[var(--muted)] mb-1">避けるべき話題</p>
                <p className="text-sm text-[var(--foreground)]">
                  {memory.avoidTopics.join(", ")}
                </p>
              </div>
            )}
            <div className="pt-2">
              {showResetConfirm ? (
                <div className="flex gap-2 items-center">
                  <p className="text-xs text-[var(--error)]">本当にリセットしますか？</p>
                  <button
                    onClick={handleResetMemory}
                    className="px-3 py-1 bg-[var(--error)] text-white rounded text-xs hover:opacity-80 min-h-[36px]"
                  >
                    リセット
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-3 py-1 border border-[var(--input-border)] rounded text-xs text-[var(--foreground)] hover:bg-[var(--input-bg)] min-h-[36px]"
                  >
                    キャンセル
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="text-xs text-[var(--error)] hover:underline"
                  disabled={memory.topics.length === 0 && memory.keyEpisodes.length === 0 && !memory.writingPatterns}
                >
                  記憶をリセット
                </button>
              )}
            </div>
          </div>
        </section>

        {/* 保存ボタン */}
        <div className="sticky bottom-4">
          <button
            onClick={handleSave}
            className={`w-full py-3 rounded-xl text-white font-medium transition-all min-h-[48px] ${
              saved
                ? "bg-[var(--success)]"
                : "bg-[var(--accent)] hover:bg-[var(--accent-hover)]"
            }`}
          >
            {saved ? "保存しました" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
