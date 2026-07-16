"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Application } from "@/lib/types";
import { REJECTION_REASONS } from "@/lib/rejectionReasons";

export default function ApplicationList({
  applications,
}: {
  applications: (Application & { videoUrl: string })[];
}) {
  const router = useRouter();
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [reasonByApplication, setReasonByApplication] = useState<Record<string, string>>({});
  const [errorByApplication, setErrorByApplication] = useState<Record<string, string>>({});

  async function handleApprove(id: string) {
    setPendingActionId(id);
    const res = await fetch(`/api/admin/applications/${id}/approve`, { method: "POST" });
    setPendingActionId(null);
    if (res.ok) {
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setErrorByApplication((prev) => ({ ...prev, [id]: body.error ?? "承認に失敗しました。" }));
    }
  }

  async function handleReject(id: string) {
    const reason = reasonByApplication[id];
    if (!reason) {
      setErrorByApplication((prev) => ({ ...prev, [id]: "却下理由を選択してください。" }));
      return;
    }
    setPendingActionId(id);
    const res = await fetch(`/api/admin/applications/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setPendingActionId(null);
    if (res.ok) {
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setErrorByApplication((prev) => ({ ...prev, [id]: body.error ?? "却下に失敗しました。" }));
    }
  }

  if (applications.length === 0) {
    return <p className="mt-2 text-sm text-gray-500">未対応の申請はありません。</p>;
  }

  return (
    <ul className="mt-4 flex flex-col gap-6">
      {applications.map((app) => (
        <li key={app.id} className="rounded border p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            <video
              src={app.videoUrl}
              controls
              className="w-full max-w-xs rounded bg-black"
            />
            <div className="flex-1 text-sm">
              <p className="font-medium">
                {app.applicant_name}({app.applicant_type === "group" ? "サークル・部活動" : "個人"})
              </p>
              <p className="text-gray-500">{app.applicant_email}</p>
              <p className="text-gray-500">尺: {app.video_duration_seconds.toFixed(1)}秒</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleApprove(app.id)}
              disabled={pendingActionId === app.id}
              className="rounded bg-green-700 px-3 py-1.5 text-sm text-white disabled:opacity-40"
            >
              承認
            </button>

            <select
              className="rounded border px-2 py-1.5 text-sm"
              value={reasonByApplication[app.id] ?? ""}
              onChange={(e) =>
                setReasonByApplication((prev) => ({ ...prev, [app.id]: e.target.value }))
              }
            >
              <option value="">却下理由を選択...</option>
              {REJECTION_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => handleReject(app.id)}
              disabled={pendingActionId === app.id}
              className="rounded bg-red-700 px-3 py-1.5 text-sm text-white disabled:opacity-40"
            >
              却下
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
