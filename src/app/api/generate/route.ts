import { generateArticle } from "@/lib/anthropic";
import {
  validateTitle,
  validateMessages,
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

    const imageCount =
      typeof b.imageCount === "number" && b.imageCount >= 0
        ? Math.min(b.imageCount, 5)
        : undefined;

    const preferences = (
      typeof b.preferences === "object" && b.preferences !== null
    ) ? b.preferences as import("@/lib/storage").UserPreferences : undefined;

    const result = await generateArticle(
      b.title as string,
      messagesResult.data,
      imageCount,
      preferences
    );
    return Response.json(result);
  } catch (error) {
    console.error("Generate API error:", error);
    return Response.json(
      { error: "記事生成中にエラーが発生しました", detail: safeErrorDetail(error) },
      { status: 500 }
    );
  }
}
