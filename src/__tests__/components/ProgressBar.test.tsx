import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgressBar from "@/components/interview/ProgressBar";

describe("ProgressBar", () => {
  it("現在の問数と合計問数を表示すること", () => {
    render(<ProgressBar current={3} total={10} />);
    expect(screen.getByText("3 / 10問目")).toBeDefined();
  });

  it("プログレスバーのaria属性が正しく設定されること", () => {
    render(<ProgressBar current={5} total={10} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.getAttribute("aria-valuenow")).toBe("5");
    expect(progressbar.getAttribute("aria-valuemin")).toBe("0");
    expect(progressbar.getAttribute("aria-valuemax")).toBe("10");
  });

  it("プログレスバーの幅が正しく計算されること", () => {
    render(<ProgressBar current={5} total={10} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.style.width).toBe("50%");
  });

  it("100%を超えないこと", () => {
    render(<ProgressBar current={15} total={10} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.style.width).toBe("100%");
  });

  it("0/10の場合に0%であること", () => {
    render(<ProgressBar current={0} total={10} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.style.width).toBe("0%");
  });
});
