export type ApplicationStatus = "pending" | "displaying" | "queued" | "rejected";
export type ApplicantType = "group" | "individual";

export interface Application {
  id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_type: ApplicantType;
  video_path: string;
  video_duration_seconds: number;
  status: ApplicationStatus;
  rejection_reason: string | null;
  display_order: number | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}
