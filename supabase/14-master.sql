-- ───────── 14. 마스터 계정 · 관리자 활성화 코드 · 센터별 운동 목록 ─────────
-- 계층: 마스터(1명) > 관리자(센터 운영자, 센터마다 1명) > 강사(센터 직원) > 회원
--   마스터: 모든 센터·계정·기록을 보고, 추가·수정·삭제할 수 있음. 앱에서는 관리자 계정을 골라 그 센터 관리자처럼 접속.
--   관리자: 가입 후 마스터가 발급한 관리자 초대 코드를 넣어야 센터가 만들어지고 활성화됨. 관리자끼리는 연결되지 않음.
--   강사: 센터 강사 코드로 가입, 그 센터에서 배정된 회원만. 회원: 여러 센터 초대 코드로 여러 센터와 연결.
-- 운동 목록: 센터마다 따로. 센터가 활성화될 때 기본 운동이 그 센터 목록으로 복사되고 그 센터 관리자 것이 됨.
--   각자 추가한 운동만 고치고 지움(마스터는 전부). 회원이 추가한 운동은 회원 개인 목록.
-- 마스터 지정은 이 파일에 없음: SQL 편집기에서 한 번 profiles.is_master = true 로 지정.

alter table public.profiles add column if not exists is_master boolean not null default false;
-- (profiles는 앱에서 display_name만 바꿀 수 있음: is_master는 앱에서 못 바꿈)

create or replace function public.is_master() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_master from public.profiles p where p.id = auth.uid()), false);
$$;
grant execute on function public.is_master() to authenticated;

