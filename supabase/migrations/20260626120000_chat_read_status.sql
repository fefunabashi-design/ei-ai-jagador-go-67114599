-- Tabela para rastrear o último momento em que cada usuário leu o chat de cada partida
create table if not exists public.chat_read_status (
  user_id  uuid not null references auth.users(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, match_id)
);

alter table public.chat_read_status enable row level security;

create policy "users_own_read_status"
  on public.chat_read_status
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.mark_chat_as_read(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.chat_read_status (user_id, match_id, last_read_at)
  values (auth.uid(), p_match_id, now())
  on conflict (user_id, match_id)
  do update set last_read_at = now();
end;
$$;

create or replace function public.get_unread_chat_counts(p_match_ids uuid[])
returns table (
  match_id    uuid,
  unread_count bigint,
  has_unread  boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id                                                   as match_id,
    count(msg.id)                                          as unread_count,
    count(msg.id) > 0                                      as has_unread
  from unnest(p_match_ids) as m(id)
  left join public.match_chat_messages msg
         on msg.match_id = m.id
        and msg.user_id  <> auth.uid()
        and msg.created_at > coalesce(
              (select crs.last_read_at
               from public.chat_read_status crs
               where crs.user_id  = auth.uid()
                 and crs.match_id = m.id),
              '-infinity'::timestamptz
            )
  group by m.id;
$$;

grant execute on function public.mark_chat_as_read(uuid) to authenticated;
grant execute on function public.get_unread_chat_counts(uuid[]) to authenticated;