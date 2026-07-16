import { Resend } from "resend";
import { rejectionReasonLabel } from "@/lib/rejectionReasons";

export async function sendRejectionEmail(
  to: string,
  applicantName: string,
  reasonValue: string
) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const reasonLabel = rejectionReasonLabel(reasonValue);

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: "【学内サイネージ】掲示申請の結果について",
    text: [
      `${applicantName} 様`,
      "",
      "学内デジタルサイネージへの掲示申請について、学生会にて内容を確認いたしました。",
      "誠に申し訳ございませんが、今回は掲載を見送らせていただきます。",
      "",
      `見送りの理由: ${reasonLabel}`,
      "",
      "ご不明な点があれば学生会までご連絡ください。",
    ].join("\n"),
  });
}
