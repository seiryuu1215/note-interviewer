import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FlowSummary from "@/components/interview/FlowSummary";

describe("FlowSummary", () => {
  const messages = [
    { role: "assistant" as const, content: "最初の質問です" },
    { role: "user" as const, content: "最初の回答です" },
    { role: "assistant" as const, content: "2番目の質問です" },
    { role: "user" as const, content: "2番目の回答です" },
  ];

  it("Q&Aペア数を表示すること", () => {
    render(<FlowSummary messages={messages} />);
    expect(screen.getByText("これまでの流れ（2問）")).toBeDefined();
  });

  it("初期状態では詳細が非表示であること", () => {
    render(<FlowSummary messages={messages} />);
    expect(screen.queryByText(/Q1\./)).toBeNull();
  });

  it("ボタンクリックで詳細が表示されること", () => {
    render(<FlowSummary messages={messages} />);
    fireEvent.click(screen.getByText("これまでの流れ（2問）"));
    expect(screen.getByText(/Q1\./)).toBeDefined();
    expect(screen.getByText(/Q2\./)).toBeDefined();
  });

  it("再度クリックで詳細が非表示になること", () => {
    render(<FlowSummary messages={messages} />);
    const button = screen.getByText("これまでの流れ（2問）");
    fireEvent.click(button);
    fireEvent.click(button);
    expect(screen.queryByText(/Q1\./)).toBeNull();
  });

  it("Q&Aペアがない場合にnullを返すこと", () => {
    const { container } = render(<FlowSummary messages={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("assistantのみでuserの回答がない場合は表示しないこと", () => {
    const incompleteMessages = [
      { role: "assistant" as const, content: "質問です" },
    ];
    const { container } = render(
      <FlowSummary messages={incompleteMessages} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("aria-expanded属性が正しく切り替わること", () => {
    render(<FlowSummary messages={messages} />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
  });

  it("長いテキストが30文字で切り詰められること", () => {
    const longMessages = [
      {
        role: "assistant" as const,
        content: "これはとても長い質問テキストで、30文字を超えているはずです。",
      },
      {
        role: "user" as const,
        content: "これはとても長い回答テキストで、30文字を超えているはずです。",
      },
    ];
    render(<FlowSummary messages={longMessages} />);
    fireEvent.click(screen.getByRole("button"));
    // 30文字+「...」で切り詰められているか確認
    const q1Text = screen.getByText(/Q1\./);
    expect(q1Text.textContent).toContain("...");
  });
});
