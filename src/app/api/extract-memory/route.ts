import { extractMemory } from "@/lib/anthropic";
import {
  validateMessages,
  safeErrorDetail,
} from "@/lib/validate";
import type { UserMemory } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return Response.json({ error: "不正なリクエストです" }, { status: 400 });
    }

    const b = body as Record<string, unknown>;

    const messagesResult = validateMessages(b.messages);
    if (!messagesResult.valid) {
      return Response.json({ error: messagesResult.error }, { status: 400 });
    }

    const existingMemory = (
      typeof b.existingMemory === "object" && b.existingMemory !== null
    ) ? b.existingMemory as UserMemory : undefined;

    const result = await extractMemory(messagesResult.data, existingMemory);
    return Response.json(result);
  } catch (error) {
    console.error("Extract memory API error:", error);
    return Response.json(
      { error: "記憶抽出中にエラーが発生しました", detail: safeErrorDetail(error) },
      { status: 500 }
    );
  }
}
