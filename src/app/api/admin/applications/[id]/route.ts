import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServiceRoleClient();

  const { data: application, error: fetchError } = await supabase
    .from("applications")
    .select("video_path, status")
    .eq("id", id)
    .single();

  if (fetchError || !application) {
    return NextResponse.json({ error: "申請が見つかりません。" }, { status: 404 });
  }

  const { error: storageError } = await supabase.storage
    .from("videos")
    .remove([application.video_path]);

  if (storageError) {
    return NextResponse.json({ error: "動画ファイルの削除に失敗しました。" }, { status: 500 });
  }

  const { error: deleteError } = await supabase.from("applications").delete().eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: "削除処理に失敗しました。" }, { status: 500 });
  }

  if (application.status === "displaying") {
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
        .update({ status: "displaying", display_order: nextOrder })
        .eq("id", nextInQueue.id);
    }
  }

  return NextResponse.json({ ok: true });
}
