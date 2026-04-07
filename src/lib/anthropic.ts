import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const MODEL = "claude-sonnet-4-5-20250514";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export async function askInterviewer(
  title: string,
  messages: Message[]
): Promise<{ message: string; shouldEnd: boolean }> {
  const systemPrompt = `あなたはプロのnoteライター兼インタビュアーです。

## あなたの役割
ユーザーが「${title}」というタイトルで記事を書きたいと言っています。
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
目安は5〜10問。ユーザーが「もう終わりでいい」等と言ったら即終了。

## 回答フォーマット
必ず以下のJSON形式のみで回答してください（他のテキストは含めない）：
{"message": "質問テキスト", "shouldEnd": false}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // JSONパース失敗時はテキストをそのまま返す
  }

  return { message: text, shouldEnd: false };
}

export async function generateArticle(
  title: string,
  messages: Message[]
): Promise<{ title: string; content: string }> {
  const interviewLog = messages
    .map((m) => `${m.role === "user" ? "回答者" : "インタビュアー"}: ${m.content}`)
    .join("\n\n");

  const response = await client.messages.create({
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
- Markdown形式で出力

## 構成
1. 導入（読者の興味を引く）
2. 背景・きっかけ
3. 体験・エピソード
4. 学び・気づき
5. 読者へのメッセージ（締め）

## タイトル
「${title}」を尊重しつつ、必要なら副題を提案。

## 出力フォーマット
必ず以下のJSON形式のみで回答（他のテキストは含めない）：
{"title": "記事タイトル", "content": "記事本文（Markdown）"}`,
    messages: [
      {
        role: "user",
        content: `以下のインタビュー記録から記事を生成してください：\n\n${interviewLog}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // JSONパース失敗時
  }

  return { title, content: text };
}
