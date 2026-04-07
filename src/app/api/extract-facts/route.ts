import { extractFacts, type Message } from "@/lib/anthropic";

export async function POST(request: Request) {
  try {
    const { messages } = (await request.json()) as { messages: Message[] };

    if (!Array.isArray(messages)) {
      return Response.json({ facts: [] });
    }

    const result = await extractFacts(messages);
    return Response.json(result);
  } catch (error) {
    console.error("Extract facts error:", error);
    return Response.json({ facts: [] });
  }
}
