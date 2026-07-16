import { auth, signOut } from "@/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Application } from "@/lib/types";
import ApplicationList from "./ApplicationList";

export default async function AdminPage() {
  const session = await auth();
  const supabase = createServiceRoleClient();

  const { data: applications } = await supabase
    .from("applications")
    .select("*")
    .order("created_at", { ascending: true });

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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">サイネージ申請 管理画面</h1>
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

      <section className="mt-8">
        <h2 className="text-lg font-semibold">未対応の申請 ({pending.length}件)</h2>
        <ApplicationList applications={pending} />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">
          表示中 ({displaying.length}件 / 上限{process.env.MAX_DISPLAY_SLOTS ?? 10}件)
        </h2>
        <ul className="mt-2 text-sm text-gray-600">
          {displaying
            .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
            .map((a) => (
              <li key={a.id}>
                #{a.display_order} {a.applicant_name}
              </li>
            ))}
        </ul>
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