-- ── 권한 판단: 마스터는 모든 센터의 관리자로 취급 ──
create or replace function public.is_center_admin(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select c is not null and (public.is_master()
    or exists (select 1 from public.center_staff where center_id = c and user_id = auth.uid() and role = 'admin'));
$$;
create or replace function public.is_center_staff(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select c is not null and (public.is_master()
    or exists (select 1 from public.center_staff where center_id = c and user_id = auth.uid()));
$$;
create or replace function public.can_access_member(mid text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_master() or public.is_member_owner(mid)
    or exists (select 1 from public.center_members cm where cm.member_id = mid and public.staff_access(mid, cm.center_id))
    or exists (select 1 from public.member_aliases a where a.old_id = mid and (public.is_member_owner(a.member_id)
         or exists (select 1 from public.center_members cm where cm.member_id = a.member_id and public.staff_access(a.member_id, cm.center_id))));
$$;
create or replace function public.can_see_record(mid text, cid uuid, pub boolean) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_master() or public.is_member_owner(mid)
    or exists (select 1 from public.center_members cm where cm.member_id = mid and public.staff_access(mid, cm.center_id) and (cm.center_id = cid or pub));
$$;
create or replace function public.can_edit_record(mid text, cid uuid, by uuid, cat timestamptz) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_master()
    or (cid is null and by = auth.uid() and public.is_member_owner(mid))
    or (cid is not null and public.staff_access(mid, cid) and (public.is_center_admin(cid) or cat > now() - interval '3 days'));
$$;
-- 마스터는 모든 계정과 연결된 것으로 (이름·강사 목록 보기)
create or replace function public.connected(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select a = b
    or exists (select 1 from public.profiles p where p.id = a and p.is_master)
    or exists (select 1 from public.center_staff s1 join public.center_staff s2 on s1.center_id = s2.center_id where s1.user_id = a and s2.user_id = b)
    or exists (select 1 from public.members m join public.center_members cm on cm.member_id = m.id join public.center_staff s on s.center_id = cm.center_id
      where ((m.user_id = a and s.user_id = b) or (m.user_id = b and s.user_id = a))
        and (s.role = 'admin' or exists (select 1 from public.member_trainers t where t.member_id = m.id and t.trainer_id = s.user_id and t.center_id = s.center_id)));
$$;

-- 회원: 마스터는 아무 센터에나 회원을 등록하고 지울 수 있음
drop policy if exists members_insert on public.members;
create policy members_insert on public.members for insert to authenticated with check (
  (user_id = auth.uid() and trainer_id is null)
  or (user_id is null and trainer_id = auth.uid() and (public.is_trainer() or public.is_master())));
drop policy if exists members_delete on public.members;
create policy members_delete on public.members for delete to authenticated using (
  public.is_master()
  or (user_id = auth.uid() and not exists (select 1 from public.center_members cm where cm.member_id = members.id))
  or (user_id is null and exists (select 1 from public.center_members cm where cm.member_id = members.id and public.is_center_admin(cm.center_id))
      and not exists (select 1 from public.center_members cm where cm.member_id = members.id and not public.is_center_admin(cm.center_id)))
  or (user_id is null and trainer_id = auth.uid() and not exists (select 1 from public.center_members cm where cm.member_id = members.id)));
-- 직원이 등록한 회원은 앱이 고른 센터(data._center, 내가 직원인 센터일 때) 또는 내 센터 회원이 되고, 강사가 등록하면 그 강사가 담당
create or replace function public.member_added() returns trigger
language plpgsql security definer set search_path = public as $$
declare c uuid; adm boolean;
begin
  if new.trainer_id is not null and new.user_id is null then
    begin c := nullif(new.data->>'_center', '')::uuid; exception when others then c := null; end;
    if c is not null and exists (select 1 from public.centers where id = c) and public.is_center_staff(c) then
      adm := public.is_center_admin(c);
    else
      select s.center_id, s.role = 'admin' into c, adm from public.center_staff s where s.user_id = new.trainer_id
        order by (s.role = 'admin') desc, s.created_at limit 1;
    end if;
    if c is not null then
      insert into public.center_members (center_id, member_id) values (c, new.id) on conflict do nothing;
      if not adm then insert into public.member_trainers (member_id, trainer_id, center_id) values (new.id, new.trainer_id, c) on conflict do nothing; end if;
    end if;
  end if;
  return new;
end $$;

-- 기록: 앱이 보낸 센터가 이 회원을 볼 수 있는 내 센터면 그 센터로 (마스터가 고른 관리자 계정으로 쓸 때)
create or replace function public.record_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.created_by := auth.uid();
      new.created_at := now();
      new.center_id := case when public.is_member_owner(new.member_id) then null
        when new.center_id is not null and public.staff_access(new.member_id, new.center_id) then new.center_id
        else public.staff_center_for(new.member_id) end;
      new.is_public := true;
    end if;
  else
    if coalesce(current_setting('app.merge', true), '') <> '1' then new.member_id := old.member_id; end if;
    new.created_by := old.created_by; new.created_at := old.created_at; new.center_id := old.center_id;
    if coalesce(current_setting('app.set_public', true), '') <> '1' then new.is_public := old.is_public; end if;
  end if;
  return new;
end $$;

-- ── 가입: 회원은 코드 없이, 강사는 센터 강사 코드, 관리자는 코드 없이 가입 → 마스터의 관리자 초대 코드로 활성화 ──
create or replace function public.check_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  want text := coalesce(new.raw_user_meta_data->>'role', 'member');
  code text := upper(trim(coalesce(new.raw_user_meta_data->>'signup_code', '')));
  r text := 'member'; c uuid := null;
begin
  if want = 'trainer' then
    select id into c from public.centers where trainer_code = code;
    if c is null then raise exception 'bad_signup_code'; end if;
    r := 'trainer';
  end if;
  new.raw_user_meta_data := (coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'signup_code' - 'center_id' - 'center_name' - 'want_admin')
    || jsonb_build_object('role', r) || case when c is null then '{}'::jsonb else jsonb_build_object('center_id', c) end
    || case when want = 'admin' then jsonb_build_object('want_admin', true) else '{}'::jsonb end;
  return new;
end $$;
create or replace function public.check_signup_code(want text, code text) returns boolean
language sql stable security definer set search_path = public as $$
  select case want
    when 'trainer' then exists (select 1 from public.centers where trainer_code = upper(trim(code)))
    else true end;
$$;

-- 관리자 초대 코드 (마스터만 발급·열람·취소)
create table if not exists public.admin_invites (
  code text primary key default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  note text not null default '',
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  used_by uuid references public.profiles(id) on delete set null,
  used_at timestamptz,
  center_id uuid references public.centers(id) on delete set null
);
alter table public.admin_invites enable row level security;
revoke all on public.admin_invites from authenticated, anon;
grant select, delete on public.admin_invites to authenticated;
drop policy if exists admin_invites_select on public.admin_invites;
create policy admin_invites_select on public.admin_invites for select to authenticated using (public.is_master());
drop policy if exists admin_invites_delete on public.admin_invites;
create policy admin_invites_delete on public.admin_invites for delete to authenticated using (public.is_master() and used_by is null);
create or replace function public.issue_admin_code(nt text default '') returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not public.is_master() then raise exception 'not_allowed'; end if;
  insert into public.admin_invites (note, created_by) values (left(coalesce(trim(nt), ''), 40), auth.uid()) returning code into c;
  return c;
end $$;

-- 기본 운동 원본 (센터가 활성화될 때 이 목록을 그 센터 목록으로 복사)
create table if not exists public.exercise_templates (
  id text primary key,
  name text not null,
  category text not null default 'gym',
  muscles text[] not null default '{}',
  muscles2 text[] not null default '{}',
  equipment text not null default ''
);
alter table public.exercise_templates enable row level security;
revoke all on public.exercise_templates from authenticated, anon;
grant select on public.exercise_templates to authenticated;
drop policy if exists exercise_templates_select on public.exercise_templates;
create policy exercise_templates_select on public.exercise_templates for select to authenticated using (true);

alter table public.exercises add column if not exists center_id uuid references public.centers(id) on delete cascade;
alter table public.exercises add column if not exists is_base boolean not null default false;
create index if not exists exercises_center_idx on public.exercises(center_id);

-- 처음 한 번: 지금 있는 기본 운동을 원본으로 저장하고, 기존 운동을 센터 목록으로 옮김
do $$
declare c1 uuid; owner uuid;
begin
  if not exists (select 1 from public.exercise_templates) then
    insert into public.exercise_templates (id, name, category, muscles, muscles2, equipment)
      select id, name, category, muscles, muscles2, equipment from public.exercises where created_by is null and center_id is null
      on conflict do nothing;
    select id into c1 from public.centers order by created_at limit 1;
    select coalesce((select id from public.profiles where is_master order by created_at limit 1),
      (select user_id from public.center_staff where center_id = c1 and role = 'admin' order by created_at limit 1)) into owner;
    -- 기본 운동 → 첫 센터(TEMPT PT)의 기본 운동, 관리자(마스터) 소유. id는 그대로라 지난 기록이 그대로 이어짐
    if c1 is not null then
      update public.exercises set center_id = c1, is_base = true, created_by = owner where created_by is null and center_id is null;
    end if;
    -- 직원이 추가한 운동 → 그 직원의 센터 목록, 회원이 추가한 운동은 회원 개인 목록(center_id 없음)
    update public.exercises e set center_id = (select s.center_id from public.center_staff s where s.user_id = e.created_by
      order by (s.role = 'admin') desc, s.created_at limit 1) where e.center_id is null and e.created_by is not null;
  end if;
end $$;

-- 관리자 활성화: 마스터에게 받은 코드 + 센터 이름 → 새 센터, 이 계정이 그 센터 관리자, 기본 운동 복사
create or replace function public.activate_admin(code text, center_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv public.admin_invites; c uuid; nm text := left(trim(coalesce(center_name, '')), 40);
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if exists (select 1 from public.center_staff where user_id = auth.uid()) then raise exception 'already_staff'; end if;
  if nm = '' then raise exception 'need_center_name'; end if;
  select * into inv from public.admin_invites where admin_invites.code = upper(trim(activate_admin.code)) and used_by is null for update;
  if inv.code is null then raise exception 'invalid_code'; end if;
  insert into public.centers (name) values (nm) returning id into c;
  insert into public.center_staff (center_id, user_id, role) values (c, auth.uid(), 'admin');
  perform set_config('app.seed', '1', true);
  insert into public.exercises (id, name, category, muscles, muscles2, equipment, center_id, is_base)
    select left(replace(c::text, '-', ''), 8) || '_' || t.id, t.name, t.category, t.muscles, t.muscles2, t.equipment, c, true from public.exercise_templates t;
  perform set_config('app.seed', '', true);
  update public.admin_invites set used_by = auth.uid(), used_at = now(), center_id = c where admin_invites.code = inv.code;
  update public.profiles set role = 'admin' where id = auth.uid();
  return c;
end $$;

-- 마스터가 고른 센터의 강사 코드 새로 발급 (관리자는 자기 센터). 관리자 가입 코드는 더 이상 쓰지 않음
drop function if exists public.regen_signup_code(text);
create or replace function public.regen_signup_code(kind text, c uuid default null) returns text
language plpgsql security definer set search_path = public as $$
declare k text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)); cid uuid := c;
begin
  if cid is null then select center_id into cid from public.center_staff where user_id = auth.uid() and role = 'admin' order by created_at limit 1; end if;
  if cid is null or not public.is_center_admin(cid) then raise exception 'not_allowed'; end if;
  if kind = 'trainer' then update public.centers set trainer_code = k where id = cid;
  else raise exception 'bad_kind'; end if;
  return k;
end $$;
-- 강사를 관리자로 올리는 건 마스터만 (관리자는 센터마다 마스터가 활성화)
create or replace function public.save_staff(tid uuid, nm text, rl text, ph text, mm text) returns void
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select s.center_id into cid from public.center_staff s where s.user_id = tid and public.is_center_admin(s.center_id) order by (s.role = 'admin') desc, s.created_at limit 1;
  if cid is null then raise exception 'not_allowed'; end if;
  if rl not in ('admin', 'trainer', 'member') then raise exception 'bad_role'; end if;
  if tid = auth.uid() and rl <> 'admin' then raise exception 'self_role'; end if;
  if rl = 'admin' and not public.is_master() and not exists (select 1 from public.center_staff where user_id = tid and center_id = cid and role = 'admin') then
    raise exception 'master_only'; end if;
  update public.profiles set display_name = left(coalesce(nullif(trim(nm), ''), display_name), 40) where id = tid;
  if rl = 'member' then
    delete from public.member_trainers where trainer_id = tid and center_id = cid;
    delete from public.center_staff where user_id = tid and center_id = cid;
  else
    update public.center_staff set role = rl where user_id = tid and center_id = cid;
    insert into public.staff_notes (trainer_id, phone, memo) values (tid, left(coalesce(ph, ''), 30), left(coalesce(mm, ''), 2000))
      on conflict (trainer_id) do update set phone = excluded.phone, memo = excluded.memo, updated_at = now();
  end if;
  update public.profiles set role = case when exists (select 1 from public.center_staff where user_id = tid and role = 'admin') then 'admin'
    when exists (select 1 from public.center_staff where user_id = tid) then 'trainer' else 'member' end where id = tid;
end $$;

-- ── 운동 목록: 센터마다 따로 ──
-- 볼 수 있는 센터 목록: 내가 직원인 센터, 내가 회원인 센터, 내가 볼 수 있는 회원이 다니는 센터(그 회원 기록을 볼 때 운동 이름·설명 보기용)
create or replace function public.my_ex_centers() returns setof uuid
language sql stable security definer set search_path = public as $$
  select center_id from public.center_staff where user_id = auth.uid()
  union select cm.center_id from public.center_members cm join public.members m on m.id = cm.member_id where m.user_id = auth.uid()
  union select cm2.center_id from public.center_members cm2
    where cm2.member_id in (select cm.member_id from public.center_members cm where public.staff_access(cm.member_id, cm.center_id));
$$;
create or replace function public.my_member_users() returns setof uuid
language sql stable security definer set search_path = public as $$
  select m.user_id from public.members m where m.user_id is not null and public.can_access_member(m.id);
$$;
create or replace function public.exercise_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.created_by := auth.uid();
      if new.center_id is null or not public.is_center_staff(new.center_id) then
        new.center_id := (select s.center_id from public.center_staff s where s.user_id = auth.uid() order by (s.role = 'admin') desc, s.created_at limit 1);
      end if;
      if coalesce(current_setting('app.seed', true), '') <> '1' then new.is_base := false; end if;
    end if;
  else
    new.created_by := old.created_by; new.center_id := old.center_id; new.is_base := old.is_base;
  end if;
  return new;
end $$;
drop policy if exists exercises_select on public.exercises;
create policy exercises_select on public.exercises for select to authenticated using (
  public.is_master() or created_by = auth.uid()
  or (center_id is not null and center_id in (select public.my_ex_centers()))
  or (center_id is null and created_by in (select public.my_member_users())));
drop policy if exists exercises_insert on public.exercises;
create policy exercises_insert on public.exercises for insert to authenticated with check (
  created_by = auth.uid() and (center_id is null or public.is_center_staff(center_id)));
drop policy if exists exercises_update on public.exercises;
create policy exercises_update on public.exercises for update to authenticated
  using (created_by = auth.uid() or public.is_master()) with check (created_by = auth.uid() or public.is_master());
drop policy if exists exercises_delete on public.exercises;
create policy exercises_delete on public.exercises for delete to authenticated using (created_by = auth.uid() or public.is_master());
drop policy if exists exercise_media_insert on storage.objects;
create policy exercise_media_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'session-media' and (storage.foldername(name))[1] = 'lib'
  and (public.is_master() or not exists (select 1 from public.exercises e where e.id = (storage.foldername(name))[2] and e.created_by is distinct from auth.uid())));
drop policy if exists exercise_media_delete on storage.objects;
create policy exercise_media_delete on storage.objects for delete to authenticated using (
  bucket_id = 'session-media' and (storage.foldername(name))[1] = 'lib'
  and (public.is_master() or not exists (select 1 from public.exercises e where e.id = (storage.foldername(name))[2] and e.created_by is distinct from auth.uid())));

revoke all on function public.issue_admin_code(text), public.activate_admin(text, text), public.regen_signup_code(text, uuid), public.my_ex_centers(), public.my_member_users() from public, anon;
grant execute on function public.issue_admin_code(text), public.activate_admin(text, text), public.regen_signup_code(text, uuid), public.my_ex_centers(), public.my_member_users() to authenticated;
