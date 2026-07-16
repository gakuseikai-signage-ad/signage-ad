export const REJECTION_REASONS = [
  { value: "defamation", label: "誹謗中傷にあたる内容が含まれている" },
  { value: "political_religious", label: "政治・宗教的な勧誘にあたる内容が含まれている" },
  { value: "commercial_ad", label: "外部企業の商業広告にあたる" },
  { value: "other", label: "その他(大学の規定に抵触する内容など)" },
] as const;

export type RejectionReasonValue = (typeof REJECTION_REASONS)[number]["value"];

export function rejectionReasonLabel(value: string): string {
  return REJECTION_REASONS.find((r) => r.value === value)?.label ?? value;
}
