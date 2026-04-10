"use client";

type ProgressBarProps = {
  current: number;
  total: number;
};

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const percentage = Math.min((current / total) * 100, 100);

  return (
    <div className="px-4 py-2 flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-[var(--input-bg)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={total}
        />
      </div>
      <span className="text-xs text-[var(--muted)] whitespace-nowrap">
        {current} / {total}問目
      </span>
    </div>
  );
}
