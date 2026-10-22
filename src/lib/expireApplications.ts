import { createServiceRoleClient } from "@/lib/supabase/server";
import { getDeadline } from "@/lib/expiry";

type SupabaseServiceClient = ReturnType<typeof createServiceRoleClient>;

const MAX_DISPLAY_SLOTS = Number(process.env.MAX_DISPLAY_SLOTS ?? 10);

// 表示中(displaying)の申請のうち、申請者が指定した掲載期間(requested_display_days)を
// displaying_started_atから過ぎたものを自動でexpiredへ移行し、空いた枠に待機キューの
// 先頭(reviewed_at最古)から繰り上げる。常駐サーバーを持たない構成のため、ラズパイの
// ポーリング(/api/display/applications)と管理画面表示のたびに呼び出すことで代替する。
export async function expireOverdueApplications(supabase: SupabaseServiceClient) {
  const { data: displaying } = await supabase
    .from("applications")
    .select("id, displaying_started_at, requested_display_days")
    .eq("status", "displaying");

  const now = Date.now();
  const overdue = (displaying ?? []).flatMap((a) => {
    if (!a.displaying_started_at) return [];
    const deadline = getDeadline(a.displaying_started_at, a.requested_display_days);
    return deadline.getTime() <= now ? [{ id: a.id, deadline }] : [];
  });

  // 検知は次回ポーリング時になるため、expired_atには検知時刻ではなく本来の期限を記録する
  for (const o of overdue) {
    await supabase
      .from("applications")
      .update({ status: "expired", display_order: null, expired_at: o.deadline.toISOString() })
      .eq("id", o.id)
      .eq("status", "displaying");
  }

  const { count } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("status", "displaying");

  const freeSlots = MAX_DISPLAY_SLOTS - (count ?? 0);
  if (freeSlots <= 0) return;

  const { data: queued } = await supabase
    .from("applications")
    .select("id")
    .eq("status", "queued")
    .order("reviewed_at", { ascending: true })
    .limit(freeSlots);

  if (!queued || queued.length === 0) return;

  const { data: maxOrderRow } = await supabase
    .from("applications")
    .select("display_order")
    .eq("status", "displaying")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextOrder = (maxOrderRow?.display_order ?? 0) + 1;

  for (const q of queued) {
    await supabase
      .from("applications")
      .update({
        status: "displaying",
        display_order: nextOrder,
        displaying_started_at: new Date().toISOString(),
      })
      .eq("id", q.id);
    nextOrder += 1;
  }
}
