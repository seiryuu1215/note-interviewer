import { NextResponse } from "next/server";
import { analyzeTheme } from "@/lib/anthropic";
import { safeErrorDetail } from "@/lib/validate";

const MAX_INPUT_LENGTH = 500;

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      !("input" in body) ||
      typeof (body as Record<string, unknown>).input !== "string" ||
      !(body as Record<string, unknown>).input
    ) {
      return NextResponse.json(
        { error: "input（文字列）は必須です" },
        { status: 400 }
      );
    }

    const b = body as Record<string, unknown>;
    const input = (b.input as string).slice(0, MAX_INPUT_LENGTH);

    // profileのバリデーション（オプショナル）
    let profile: { name?: string; bio?: string; facts?: string[] } | undefined;
    if (b.profile && typeof b.profile === "object") {
      const p = b.profile as Record<string, unknown>;
      profile = {
        name: typeof p.name === "string" ? p.name.slice(0, 100) : undefined,
        bio: typeof p.bio === "string" ? p.bio.slice(0, 500) : undefined,
        facts: Array.isArray(p.facts)
          ? p.facts
              .filter((f): f is string => typeof f === "string")
              .slice(0, 20)
          : undefined,
      };
    }

    const result = await analyzeTheme(input, profile);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Analyze theme API error:", error);
    return NextResponse.json(
      { error: "テーマ分析中にエラーが発生しました", detail: safeErrorDetail(error) },
      { status: 500 }
    );
  }
}
