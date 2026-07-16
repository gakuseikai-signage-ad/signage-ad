"use client";

import { useEffect, useRef, useState } from "react";

interface DisplayItem {
  id: string;
  applicantName: string;
  videoUrl: string;
  order: number | null;
}

const POLL_INTERVAL_MS = 60_000;

export default function DisplayClient() {
  const [items, setItems] = useState<DisplayItem[]>([]);
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

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, [safeIndex, items]);

  function handleEnded() {
    setCurrentIndex((prev) => (items.length === 0 ? 0 : (prev + 1) % items.length));
  }

  const current = items[safeIndex];

  if (!current) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
        <p>掲示中のコンテンツはありません</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black">
      <video
        key={current.id}
        ref={videoRef}
        src={current.videoUrl}
        autoPlay
        muted
        playsInline
        onEnded={handleEnded}
        className="h-full w-full object-contain"
      />
    </div>
  );
}
