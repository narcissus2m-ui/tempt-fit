-- ───────── 13. 센터(관리자 계정 단위) · 공유 범위 · 3일 수정 제한 · 공개/비공개 ─────────
-- 센터 = 관리자 계정이 운영하는 곳. 강사는 가입 코드로 센터에 들어오고, 회원은 센터가 보낸 초대 코드로 연결합니다.
--   회원은 코드 없이도 가입해서 혼자 기록할 수 있고, 여러 센터와 연결될 수 있습니다.
--   관리자: 자기 센터 회원 전부 / 강사: 자기 센터에서 배정받은 회원만 / 회원: 자기 기록 전부
--   연결이나 배정이 풀리면 서로 볼 수 없습니다.
-- 기록(운동 세션·인바디)마다 어느 센터에서 썼는지(center_id, 비어 있으면 회원 본인 기록)와 공개 여부(is_public)를 남깁니다.
--   다른 센터에서 쓴 기록과 회원 본인 기록은 회원이 비공개로 돌릴 수 있고, 비공개면 그 기록을 쓴 센터 밖에서는 "비공개"로만 보입니다.
--   고치기·지우기: 회원은 자기가 쓴 기록을 언제든, 강사는 자기 센터 기록을 쓴 지 3일 안에만, 관리자는 자기 센터 기록을 언제든.
-- 운동 목록: 누구나 추가, 고치고 지우는 건 추가한 사람만. 서로 연결된 사람(같은 센터 강사끼리, 관리자↔센터 회원, 강사↔배정 회원)끼리 공유.

create table if not exists public.centers (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  admin_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  trainer_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  created_at timestamptz not null default now()
);
create table if not exists public.center_staff (
  center_id uuid not null references public.centers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'trainer' check (role in ('admin', 'trainer')),
  created_at timestamptz not null default now(),
  primary key (center_id, user_id)
);
create index if not exists center_staff_user_idx on public.center_staff(user_id);
create table if not exists public.center_members (
  center_id uuid not null references public.centers(id) on delete cascade,
  member_id text not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (center_id, member_id)
);
create index if not exists center_members_member_idx on public.center_members(member_id);
alter table public.member_trainers add column if not exists center_id uuid references public.centers(id) on delete cascade;
alter table public.sessions add column if not exists center_id uuid references public.centers(id) on delete set null;
alter table public.sessions add column if not exists is_public boolean not null default true;
alter table public.measurements add column if not exists center_id uuid references public.centers(id) on delete set null;
alter table public.measurements add column if not exists is_public boolean not null default true;
alter table public.measurements add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.measurements alter column created_by set default auth.uid();
-- 회원 기록을 합칠 때(이미 자기 기록이 있는 회원이 센터 초대 코드로 연결) 예전 id로 저장된 사진·영상 경로를 위해
create table if not exists public.member_aliases (
  old_id text primary key,
  member_id text not null references public.members(id) on delete cascade
);

-- 처음 한 번: 지금까지의 하나뿐인 센터를 "TEMPT PT" 센터로 옮김 (가입 코드도 그대로)
do $$
declare c uuid;
begin
  if not exists (select 1 from public.centers) then
    insert into public.centers (name, admin_code, trainer_code)
      select 'TEMPT PT', admin_code, trainer_code from public.gym_settings where id = 1 returning id into c;
    if c is null then insert into public.centers (name) values ('TEMPT PT') returning id into c; end if;
    insert into public.center_staff (center_id, user_id, role)
      select c, id, role from public.profiles where role in ('admin', 'trainer') on conflict do nothing;
    -- 혼자 쓰던 회원(본인 계정, 담당 없음)은 개인 회원, 나머지는 모두 이 센터 회원
    insert into public.center_members (center_id, member_id)
      select c, m.id from public.members m
      where not (m.user_id is not null and m.trainer_id is null and not exists (select 1 from public.member_trainers t where t.member_id = m.id))
      on conflict do nothing;
    update public.member_trainers set center_id = c where center_id is null;
    update public.sessions s set center_id = c
      where exists (select 1 from public.center_members cm where cm.member_id = s.member_id and cm.center_id = c)
        and (coalesce(cardinality(s.trainer_ids), 0) > 0 or not exists (select 1 from public.members m where m.id = s.member_id and m.user_id is not distinct from s.created_by));
    update public.measurements x set center_id = c
      where exists (select 1 from public.center_members cm where cm.member_id = x.member_id and cm.center_id = c);
    update public.measurements x set created_by = m.user_id from public.members m
      where m.id = x.member_id and x.center_id is null and x.created_by is null;
  end if;
