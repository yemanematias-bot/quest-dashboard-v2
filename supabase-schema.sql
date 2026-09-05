create table if not exists public.quest_saves (
    user_id uuid primary key references auth.users(id) on delete cascade,
    data jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

alter table public.quest_saves enable row level security;

revoke all on table public.quest_saves from anon;
grant select, insert, update on table public.quest_saves to authenticated;

drop policy if exists "Users can read their own save" on public.quest_saves;
drop policy if exists "Users can create their own save" on public.quest_saves;
drop policy if exists "Users can update their own save" on public.quest_saves;

create policy "Users can read their own save"
on public.quest_saves for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own save"
on public.quest_saves for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own save"
on public.quest_saves for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
