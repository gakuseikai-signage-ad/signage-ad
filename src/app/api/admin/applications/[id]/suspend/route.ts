import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

const MAX_DISPLAY_SLOTS = Number(process.env.MAX_DISPLAY_SLOTS ?? 10);

// 表示中の申請を即座にローテーションから外す(データは削除しない)。
// トラブル発生時などに、学生会が完全削除より先に使う想定の緊急停止操作。
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("applications")
    .update({ status: "expired", display_order: null, expired_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "displaying");

  if (error) {
    return NextResponse.json({ error: "取り下げ処理に失敗しました。" }, { status: 500 });
  }

  const { count } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("status", "displaying");

  const hasFreeSlot = (count ?? 0) < MAX_DISPLAY_SLOTS;

  if (hasFreeSlot) {
    const { data: nextInQueue } = await supabase
      .from("applications")
      .select("id")
      .eq("status", "queued")
      .order("reviewed_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextInQueue) {
      const { data: maxOrderRow } = await supabase
        .from("applications")
        .select("display_order")
        .eq("status", "displaying")
        .order("display_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrder = (maxOrderRow?.display_order ?? 0) + 1;

      await supabase
        .from("applications")
        .update({
          status: "displaying",
          display_order: nextOrder,
          displaying_started_at: new Date().toISOString(),
        })
        .eq("id", nextInQueue.id);
    }
  }

  return NextResponse.json({ ok: true });
}
