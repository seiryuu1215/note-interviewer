import Anthropic from "@anthropic-ai/sdk";
import {
  INTERVIEWER_SYSTEM_PROMPT,
  ARTICLE_GENERATOR_SYSTEM_PROMPT,
  FACT_EXTRACTOR_SYSTEM_PROMPT,
  TITLE_OPTIMIZER_SYSTEM_PROMPT,
  MULTI_ARTICLE_SYSTEM_PROMPT,
  THEME_ANALYZER_SYSTEM_PROMPT,
  NOTE_PROFILE_ANALYZER_PROMPT,
  REVIEW_SYSTEM_PROMPT_GENTLE,
  REVIEW_SYSTEM_PROMPT_NORMAL,
  REVIEW_SYSTEM_PROMPT_HARSH,
} from "./prompts";

export const anthropicClient = new Anthropic();

export const MODEL = "claude-sonnet-4-5-20250929";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

// API送信用: 画像を含む可能性がある
type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

type ImageContentBlock = {
  type: "image";
  source: { type: "base64"; media_type: ImageMediaType; data: string };
};
type TextContentBlock = { type: "text"; text: string };
type ApiMessageContent = string | Array<TextContentBlock | ImageContentBlock>;

export type ApiMessage = {
  role: "user" | "assistant";
  content: ApiMessageContent;
};

const SUPPORTED_MEDIA_TYPES = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function parseBase64DataUrl(dataUrl: string): {
  mediaType: ImageMediaType;
  data: string;
} {
  const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid base64 data URL format");
  }
  const rawType = match[1];
  const mediaType = SUPPORTED_MEDIA_TYPES.has(rawType) ? rawType as ImageMediaType : "image/jpeg" as ImageMediaType;
  return { mediaType, data: match[2] };
}

function parseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text);
  } catch {
    // pass
  }

  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {
      // pass
    }
  }

  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

