-- ───────── 11. 강사 관리 (관리자: 이름·역할·연락처·메모 수정, 강사 해제) ─────────
create table if not exists public.staff_notes (
  trainer_id uuid primary key references public.profiles(id) on delete cascade,
  phone text not null default '',
  memo text not null default '',   -- 관리자만 보는 메모
  updated_at timestamptz not null default now()
);
grant select on public.staff_notes to authenticated;
alter table public.staff_notes enable row level security;
drop policy if exists staff_notes_select on public.staff_notes;
create policy staff_notes_select on public.staff_notes for select to authenticated using (public.is_admin());
create or replace function public.save_staff(tid uuid, nm text, rl text, ph text, mm text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_allowed'; end if;
  if rl not in ('admin', 'trainer', 'member') then raise exception 'bad_role'; end if;
  if tid = auth.uid() and rl <> 'admin' then raise exception 'self_role'; end if;
  if not exists (select 1 from public.profiles where id = tid and role in ('admin', 'trainer')) then raise exception 'not_trainer'; end if;
  update public.profiles set display_name = left(coalesce(nullif(trim(nm), ''), display_name), 40), role = rl where id = tid;
  if rl = 'member' then
    delete from public.member_trainers where trainer_id = tid;
    update public.members set trainer_id = null where trainer_id = tid;
    delete from public.staff_notes where trainer_id = tid;
  else
    insert into public.staff_notes (trainer_id, phone, memo) values (tid, left(coalesce(ph, ''), 30), left(coalesce(mm, ''), 2000))
      on conflict (trainer_id) do update set phone = excluded.phone, memo = excluded.memo, updated_at = now();
  end if;
end $$;
revoke all on function public.save_staff(uuid, text, text, text, text) from public, anon;
grant execute on function public.save_staff(uuid, text, text, text, text) to authenticated;
