-- Execute no SQL Editor do seu projeto Supabase.
create table if not exists public.palco_libraries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.palco_libraries enable row level security;
revoke all on public.palco_libraries from anon;
grant select, insert, update, delete on public.palco_libraries to authenticated;
drop policy if exists "Own library" on public.palco_libraries;
create policy "Own library" on public.palco_libraries for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public)
values ('palco-files', 'palco-files', false)
on conflict (id) do update set public = false;
drop policy if exists "Own palco files" on storage.objects;
create policy "Own palco files" on storage.objects for all to authenticated
using (bucket_id = 'palco-files' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'palco-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
