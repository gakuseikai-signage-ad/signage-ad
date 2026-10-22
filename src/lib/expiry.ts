import { Application } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const TIME_ZONE = "Asia/Tokyo";

// 掲示期限(displaying_started_at + requested_display_days)
export function getDeadline(displayingStartedAt: string, requestedDisplayDays: number) {
  return new Date(new Date(displayingStartedAt).getTime() + requestedDisplayDays * DAY_MS);
}

// 表示が終了した日時。expired_atカラム追加前に期限切れになった申請はexpired_atが空のため、
// 掲示期限から推定する(取り下げ分は推定できないためnull)。
export function getExpiredAt(app: Pick<Application, "expired_at" | "displaying_started_at" | "requested_display_days">) {
  if (app.expired_at) return new Date(app.expired_at);
  if (app.displaying_started_at) {
    return getDeadline(app.displaying_started_at, app.requested_display_days);
  }
  return null;
}

export function formatDate(date: Date) {
  return date.toLocaleDateString("ja-JP", { timeZone: TIME_ZONE });
}

// 月別グループ用のキー("2026-10")と表示ラベル("2026年10月")
export function getMonthKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  return `${year}-${month}`;
}

export function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return `${year}年${Number(month)}月`;
}
