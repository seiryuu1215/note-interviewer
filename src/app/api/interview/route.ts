import { askInterviewer } from "@/lib/anthropic";
import {
  validateTitle,
  validateMessages,
  validateImages,
  safeErrorDetail,
} from "@/lib/validate";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return Response.json({ error: "不正なリクエストです" }, { status: 400 });
    }

    const b = body as Record<string, unknown>;

    const titleError = validateTitle(b.title);
    if (titleError) {
      return Response.json({ error: titleError }, { status: 400 });
    }

    const messagesResult = validateMessages(b.messages);
    if (!messagesResult.valid) {
      return Response.json({ error: messagesResult.error }, { status: 400 });
    }

    const imagesResult = validateImages(b.images);
    if (!imagesResult.valid) {
      return Response.json({ error: imagesResult.error }, { status: 400 });
    }

    const result = await askInterviewer(
      b.title as string,
      messagesResult.data,
      imagesResult.data.length > 0 ? imagesResult.data : undefined
    );
    return Response.json(result);
  } catch (error) {
    console.error("Interview API error:", error);
    return Response.json(
      { error: "インタビュー処理中にエラーが発生しました", detail: safeErrorDetail(error) },
      { status: 500 }
    );
  }
}
