import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

const MAX_VIDEO_DURATION_SECONDS = Number(process.env.MAX_VIDEO_DURATION_SECONDS ?? 30);

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const applicantName = formData.get("applicant_name");
  const applicantType = formData.get("applicant_type");
  const applicantEmail = formData.get("applicant_email");
  const videoDurationSeconds = Number(formData.get("video_duration_seconds"));
  const video = formData.get("video");

  if (
    typeof applicantName !== "string" ||
    typeof applicantType !== "string" ||
    typeof applicantEmail !== "string" ||
    !(video instanceof File)
  ) {
    return NextResponse.json({ error: "入力内容が不正です。" }, { status: 400 });
  }

  if (applicantType !== "group" && applicantType !== "individual") {
    return NextResponse.json({ error: "申請種別が不正です。" }, { status: 400 });
  }

  // ブラウザ側チェックの保険として、サーバー側でも尺の上限を検証する
  if (!Number.isFinite(videoDurationSeconds) || videoDurationSeconds > MAX_VIDEO_DURATION_SECONDS) {
    return NextResponse.json(
      { error: `動画の尺は${MAX_VIDEO_DURATION_SECONDS}秒以内にしてください。` },
      { status: 400 }
    );
  }

  const supabase = createServiceRoleClient();

  const fileExt = video.name.split(".").pop() ?? "mp4";
  const videoPath = `${crypto.randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("videos")
    .upload(videoPath, video, { contentType: video.type });

  if (uploadError) {
    return NextResponse.json({ error: "動画のアップロードに失敗しました。" }, { status: 500 });
  }

  const { error: insertError } = await supabase.from("applications").insert({
    applicant_name: applicantName,
    applicant_type: applicantType,
    applicant_email: applicantEmail,
    video_path: videoPath,
    video_duration_seconds: videoDurationSeconds,
    status: "pending",
  });

  if (insertError) {
    await supabase.storage.from("videos").remove([videoPath]);
    return NextResponse.json({ error: "申請の登録に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
