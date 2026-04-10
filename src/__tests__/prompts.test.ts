import { describe, it, expect } from "vitest";
import {
  INTERVIEWER_SYSTEM_PROMPT,
  ARTICLE_GENERATOR_SYSTEM_PROMPT,
  FACT_EXTRACTOR_SYSTEM_PROMPT,
  THEME_ANALYZER_SYSTEM_PROMPT,
} from "@/lib/prompts";

describe("プロンプト定数", () => {
  it("INTERVIEWER_SYSTEM_PROMPTが空でない文字列であること", () => {
    expect(typeof INTERVIEWER_SYSTEM_PROMPT).toBe("string");
    expect(INTERVIEWER_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it("ARTICLE_GENERATOR_SYSTEM_PROMPTが空でない文字列であること", () => {
    expect(typeof ARTICLE_GENERATOR_SYSTEM_PROMPT).toBe("string");
    expect(ARTICLE_GENERATOR_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it("FACT_EXTRACTOR_SYSTEM_PROMPTが空でない文字列であること", () => {
    expect(typeof FACT_EXTRACTOR_SYSTEM_PROMPT).toBe("string");
    expect(FACT_EXTRACTOR_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it("THEME_ANALYZER_SYSTEM_PROMPTが空でない文字列であること", () => {
    expect(typeof THEME_ANALYZER_SYSTEM_PROMPT).toBe("string");
    expect(THEME_ANALYZER_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it("インタビュアープロンプトにJSON形式の指示が含まれること", () => {
    expect(INTERVIEWER_SYSTEM_PROMPT).toContain("shouldEnd");
    expect(INTERVIEWER_SYSTEM_PROMPT).toContain("message");
  });

  it("記事生成プロンプトにnote向けの文体指示が含まれること", () => {
    expect(ARTICLE_GENERATOR_SYSTEM_PROMPT).toContain("僕");
    expect(ARTICLE_GENERATOR_SYSTEM_PROMPT).toContain("Markdown");
  });

  it("テーマ分析プロンプトにfirstQuestionキーが含まれること", () => {
    expect(THEME_ANALYZER_SYSTEM_PROMPT).toContain("firstQuestion");
  });
});
