# Note Interviewer

話すだけで note 記事ができる AI インタビューアプリ。

テーマをふわっと伝えるだけで、AIがインタビュアーとして深掘り質問を繰り返し、あなたの言葉から記事を自動生成します。

## 特徴

- **音声入力対応** — マイクボタンをタップして話すだけ。テキスト入力にも対応
- **テーマ自動分析** — 「最近の転職の話」程度の入力からAIがタイトルと質問を自動生成
- **AI読み上げ** — 質問を音声で読み上げ（ON/OFF切替可能）
- **画像アップロード** — 写真を添付するとAIが認識して質問に活用、記事にも埋め込み
- **プロフィール蓄積** — 使うほどあなたを理解し、質問の精度が向上
- **note向け最適化** — 口語体・見出し多め・2000〜3000字の読みやすい記事
- **セッション保存** — 中断しても続きから再開可能
- **月3記事無料** — 収益化基盤搭載

## フロー

```
1. 書きたいテーマを話す or 入力する
2. AIがテーマを分析してタイトルを提案
3. AIインタビュアーの質問に声で答える（5〜10問）
4. AIが自動的に記事を生成
5. Markdownをコピーしてnoteに投稿
```

## UI

- **録音ブース型** — 常に「今の1問」だけ大きく表示
- **マイクボタンが主役** — テキスト入力はサブ動線
- **これまでの流れ** — 過去のQ&Aを折りたたみパネルで要約表示
- **プログレスバー** — 何問目か一目でわかる

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロント | Next.js 16 + React 19 + TypeScript 5 |
| スタイル | Tailwind CSS 4 |
| AI | Anthropic API (Claude Sonnet 4.5) |
| 音声認識 | Web Speech API（ブラウザネイティブ、追加コスト¥0） |
| 音声読み上げ | Web Speech Synthesis（ブラウザネイティブ、追加コスト¥0） |
| テスト | Vitest + @testing-library/react（76テスト） |
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
│   ├── page.tsx                    # テーマ入力 + 音声対応 + ダッシュボード
│   ├── interview/[id]/page.tsx     # 録音ブース型インタビュー
│   ├── article/[id]/page.tsx       # 記事プレビュー（画像対応）
│   └── api/
│       ├── analyze-theme/route.ts  # テーマ分析 API
│       ├── interview/route.ts      # インタビュー応答 API（画像対応）
│       ├── generate/route.ts       # 記事生成 API
│       └── extract-facts/route.ts  # プロフィール事実抽出 API
├── components/interview/
│   ├── QuestionCard.tsx            # AI質問の大型表示（読み上げ付き）
│   ├── ProgressBar.tsx             # 質問進捗バー
│   ├── FlowSummary.tsx             # 過去Q&A要約パネル
│   ├── VoiceInput.tsx              # 音声/テキスト入力（マイク主動線）
│   └── ImageUpload.tsx             # 画像アップロード（リサイズ対応）
├── hooks/
│   ├── useSpeechRecognition.ts     # 音声認識フック
│   └── useSpeechSynthesis.ts       # 音声読み上げフック
├── lib/
│   ├── anthropic.ts                # AI呼び出し（Vision API対応）
│   ├── prompts.ts                  # プロンプト定義
│   ├── storage.ts                  # localStorage管理
│   └── validate.ts                 # APIリクエストバリデーション
└── types/
    └── speech.d.ts                 # Web Speech API 型定義
```

## 運用コスト

| 項目 | 自分用（月10記事） | SaaS 1,000人 |
|---|---|---|
| Claude API | ¥120〜360 | ¥74,000 |
| 音声認識/読み上げ | ¥0 | ¥0 |
| Vercel | ¥0（Hobby） | ¥3,000（Pro） |
| **合計** | **¥120〜360** | **¥77,000** |

## 収益化ロードマップ

### Phase 1: コア体験（完了）
- [x] テーマ入力 → AIインタビュー → 記事生成
- [x] 音声入力 / テキスト入力
- [x] AI質問読み上げ
- [x] 画像アップロード / 記事埋め込み
- [x] テーマ自動分析
- [x] プロフィール蓄積
- [x] 月3記事の無料枠
- [x] セッション永続化
- [x] APIバリデーション / セキュリティ対策

### Phase 2: 認証 + DB
- [ ] Google OAuth認証
- [ ] サーバーサイドの使用量管理
- [ ] 生成履歴のDB保存（Supabase）

### Phase 3: 決済連携
- [ ] Stripe サブスクリプション
- [ ] 料金プラン（無料 / ライト¥980 / プロ¥2,980）

### Phase 4: プラットフォーム拡張
- [ ] note API連携（直接投稿）
- [ ] テンプレート機能
- [ ] 多言語対応

## 開発

```bash
# ビルド
npm run build

# lint
npx eslint src/

# テスト
npx vitest run

# 開発サーバー
npm run dev
```

## ライセンス

MIT

## 作者

Seiryuu Oikawa ([@seiryuu_darts](https://twitter.com/seiryuu_darts))
