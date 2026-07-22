"use client";

import { useState } from "react";

const MAX_VIDEO_DURATION_SECONDS = 30;
const IMAGE_DISPLAY_SECONDS = 10;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

type SubmitState = "idle" | "submitting" | "done" | "error";

export default function ApplyPage() {
  const [applicantName, setApplicantName] = useState("");
  const [applicantType, setApplicantType] = useState<"group" | "individual">("group");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isImage, setIsImage] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [durationError, setDurationError] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(null);
    setIsImage(false);
    setVideoDuration(null);
    setDurationError(null);

    if (!selected) return;

    if (ALLOWED_IMAGE_TYPES.includes(selected.type)) {
      setIsImage(true);
      setVideoDuration(IMAGE_DISPLAY_SECONDS);
      setFile(selected);
      return;
    }

    const url = URL.createObjectURL(selected);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(url);
      setVideoDuration(duration);
      if (duration > MAX_VIDEO_DURATION_SECONDS) {
        setDurationError(
          `動画の尺が${duration.toFixed(1)}秒です。${MAX_VIDEO_DURATION_SECONDS}秒以内の動画を選んでください。`
        );
        setFile(null);
      } else {
        setFile(selected);
      }
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      setDurationError("ファイルを読み込めませんでした。別のファイルを試してください。");
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setSubmitState("submitting");
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("applicant_name", applicantName);
      formData.append("applicant_type", applicantType);
      formData.append("applicant_email", applicantEmail);
      formData.append("video_duration_seconds", String(videoDuration ?? 0));
      formData.append("video", file);

      const res = await fetch("/api/applications", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "申請の送信に失敗しました。");
      }

      setSubmitState("done");
    } catch (err) {
      setSubmitState("error");
      setErrorMessage(err instanceof Error ? err.message : "予期しないエラーが発生しました。");
    }
  }

  if (submitState === "done") {
    return (
      <main className="mx-auto max-w-lg p-8">
        <h1 className="text-xl font-bold">申請を受け付けました</h1>
        <p className="mt-4 text-sm text-gray-600">
          学生会が内容を確認のうえ、承認/却下の結果をメールでお知らせします。
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-bold">学内サイネージ掲示 申請フォーム</h1>
      <p className="mt-2 text-sm text-gray-600">
        動画は{MAX_VIDEO_DURATION_SECONDS}秒以内、画像は{IMAGE_DISPLAY_SECONDS}
        秒間表示されます。学生会が内容を確認したうえで掲示します。
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">申請種別</span>
          <select
            className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900"
            value={applicantType}
            onChange={(e) => setApplicantType(e.target.value as "group" | "individual")}
          >
            <option value="group">サークル・部活動</option>
            <option value="individual">個人・有志プロジェクト</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">団体名 / お名前</span>
          <input
            required
            className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900"
            value={applicantName}
            onChange={(e) => setApplicantName(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">連絡先メールアドレス</span>
          <input
            required
            type="email"
            className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900"
            value={applicantEmail}
            onChange={(e) => setApplicantEmail(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">掲示する動画・画像</span>
          <input
            required
            type="file"
            accept="video/*,image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
          />
        </label>

        {videoDuration !== null && !durationError && (
          <p className="text-sm text-green-700">
            {isImage
              ? `画像を選択しました(${IMAGE_DISPLAY_SECONDS}秒間表示されます)`
              : `動画の尺: ${videoDuration.toFixed(1)}秒 (OK)`}
          </p>
        )}
        {durationError && <p className="text-sm text-red-600">{durationError}</p>}
        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

        <button
          type="submit"
          disabled={!file || submitState === "submitting"}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-40"
        >
          {submitState === "submitting" ? "送信中..." : "申請する"}
        </button>
      </form>
    </main>
  );
}
