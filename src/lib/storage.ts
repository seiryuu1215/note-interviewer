// ユーザー設定
export type UserPreferences = {
  interviewTone: "casual" | "polite" | "provocative";
  interviewDepth: "light" | "normal" | "deep";
  firstPerson: string;
  articleStyle: "emotional" | "logical" | "humorous";
  ngWords: string[];
};

// AI記憶
export type UserMemory = {
  topics: string[];
  keyEpisodes: {
    summary: string;
    theme: string;
    date: string;
  }[];
  writingPatterns: string;
  avoidTopics: string[];
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  interviewTone: "casual",
  interviewDepth: "normal",
  firstPerson: "僕",
  articleStyle: "emotional",
  ngWords: [],
};

export const DEFAULT_MEMORY: UserMemory = {
  topics: [],
  keyEpisodes: [],
  writingPatterns: "",
  avoidTopics: [],
};

// ユーザープロフィール（インタビューから蓄積）
export type UserProfile = {
  name: string;
  bio: string;
  facts: string[];
  noteUsername?: string;
  noteAnalysis?: string;
  noteArticleCount?: number;
  preferences?: UserPreferences;
  memory?: UserMemory;
  appliedCoupons?: string[];
  bonusArticles?: number;
  isAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
};

// インタビューセッション
export type InterviewSession = {
  id: string;
  title: string;
  /** ユーザーの元の入力（「最近の転職の話」など） */
  theme?: string;
  /** AIが提案したタイトル（ユーザー入力のtitleとは別） */
  suggestedTitle?: string;
  messages: { role: "user" | "assistant"; content: string }[];
  status: "active" | "completed";
  createdAt: string;
};

// 生成された記事
export type GeneratedArticle = {
  id: string;
  sessionId: string;
  title: string;
  content: string;
  images?: string[];
  createdAt: string;
};

const KEYS = {
  profile: "note-interviewer-profile",
  sessions: "note-interviewer-sessions",
  articles: "note-interviewer-articles",
  usage: "note-interviewer-usage",
} as const;

function safeParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function isClient(): boolean {
  return typeof window !== "undefined";
}

function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    console.warn("localStorage quota exceeded or unavailable");
    return false;
  }
}

// --- プロフィール ---
export function getProfile(): UserProfile | null {
  if (!isClient()) return null;
  return safeParse(localStorage.getItem(KEYS.profile), null);
}

export function saveProfile(profile: UserProfile): void {
  if (!isClient()) return;
  safeSetItem(KEYS.profile, JSON.stringify(profile));
}

export function updateProfileFacts(newFacts: string[]): void {
  const profile = getProfile();
  if (!profile) return;
  const existingSet = new Set(profile.facts);
  newFacts.forEach((f) => existingSet.add(f));
  profile.facts = Array.from(existingSet);
  profile.updatedAt = new Date().toISOString();
  saveProfile(profile);
}

// --- セッション ---
export function getSessions(): InterviewSession[] {
  if (!isClient()) return [];
  return safeParse(localStorage.getItem(KEYS.sessions), []);
}

export function getSession(id: string): InterviewSession | null {
  return getSessions().find((s) => s.id === id) ?? null;
}

export function saveSession(session: InterviewSession): void {
  if (!isClient()) return;
  const sessions = getSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.unshift(session);
  }

  // 古いセッションを制限（最大50件）
  const trimmed = sessions.slice(0, 50);
  safeSetItem(KEYS.sessions, JSON.stringify(trimmed));
}

export function deleteSession(id: string): void {
  if (!isClient()) return;
  const sessions = getSessions().filter((s) => s.id !== id);
  safeSetItem(KEYS.sessions, JSON.stringify(sessions));
}

// --- 記事 ---
export function getArticles(): GeneratedArticle[] {
  if (!isClient()) return [];
  return safeParse(localStorage.getItem(KEYS.articles), []);
}

export function getArticle(id: string): GeneratedArticle | null {
  return getArticles().find((a) => a.id === id) ?? null;
}

export function saveArticle(article: GeneratedArticle): void {
  if (!isClient()) return;
  const articles = getArticles();
  // 同じIDの重複を防ぐ
  const filtered = articles.filter((a) => a.id !== article.id);
  filtered.unshift(article);
  // 最大30件
  const trimmed = filtered.slice(0, 30);
  safeSetItem(KEYS.articles, JSON.stringify(trimmed));
}

// --- 使用量トラッキング（収益化用） ---
export type UsageData = {
  totalInterviews: number;
  totalArticles: number;
  monthlyArticles: number;
  totalReviews: number;
  monthlyReviews: number;
  lastResetMonth: string;
};

