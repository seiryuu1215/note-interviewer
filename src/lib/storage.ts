// ユーザープロフィール（インタビューから蓄積）
export type UserProfile = {
  name: string;
  bio: string;
  facts: string[]; // インタビューから抽出した事実
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
} as const;

// --- プロフィール ---
export function getProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(KEYS.profile);
  return data ? JSON.parse(data) : null;
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(KEYS.profile, JSON.stringify(profile));
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
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(KEYS.sessions);
  return data ? JSON.parse(data) : [];
}

export function getSession(id: string): InterviewSession | null {
  return getSessions().find((s) => s.id === id) ?? null;
}

export function saveSession(session: InterviewSession): void {
  const sessions = getSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.unshift(session);
  }
  localStorage.setItem(KEYS.sessions, JSON.stringify(sessions));
}

export function deleteSession(id: string): void {
  const sessions = getSessions().filter((s) => s.id !== id);
  localStorage.setItem(KEYS.sessions, JSON.stringify(sessions));
}

// --- 記事 ---
export function getArticles(): GeneratedArticle[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(KEYS.articles);
  return data ? JSON.parse(data) : [];
}

export function getArticle(id: string): GeneratedArticle | null {
  return getArticles().find((a) => a.id === id) ?? null;
}

export function saveArticle(article: GeneratedArticle): void {
  const articles = getArticles();
  articles.unshift(article);
  localStorage.setItem(KEYS.articles, JSON.stringify(articles));
}

// --- 使用量トラッキング（収益化用） ---
export type UsageData = {
  totalInterviews: number;
  totalArticles: number;
  monthlyArticles: number;
  lastResetMonth: string; // YYYY-MM
};

export function getUsage(): UsageData {
  if (typeof window === "undefined")
    return {
      totalInterviews: 0,
      totalArticles: 0,
      monthlyArticles: 0,
      lastResetMonth: "",
    };
  const data = localStorage.getItem("note-interviewer-usage");
  const usage: UsageData = data
    ? JSON.parse(data)
    : {
        totalInterviews: 0,
        totalArticles: 0,
        monthlyArticles: 0,
        lastResetMonth: new Date().toISOString().slice(0, 7),
      };

  // 月が変わったらリセット
  const currentMonth = new Date().toISOString().slice(0, 7);
  if (usage.lastResetMonth !== currentMonth) {
    usage.monthlyArticles = 0;
    usage.lastResetMonth = currentMonth;
  }

  return usage;
}

export function incrementUsage(
  type: "interview" | "article"
): { allowed: boolean; usage: UsageData } {
  const usage = getUsage();
  const FREE_LIMIT = 3; // 無料枠：月3記事

  if (type === "interview") {
    usage.totalInterviews++;
  } else {
    if (usage.monthlyArticles >= FREE_LIMIT) {
      return { allowed: false, usage };
    }
    usage.totalArticles++;
    usage.monthlyArticles++;
  }

  localStorage.setItem("note-interviewer-usage", JSON.stringify(usage));
  return { allowed: true, usage };
}
