import { reviewArticle, type ReviewTone } from "@/lib/anthropic";
import { safeErrorDetail } from "@/lib/validate";

const MAX_CONTENT_LENGTH = 10000;
const VALID_TONES = new Set<string>(["gentle", "normal", "harsh"]);

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return Response.json({ error: "不正なリクエストです" }, { status: 400 });
    }

    const b = body as Record<string, unknown>;

    // content バリデーション
    if (typeof b.content !== "string" || !b.content.trim()) {
      return Response.json(
        { error: "記事の内容を入力してください" },
        { status: 400 }
      );
    }
    if (b.content.length > MAX_CONTENT_LENGTH) {
      return Response.json(
        { error: `記事は最大${MAX_CONTENT_LENGTH}文字までです` },
        { status: 400 }
      );
    }

    // tone バリデーション
    if (typeof b.tone !== "string" || !VALID_TONES.has(b.tone)) {
      return Response.json(
        { error: "toneはgentle、normal、harshのいずれかを指定してください" },
        { status: 400 }
      );
    }

    const tone = b.tone as ReviewTone;

    // profile（オプション）
    const profile =
      typeof b.profile === "object" && b.profile !== null
        ? (b.profile as { name?: string; noteAnalysis?: string })
        : undefined;

    const result = await reviewArticle(b.content, tone, profile);
    return Response.json(result);
  } catch (error) {
    console.error("Review API error:", error);
    return Response.json(
      {
        error: "添削中にエラーが発生しました",
        detail: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}