const DEFAULT_USAGE: UsageData = {
  totalInterviews: 0,
  totalArticles: 0,
  monthlyArticles: 0,
  totalReviews: 0,
  monthlyReviews: 0,
  lastResetMonth: "",
};

export const FREE_LIMIT = 1;
export const FREE_REVIEW_LIMIT = 1;

export function getUsage(): UsageData {
  if (!isClient()) return { ...DEFAULT_USAGE };
  const usage = safeParse(localStorage.getItem(KEYS.usage), {
    ...DEFAULT_USAGE,
    lastResetMonth: new Date().toISOString().slice(0, 7),
  });

  const currentMonth = new Date().toISOString().slice(0, 7);
  if (usage.lastResetMonth !== currentMonth) {
    usage.monthlyArticles = 0;
    usage.monthlyReviews = 0;
    usage.lastResetMonth = currentMonth;
  }

  // 既存データにreviewフィールドがない場合の互換性対応
  if (typeof usage.totalReviews !== "number") usage.totalReviews = 0;
  if (typeof usage.monthlyReviews !== "number") usage.monthlyReviews = 0;

  return usage;
}

export function canGenerateArticle(): boolean {
  const profile = getProfile();
  if (profile?.isAdmin) return true;
  const usage = getUsage();
  const limit = FREE_LIMIT + (profile?.bonusArticles ?? 0);
  return usage.monthlyArticles < limit;
}

export function canReview(): boolean {
  const profile = getProfile();
  if (profile?.isAdmin) return true;
  return getUsage().monthlyReviews < FREE_REVIEW_LIMIT;
}

// --- ユーザー設定 ---
export function savePreferences(preferences: UserPreferences): void {
  const profile = getProfile();
  if (!profile) return;
  profile.preferences = preferences;
  profile.updatedAt = new Date().toISOString();
  saveProfile(profile);
}

export function getPreferences(): UserPreferences {
  return getProfile()?.preferences ?? { ...DEFAULT_PREFERENCES };
}

// --- AI記憶 ---
export function saveMemory(memory: UserMemory): void {
  const profile = getProfile();
  if (!profile) return;
  profile.memory = memory;
  profile.updatedAt = new Date().toISOString();
  saveProfile(profile);
}

export function getMemory(): UserMemory {
  return getProfile()?.memory ?? { ...DEFAULT_MEMORY };
}

// --- クーポン ---
const VALID_COUPONS: Record<string, number> = {
  "SEIRYUU2026": 10,
  "FRIEND5": 5,
  "BETA3": 3,
};

export function applyCoupon(code: string): { success: boolean; message: string; addedArticles: number } {
  const profile = getProfile();
  if (!profile) {
    return { success: false, message: "プロフィールが設定されていません", addedArticles: 0 };
  }

  const upperCode = code.toUpperCase().trim();
  const bonus = VALID_COUPONS[upperCode];

  if (bonus === undefined) {
    return { success: false, message: "無効なクーポンコードです", addedArticles: 0 };
  }

  const applied = profile.appliedCoupons ?? [];
  if (applied.includes(upperCode)) {
    return { success: false, message: "このクーポンは既に使用済みです", addedArticles: 0 };
  }

  profile.appliedCoupons = [...applied, upperCode];
  profile.bonusArticles = (profile.bonusArticles ?? 0) + bonus;
  profile.updatedAt = new Date().toISOString();
  saveProfile(profile);

  return { success: true, message: `${bonus}記事分の無料枠が追加されました！`, addedArticles: bonus };
}

// --- 管理者 ---
const ADMIN_PASSWORD = "seiryuu-admin-2026";

export function setAdmin(password: string): boolean {
  if (password === ADMIN_PASSWORD) {
    const profile = getProfile();
    if (profile) {
      profile.isAdmin = true;
      profile.updatedAt = new Date().toISOString();
      saveProfile(profile);
    }
    return true;
  }
  return false;
}

export function isAdmin(): boolean {
  return getProfile()?.isAdmin === true;
}

export function incrementUsage(type: "interview" | "article" | "review"): void {
  if (!isClient()) return;
  const usage = getUsage();

  if (type === "interview") {
    usage.totalInterviews++;
  } else if (type === "article") {
    usage.totalArticles++;
    usage.monthlyArticles++;
  } else {
    usage.totalReviews++;
    usage.monthlyReviews++;
  }

  safeSetItem(KEYS.usage, JSON.stringify(usage));
}
