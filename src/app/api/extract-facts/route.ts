import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@/lib/anthropic";

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    const { messages } = (await request.json()) as { messages: Message[] };

    const interviewLog = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: `ユーザーのインタビュー回答から、プロフィールに蓄積すべき事実を抽出してください。
箇条書きで、短く具体的に。例：
- フリーランスエンジニア
- 25歳
- ダーツプロ（PERFECT所属）
- Next.js / TypeScript が得意

JSON形式で返してください：{"facts": ["事実1", "事実2", ...]}`,
      messages: [
        { role: "user", content: `以下の回答から事実を抽出：\n${interviewLog}` },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return Response.json(JSON.parse(jsonMatch[0]));
    }
    return Response.json({ facts: [] });
  } catch (error) {
    console.error("Extract facts error:", error);
    return Response.json({ facts: [] });
  }
}
