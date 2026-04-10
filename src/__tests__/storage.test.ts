import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getProfile,
  saveProfile,
  updateProfileFacts,
  getSessions,
  getSession,
  saveSession,
  getArticles,
  getArticle,
  saveArticle,
  getUsage,
  canGenerateArticle,
  incrementUsage,
  FREE_LIMIT,
  type UserProfile,
  type InterviewSession,
  type GeneratedArticle,
} from "@/lib/storage";

// localStorageのモック
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// windowをjsdom環境で確保
Object.defineProperty(globalThis, "window", {
  value: globalThis,
  writable: true,
});

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

const sampleProfile: UserProfile = {
  name: "テスト太郎",
  bio: "テスト用プロフィール",
  facts: ["エンジニア", "25歳"],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const sampleSession: InterviewSession = {
  id: "session-1",
  title: "テスト記事",
  messages: [
    { role: "assistant", content: "こんにちは" },
    { role: "user", content: "よろしく" },
  ],
  status: "active",
  createdAt: "2024-01-01T00:00:00.000Z",
};

const sampleArticle: GeneratedArticle = {
  id: "article-1",
  sessionId: "session-1",
  title: "テスト記事タイトル",
  content: "テスト記事の本文です。",
  createdAt: "2024-01-01T00:00:00.000Z",
};

describe("プロフィール操作", () => {
  it("saveProfileで保存してgetProfileで取得できること", () => {
    saveProfile(sampleProfile);
    const result = getProfile();
    expect(result).toEqual(sampleProfile);
  });

  it("プロフィールがない場合にnullを返すこと", () => {
    expect(getProfile()).toBeNull();
  });

  it("updateProfileFactsで新しい事実をマージすること", () => {
    saveProfile(sampleProfile);
    updateProfileFacts(["ダーツプロ", "25歳"]); // "25歳"は重複
    const result = getProfile();
    expect(result?.facts).toContain("エンジニア");
    expect(result?.facts).toContain("ダーツプロ");
    expect(result?.facts).toContain("25歳");
    // 重複排除されて3件であること
    expect(result?.facts).toHaveLength(3);
  });

  it("プロフィールがない場合にupdateProfileFactsが何もしないこと", () => {
    updateProfileFacts(["新しい事実"]);
    expect(getProfile()).toBeNull();
  });
});

describe("セッション操作", () => {
  it("saveSessionで保存してgetSessionsで取得できること", () => {
    saveSession(sampleSession);
    const sessions = getSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe("session-1");
  });

  it("getSessionでIDを指定して取得できること", () => {
    saveSession(sampleSession);
    const session = getSession("session-1");
    expect(session?.title).toBe("テスト記事");
  });

  it("存在しないIDの場合にnullを返すこと", () => {
    expect(getSession("not-found")).toBeNull();
  });

  it("同じIDのセッションを更新すること", () => {
    saveSession(sampleSession);
    const updated = { ...sampleSession, title: "更新後のタイトル" };
    saveSession(updated);
    const sessions = getSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].title).toBe("更新後のタイトル");
  });

  it("新しいセッションが先頭に追加されること", () => {
    saveSession(sampleSession);
    saveSession({ ...sampleSession, id: "session-2", title: "2番目" });
    const sessions = getSessions();
    expect(sessions[0].id).toBe("session-2");
  });
});

describe("記事操作", () => {
  it("saveArticleで保存してgetArticlesで取得できること", () => {
    saveArticle(sampleArticle);
    const articles = getArticles();
    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe("テスト記事タイトル");
  });

  it("getArticleでIDを指定して取得できること", () => {
    saveArticle(sampleArticle);
    const article = getArticle("article-1");
    expect(article?.content).toBe("テスト記事の本文です。");
  });

  it("存在しないIDの場合にnullを返すこと", () => {
    expect(getArticle("not-found")).toBeNull();
  });

  it("同じIDの記事を重複保存しないこと", () => {
    saveArticle(sampleArticle);
    saveArticle({ ...sampleArticle, content: "更新された本文" });
    const articles = getArticles();
    expect(articles).toHaveLength(1);
    expect(articles[0].content).toBe("更新された本文");
  });
});

describe("使用量トラッキング", () => {
  it("初期状態でデフォルト値を返すこと", () => {
    const usage = getUsage();
    expect(usage.totalInterviews).toBe(0);
    expect(usage.totalArticles).toBe(0);
    expect(usage.monthlyArticles).toBe(0);
  });

  it("incrementUsageでインタビュー回数が増加すること", () => {
    incrementUsage("interview");
    const usage = getUsage();
    expect(usage.totalInterviews).toBe(1);
  });

  it("incrementUsageで記事回数が増加すること", () => {
    incrementUsage("article");
    const usage = getUsage();
    expect(usage.totalArticles).toBe(1);
    expect(usage.monthlyArticles).toBe(1);
  });

  it("canGenerateArticleが無料制限内でtrueを返すこと", () => {
    expect(canGenerateArticle()).toBe(true);
  });

  it("canGenerateArticleが無料制限を超えるとfalseを返すこと", () => {
    for (let i = 0; i < FREE_LIMIT; i++) {
      incrementUsage("article");
    }
    expect(canGenerateArticle()).toBe(false);
  });
});
