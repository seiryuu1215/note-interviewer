"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getProfile,
  getUsage,
  canReview,
  incrementUsage,
  FREE_REVIEW_LIMIT,
  type UserProfile,
  type UsageData,
} from "@/lib/storage";

type ReviewTone = "gentle" | "normal" | "harsh";

type GentleImprovement = {
  point: string;
  suggestion: string;
  example: string;
};

type NormalImprovement = {
  point: string;
  suggestion: string;
  example: string;
  priority: string;
};

type CriticalIssue = {
  issue: string;
  why: string;
  fix: string;
};

type WastedPotential = {
  point: string;
  suggestion: string;
};

type ReviewResult = Record<string, unknown>;

function getScoreColor(score: number): string {
  if (score <= 30) return "text-[var(--error)]";
  if (score <= 60) return "text-[var(--warning)]";
  if (score <= 80) return "text-[var(--success)]";
  return "text-[var(--accent)]";
}

function getScoreBarColor(score: number): string {
  if (score <= 30) return "bg-[var(--error)]";
  if (score <= 60) return "bg-[var(--warning)]";
  if (score <= 80) return "bg-[var(--success)]";
  return "bg-[var(--accent)]";
}

function getScoreLabel(score: number): string {
  if (score <= 30) return "要改善";
  if (score <= 60) return "もう少し";
  if (score <= 80) return "良い";
  return "素晴らしい";
}

