import { askInterviewer, type Message } from "@/lib/anthropic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, messages } = body as {
      title: string;
      messages: Message[];
    };

    if (
      !title ||
      !Array.isArray(messages) ||
      messages.some((m) => !m.role || !m.content)
    ) {
      return Response.json(
        { error: "title（文字列）と messages（配列）は必須です" },
        { status: 400 }
      );
    }

    const result = await askInterviewer(title, messages);
    return Response.json(result);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("Interview API error:", detail);
    return Response.json(
      { error: "インタビュー処理中にエラーが発生しました", detail },
      { status: 500 }
    );
  }
}
