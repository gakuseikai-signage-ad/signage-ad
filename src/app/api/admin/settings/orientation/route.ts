import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  const { orientation } = await req.json();

  if (orientation !== "landscape" && orientation !== "portrait") {
    return NextResponse.json({ error: "不正な向きが指定されました。" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("display_settings")
    .update({ orientation, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) {
    return NextResponse.json({ error: "更新に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, orientation });
}
