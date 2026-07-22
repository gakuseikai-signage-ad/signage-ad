"use client";

import { useEffect, useRef, useState } from "react";

interface DisplayItem {
  id: string;
  applicantName: string;
  videoUrl: string;
  order: number | null;
  mediaType: "video" | "image";
  durationSeconds: number;
}

const POLL_INTERVAL_MS = 60_000;

export default function DisplayClient() {
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchItems() {
      try {
        const res = await fetch("/api/display/applications");
        const body = await res.json();
        if (!cancelled) {
          setItems(body.items ?? []);
          setOrientation(body.orientation === "portrait" ? "portrait" : "landscape");
        }
      } catch {
        // ネットワーク不調時は次回ポーリングまで現状のリストで再生を継続
      }
    }

    fetchItems();
    const interval = setInterval(fetchItems, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const safeIndex = items.length === 0 ? 0 : currentIndex % items.length;

  function handleEnded() {
    setCurrentIndex((prev) => (items.length === 0 ? 0 : (prev + 1) % items.length));
  }

  const current = items[safeIndex];

  useEffect(() => {
    if (!current) return;

    if (current.mediaType === "video") {
      videoRef.current?.play().catch(() => {});
      return;
    }

    const timer = setTimeout(handleEnded, current.durationSeconds * 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIndex, items]);

  if (!current) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
        <p>掲示中のコンテンツはありません</p>
      </div>
    );
  }

  const mediaClassName =
    orientation === "portrait"
      ? "absolute left-1/2 top-1/2 h-[100vw] w-[100vh] -translate-x-1/2 -translate-y-1/2 rotate-90 object-contain"
      : "h-full w-full object-contain";

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {current.mediaType === "image" ? (
        <img key={current.id} src={current.videoUrl} alt="" className={mediaClassName} />
      ) : (
        <video
          key={current.id}
          ref={videoRef}
          src={current.videoUrl}
          autoPlay
          muted
          playsInline
          onEnded={handleEnded}
          className={mediaClassName}
        />
      )}
    </div>
  );
}