end $$;

-- ── 권한 판단 함수 ──
create or replace function public.is_center_admin(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.center_staff where center_id = c and user_id = auth.uid() and role = 'admin');
$$;
create or replace function public.is_center_staff(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.center_staff where center_id = c and user_id = auth.uid());
$$;
-- 어느 센터든 관리자/강사인지 (화면 구분용, 다른 센터 회원을 보는 권한은 아님)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.center_staff where user_id = auth.uid() and role = 'admin');
$$;
create or replace function public.is_trainer() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.center_staff where user_id = auth.uid());
$$;
create or replace function public.is_member_owner(mid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where id = mid and user_id = auth.uid());
$$;
-- 센터 c에서 이 회원을 볼 수 있는지: 그 센터 관리자이거나, 그 센터에서 배정받은 강사
create or replace function public.staff_access(mid text, c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select c is not null
    and exists (select 1 from public.center_members where center_id = c and member_id = mid)
    and (public.is_center_admin(c)
      or (public.is_center_staff(c) and exists (select 1 from public.member_trainers t where t.member_id = mid and t.trainer_id = auth.uid() and t.center_id = c)));
$$;
create or replace function public.can_access_member(mid text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_member_owner(mid)
    or exists (select 1 from public.center_members cm where cm.member_id = mid and public.staff_access(mid, cm.center_id))
    or exists (select 1 from public.member_aliases a where a.old_id = mid and (public.is_member_owner(a.member_id)
         or exists (select 1 from public.center_members cm where cm.member_id = a.member_id and public.staff_access(a.member_id, cm.center_id))));
$$;
-- 기록 보기: 본인, 그 기록을 쓴 센터, 또는 공개 기록이면 회원에게 접근할 수 있는 다른 센터
create or replace function public.can_see_record(mid text, cid uuid, pub boolean) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_member_owner(mid)
    or exists (select 1 from public.center_members cm where cm.member_id = mid and public.staff_access(mid, cm.center_id) and (cm.center_id = cid or pub));
$$;
-- 기록 고치기·지우기: 회원은 자기가 쓴 기록 언제든 / 관리자는 자기 센터 기록 언제든 / 강사는 자기 센터 기록을 쓴 지 3일 안에
create or replace function public.can_edit_record(mid text, cid uuid, by uuid, cat timestamptz) returns boolean
language sql stable security definer set search_path = public as $$
  select (cid is null and by = auth.uid() and public.is_member_owner(mid))
    or (cid is not null and public.staff_access(mid, cid) and (public.is_center_admin(cid) or cat > now() - interval '3 days'));
$$;
-- 두 계정이 서로 연결돼 있는지 (운동 목록·이름 공유)
create or replace function public.connected(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select a = b
    or exists (select 1 from public.center_staff s1 join public.center_staff s2 on s1.center_id = s2.center_id where s1.user_id = a and s2.user_id = b)
    or exists (select 1 from public.members m join public.center_members cm on cm.member_id = m.id join public.center_staff s on s.center_id = cm.center_id
      where ((m.user_id = a and s.user_id = b) or (m.user_id = b and s.user_id = a))
        and (s.role = 'admin' or exists (select 1 from public.member_trainers t where t.member_id = m.id and t.trainer_id = s.user_id and t.center_id = s.center_id)));
$$;
-- 직원이 이 회원 기록을 쓸 때 쓰는 센터 (관리자인 센터 먼저)
create or replace function public.staff_center_for(mid text) returns uuid
language sql stable security definer set search_path = public as $$
  select cm.center_id from public.center_members cm join public.center_staff s on s.center_id = cm.center_id and s.user_id = auth.uid()
  where cm.member_id = mid and public.staff_access(mid, cm.center_id)
  order by (s.role = 'admin') desc, cm.created_at limit 1;
$$;

grant select on public.centers, public.center_staff, public.center_members to authenticated;
revoke insert, update, delete on public.centers, public.center_staff, public.center_members, public.member_aliases from authenticated, anon;
alter table public.centers enable row level security;
alter table public.center_staff enable row level security;
alter table public.center_members enable row level security;
alter table public.member_aliases enable row level security;
drop policy if exists centers_select on public.centers;
create policy centers_select on public.centers for select to authenticated using (
  public.is_center_staff(id) or exists (select 1 from public.center_members cm join public.members m on m.id = cm.member_id where cm.center_id = centers.id and m.user_id = auth.uid()));
-- 가입 코드는 관리자만 (centers 표 대신 아래 함수로 읽음)
revoke select on public.centers from authenticated;
grant select (id, name, created_at) on public.centers to authenticated;
create or replace function public.my_center_codes() returns table (id uuid, name text, admin_code text, trainer_code text)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.admin_code, c.trainer_code from public.centers c where public.is_center_admin(c.id) order by c.created_at;
$$;
drop policy if exists center_staff_select on public.center_staff;
create policy center_staff_select on public.center_staff for select to authenticated using (public.connected(auth.uid(), user_id));
drop policy if exists center_members_select on public.center_members;
create policy center_members_select on public.center_members for select to authenticated using (public.can_access_member(member_id));

-- profiles: 본인과 연결된 사람, 내가 볼 수 있는 수업을 한 강사
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (
  public.connected(auth.uid(), id)
  or exists (select 1 from public.sessions s where profiles.id = any(s.trainer_ids) and public.can_see_record(s.member_id, s.center_id, s.is_public))
  or exists (select 1 from public.sessions s where profiles.id = s.created_by and public.can_see_record(s.member_id, s.center_id, s.is_public))
  or exists (select 1 from public.friendships f where
      (f.requester_id = auth.uid() and f.addressee_id = profiles.id) or (f.addressee_id = auth.uid() and f.requester_id = profiles.id))
);
drop policy if exists gym_settings_select on public.gym_settings;
create policy gym_settings_select on public.gym_settings for select to authenticated using (false);

-- ── 가입: 회원은 코드 없이, 강사는 센터 강사 코드, 관리자는 센터 관리자 코드(합류) 또는 새 센터 이름 ──
create or replace function public.check_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  want text := coalesce(new.raw_user_meta_data->>'role', 'member');
  code text := upper(trim(coalesce(new.raw_user_meta_data->>'signup_code', '')));
  cname text := trim(coalesce(new.raw_user_meta_data->>'center_name', ''));
  r text := 'member'; c uuid := null;
begin
  if want = 'admin' then
    if code <> '' then
      select id into c from public.centers where admin_code = code;
      if c is null then raise exception 'bad_signup_code'; end if;
    elsif cname = '' then raise exception 'need_center_name';
    end if;
    r := 'admin';
  elsif want = 'trainer' then
    select id into c from public.centers where trainer_code = code;
    if c is null then raise exception 'bad_signup_code'; end if;
    r := 'trainer';
  end if;
  new.raw_user_meta_data := (coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'signup_code' - 'center_id')
    || jsonb_build_object('role', r) || case when c is null then '{}'::jsonb else jsonb_build_object('center_id', c) end;
  return new;
end $$;
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text := case when new.raw_user_meta_data->>'role' in ('admin', 'trainer') then new.raw_user_meta_data->>'role' else 'member' end;
  c uuid := nullif(new.raw_user_meta_data->>'center_id', '')::uuid;
begin
  insert into public.profiles (id, role, display_name)
  values (new.id, r, coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (id) do nothing;
  if r = 'admin' and c is null then
    insert into public.centers (name) values (left(coalesce(nullif(trim(new.raw_user_meta_data->>'center_name'), ''), '내 센터'), 40)) returning id into c;
  end if;
  if r in ('admin', 'trainer') and c is not null then
    insert into public.center_staff (center_id, user_id, role) values (c, new.id, r) on conflict do nothing;
  end if;
  return new;
end $$;
create or replace function public.check_signup_code(want text, code text) returns boolean
language sql stable security definer set search_path = public as $$
  select case want
    when 'admin' then trim(coalesce(code, '')) = '' or exists (select 1 from public.centers where admin_code = upper(trim(code)))
    when 'trainer' then exists (select 1 from public.centers where trainer_code = upper(trim(code)))
    else true end;
$$;

-- ── 회원 ──
-- 직원이 등록한 회원은 등록한 사람의 센터 회원이 되고, 강사가 등록하면 그 강사가 담당
create or replace function public.member_added() returns trigger
language plpgsql security definer set search_path = public as $$
declare c uuid; adm boolean;
begin
  if new.trainer_id is not null and new.user_id is null then
    select s.center_id, s.role = 'admin' into c, adm from public.center_staff s where s.user_id = new.trainer_id
      order by (s.role = 'admin') desc, s.created_at limit 1;
    if c is not null then
      insert into public.center_members (center_id, member_id) values (c, new.id) on conflict do nothing;
      if not adm then insert into public.member_trainers (member_id, trainer_id, center_id) values (new.id, new.trainer_id, c) on conflict do nothing; end if;
    end if;
  end if;
  return new;
end $$;
drop policy if exists members_select on public.members;
create policy members_select on public.members for select to authenticated using (
  user_id = auth.uid() or public.can_access_member(id)
  or (user_id is null and trainer_id = auth.uid() and not exists (select 1 from public.center_members cm where cm.member_id = members.id)));
drop policy if exists members_insert on public.members;
create policy members_insert on public.members for insert to authenticated with check (
  (user_id = auth.uid() and trainer_id is null)
  or (user_id is null and trainer_id = auth.uid() and public.is_trainer()));
-- 지우기: 계정 연결 안 된 회원은 그 회원이 있는 센터(하나뿐)의 관리자 / 혼자 쓰는 회원은 본인
drop policy if exists members_delete on public.members;
create policy members_delete on public.members for delete to authenticated using (
  (user_id = auth.uid() and not exists (select 1 from public.center_members cm where cm.member_id = members.id))
  or (user_id is null and exists (select 1 from public.center_members cm where cm.member_id = members.id and public.is_center_admin(cm.center_id))
      and not exists (select 1 from public.center_members cm where cm.member_id = members.id and not public.is_center_admin(cm.center_id)))
  or (user_id is null and trainer_id = auth.uid() and not exists (select 1 from public.center_members cm where cm.member_id = members.id)));
-- 강사 메모(data.memo): 센터와 연결된 회원은 본인이 바꿀 수 없음
create or replace function public.keep_staff_memo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.user_id = auth.uid() and exists (select 1 from public.center_members cm where cm.member_id = new.id) then
    new.data := jsonb_set(coalesce(new.data, '{}'::jsonb), '{memo}', coalesce(old.data -> 'memo', '""'::jsonb));
  end if;
  return new;
end $$;

-- 회원이 센터 초대 코드로 연결. 이미 내 기록이 있으면 센터가 만들어 둔 기록을 내 기록으로 합침 (여러 센터 연결 가능)
create or replace function public.claim_member(code text) returns text
language plpgsql security definer set search_path = public as $$
declare rec public.members; own text;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  select * into rec from public.members where invite_code = upper(trim(code));
  if rec.id is null then raise exception 'invalid_code'; end if;
  if rec.user_id = auth.uid() then raise exception 'already_linked'; end if;
  if rec.user_id is not null then raise exception 'invalid_code'; end if;
  select id into own from public.members where user_id = auth.uid();
  if own is null then
    update public.members set user_id = auth.uid(), updated_at = now() where id = rec.id;
    return rec.id;
  end if;
  insert into public.center_members (center_id, member_id, created_at) select center_id, own, created_at from public.center_members where member_id = rec.id on conflict do nothing;
  insert into public.member_trainers (member_id, trainer_id, center_id, created_at) select own, trainer_id, center_id, created_at from public.member_trainers where member_id = rec.id on conflict do nothing;
  perform set_config('app.merge', '1', true);
  update public.sessions set member_id = own where member_id = rec.id;
  update public.measurements set member_id = own where member_id = rec.id;
  perform set_config('app.merge', '', true);
  update public.member_aliases set member_id = own where member_id = rec.id;
  insert into public.member_aliases (old_id, member_id) values (rec.id, own) on conflict (old_id) do update set member_id = excluded.member_id;
  -- 강사 메모는 비어 있을 때만 가져옴
  update public.members set data = case when coalesce(data->>'memo', '') = '' and coalesce(rec.data->>'memo', '') <> '' then jsonb_set(data, '{memo}', rec.data->'memo') else data end, updated_at = now() where id = own;
  delete from public.members where id = rec.id;
  return own;
end $$;

-- 센터 연결 해제: 회원 본인 또는 그 센터 관리자. 그 센터의 배정도 모두 풀림. 계정 없는 회원이 마지막 센터에서 빠지면 기록째 지움
create or replace function public.leave_center(mid text, c uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_member_owner(mid) or public.is_center_admin(c)) then raise exception 'not_allowed'; end if;
  delete from public.member_trainers where member_id = mid and center_id = c;
  delete from public.center_members where member_id = mid and center_id = c;
  update public.members set trainer_id = null
    where id = mid and trainer_id is not null and not exists (select 1 from public.center_staff s join public.center_members cm on cm.center_id = s.center_id where s.user_id = members.trainer_id and cm.member_id = mid);
  delete from public.members m where m.id = mid and m.user_id is null and not exists (select 1 from public.center_members cm where cm.member_id = mid);
end $$;
revoke all on function public.leave_center(text, uuid) from public, anon;
grant execute on function public.leave_center(text, uuid) to authenticated;
-- 앱 연결 끊기(계정과 기록 분리)는 더 이상 쓰지 않음: 센터 연결 해제로 대신
create or replace function public.unlink_member(mid text) returns void
language plpgsql security definer set search_path = public as $$
begin raise exception 'not_allowed'; end $$;

-- 관리자: 자기 센터 회원에게 자기 센터 강사 배정 / 해제
create or replace function public.assign_trainer(mid text, tid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c uuid;
begin
  select cm.center_id into c from public.center_members cm
    join public.center_staff s on s.center_id = cm.center_id and s.user_id = tid
    where cm.member_id = mid and public.is_center_admin(cm.center_id) order by cm.created_at limit 1;
  if c is null then raise exception 'not_allowed'; end if;
  insert into public.member_trainers (member_id, trainer_id, center_id) values (mid, tid, c)
    on conflict (member_id, trainer_id) do update set center_id = excluded.center_id;
end $$;
create or replace function public.unassign_trainer(mid text, tid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.member_trainers t where t.member_id = mid and t.trainer_id = tid and public.is_center_admin(t.center_id)) then raise exception 'not_allowed'; end if;
  delete from public.member_trainers where member_id = mid and trainer_id = tid;
  update public.members set trainer_id = null where id = mid and trainer_id = tid;
end $$;
create or replace function public.regen_signup_code(kind text) returns text
language plpgsql security definer set search_path = public as $$
declare c text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)); cid uuid;
begin
  select center_id into cid from public.center_staff where user_id = auth.uid() and role = 'admin' order by created_at limit 1;
  if cid is null then raise exception 'not_allowed'; end if;
  if kind = 'admin' then update public.centers set admin_code = c where id = cid;
  elsif kind = 'trainer' then update public.centers set trainer_code = c where id = cid;
  else raise exception 'bad_kind'; end if;
  return c;
end $$;
-- 강사 관리: 내 센터 강사의 이름·역할·연락처·메모. 해제하면 내 센터에서만 빠지고 그 센터 배정이 풀림
drop policy if exists staff_notes_select on public.staff_notes;
create policy staff_notes_select on public.staff_notes for select to authenticated using (
  exists (select 1 from public.center_staff s where s.user_id = staff_notes.trainer_id and public.is_center_admin(s.center_id)));
create or replace function public.save_staff(tid uuid, nm text, rl text, ph text, mm text) returns void
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select s.center_id into cid from public.center_staff s where s.user_id = tid and public.is_center_admin(s.center_id) order by s.created_at limit 1;
  if cid is null then raise exception 'not_allowed'; end if;
  if rl not in ('admin', 'trainer', 'member') then raise exception 'bad_role'; end if;
  if tid = auth.uid() and rl <> 'admin' then raise exception 'self_role'; end if;
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

-- ── 기록(세션·인바디): 쓴 센터·쓴 사람·쓴 시각은 서버가 정하고 바꿀 수 없음 ──
create or replace function public.record_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.created_by := auth.uid();
      new.created_at := now();
      new.center_id := case when public.is_member_owner(new.member_id) then null else public.staff_center_for(new.member_id) end;
      new.is_public := true;
    end if;
  else
    if coalesce(current_setting('app.merge', true), '') <> '1' then new.member_id := old.member_id; end if;
    new.created_by := old.created_by; new.created_at := old.created_at; new.center_id := old.center_id;
    if coalesce(current_setting('app.set_public', true), '') <> '1' then new.is_public := old.is_public; end if;
  end if;
  return new;
end $$;
drop trigger if exists sessions_stamp on public.sessions;
create trigger sessions_stamp before insert or update on public.sessions for each row execute function public.record_stamp();
drop trigger if exists measurements_stamp on public.measurements;
create trigger measurements_stamp before insert or update on public.measurements for each row execute function public.record_stamp();

drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions for select to authenticated using (public.can_see_record(member_id, center_id, is_public));
drop policy if exists sessions_insert on public.sessions;
create policy sessions_insert on public.sessions for insert to authenticated with check (
  (center_id is null and created_by = auth.uid() and public.is_member_owner(member_id) and coalesce(cardinality(trainer_ids), 0) = 0)
  or (center_id is not null and created_by = auth.uid() and public.staff_access(member_id, center_id)));
drop policy if exists sessions_update on public.sessions;
create policy sessions_update on public.sessions for update to authenticated
  using (public.can_edit_record(member_id, center_id, created_by, created_at))
  with check (public.can_edit_record(member_id, center_id, created_by, created_at) and (center_id is not null or coalesce(cardinality(trainer_ids), 0) = 0));
drop policy if exists sessions_delete on public.sessions;
create policy sessions_delete on public.sessions for delete to authenticated using (public.can_edit_record(member_id, center_id, created_by, created_at));

drop policy if exists measurements_all on public.measurements;
drop policy if exists measurements_select on public.measurements;
create policy measurements_select on public.measurements for select to authenticated using (public.can_see_record(member_id, center_id, is_public));
drop policy if exists measurements_insert on public.measurements;
create policy measurements_insert on public.measurements for insert to authenticated with check (
  (center_id is null and created_by = auth.uid() and public.is_member_owner(member_id))
  or (center_id is not null and created_by = auth.uid() and public.staff_access(member_id, center_id)));
drop policy if exists measurements_update on public.measurements;
create policy measurements_update on public.measurements for update to authenticated
  using (public.can_edit_record(member_id, center_id, created_by, created_at)) with check (public.can_edit_record(member_id, center_id, created_by, created_at));
drop policy if exists measurements_delete on public.measurements;
create policy measurements_delete on public.measurements for delete to authenticated using (public.can_edit_record(member_id, center_id, created_by, created_at));

-- 회원 본인: 기록 공개/비공개 (그 기록을 쓴 센터에는 항상 보임)
create or replace function public.set_record_public(kind text, rid text, pub boolean) returns void
language plpgsql security definer set search_path = public as $$
declare mid text;
begin
  if kind = 'session' then select member_id into mid from public.sessions where id = rid;
  elsif kind = 'measurement' then select member_id into mid from public.measurements where id = rid;
  else raise exception 'bad_kind'; end if;
  if mid is null or not public.is_member_owner(mid) then raise exception 'not_allowed'; end if;
  perform set_config('app.set_public', '1', true);
  if kind = 'session' then update public.sessions set is_public = pub where id = rid;
  else update public.measurements set is_public = pub where id = rid; end if;
  perform set_config('app.set_public', '', true);
end $$;
-- 볼 수 있는 회원의 비공개 기록: 날짜만 (화면에 "비공개"로 표시)
create or replace function public.private_records() returns table (kind text, id text, member_id text, date date, center_name text)
language sql stable security definer set search_path = public as $$
  select 'session', s.id, s.member_id, s.date, coalesce(c.name, '')
    from public.sessions s left join public.centers c on c.id = s.center_id
    where public.can_access_member(s.member_id) and not public.can_see_record(s.member_id, s.center_id, s.is_public)
  union all
  select 'measurement', x.id, x.member_id, x.date, coalesce(c.name, '')
    from public.measurements x left join public.centers c on c.id = x.center_id
    where public.can_access_member(x.member_id) and not public.can_see_record(x.member_id, x.center_id, x.is_public);
$$;
revoke all on function public.set_record_public(text, text, boolean), public.private_records(), public.my_center_codes() from public, anon;
grant execute on function public.set_record_public(text, text, boolean), public.private_records(), public.my_center_codes() to authenticated;

-- ── 운동 목록: 누구나 추가, 고치기·지우기는 추가한 사람만, 연결된 사람끼리 공유 (기본 운동은 모두에게, 고칠 수 없음) ──
create or replace function public.exercise_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then if auth.uid() is not null then new.created_by := auth.uid(); end if;
  else new.created_by := old.created_by; end if;
  return new;
end $$;
drop trigger if exists exercises_stamp on public.exercises;
create trigger exercises_stamp before insert or update on public.exercises for each row execute function public.exercise_stamp();
drop policy if exists exercises_select on public.exercises;
create policy exercises_select on public.exercises for select to authenticated using (created_by is null or public.connected(auth.uid(), created_by));
drop policy if exists exercises_insert on public.exercises;
create policy exercises_insert on public.exercises for insert to authenticated with check (created_by = auth.uid());
drop policy if exists exercises_update on public.exercises;
create policy exercises_update on public.exercises for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
drop policy if exists exercises_delete on public.exercises;
create policy exercises_delete on public.exercises for delete to authenticated using (created_by = auth.uid());
drop policy if exists exercise_media_insert on storage.objects;
create policy exercise_media_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'session-media' and (storage.foldername(name))[1] = 'lib'
  and not exists (select 1 from public.exercises e where e.id = (storage.foldername(name))[2] and e.created_by is distinct from auth.uid()));
drop policy if exists exercise_media_delete on storage.objects;
create policy exercise_media_delete on storage.objects for delete to authenticated using (
  bucket_id = 'session-media' and (storage.foldername(name))[1] = 'lib'
  and not exists (select 1 from public.exercises e where e.id = (storage.foldername(name))[2] and e.created_by is distinct from auth.uid()));
