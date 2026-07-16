import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendRejectionEmail } from "@/lib/mail";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  const { id } = await params;
  const { reason } = await req.json();

  if (typeof reason !== "string" || !reason) {
    return NextResponse.json({ error: "却下理由を選択してください。" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: application, error: fetchError } = await supabase
    .from("applications")
    .select("applicant_name, applicant_email")
    .eq("id", id)
    .single();

  if (fetchError || !application) {
    return NextResponse.json({ error: "申請が見つかりません。" }, { status: 404 });
  }

  const { error } = await supabase
    .from("applications")
    .update({
      status: "rejected",
      rejection_reason: reason,
      reviewed_by: session.user.email,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "却下処理に失敗しました。" }, { status: 500 });
  }

  try {
    await sendRejectionEmail(application.applicant_email, application.applicant_name, reason);
  } catch {
    // メール送信に失敗しても却下処理自体は成立させる(要ログ整備は将来対応)
  }

  return NextResponse.json({ ok: true });
}
