-- 爍宇企業管理系統 — Supabase 資料庫結構
-- 在 Supabase Dashboard → SQL Editor 執行此檔案

-- 1. 使用者資料（對應 auth.users）
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  name text not null,
  department text not null default '',
  role text not null default 'employee' check (role in ('employee', 'manager', 'admin')),
  created_at timestamptz not null default now()
);

-- 2. 共用資料（取代 localStorage，支援多人即時同步）
create table if not exists public.app_documents (
  id text primary key,
  data jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now()
);

-- 3. 新使用者註冊時自動建立 profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, name, department, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'department', ''),
    coalesce(new.raw_user_meta_data->>'role', 'employee')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. 啟用 RLS
alter table public.profiles enable row level security;
alter table public.app_documents enable row level security;

-- 已登入使用者可讀取所有 profile
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- 管理員可新增/修改/刪除 profile（透過 service role API 處理密碼）
create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'manager')
    )
  );

create policy "profiles_delete_admin"
  on public.profiles for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 已登入使用者可讀寫共用資料（單一公司多人協作）
create policy "app_documents_all_authenticated"
  on public.app_documents for all
  to authenticated
  using (true)
  with check (true);

-- 5. 啟用 Realtime 即時同步
alter publication supabase_realtime add table public.app_documents;
alter table public.app_documents replica identity full;

-- 6. 預設資料列（空陣列 / 物件，首次部署後由系統寫入）
insert into public.app_documents (id, data) values
  ('events', '[]'::jsonb),
  ('pending', '[]'::jsonb),
  ('attendance', '[]'::jsonb),
  ('leaves', '[]'::jsonb),
  ('remuneration', '[]'::jsonb),
  ('employee_params', '{}'::jsonb),
  ('sites', '["中壢日月光"]'::jsonb),
  ('site_late_times', '{}'::jsonb),
  ('ban_rest_days', '[]'::jsonb),
  ('expenses', '[]'::jsonb),
  ('contractors', '[]'::jsonb)
on conflict (id) do nothing;