export async function askInterviewer(
  title: string,
  messages: Message[],
  images?: string[]
): Promise<{ message: string; shouldEnd: boolean }> {
  // メッセージをAPI送信用に変換（最後のuserメッセージに画像を添付）
  const apiMessages: ApiMessage[] = messages.map((m, i) => {
    const isLastUserMessage =
      m.role === "user" && i === messages.length - 1 && images && images.length > 0;

    if (isLastUserMessage) {
      const contentBlocks: Array<TextContentBlock | ImageContentBlock> = [
        { type: "text", text: m.content },
        ...images.map((img): ImageContentBlock => {
          const { mediaType, data } = parseBase64DataUrl(img);
          return {
            type: "image",
            source: { type: "base64", media_type: mediaType, data },
          };
        }),
      ];
      return { role: m.role, content: contentBlocks };
    }

    return { role: m.role, content: m.content };
  });

  const response = await anthropicClient.messages.create({
    model: MODEL,
    max_tokens: 1024,
    temperature: 0.5,
    system: INTERVIEWER_SYSTEM_PROMPT,
    messages: apiMessages,
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const parsed = parseJson<{ message: string; shouldEnd: boolean }>(text);
  if (parsed?.message) return parsed;

  return { message: text, shouldEnd: false };
}

export async function generateArticle(
  title: string,
  messages: Message[],
  imageCount?: number
): Promise<{ title: string; content: string }> {
  const interviewLog = messages
    .map(
      (m) =>
        `${m.role === "user" ? "回答者" : "インタビュアー"}: ${m.content}`
    )
    .join("\n\n");

  const imageInstruction =
    imageCount && imageCount > 0
      ? `\n\nユーザーが画像を${imageCount}枚提供しています。記事の適切な位置に${Array.from({ length: imageCount }, (_, i) => `![写真${i + 1}](image-${i + 1})`).join("、")}のようなプレースホルダーを挿入してください。`
      : "";

  const response = await anthropicClient.messages.create({
    model: MODEL,
    max_tokens: 4096,
    temperature: 0.7,
    system: ARTICLE_GENERATOR_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `記事タイトル：「${title}」\n\n以下のインタビュー記録から記事を生成してください：\n\n${interviewLog}${imageInstruction}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const parsed = parseJson<{ title: string; content: string }>(text);
  if (parsed?.title && parsed?.content) return parsed;

  return { title, content: text };
}

export async function extractFacts(
  messages: Message[]
): Promise<{ facts: string[] }> {
  const interviewLog = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");

  const response = await anthropicClient.messages.create({
    model: MODEL,
    max_tokens: 1024,
    temperature: 0.3,
    system: FACT_EXTRACTOR_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `以下の回答から事実を抽出：\n${interviewLog}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const parsed = parseJson<{ facts: string[] }>(text);
  return parsed ?? { facts: [] };
}

// テーマ分析: ふわっとした入力からタイトルと最初の質問を生成
export async function analyzeTheme(
  input: string,
  profile?: { name?: string; bio?: string; facts?: string[] }
): Promise<{ title: string; firstQuestion: string }> {
  // ユーザー情報があればプロンプトに追記
  let systemPrompt = THEME_ANALYZER_SYSTEM_PROMPT;
  if (profile && (profile.name || profile.bio || profile.facts?.length)) {
    const profileLines: string[] = [];
    if (profile.name) profileLines.push(`名前: ${profile.name}`);
    if (profile.bio) profileLines.push(`自己紹介: ${profile.bio}`);
    if (profile.facts?.length) {
      profileLines.push(`既知の事実:\n${profile.facts.map((f) => `- ${f}`).join("\n")}`);
    }
    systemPrompt += `\n\n## ユーザー情報\n${profileLines.join("\n")}`;
  }

  const response = await anthropicClient.messages.create({
    model: MODEL,
    max_tokens: 1024,
    temperature: 0.5,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: input,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const parsed = parseJson<{ title: string; firstQuestion: string }>(text);
  if (parsed?.title && parsed?.firstQuestion) return parsed;

  // フォールバック: パースできなかった場合はそのまま返す
  return {
    title: input,
    firstQuestion: text || "このテーマについて、まず何がきっかけで書きたいと思いましたか？",
  };
}

// タイトル最適化: 記事本文からクリック率の高いタイトル候補を生成
export type TitleSuggestion = {
  title: string;
  approach: string;
  reason: string;
};

export async function optimizeTitles(
  content: string,
  originalTitle: string
): Promise<{ titles: TitleSuggestion[] }> {
  const truncatedContent = content.slice(0, 2000);

  const response = await anthropicClient.messages.create({
    model: MODEL,
    max_tokens: 1024,
    temperature: 0.8,
    system: TITLE_OPTIMIZER_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `元のタイトル：「${originalTitle}」\n\n記事本文：\n${truncatedContent}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const parsed = parseJson<{ titles: TitleSuggestion[] }>(text);
  if (parsed?.titles && Array.isArray(parsed.titles)) return parsed;

  return { titles: [] };
}

// 複数記事生成: 1つのインタビューからテーマ別に3〜5本の記事を生成
export type MultiArticle = {
  title: string;
  content: string;
  theme: string;
  order: number;
};

export async function generateMultipleArticles(
  title: string,
  messages: Message[],
  imageCount?: number
): Promise<{ articles: MultiArticle[] }> {
  const interviewLog = messages
    .map(
      (m) =>
        `${m.role === "user" ? "回答者" : "インタビュアー"}: ${m.content}`
    )
    .join("\n\n");

  const imageInstruction =
    imageCount && imageCount > 0
      ? `\n\nユーザーが画像を${imageCount}枚提供しています。適切な記事に画像プレースホルダーを振り分けてください。`
      : "";

  const response = await anthropicClient.messages.create({
    model: MODEL,
    max_tokens: 8192,
    temperature: 0.7,
    system: MULTI_ARTICLE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `元の記事テーマ：「${title}」\n\n以下のインタビュー記録から、テーマ別に複数の記事を生成してください：\n\n${interviewLog}${imageInstruction}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const parsed = parseJson<{ articles: MultiArticle[] }>(text);
  if (parsed?.articles && Array.isArray(parsed.articles)) return parsed;

  return { articles: [] };
}

// 添削モード: 記事をレビューしてフィードバックを返す
export type ReviewTone = "gentle" | "normal" | "harsh";

const REVIEW_PROMPTS: Record<ReviewTone, string> = {
  gentle: REVIEW_SYSTEM_PROMPT_GENTLE,
  normal: REVIEW_SYSTEM_PROMPT_NORMAL,
  harsh: REVIEW_SYSTEM_PROMPT_HARSH,
};

export async function reviewArticle(
  content: string,
  tone: ReviewTone,
  profile?: { name?: string; noteAnalysis?: string }
): Promise<Record<string, unknown>> {
  let systemPrompt = REVIEW_PROMPTS[tone];

  if (profile && (profile.name || profile.noteAnalysis)) {
    const profileLines: string[] = [];
    if (profile.name) profileLines.push(`著者名: ${profile.name}`);
    if (profile.noteAnalysis) profileLines.push(`文体分析: ${profile.noteAnalysis}`);
    systemPrompt += `\n\n## 著者情報\n${profileLines.join("\n")}`;
  }

  const response = await anthropicClient.messages.create({
    model: MODEL,
    max_tokens: 4096,
    temperature: 0.7,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `以下の記事を添削してください：\n\n${content}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const parsed = parseJson<Record<string, unknown>>(text);
  if (parsed && typeof parsed.score === "number") return parsed;

  // フォールバック: パース失敗時
  return { score: 0, summary: text || "添削結果を取得できませんでした", error: true };
}

// noteプロフィール分析: ユーザーのnote記事から人間性・文体を分析
export async function analyzeNoteProfile(
  profile: { nickname: string; profile: string; noteCount: number; followerCount: number },
  articles: { name: string; body: string; likeCount: number }[]
): Promise<{ analysis: string; topics: string[]; writingStyle: string }> {
  const articleSummaries = articles
    .map(
      (a, i) =>
        `記事${i + 1}: 「${a.name}」（いいね${a.likeCount}件）\n${a.body?.slice(0, 500) ?? "（本文なし）"}`
    )
    .join("\n\n");

  const userContext = [
    `ニックネーム: ${profile.nickname}`,
    `プロフィール: ${profile.profile || "（未設定）"}`,
    `記事数: ${profile.noteCount}`,
    `フォロワー数: ${profile.followerCount}`,
    "",
    "## 最近の記事",
    articleSummaries || "（記事なし）",
  ].join("\n");

  const response = await anthropicClient.messages.create({
    model: MODEL,
    max_tokens: 1024,
    temperature: 0.5,
    system: NOTE_PROFILE_ANALYZER_PROMPT,
    messages: [
      {
        role: "user",
        content: userContext,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const parsed = parseJson<{ analysis: string; topics: string[]; writingStyle: string }>(text);
  if (parsed?.analysis) {
    return {
      analysis: parsed.analysis,
      topics: parsed.topics ?? [],
      writingStyle: parsed.writingStyle ?? "",
    };
  }

  // フォールバック
  return {
    analysis: text || "分析できませんでした",
    topics: [],
    writingStyle: "",
  };
}
