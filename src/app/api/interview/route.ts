import { askInterviewer, type Message } from "@/lib/anthropic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, messages } = body as {
      title: string;
      messages: Message[];
    };

    if (!title || !messages) {
      return Response.json(
        { error: "title と messages は必須です" },
        { status: 400 }
      );
    }

    const result = await askInterviewer(title, messages);
    return Response.json(result);
  } catch (error) {
    console.error("Interview API error:", error);
    return Response.json(
      { error: "インタビュー処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
