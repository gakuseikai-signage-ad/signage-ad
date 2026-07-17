import Link from "next/link";
import { auth, signOut } from "@/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Application } from "@/lib/types";
import ApplicationList from "./ApplicationList";
import DisplayingList from "./DisplayingList";
import OrientationToggle from "./OrientationToggle";

export default async function AdminPage() {
  const session = await auth();
  const supabase = createServiceRoleClient();

  const { data: applications } = await supabase
    .from("applications")
    .select("*")
    .order("created_at", { ascending: true });

  const { data: settings } = await supabase
    .from("display_settings")
    .select("orientation")
    .eq("id", 1)
    .maybeSingle();
  const orientation = (settings?.orientation ?? "landscape") as "landscape" | "portrait";

  const all = (applications ?? []) as Application[];
  const withVideoUrl = all.map((a) => ({
    ...a,
    videoUrl: supabase.storage.from("videos").getPublicUrl(a.video_path).data.publicUrl,
  }));
  const pending = withVideoUrl.filter((a) => a.status === "pending");
  const displaying = withVideoUrl.filter((a) => a.status === "displaying");
  const queued = withVideoUrl.filter((a) => a.status === "queued");

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">サイネージ申請 管理画面</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/apply"
            target="_blank"
            className="text-sm text-blue-700 underline"
          >
            申請フォームを開く
          </Link>
          <Link
            href="/display"
            target="_blank"
            className="text-sm text-blue-700 underline"
          >
            表示画面を開く
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut();
            }}
          >
            <button className="text-sm text-gray-500 underline" type="submit">
              {session?.user?.email} をログアウト
            </button>
          </form>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">表示の向き</h2>
        <OrientationToggle orientation={orientation} />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">未対応の申請 ({pending.length}件)</h2>
        <ApplicationList applications={pending} />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">
          表示中 ({displaying.length}件 / 上限{process.env.MAX_DISPLAY_SLOTS ?? 10}件)
        </h2>
        <DisplayingList applications={displaying} />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">待機キュー ({queued.length}件)</h2>
        <ul className="mt-2 text-sm text-gray-600">
          {queued.map((a) => (
            <li key={a.id}>{a.applicant_name}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
