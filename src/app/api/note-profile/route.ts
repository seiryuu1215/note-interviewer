import { analyzeNoteProfile } from "@/lib/anthropic";
import { safeErrorDetail } from "@/lib/validate";

// noteの公開APIレスポンスの型定義
type NoteCreatorData = {
  nickname: string;
  urlname: string;
  profile: string;
  noteCount: number;
  followerCount: number;
  followingCount: number;
};

type NoteArticle = {
  name: string;
  body: string;
  likeCount: number;
  publishAt: string;
  description: string;
};

type NoteCreatorResponse = {
  data: NoteCreatorData;
};

type NoteContentsResponse = {
  data: {
    contents: NoteArticle[];
    totalCount: number;
    isLastPage: boolean;
  };
};

function isNoteCreatorResponse(data: unknown): data is NoteCreatorResponse {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.data !== "object" || obj.data === null) return false;
  const d = obj.data as Record<string, unknown>;
  return (
    typeof d.nickname === "string" &&
    typeof d.urlname === "string" &&
    typeof d.noteCount === "number"
  );
}

function isNoteContentsResponse(data: unknown): data is NoteContentsResponse {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.data !== "object" || obj.data === null) return false;
  const d = obj.data as Record<string, unknown>;
  return Array.isArray(d.contents);
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return Response.json({ error: "不正なリクエストです" }, { status: 400 });
    }

    const b = body as Record<string, unknown>;
    const urlname = b.urlname;

    if (typeof urlname !== "string" || !urlname.trim()) {
      return Response.json(
        { error: "urlnameは必須の文字列です" },
        { status: 400 }
      );
    }

    // urlnameのバリデーション（英数字・ハイフン・アンダースコアのみ）
    const sanitized = urlname.trim().toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(sanitized)) {
      return Response.json(
        { error: "無効なユーザー名です" },
        { status: 400 }
      );
    }

    // noteプロフィール取得
    const profileRes = await fetch(
      `https://note.com/api/v2/creators/${sanitized}`,
      {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!profileRes.ok) {
      if (profileRes.status === 404) {
        return Response.json({ exists: false });
      }
      return Response.json(
        { exists: false, error: "noteのAPIにアクセスできませんでした" },
        { status: 502 }
      );
    }

    const profileData: unknown = await profileRes.json();
    if (!isNoteCreatorResponse(profileData)) {
      return Response.json(
        { exists: false, error: "プロフィールデータの形式が不正です" },
        { status: 502 }
      );
    }

    const creator = profileData.data;

    // 記事一覧取得
    let articles: NoteArticle[] = [];
    try {
      const contentsRes = await fetch(
        `https://note.com/api/v2/creators/${sanitized}/contents?kind=note&page=1&per=10`,
        {
          headers: { "Accept": "application/json" },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (contentsRes.ok) {
        const contentsData: unknown = await contentsRes.json();
        if (isNoteContentsResponse(contentsData)) {
          articles = contentsData.data.contents;
        }
      }
    } catch {
      // 記事取得失敗は無視（プロフィールだけでも返す）
    }

    // AIで分析
    const analysisResult = await analyzeNoteProfile(
      {
        nickname: creator.nickname,
        profile: creator.profile ?? "",
        noteCount: creator.noteCount,
        followerCount: creator.followerCount,
      },
      articles.map((a) => ({
        name: a.name,
        body: a.body ?? a.description ?? "",
        likeCount: a.likeCount ?? 0,
      }))
    );

    return Response.json({
      exists: true,
      profile: {
        nickname: creator.nickname,
        urlname: creator.urlname,
        bio: creator.profile ?? "",
        noteCount: creator.noteCount,
        followerCount: creator.followerCount,
      },
      articleCount: articles.length,
      analysis: analysisResult.analysis,
      topics: analysisResult.topics,
      writingStyle: analysisResult.writingStyle,
    });
  } catch (error) {
    console.error("Note profile API error:", error);
    return Response.json(
      {
        error: "noteプロフィールの取得中にエラーが発生しました",
        detail: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}
