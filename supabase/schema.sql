-- 申請テーブル
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  applicant_name text not null,
  applicant_email text not null,
  applicant_type text not null check (applicant_type in ('group', 'individual')),
  video_path text not null,
  video_duration_seconds numeric not null,
  status text not null default 'pending' check (status in ('pending', 'displaying', 'queued', 'rejected')),
  rejection_reason text,
  display_order integer,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists applications_status_idx on applications (status);
create index if not exists applications_display_order_idx on applications (display_order);

-- 動画保存用バケット(SupabaseダッシュボードまたはこのSQLで作成)
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do nothing;

-- 表示設定(ディスプレイの向き)。常に id=1 の1行のみを更新して使う。
create table if not exists display_settings (
  id integer primary key default 1,
  orientation text not null default 'landscape' check (orientation in ('landscape', 'portrait')),
  updated_at timestamptz not null default now(),
  constraint display_settings_single_row check (id = 1)
);

insert into display_settings (id, orientation)
values (1, 'landscape')
on conflict (id) do nothing;
