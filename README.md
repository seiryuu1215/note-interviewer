# Note Interviewer

AIインタビューで note 記事を自動生成するWebアプリ。

タイトルを入力するだけで、AIがインタビュアーとして質問を重ね、あなたの言葉から記事を自動生成します。

## 特徴

- **対話型の記事作成** — チャット形式でAIの質問に答えるだけ
- **プロフィール蓄積** — 使うほどあなたを理解し、質問の精度が向上
- **note向け最適化** — 口語体・見出し多め・2000〜3000字の読みやすい記事
- **Markdownコピー** — 生成した記事をワンクリックでnoteに貼り付け
- **セッション保存** — 中断しても続きから再開可能
- **月3記事無料** — 収益化基盤搭載（認証・決済は後続フェーズ）

## フロー

```
1. タイトルを入力
2. AIインタビュアーの質問に答える（5〜10問）
3. AIが自動的に記事を生成
4. Markdownをコピーしてnoteに投稿
```

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロント | Next.js 16 + React 19 + TypeScript 5 |
| スタイル | Tailwind CSS 4 |
| AI | Anthropic API (Claude Sonnet 4.5) |
| テスト | Vitest + @testing-library/react |
| デプロイ | Vercel |

## セットアップ

```bash
# インストール
npm install

# 環境変数を設定
echo "ANTHROPIC_API_KEY=your-key-here" > .env.local

# 開発サーバー起動
npm run dev
```

[Anthropic Console](https://console.anthropic.com/settings/keys) でAPIキーを取得してください。

## 環境変数

| 変数名 | 必須 | 説明 |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API キー |

## プロジェクト構成

```
src/
├── app/
│   ├── page.tsx                    # タイトル入力 + ダッシュボード
│   ├── interview/[id]/page.tsx     # チャット形式インタビュー
│   ├── article/[id]/page.tsx       # 記事プレビュー + コピー
│   └── api/
│       ├── interview/route.ts      # インタビュー応答 API
│       ├── generate/route.ts       # 記事生成 API
│       └── extract-facts/route.ts  # プロフィール事実抽出 API
├── components/
│   └── ChatBubble.tsx              # チャットバブル（memo最適化）
└── lib/
    ├── anthropic.ts                # AI呼び出し + JSONパーサー
    └── storage.ts                  # localStorage管理（プロフィール/セッション/記事/使用量）
```

## SubAgent構成

```
ユーザー要望
  → pm-agent（要件整理・タスク分解）
  → implement-agent（実装）
  → test-agent（テスト）
  → review-agent（レビュー）
  → diary-agent（日記生成）
```

## 収益化ロードマップ

### Phase 1: MVP（現在）
- [x] インタビュー → 記事生成の一本道フロー
- [x] プロフィール蓄積
- [x] 月3記事の無料枠（クライアントサイド）
- [x] セッション永続化

### Phase 2: 認証 + 使用量管理
- [ ] Google OAuth認証（NextAuth.js）
- [ ] サーバーサイドの使用量管理
- [ ] ユーザーダッシュボード
- [ ] 生成履歴のDB保存（Supabase）

### Phase 3: 決済連携
- [ ] Stripe サブスクリプション
- [ ] 料金プラン（無料 / Pro / Business）
- [ ] APIキーの代理管理（ユーザーのキー不要に）

### Phase 4: プラットフォーム拡張
- [ ] note API連携（直接投稿）
- [ ] テンプレート機能（記事スタイルの保存）
- [ ] チーム機能（編集者の招待）
- [ ] 多言語対応

## 料金プラン（予定）

| プラン | 月額 | 記事数 | 機能 |
|---|---|---|---|
| Free | ¥0 | 3記事/月 | 基本機能 |
| Pro | ¥980 | 30記事/月 | プロフィール蓄積 + テンプレート |
| Business | ¥2,980 | 無制限 | チーム + API連携 + 優先サポート |

## 開発

```bash
# ビルド
npm run build

# lint
npm run lint

# 開発サーバー
npm run dev
```

## ライセンス

MIT

## 作者

Seiryuu Oikawa ([@seiryuu_darts](https://twitter.com/seiryuu_darts))
