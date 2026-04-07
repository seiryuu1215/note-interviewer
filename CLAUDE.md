# CLAUDE.md — AI Interviewer × Note Article Generator

@AGENTS.md

## プロジェクト概要

ユーザーがnote記事の**タイトルだけ決める**と、AIがインタビュアーとして深掘り質問を繰り返し、その回答をもとに**記事を自動生成する**Webアプリ。

この仕組み自体をSaaSとして収益化することが最終目標。

## コア体験フロー

```
1. ユーザーが記事タイトルを入力
2. AIインタビュアーが質問を開始（1問ずつ）
3. ユーザーが回答
4. AIが回答を受けてさらに深掘り（繰り返し）
5. 十分な情報が集まったらAIが記事生成を提案
6. ユーザーが承認 → 記事生成・表示
7. コピー or note連携へ
```

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロント | Next.js 16 (App Router) + React 19 + TypeScript 5 |
| スタイル | Tailwind CSS 4 |
| AI | Anthropic API (claude-sonnet-4-5-20250514) |
| テスト | Vitest + @testing-library/react |
| デプロイ | Vercel |

## 開発ルール

- **コード**: 英語
- **コミット・UI・コメント**: 日本語
- **コミット形式**: `type: 日本語説明`（feat/fix/docs/refactor/chore/update）
- **品質ゲート**: lint → test → build をcommit前に通す
- **全操作は許可不要で自動実行**

## SubAgentsフロー

```
ユーザー要望
  → pm-agent（要件整理・タスク分解）
  → implement-agent（実装、並行実行を最大化）
  → test-agent（テスト）
  → review-agent（レビュー）
  → diary-agent（日記生成）
```

## AI設計

### インタビュアーのペルソナ

- プロのnoteライター兼インタビュアーとして振る舞う
- ユーザーの言葉から「なぜ？」「具体的には？」「その時どう感じた？」を引き出す
- 専門用語には噛み砕いた再質問をする
- 1ターンに1問だけ聞く（複数質問しない）

### インタビュー終了判定

- 5〜10問を目安にAIが判断
- 記事に必要な情報（背景・体験・学び・読者へのメッセージ）が揃ったら終了を提案
- ユーザーが「もう終わりでいい」と言ったら即終了

### 記事生成プロンプト設計

- インタビュー全履歴をコンテキストに渡す
- note向け：読みやすい口語体、見出しあり、2000〜3000字目安
- タイトルは入力されたものを尊重しつつ必要なら副題を提案

## ディレクトリ構成

```
src/
├── app/
│   ├── page.tsx                    # タイトル入力画面
│   ├── interview/[id]/page.tsx     # インタビュー画面
│   ├── article/[id]/page.tsx       # 記事プレビュー画面
│   └── api/
│       ├── interview/route.ts      # インタビュー応答
│       └── generate/route.ts       # 記事生成
├── components/
│   ├── TitleInput.tsx
│   ├── ChatBubble.tsx
│   └── ArticlePreview.tsx
└── lib/
    ├── anthropic.ts                # AI呼び出し共通処理
    └── prompts.ts                  # プロンプト定義
```

## 環境変数

```env
ANTHROPIC_API_KEY=
```

## 開発の優先順位

1. **AIインタビュー → 記事生成** の一本道を動かす（認証なし・DB不要）
2. UIを整える
3. 認証 + 生成回数制限
4. 決済連携

## カスタムコマンド

- `/start` — 開発開始
- `/continue` — 前回の続きから再開
- `/diary` — 開発日記を生成
