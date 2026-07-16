import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// ラズパイの表示クライアントが定期的に叩く公開エンドポイント。認証不要。
export async function GET() {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("applications")
    .select("id, applicant_name, video_path, display_order")
    .eq("status", "displaying")
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "取得に失敗しました。" }, { status: 500 });
  }

  const items = (data ?? []).map((a) => ({
    id: a.id,
    applicantName: a.applicant_name,
    videoUrl: supabase.storage.from("videos").getPublicUrl(a.video_path).data.publicUrl,
    order: a.display_order,
  }));

  return NextResponse.json({ items });
}
