// ユーザープロフィール（インタビューから蓄積）
export type UserProfile = {
  name: string;
  bio: string;
  facts: string[];
  createdAt: string;
  updatedAt: string;
};

// インタビューセッション
export type InterviewSession = {
  id: string;
  title: string;
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
  lastResetMonth: string;
};

const DEFAULT_USAGE: UsageData = {
  totalInterviews: 0,
  totalArticles: 0,
  monthlyArticles: 0,
  lastResetMonth: "",
};

export const FREE_LIMIT = 3;

export function getUsage(): UsageData {
  if (!isClient()) return { ...DEFAULT_USAGE };
  const usage = safeParse(localStorage.getItem(KEYS.usage), {
    ...DEFAULT_USAGE,
    lastResetMonth: new Date().toISOString().slice(0, 7),
  });

  const currentMonth = new Date().toISOString().slice(0, 7);
  if (usage.lastResetMonth !== currentMonth) {
    usage.monthlyArticles = 0;
    usage.lastResetMonth = currentMonth;
  }

  return usage;
}

export function canGenerateArticle(): boolean {
  return getUsage().monthlyArticles < FREE_LIMIT;
}

export function incrementUsage(type: "interview" | "article"): void {
  if (!isClient()) return;
  const usage = getUsage();

  if (type === "interview") {
    usage.totalInterviews++;
  } else {
    usage.totalArticles++;
    usage.monthlyArticles++;
  }

  safeSetItem(KEYS.usage, JSON.stringify(usage));
}
