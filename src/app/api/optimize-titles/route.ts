import { optimizeTitles } from "@/lib/anthropic";
import {
  validateTitle,
  validateContent,
  safeErrorDetail,
} from "@/lib/validate";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return Response.json({ error: "不正なリクエストです" }, { status: 400 });
    }

    const b = body as Record<string, unknown>;

    const contentError = validateContent(b.content);
    if (contentError) {
      return Response.json({ error: contentError }, { status: 400 });
    }

    const titleError = validateTitle(b.originalTitle);
    if (titleError) {
      return Response.json({ error: titleError }, { status: 400 });
    }

    const result = await optimizeTitles(
      b.content as string,
      b.originalTitle as string
    );
    return Response.json(result);
  } catch (error) {
    console.error("Optimize titles API error:", error);
    return Response.json(
      { error: "タイトル最適化中にエラーが発生しました", detail: safeErrorDetail(error) },
      { status: 500 }
    );
  }
}
