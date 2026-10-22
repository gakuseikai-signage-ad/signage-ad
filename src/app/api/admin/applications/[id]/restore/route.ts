import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

const MAX_DISPLAY_SLOTS = Number(process.env.MAX_DISPLAY_SLOTS ?? 10);

// 期限切れ(expired)の申請を表示中または待機キューへ戻す。
// 掲載期間は戻した時点(待機キューの場合は繰り上がった時点)から希望期間分を数え直す。
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const target = body.target;
  if (target !== "displaying" && target !== "queued") {
    return NextResponse.json({ error: "戻し先の指定が不正です。" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  if (target === "displaying") {
    const { count } = await supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "displaying");

    if ((count ?? 0) >= MAX_DISPLAY_SLOTS) {
      return NextResponse.json(
        { error: `表示中が上限(${MAX_DISPLAY_SLOTS}件)に達しています。待機キューに戻してください。` },
        { status: 409 }
      );
    }

    const { data: maxOrderRow } = await supabase
      .from("applications")
      .select("display_order")
      .eq("status", "displaying")
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (maxOrderRow?.display_order ?? 0) + 1;

    const { data, error } = await supabase
      .from("applications")
      .update({
        status: "displaying",
        display_order: nextOrder,
        reviewed_by: session.user.email,
        reviewed_at: now,
        displaying_started_at: now,
        expired_at: null,
      })
      .eq("id", id)
      .eq("status", "expired")
      .select("id");

    if (error) {
      return NextResponse.json({ error: "表示中へ戻す処理に失敗しました。" }, { status: 500 });
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "期限切れの申請が見つかりません。" }, { status: 404 });
    }
  } else {
    // 待機キューはreviewed_at順のため、戻した申請は末尾に並ぶ
    const { data, error } = await supabase
      .from("applications")
      .update({
        status: "queued",
        display_order: null,
        reviewed_by: session.user.email,
        reviewed_at: now,
        expired_at: null,
      })
      .eq("id", id)
      .eq("status", "expired")
      .select("id");

    if (error) {
      return NextResponse.json({ error: "待機キューへ戻す処理に失敗しました。" }, { status: 500 });
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "期限切れの申請が見つかりません。" }, { status: 404 });
    }
  }

  return NextResponse.json({ ok: true, status: target });
}
