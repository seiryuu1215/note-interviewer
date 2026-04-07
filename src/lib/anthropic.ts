import Anthropic from "@anthropic-ai/sdk";

export const anthropicClient = new Anthropic();

export const MODEL = "claude-sonnet-4-5-20250929";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

function parseJson<T>(text: string): T | null {
  // まず全体をそのまま試す
  try {
    return JSON.parse(text);
  } catch {
    // pass
  }

  // ```json ブロックを探す
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {
      // pass
    }
  }

  // 最初の { から対応する } までを追跡
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
  messages: Message[]
): Promise<{ message: string; shouldEnd: boolean }> {
  const response = await anthropicClient.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: `あなたはプロのnoteライター兼インタビュアーです。

## あなたの役割
ユーザーが記事を書きたいと言っています。
記事に必要な情報を引き出すためのインタビューを行ってください。

## インタビューのルール
- 1ターンにつき1問だけ質問する（複数質問しない）
- ユーザーの言葉から「なぜ？」「具体的には？」「その時どう感じた？」を引き出す
- 専門用語が出たら噛み砕いた再質問をする
- 共感的で温かいトーンを保つ

## インタビュー終了の判断
以下の情報が揃ったと判断したら "shouldEnd" を true にする：
- 背景・きっかけ
- 具体的な体験・エピソード
- そこから得た学び・気づき
- 読者へのメッセージ
目安は5〜10問。ユーザーが「もう終わりでいい」「十分」等と言ったら即終了。

## 回答フォーマット
必ず以下のJSON形式のみで回答してください（他のテキストは含めない）：
{"message": "質問テキスト", "shouldEnd": false}`,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const parsed = parseJson<{ message: string; shouldEnd: boolean }>(text);
  if (parsed?.message) return parsed;

  return { message: text, shouldEnd: false };
}

export async function generateArticle(
  title: string,
  messages: Message[]
): Promise<{ title: string; content: string }> {
  const interviewLog = messages
    .map(
      (m) =>
        `${m.role === "user" ? "回答者" : "インタビュアー"}: ${m.content}`
    )
    .join("\n\n");

  const response = await anthropicClient.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: `あなたはプロのnoteライターです。
以下のインタビュー記録をもとに、note記事を生成してください。

## 記事のルール
- 一人称「僕」、カジュアルだけど芯のあるトーン
- 技術用語は最小限、使う場合は必ず説明
- 段落短め、見出し多め
- 2000〜3000字目安
- 読みやすい口語体
- Markdown形式で出力（見出しは ## から開始、# は使わない）

## 構成
1. 導入（読者の興味を引く）
2. 背景・きっかけ
3. 体験・エピソード
4. 学び・気づき
5. 読者へのメッセージ（締め）

## 出力フォーマット
必ず以下のJSON形式のみで回答してください。contentにはMarkdown文字列を入れてください：
{"title": "記事タイトル", "content": "記事本文"}`,
    messages: [
      {
        role: "user",
        content: `記事タイトル：「${title}」\n\n以下のインタビュー記録から記事を生成してください：\n\n${interviewLog}`,
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
    system: `ユーザーのインタビュー回答から、プロフィールに蓄積すべき事実を抽出してください。
箇条書きで、短く具体的に。例：
- フリーランスエンジニア
- 25歳
- ダーツプロ（PERFECT所属）

JSON形式で返してください：{"facts": ["事実1", "事実2", ...]}`,
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
