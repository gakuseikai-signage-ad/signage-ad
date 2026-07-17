"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Application } from "@/lib/types";

export default function DisplayingList({
  applications,
}: {
  applications: (Application & { videoUrl: string })[];
}) {
  const router = useRouter();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [errorByApplication, setErrorByApplication] = useState<Record<string, string>>({});

  async function handleDelete(id: string, applicantName: string) {
    if (!window.confirm(`「${applicantName}」の動画を削除します。この操作は取り消せません。よろしいですか?`)) {
      return;
    }
    setPendingDeleteId(id);
    const res = await fetch(`/api/admin/applications/${id}`, { method: "DELETE" });
    setPendingDeleteId(null);
    if (res.ok) {
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setErrorByApplication((prev) => ({ ...prev, [id]: body.error ?? "削除に失敗しました。" }));
    }
  }

  if (applications.length === 0) {
    return <p className="mt-2 text-sm text-gray-500">表示中の申請はありません。</p>;
  }

  return (
    <ul className="mt-4 flex flex-col gap-6">
      {applications
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map((app) => (
          <li key={app.id} className="rounded border p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
              {app.media_type === "image" ? (
                <img
                  src={app.videoUrl}
                  alt={`${app.applicant_name}の申請画像`}
                  className="w-full max-w-xs rounded bg-black object-contain"
                />
              ) : (
                <video src={app.videoUrl} controls className="w-full max-w-xs rounded bg-black" />
              )}
              <div className="flex-1 text-sm">
                <p className="font-medium">
                  #{app.display_order} {app.applicant_name}
                  ({app.applicant_type === "group" ? "サークル・部活動" : "個人"})
                </p>
                <p className="text-gray-500">{app.applicant_email}</p>
                <p className="text-gray-500">
                  {app.media_type === "image"
                    ? `画像(${app.video_duration_seconds.toFixed(0)}秒間表示)`
                    : `動画・尺: ${app.video_duration_seconds.toFixed(1)}秒`}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a
                href={app.videoUrl}
                download
                className="rounded bg-gray-700 px-3 py-1.5 text-sm text-white"
              >
                ダウンロード
              </a>
              <button
                onClick={() => handleDelete(app.id, app.applicant_name)}
                disabled={pendingDeleteId === app.id}
                className="rounded bg-red-700 px-3 py-1.5 text-sm text-white disabled:opacity-40"
              >
                削除
              </button>
            </div>

            {errorByApplication[app.id] && (
              <p className="mt-2 text-sm text-red-600">{errorByApplication[app.id]}</p>
            )}
          </li>
        ))}
    </ul>
  );
}
