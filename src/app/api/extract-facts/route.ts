import { extractFacts } from "@/lib/anthropic";
import { validateMessages } from "@/lib/validate";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return Response.json({ facts: [] });
    }

    const messagesResult = validateMessages(
      (body as Record<string, unknown>).messages
    );
    if (!messagesResult.valid) {
      return Response.json({ facts: [] });
    }

    const result = await extractFacts(messagesResult.data);
    return Response.json(result);
  } catch (error) {
    console.error("Extract facts error:", error);
    return Response.json({ facts: [] });
  }
}
