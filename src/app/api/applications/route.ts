import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

const MAX_VIDEO_DURATION_SECONDS = Number(process.env.MAX_VIDEO_DURATION_SECONDS ?? 30);
const IMAGE_DISPLAY_SECONDS = 10;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

// File.type はクライアントの自己申告であり偽装可能なため、先頭バイト(マジックナンバー)で実体を確認する
async function sniffMediaType(file: File): Promise<"image" | "video" | null> {
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return "image"; // JPEG
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) return "image"; // PNG
  if (
    header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
    header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50
  ) {
    return "image"; // WEBP (RIFF....WEBP)
  }
  if (header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70) return "video"; // MP4/MOV (ftyp)
  if (header[0] === 0x1a && header[1] === 0x45 && header[2] === 0xdf && header[3] === 0xa3) return "video"; // WebM

  return null;
}

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

  const declaredIsImage = ALLOWED_IMAGE_TYPES.includes(video.type);
  const declaredIsVideo = ALLOWED_VIDEO_TYPES.includes(video.type);
  if (!declaredIsImage && !declaredIsVideo) {
    return NextResponse.json({ error: "対応していないファイル形式です。" }, { status: 400 });
  }

  const sniffed = await sniffMediaType(video);
  if (sniffed !== (declaredIsImage ? "image" : "video")) {
    return NextResponse.json(
      { error: "ファイルの内容が申請された形式と一致しません。" },
      { status: 400 }
    );
  }

  const isImage = declaredIsImage;
  const mediaType = isImage ? "image" : "video";

  let durationSeconds = IMAGE_DISPLAY_SECONDS;
  if (!isImage) {
    // ブラウザ側チェックの保険として、サーバー側でも尺の上限を検証する
    if (!Number.isFinite(videoDurationSeconds) || videoDurationSeconds > MAX_VIDEO_DURATION_SECONDS) {
      return NextResponse.json(
        { error: `動画の尺は${MAX_VIDEO_DURATION_SECONDS}秒以内にしてください。` },
        { status: 400 }
      );
    }
    durationSeconds = videoDurationSeconds;
  }

  const supabase = createServiceRoleClient();

  const fileExt = video.name.split(".").pop() ?? (isImage ? "jpg" : "mp4");
  const videoPath = `${crypto.randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("videos")
    .upload(videoPath, video, { contentType: video.type });

  if (uploadError) {
    return NextResponse.json({ error: "ファイルのアップロードに失敗しました。" }, { status: 500 });
  }

  const { error: insertError } = await supabase.from("applications").insert({
    applicant_name: applicantName,
    applicant_type: applicantType,
    applicant_email: applicantEmail,
    video_path: videoPath,
    video_duration_seconds: durationSeconds,
    media_type: mediaType,
    status: "pending",
  });

  if (insertError) {
    await supabase.storage.from("videos").remove([videoPath]);
    return NextResponse.json({ error: "申請の登録に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