export default function ReviewPage() {
  const [content, setContent] = useState("");
  const [tone, setTone] = useState<ReviewTone>("normal");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const router = useRouter();

  useEffect(() => {
    setProfile(getProfile());
    setUsage(getUsage());
  }, []);

  const handleReview = async () => {
    if (!content.trim() || isLoading) return;

    if (!canReview()) {
      setError(
        `今月の無料添削回数（${FREE_REVIEW_LIMIT}回）を使い切りました。来月またお試しください。`
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          tone,
          profile: profile
            ? { name: profile.name, noteAnalysis: profile.noteAnalysis }
            : undefined,
        }),
      });

      if (!response.ok) {
        const errData: unknown = await response.json();
        const errMsg =
          typeof errData === "object" &&
          errData !== null &&
          "error" in errData &&
          typeof (errData as Record<string, unknown>).error === "string"
            ? (errData as Record<string, unknown>).error as string
            : "添削に失敗しました";
        throw new Error(errMsg);
      }

      const data: unknown = await response.json();
      if (typeof data !== "object" || data === null) {
        throw new Error("添削結果が不正です");
      }

      setResult(data as ReviewResult);
      incrementUsage("review");
      setUsage(getUsage());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "添削に失敗しました。もう一度お試しください。"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const score =
    result && typeof result.score === "number" ? result.score : null;

  return (
    <div className="min-h-screen bg-[var(--background)] pb-[env(safe-area-inset-bottom)]">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-[var(--background)]/80 backdrop-blur-sm border-b border-[var(--card-border)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="text-[var(--muted)] hover:text-[var(--foreground)] min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="ホームに戻る"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path
                fillRule="evenodd"
                d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm ml-1">ホーム</span>
          </button>
          <h1 className="text-lg font-bold text-[var(--foreground)]">記事を添削する</h1>
          <div className="w-[44px]" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 使用量 */}
        {usage && (
          <div className="text-center text-sm text-[var(--muted)]">
            今月の添削: {usage.monthlyReviews} / {FREE_REVIEW_LIMIT}（無料枠）
          </div>
        )}

        {/* トーン選択 */}
        <div>
          <p className="text-sm font-medium text-[var(--foreground)] mb-3">
            フィードバックのトーンを選択
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setTone("gentle")}
              className={`p-3 rounded-xl border-2 transition-all text-center min-h-[48px] ${
                tone === "gentle"
                  ? "border-[var(--success)] bg-[var(--success)]/10 text-[var(--success)]"
                  : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--muted)] hover:border-[var(--input-border)]"
              }`}
            >
              <span className="block text-lg" role="img" aria-label="やさしい">
                😊
              </span>
              <span className="block text-sm font-medium mt-1">やさしい</span>
            </button>
            <button
              onClick={() => setTone("normal")}
              className={`p-3 rounded-xl border-2 transition-all text-center min-h-[48px] ${
                tone === "normal"
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--muted)] hover:border-[var(--input-border)]"
              }`}
            >
              <span className="block text-lg" role="img" aria-label="ふつう">
                📝
              </span>
              <span className="block text-sm font-medium mt-1">ふつう</span>
            </button>
            <button
              onClick={() => setTone("harsh")}
              className={`p-3 rounded-xl border-2 transition-all text-center min-h-[48px] ${
                tone === "harsh"
                  ? "border-[var(--error)] bg-[var(--error)]/10 text-[var(--error)]"
                  : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--muted)] hover:border-[var(--input-border)]"
              }`}
            >
              <span className="block text-lg" role="img" aria-label="辛口">
                🔥
              </span>
              <span className="block text-sm font-medium mt-1">辛口</span>
            </button>
          </div>
        </div>

        {/* 記事入力 */}
        <div>
          <label
            htmlFor="article-content"
            className="block text-sm font-medium text-[var(--foreground)] mb-2"
          >
            添削する記事
          </label>
          <textarea
            id="article-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="記事をここにペースト..."
            rows={12}
            className="w-full px-4 py-3 text-base border border-[var(--input-border)] rounded-xl bg-[var(--input-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent placeholder:text-[var(--muted)] resize-y disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: "300px" }}
            disabled={isLoading}
          />
          <p className="text-xs text-[var(--muted)] mt-1 text-right">
            {content.length.toLocaleString()} / 10,000文字
          </p>
        </div>

        {/* エラー */}
        {error && (
          <div className="p-3 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-lg">
            <p className="text-sm text-[var(--error)]">{error}</p>
          </div>
        )}

        {/* 添削ボタン */}
        <button
          onClick={() => void handleReview()}
          disabled={!content.trim() || isLoading || content.length > 10000}
          className="w-full py-3 bg-[var(--accent)] text-white text-lg font-medium rounded-xl hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px] flex items-center justify-center gap-2"
        >
          {isLoading ? (
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
              添削中...
            </>
          ) : (
            "添削してもらう"
          )}
        </button>

        {/* ローディングスケルトン */}
        {isLoading && (
          <div className="space-y-4 animate-pulse">
            <div className="h-20 bg-[var(--card-bg)] rounded-xl" />
            <div className="h-32 bg-[var(--card-bg)] rounded-xl" />
            <div className="h-24 bg-[var(--card-bg)] rounded-xl" />
            <div className="h-40 bg-[var(--card-bg)] rounded-xl" />
          </div>
        )}

        {/* 添削結果 */}
        {result && score !== null && (
          <div className="space-y-5 animate-fade-in">
            {/* スコア */}
            <div className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--card-border)] text-center">
              <p className="text-sm text-[var(--muted)] mb-2">総合スコア</p>
              <div className="flex items-center justify-center gap-3">
                <span
                  className={`text-5xl font-bold ${getScoreColor(score)}`}
                >
                  {score}
                </span>
                <span className="text-2xl text-[var(--muted)]">/100</span>
              </div>
              <p
                className={`text-sm font-medium mt-2 ${getScoreColor(score)}`}
              >
                {getScoreLabel(score)}
              </p>
              {/* スコアバー */}
              <div className="mt-4 w-full bg-[var(--input-bg)] rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all duration-700 ${getScoreBarColor(score)}`}
                  style={{ width: `${Math.min(score, 100)}%` }}
                />
              </div>
            </div>

            {/* トーン別の結果表示 */}
            {tone === "harsh" ? (
              <HarshResult result={result} />
            ) : tone === "gentle" ? (
              <GentleResult result={result} />
            ) : (
              <NormalResult result={result} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// --- やさしいモードの結果表示 ---
function GentleResult({ result }: { result: ReviewResult }) {
  const good = Array.isArray(result.good) ? (result.good as string[]) : [];
  const improvements = Array.isArray(result.improvements)
    ? (result.improvements as GentleImprovement[])
    : [];
  const rewrite =
    typeof result.rewrite === "string" ? result.rewrite : null;
  const summary =
    typeof result.summary === "string" ? result.summary : null;

  return (
    <>
      {good.length > 0 && (
        <ResultSection title="良い点" icon="check-circle" color="green">
          <ul className="space-y-2">
            {good.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-[var(--foreground)]">
                <span className="text-[var(--success)] shrink-0">・</span>
                {item}
              </li>
            ))}
          </ul>
        </ResultSection>
      )}

      {improvements.length > 0 && (
        <ResultSection title="改善提案" icon="light-bulb" color="yellow">
          <div className="space-y-4">
            {improvements.map((item, i) => (
              <div key={i} className="text-sm">
                <p className="font-medium text-[var(--foreground)]">{item.point}</p>
                <p className="text-[var(--muted)] mt-1">{item.suggestion}</p>
                {item.example && (
                  <p className="mt-1 px-3 py-2 bg-[var(--warning)]/10 rounded-lg text-[var(--foreground)] border-l-2 border-[var(--warning)]">
                    {item.example}
                  </p>
                )}
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {rewrite && (
        <ResultSection title="リライト例" icon="pencil" color="blue">
          <div className="text-sm text-[var(--foreground)] whitespace-pre-wrap bg-[var(--accent)]/10 p-4 rounded-lg border-l-2 border-[var(--accent)]">
            {rewrite}
          </div>
        </ResultSection>
      )}

      {summary && (
        <ResultSection title="総合コメント" icon="chat" color="gray">
          <p className="text-sm text-[var(--foreground)]">{summary}</p>
        </ResultSection>
      )}
    </>
  );
}

// --- ふつうモードの結果表示 ---
function NormalResult({ result }: { result: ReviewResult }) {
  const good = Array.isArray(result.good) ? (result.good as string[]) : [];
  const improvements = Array.isArray(result.improvements)
    ? (result.improvements as NormalImprovement[])
    : [];
  const rewrite =
    typeof result.rewrite === "string" ? result.rewrite : null;
  const readerPerspective =
    typeof result.readerPerspective === "string"
      ? result.readerPerspective
      : null;
  const summary =
    typeof result.summary === "string" ? result.summary : null;

  return (
    <>
      {good.length > 0 && (
        <ResultSection title="良い点" icon="check-circle" color="green">
          <ul className="space-y-2">
            {good.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-[var(--foreground)]">
                <span className="text-[var(--success)] shrink-0">・</span>
                {item}
              </li>
            ))}
          </ul>
        </ResultSection>
      )}

      {improvements.length > 0 && (
        <ResultSection title="改善必須" icon="exclamation" color="orange">
          <div className="space-y-4">
            {improvements.map((item, i) => (
              <div key={i} className="text-sm">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-[var(--foreground)]">{item.point}</p>
                  {item.priority && (
                    <PriorityBadge priority={item.priority} />
                  )}
                </div>
                <p className="text-[var(--muted)] mt-1">{item.suggestion}</p>
                {item.example && (
                  <p className="mt-1 px-3 py-2 bg-[var(--warning)]/10 rounded-lg text-[var(--foreground)] border-l-2 border-[var(--warning)]">
                    {item.example}
                  </p>
                )}
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {rewrite && (
        <ResultSection title="リライト例" icon="pencil" color="blue">
          <div className="text-sm text-[var(--foreground)] whitespace-pre-wrap bg-[var(--accent)]/10 p-4 rounded-lg border-l-2 border-[var(--accent)]">
            {rewrite}
          </div>
        </ResultSection>
      )}

      {readerPerspective && (
        <ResultSection title="読者視点" icon="eye" color="purple">
          <p className="text-sm text-[var(--foreground)]">{readerPerspective}</p>
        </ResultSection>
      )}

      {summary && (
        <ResultSection title="総合コメント" icon="chat" color="gray">
          <p className="text-sm text-[var(--foreground)]">{summary}</p>
        </ResultSection>
      )}
    </>
  );
}

// --- 辛口モードの結果表示 ---
function HarshResult({ result }: { result: ReviewResult }) {
  const honestReaction =
    typeof result.honestReaction === "string" ? result.honestReaction : null;
  const criticalIssues = Array.isArray(result.criticalIssues)
    ? (result.criticalIssues as CriticalIssue[])
    : [];
  const wastedPotential = Array.isArray(result.wastedPotential)
    ? (result.wastedPotential as WastedPotential[])
    : [];
  const saving =
    typeof result.saving === "string" ? result.saving : null;
  const rewrite =
    typeof result.rewrite === "string" ? result.rewrite : null;
  const prediction =
    typeof result.prediction === "string" ? result.prediction : null;
  const summary =
    typeof result.summary === "string" ? result.summary : null;

  return (
    <>
      {honestReaction && (
        <ResultSection title="正直な感想" icon="fire" color="red">
          <p className="text-sm text-[var(--foreground)] font-medium">
            {honestReaction}
          </p>
        </ResultSection>
      )}

      {criticalIssues.length > 0 && (
        <ResultSection title="致命的な問題" icon="x-circle" color="red">
          <div className="space-y-4">
            {criticalIssues.map((item, i) => (
              <div key={i} className="text-sm">
                <p className="font-medium text-[var(--error)]">{item.issue}</p>
                <p className="text-[var(--muted)] mt-1">
                  <span className="font-medium">理由: </span>
                  {item.why}
                </p>
                <p className="mt-1 px-3 py-2 bg-[var(--error)]/10 rounded-lg text-[var(--foreground)] border-l-2 border-[var(--error)]">
                  <span className="font-medium">修正方法: </span>
                  {item.fix}
                </p>
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {wastedPotential.length > 0 && (
        <ResultSection title="もったいない点" icon="exclamation" color="orange">
          <div className="space-y-3">
            {wastedPotential.map((item, i) => (
              <div key={i} className="text-sm">
                <p className="font-medium text-[var(--foreground)]">{item.point}</p>
                <p className="text-[var(--muted)] mt-1">{item.suggestion}</p>
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {saving && (
        <ResultSection title="唯一の救い" icon="star" color="green">
          <p className="text-sm text-[var(--foreground)]">{saving}</p>
        </ResultSection>
      )}

      {rewrite && (
        <ResultSection title="本気のリライト" icon="pencil" color="blue">
          <div className="text-sm text-[var(--foreground)] whitespace-pre-wrap bg-[var(--accent)]/10 p-4 rounded-lg border-l-2 border-[var(--accent)]">
            {rewrite}
          </div>
        </ResultSection>
      )}

      {prediction && (
        <ResultSection title="このままだと..." icon="warning" color="yellow">
          <p className="text-sm text-[var(--foreground)]">{prediction}</p>
        </ResultSection>
      )}

      {summary && (
        <ResultSection title="辛口総評" icon="chat" color="gray">
          <p className="text-sm text-[var(--foreground)]">{summary}</p>
        </ResultSection>
      )}
    </>
  );
}

// --- 共通コンポーネント ---

type SectionColor = "green" | "yellow" | "orange" | "red" | "blue" | "purple" | "gray";
type IconName =
  | "check-circle"
  | "light-bulb"
  | "pencil"
  | "chat"
  | "exclamation"
  | "eye"
  | "fire"
  | "x-circle"
  | "star"
  | "warning";

const colorMap: Record<SectionColor, string> = {
  green: "border-[var(--success)]/30 bg-[var(--success)]/5",
  yellow: "border-[var(--warning)]/30 bg-[var(--warning)]/5",
  orange: "border-[var(--warning)]/30 bg-[var(--warning)]/5",
  red: "border-[var(--error)]/30 bg-[var(--error)]/5",
  blue: "border-[var(--accent)]/30 bg-[var(--accent)]/5",
  purple: "border-[var(--accent)]/30 bg-[var(--accent)]/5",
  gray: "border-[var(--card-border)] bg-[var(--card-bg)]",
};

const titleColorMap: Record<SectionColor, string> = {
  green: "text-[var(--success)]",
  yellow: "text-[var(--warning)]",
  orange: "text-[var(--warning)]",
  red: "text-[var(--error)]",
  blue: "text-[var(--accent)]",
  purple: "text-[var(--accent)]",
  gray: "text-[var(--foreground)]",
};

const iconMap: Record<IconName, string> = {
  "check-circle": "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  "light-bulb": "M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18",
  pencil: "m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z",
  chat: "M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z",
  exclamation: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z",
  eye: "M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  fire: "M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z",
  "x-circle": "m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  star: "M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z",
  warning: "M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z",
};

function ResultSection({
  title,
  icon,
  color,
  children,
}: {
  title: string;
  icon: IconName;
  color: SectionColor;
  children: React.ReactNode;
}) {
  return (
    <div className={`p-5 rounded-xl border ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className={`w-5 h-5 ${titleColorMap[color]}`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d={iconMap[icon]}
          />
        </svg>
        <h3 className={`font-bold ${titleColorMap[color]}`}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    high: "bg-[var(--error)]/15 text-[var(--error)]",
    medium: "bg-[var(--warning)]/15 text-[var(--warning)]",
    low: "bg-[var(--card-bg)] text-[var(--muted)]",
  };
  const labels: Record<string, string> = {
    high: "高",
    medium: "中",
    low: "低",
  };
  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded font-medium ${styles[priority] ?? styles.low}`}
    >
      {labels[priority] ?? priority}
    </span>
  );
}
