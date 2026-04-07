import Anthropic from "@anthropic-ai/sdk";

export const anthropicClient = new Anthropic();

export const MODEL = "claude-sonnet-4-5-20250929";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

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
  messages: Message[]
): Promise<{ message: string; shouldEnd: boolean }> {
  const response = await anthropicClient.messages.create({
    model: MODEL,
    max_tokens: 1024,
    temperature: 0.5,
    system: `あなたはプロのnoteライター兼インタビュアーです。

## あなたの役割
ユーザーが記事を書きたいと言っています。
最終的に以下の構成で記事を生成するため、必要な情報を引き出すインタビューを行ってください：
1. 導入（読者の興味を引くフック）
2. 背景・きっかけ
3. 具体的な体験・エピソード
4. 学び・気づき
5. 読者へのメッセージ（締め）

## インタビューのルール
- 1ターンにつき1問だけ質問する（複数質問しない）
- ユーザーの言葉から「なぜ？」「具体的には？」「その時どう感じた？」を引き出す
- 専門用語が出たら噛み砕いた再質問をする
- 共感的で温かいトーンを保つ
- ユーザー情報が提供されている場合、既知の情報と重複する質問は避ける

## インタビュー終了の判断
上記5つの構成要素に十分な情報が揃ったと判断したら "shouldEnd" を true にする。
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
    temperature: 0.7,
    system: `あなたはプロのnoteライターです。
以下のインタビュー記録をもとに、note記事を生成してください。

## 記事のルール
- 一人称「僕」、カジュアルだけど芯のあるトーン
- 技術用語は最小限、使う場合は必ず説明
- 段落短め、見出し多め
- **2000〜3000字**で書くこと（短すぎる場合はエピソードを膨らませる）
- 読みやすい口語体
- Markdown形式で出力（見出しは ## から開始、# は使わない）

## 構成（必ずこの順序で）
1. 導入（読者の共感を呼ぶフック、1-2段落）
2. 背景・きっかけ（なぜこのテーマなのか）
3. 体験・エピソード（具体的なストーリー、これがメイン）
4. 学び・気づき（読者にとっての価値）
5. 読者へのメッセージ（行動を促す締め）

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
    temperature: 0.3,
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
