import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

const MAX_DISPLAY_SLOTS = Number(process.env.MAX_DISPLAY_SLOTS ?? 10);

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

  const { count } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("status", "displaying");

  const displayingCount = count ?? 0;
  const hasSlot = displayingCount < MAX_DISPLAY_SLOTS;

  if (hasSlot) {
    const { data: maxOrderRow } = await supabase
      .from("applications")
      .select("display_order")
      .eq("status", "displaying")
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (maxOrderRow?.display_order ?? 0) + 1;

    const { error } = await supabase
      .from("applications")
      .update({
        status: "displaying",
        display_order: nextOrder,
        reviewed_by: session.user.email,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "承認処理に失敗しました。" }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from("applications")
      .update({
        status: "queued",
        reviewed_by: session.user.email,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "承認処理に失敗しました。" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, status: hasSlot ? "displaying" : "queued" });
}
