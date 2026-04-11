"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

type Tab = {
  label: string;
  path: string;
  matchPrefix?: boolean;
};

const tabs: Tab[] = [
  { label: "ホーム", path: "/" },
  { label: "インタビュー", path: "/interview", matchPrefix: true },
  { label: "記事", path: "/article", matchPrefix: true },
  { label: "添削", path: "/review" },
  { label: "設定", path: "/settings" },
];

export default function StatusBar() {
  const pathname = usePathname();

  const isActive = (tab: Tab) => {
    if (tab.matchPrefix) {
      return pathname.startsWith(tab.path);
    }
    return pathname === tab.path;
  };

  return (
    <header className="flex items-center justify-between bg-[var(--statusbar-bg)] border-b border-[var(--card-border)] px-2 h-9 shrink-0">
      <nav className="flex items-center gap-0 overflow-x-auto">
        {tabs.map((tab) => (
          <Link
            key={tab.path}
            href={tab.path}
            className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap border-b-2 ${
              isActive(tab)
                ? "text-[var(--foreground)] border-[var(--accent)] bg-[var(--background)]"
                : "text-[var(--muted)] border-transparent hover:text-[var(--foreground)] hover:bg-[var(--background)]"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <ThemeToggle />
    </header>
  );
}
