"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OrientationToggle({
  orientation,
}: {
  orientation: "landscape" | "portrait";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: "landscape" | "portrait") {
    if (next === orientation) return;
    setPending(true);
    setError(null);
    const res = await fetch("/api/admin/settings/orientation", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orientation: next }),
    });
    setPending(false);
    if (res.ok) {
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "更新に失敗しました。");
    }
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        onClick={() => handleChange("landscape")}
        disabled={pending}
        className={`rounded px-3 py-1.5 text-sm ${
          orientation === "landscape" ? "bg-blue-700 text-white" : "border text-gray-600"
        } disabled:opacity-40`}
      >
        横向き
      </button>
      <button
        onClick={() => handleChange("portrait")}
        disabled={pending}
        className={`rounded px-3 py-1.5 text-sm ${
          orientation === "portrait" ? "bg-blue-700 text-white" : "border text-gray-600"
        } disabled:opacity-40`}
      >
        縦向き
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
