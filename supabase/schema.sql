-- TEMPT FIT · Supabase 데이터베이스 설정
-- 사용법: Supabase 대시보드 > SQL Editor > New query 에 이 파일 전체를 붙여넣고 Run.
-- 새 프로젝트에 한 번 실행하면 되고, 여러 번 실행해도 안전합니다(기존 데이터는 그대로 두고 규칙만 다시 적용).
--
-- 계정: 마스터(운영자 1명) · 강사 · 회원. 센터(관리자) 계정은 없습니다.
--   강사: 회원을 등록하고 초대 코드를 보내 연결. 연결된 회원의 기록·일정·수업 패키지·과제를 관리.
--   회원: 코드 없이 가입해 혼자 기록할 수 있고, 강사에게 받은 초대 코드로 여러 강사와 연결.
--   마스터: 모든 계정·기록을 보고 고칠 수 있음. 지정은 맨 아래 안내대로 SQL로 한 번만.
-- 저장 원칙: 회원 / 인바디 / 운동 기록 / 일정 / 수업 패키지 / 요청 / 과제 / 알림.
--   남은 세션·소진 수·과제 도장은 저장하지 않고 일정·제출 시각에서 계산합니다(어긋날 일이 없게).

create extension if not exists pgcrypto;

-- ───────── 1. 계정 프로필 ─────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('trainer', 'member')),
  display_name text not null default '',
  is_master boolean not null default false,
  fav_exercises text[] not null default '{}',
  tprofile jsonb not null default '{}'::jsonb,   -- 강사 프로필: nickname, philosophy, career, certs
  sub_until date,                                 -- 강사 구독 만료일 (결제 연동 전에는 마스터가 지정). 회원은 무료라 쓰지 않음
  created_at timestamptz not null default now()
);
-- 강사 구독 등급 (2026-11-26): basic 9,000원 회원 15명 / standard 15,000원 30명 / pro 23,800원 무제한. 회원은 무료
alter table public.profiles add column if not exists plan text;
do $$ declare c text; begin
  for c in select conname from pg_constraint where conrelid = 'public.profiles'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%plan%' loop
    execute format('alter table public.profiles drop constraint %I', c);
  end loop;
end $$;
update public.profiles set plan = 'pro' where plan = 'unlimited';   -- 예전 무제한 등급 → 프로
alter table public.profiles add constraint profiles_plan_check check (plan in ('basic', 'standard', 'pro'));

create or replace function public.is_master() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_master from public.profiles p where p.id = auth.uid()), false);
$$;
create or replace function public.is_trainer() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.role = 'trainer' or p.is_master from public.profiles p where p.id = auth.uid()), false);
$$;

-- 구독 중인 강사 (마스터는 언제나). 구독 전 강사는 가입만 되고 회원 등록·수업·일정·과제를 못 함
create or replace function public.is_active_trainer() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_master or (p.role = 'trainer' and p.sub_until >= (now() at time zone 'Asia/Seoul')::date)
    from public.profiles p where p.id = auth.uid()), false);
$$;

-- 가입하면 프로필 자동 생성 (가입 화면에서 고른 역할: 강사 또는 회원)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, display_name)
  values (new.id,
    case when new.raw_user_meta_data->>'role' = 'trainer' then 'trainer' else 'member' end,
    coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
insert into public.profiles (id, role, display_name)
select u.id, case when u.raw_user_meta_data->>'role' = 'trainer' then 'trainer' else 'member' end, coalesce(u.raw_user_meta_data->>'display_name', '')
from auth.users u on conflict (id) do nothing;

-- 본인이 바꿀 수 있는 건 이름·강사 프로필·즐겨찾기뿐 (역할·마스터·구독은 못 바꿈)
create or replace function public.profile_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('app.admin', true), '') <> '1' and auth.uid() is not null then
    new.id := old.id; new.role := old.role; new.is_master := old.is_master; new.created_at := old.created_at;
    if not public.is_master() then new.sub_until := old.sub_until; new.plan := old.plan; end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles for each row execute function public.profile_guard();

create or replace function public.set_fav_exercises(ids text[]) returns void
language sql security definer set search_path = public as $$
  update public.profiles set fav_exercises = coalesce(ids[1:10], '{}') where id = auth.uid();
$$;

-- 오늘 날짜 (한국 시간)
create or replace function public.kst_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Seoul')::date; $$;

-- ───────── 2. 회원 · 강사 연결 ─────────
create table if not exists public.members (
  id text primary key,
  trainer_id uuid references public.profiles(id) on delete set null,     -- 이 회원을 등록한 강사
  user_id uuid unique references public.profiles(id) on delete set null,  -- 회원 본인 계정 (연결 전에는 비어 있음)
  invite_code text not null unique default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
  name text not null default '',
  data jsonb not null default '{}'::jsonb,  -- 성별·생년월일·전화·목적·안정시 심박·식단 방식·메모 등
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists members_trainer_idx on public.members(trainer_id);

create table if not exists public.member_trainers (
  member_id text not null references public.members(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, trainer_id)
);
create index if not exists member_trainers_trainer_idx on public.member_trainers(trainer_id);

-- 예전 회원 id(기록을 합칠 때)로 저장된 사진 경로를 위해
create table if not exists public.member_aliases (
  old_id text primary key,
  member_id text not null references public.members(id) on delete cascade
);

create or replace function public.is_member_owner(mid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members m where m.id = mid and m.user_id = auth.uid())
      or exists (select 1 from public.member_aliases a join public.members m on m.id = a.member_id where a.old_id = mid and m.user_id = auth.uid());
$$;
create or replace function public.is_linked_trainer(mid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.member_trainers t where t.member_id = mid and t.trainer_id = auth.uid())
      or exists (select 1 from public.member_aliases a join public.member_trainers t on t.member_id = a.member_id where a.old_id = mid and t.trainer_id = auth.uid());
$$;
create or replace function public.can_access_member(mid text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_master() or public.is_member_owner(mid) or public.is_linked_trainer(mid);
$$;
-- 서로 연결된 사람끼리 (강사 ↔ 연결된 회원)
create or replace function public.connected(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select a = b or exists (
    select 1 from public.member_trainers t join public.members m on m.id = t.member_id
    where (t.trainer_id = a and m.user_id = b) or (t.trainer_id = b and m.user_id = a));
$$;

-- 강사가 등록한 회원은 그 강사와 자동 연결
create or replace function public.member_added() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.trainer_id is not null then
    insert into public.member_trainers (member_id, trainer_id) values (new.id, new.trainer_id) on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists on_member_added on public.members;
create trigger on_member_added after insert on public.members for each row execute function public.member_added();

-- 회원 정보: 계정·등록 강사·초대 코드는 앱에서 못 바꿈. 강사 메모(data.memo)는 회원 본인이 못 바꿈
create or replace function public.member_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('app.admin', true), '') <> '1' then
    new.user_id := old.user_id; new.trainer_id := old.trainer_id; new.invite_code := old.invite_code; new.created_at := old.created_at;
    if new.user_id = auth.uid() and not public.is_master() then
      new.data := jsonb_set(coalesce(new.data, '{}'::jsonb), '{memo}', coalesce(old.data -> 'memo', '""'::jsonb));
    end if;
  end if;
  return new;
end $$;
drop trigger if exists members_guard on public.members;
create trigger members_guard before update on public.members for each row execute function public.member_guard();

-- 회원이 강사 초대 코드로 연결. 이미 내 기록이 있으면 강사가 만들어 둔 기록을 내 기록으로 합침
create or replace function public.claim_member(code text) returns text
language plpgsql security definer set search_path = public as $$
declare rec public.members; own text;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if (select role from public.profiles where id = auth.uid()) <> 'member' then raise exception 'member_only'; end if;
  select * into rec from public.members where invite_code = upper(trim(code));
  if rec.id is null then raise exception 'invalid_code'; end if;
  if rec.user_id = auth.uid() then raise exception 'already_linked'; end if;
  if rec.user_id is not null then raise exception 'invalid_code'; end if;
  perform set_config('app.admin', '1', true);
  select id into own from public.members where user_id = auth.uid();
  if own is null then
    update public.members set user_id = auth.uid(), updated_at = now() where id = rec.id;
    perform public.notify_trainers(rec.id, 'link', '회원 연결', coalesce(nullif(rec.name, ''), '회원') || ' 회원이 앱에 연결했어요.', rec.id);
    perform set_config('app.admin', '', true);
    return rec.id;
  end if;
  insert into public.member_trainers (member_id, trainer_id, created_at) select own, trainer_id, created_at from public.member_trainers where member_id = rec.id on conflict do nothing;
  update public.sessions set member_id = own where member_id = rec.id;
  update public.measurements set member_id = own where member_id = rec.id;
  update public.packages set member_id = own where member_id = rec.id;
  update public.schedules set member_id = own where member_id = rec.id;
  update public.requests set member_id = own where member_id = rec.id;
  update public.assignments set member_id = own where member_id = rec.id;
  update public.member_aliases set member_id = own where member_id = rec.id;
  insert into public.member_aliases (old_id, member_id) values (rec.id, own) on conflict (old_id) do update set member_id = excluded.member_id;
  update public.members set data = case when coalesce(data->>'memo', '') = '' and coalesce(rec.data->>'memo', '') <> '' then jsonb_set(data, '{memo}', rec.data->'memo') else data end, updated_at = now() where id = own;
  delete from public.members where id = rec.id;
  perform public.notify_trainers(own, 'link', '회원 연결', coalesce(nullif((select name from public.members where id = own), ''), '회원') || ' 회원이 앱에 연결했어요.', own);
  perform set_config('app.admin', '', true);
  return own;
end $$;

-- 연결 해제: 회원 본인 또는 그 강사(또는 마스터). 계정 없는 회원이 마지막 강사와 끊기면 기록째 지움
create or replace function public.unlink_trainer(mid text, tid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_master() or public.is_member_owner(mid) or tid = auth.uid() and public.is_linked_trainer(mid)) then raise exception 'not_allowed'; end if;
  delete from public.member_trainers where member_id = mid and trainer_id = tid;
  delete from public.schedules where member_id = mid and trainer_id = tid and starts_at > now();
  delete from public.requests where member_id = mid and trainer_id = tid and status = 'pending';
  delete from public.members m where m.id = mid and m.user_id is null and not exists (select 1 from public.member_trainers t where t.member_id = mid);
end $$;

-- ───────── 3. 인바디 · 운동 기록 ─────────
create table if not exists public.measurements (
  id text primary key,
  member_id text not null references public.members(id) on delete cascade,
  date date not null,
  height_cm numeric, weight_kg numeric, smm_kg numeric, body_fat_pct numeric,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists measurements_member_idx on public.measurements(member_id, date);

create table if not exists public.sessions (
  id text primary key,
  member_id text not null references public.members(id) on delete cascade,
  date date not null,
  time text,
  entries jsonb not null default '[]'::jsonb,   -- 세트·유산소·사진/영상 경로
  trainer_ids uuid[] not null default '{}',      -- 수업한 강사 (비어 있으면 개인 운동)
  note text not null default '',
  schedule_id text,                               -- 수업 일정에서 이어 쓴 기록
  assignment_id text,                             -- 과제 제출로 생긴 기록
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists sessions_member_idx on public.sessions(member_id, date);

-- 쓴 사람·쓴 시각은 서버가 정함
create or replace function public.record_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then new.created_by := auth.uid(); new.created_at := now(); end if;
  elsif coalesce(current_setting('app.admin', true), '') <> '1' then
    new.member_id := old.member_id; new.created_by := old.created_by; new.created_at := old.created_at;
  end if;
  return new;
end $$;
drop trigger if exists sessions_stamp on public.sessions;
create trigger sessions_stamp before insert or update on public.sessions for each row execute function public.record_stamp();
drop trigger if exists measurements_stamp on public.measurements;
create trigger measurements_stamp before insert or update on public.measurements for each row execute function public.record_stamp();

-- 고치기·지우기: 회원은 자기가 쓴 기록, 강사는 자기가 쓴 기록을 3일 안에, 마스터는 언제든
create or replace function public.can_edit_record(mid text, by uuid, cat timestamptz) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_master()
    or (public.is_member_owner(mid) and by = auth.uid())
    or (public.is_linked_trainer(mid) and by = auth.uid() and cat > now() - interval '3 days');
$$;

-- ───────── 4. 운동 목록 (기본 운동 + 각자 추가한 운동, 연결된 사람끼리 공유) ─────────
create table if not exists public.exercises (
  id text primary key,
  name text not null,
  category text not null default 'gym' check (category in ('gym', 'pilates')),
  muscles text[] not null default '{}',
  muscles2 text[] not null default '{}',
  equipment text not null default '',
  note text not null default '',
  media jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,  -- 비어 있으면 기본 운동
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
insert into public.exercises (id, name, muscles, muscles2, equipment) values
  ('bench', '벤치프레스', '{chest}', '{triceps,shoulders}', '바벨'),
  ('incline_db', '인클라인 덤벨프레스', '{chest}', '{shoulders,triceps}', '덤벨'),
  ('dip', '딥스', '{chest,triceps}', '{shoulders}', '맨몸'),
  ('ohp', '오버헤드프레스', '{shoulders}', '{triceps}', '바벨'),
  ('lateral', '사이드 레터럴 레이즈', '{shoulders}', '{}', '덤벨'),
  ('pushdown', '트라이셉스 푸시다운', '{triceps}', '{}', '케이블'),
  ('deadlift', '데드리프트', '{hamstrings,glutes,back}', '{quads}', '바벨'),
  ('row', '바벨 로우', '{back}', '{biceps}', '바벨'),
  ('pullup', '풀업', '{back}', '{biceps}', '맨몸'),
  ('latpull', '랫풀다운', '{back}', '{biceps}', '머신'),
  ('curl', '바벨 컬', '{biceps}', '{}', '바벨'),
  ('squat', '백스쿼트', '{quads,glutes}', '{hamstrings}', '바벨'),
  ('legpress', '레그프레스', '{quads}', '{glutes}', '머신'),
  ('rdl', '루마니안 데드리프트', '{hamstrings}', '{glutes,back}', '바벨'),
  ('hipthrust', '힙 쓰러스트', '{glutes}', '{hamstrings}', '바벨'),
  ('legcurl', '레그 컬', '{hamstrings}', '{}', '머신'),
  ('calf', '카프 레이즈', '{calves}', '{}', '머신'),
  ('cablecrunch', '케이블 크런치', '{abs}', '{}', '케이블')
on conflict (id) do nothing;
insert into public.exercises (id, name, category, muscles, muscles2, equipment) values
  ('pi_footwork', '풋워크', 'pilates', '{quads,glutes}', '{calves}', '리포머'),
  ('pi_hundred', '헌드레드', 'pilates', '{abs}', '{}', '매트'),
  ('pi_rollup', '롤업', 'pilates', '{abs}', '{}', '매트'),
  ('pi_elephant', '엘리펀트', 'pilates', '{hamstrings,abs}', '{}', '리포머'),
  ('pi_longstretch', '롱 스트레치', 'pilates', '{abs,shoulders}', '{chest}', '리포머'),
  ('pi_rolldown', '롤다운', 'pilates', '{abs}', '{back}', '캐딜락'),
  ('pi_legspring', '레그 스프링', 'pilates', '{hamstrings,glutes}', '{abs}', '캐딜락'),
  ('pi_pumpchair', '풋워크 (체어)', 'pilates', '{quads,glutes}', '{calves}', '체어'),
  ('pi_swanchair', '스완 (체어)', 'pilates', '{back}', '{glutes}', '체어'),
  ('pi_swanbarrel', '스완 (바렐)', 'pilates', '{back}', '{glutes}', '바렐'),
  ('pi_sidestretch', '사이드 스트레치', 'pilates', '{abs}', '{}', '바렐')
on conflict (id) do nothing;
create or replace function public.exercise_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then new.created_by := auth.uid(); new.created_at := now();
  else new.created_by := old.created_by; new.created_at := old.created_at; end if;
  return new;
end $$;
drop trigger if exists exercises_stamp on public.exercises;
create trigger exercises_stamp before insert or update on public.exercises for each row execute function public.exercise_stamp();

-- ───────── 5. 수업 패키지 (강사가 회원에게 개설: 수업 수 · 1회당 기한 · 소진 기한) ─────────
create table if not exists public.packages (
  id text primary key,
  trainer_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  member_id text not null references public.members(id) on delete cascade,
  total int not null check (total between 1 and 500),
  per_days int not null default 7 check (per_days between 1 and 365),
  starts_on date not null default current_date,
  expires_on date not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists packages_member_idx on public.packages(member_id, trainer_id);
create or replace function public.owner_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and not public.is_master() then new.trainer_id := auth.uid(); end if;
    new.created_at := now();
  else new.trainer_id := old.trainer_id; new.member_id := old.member_id; new.created_at := old.created_at; end if;
  return new;
end $$;
drop trigger if exists packages_stamp on public.packages;
create trigger packages_stamp before insert or update on public.packages for each row execute function public.owner_stamp();

-- ───────── 6. 일정 (수업 · 보강). 과제는 7절 ─────────
-- 상태: planned(예정·시간 지나면 완료) / noshow(노쇼) / canceled(취소)
-- 세션 소진 = 수업(lesson) 중 취소되지 않았고 끝나는 시각이 지난 것의 수. 삭제하거나 취소하면 자동으로 돌아옴.
create table if not exists public.schedules (
  id text primary key,
  trainer_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  member_id text not null references public.members(id) on delete cascade,
  kind text not null default 'lesson' check (kind in ('lesson', 'bonus')),
  starts_at timestamptz not null,
  minutes int not null default 50 check (minutes between 10 and 600),
  status text not null default 'planned' check (status in ('planned', 'noshow', 'canceled')),
  package_id text references public.packages(id) on delete set null,
  plan jsonb not null default '[]'::jsonb,   -- 미리 적어 둔 운동 (운동 기록 entries와 같은 모양)
  note text not null default '',
  cancel_reason text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists schedules_trainer_idx on public.schedules(trainer_id, starts_at);
create index if not exists schedules_member_idx on public.schedules(member_id, starts_at);

-- 수업은 그 강사·회원의 패키지에 자동으로 붙음: 기한 안이고 자리가 남은 가장 오래된 패키지, 없으면 가장 최근 패키지
create or replace function public.pick_package(tid uuid, mid text, at timestamptz, skip text default null) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select p.id from public.packages p where p.trainer_id = tid and p.member_id = mid and (at at time zone 'Asia/Seoul')::date <= p.expires_on
       and p.total > (select count(*) from public.schedules s where s.package_id = p.id and s.kind = 'lesson' and s.status <> 'canceled' and s.id is distinct from skip)
     order by p.starts_on, p.created_at limit 1),
    (select p.id from public.packages p where p.trainer_id = tid and p.member_id = mid order by p.created_at desc limit 1));
$$;
create or replace function public.schedule_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and not public.is_master() then new.trainer_id := auth.uid(); end if;
    new.created_at := now();
  else
    new.trainer_id := old.trainer_id; new.created_at := old.created_at;
    if coalesce(current_setting('app.admin', true), '') <> '1' then new.member_id := old.member_id; end if;
    -- 노쇼는 수업 시작 시각이 지난 뒤에만
    if new.status = 'noshow' and old.status <> 'noshow' and new.starts_at > now() then raise exception 'noshow_future'; end if;
    -- 지난 수업은 취소 대신 삭제(취소 요청 승인은 예외)
    if new.status = 'canceled' and old.status <> 'canceled' and old.starts_at <= now() and coalesce(current_setting('app.admin', true), '') <> '1' then raise exception 'past_cancel'; end if;
  end if;
  if new.kind = 'lesson' and (new.package_id is null or (tg_op = 'UPDATE' and new.starts_at <> old.starts_at and new.package_id = old.package_id)) then
    new.package_id := public.pick_package(new.trainer_id, new.member_id, new.starts_at, new.id);
  end if;
  if new.kind = 'bonus' then new.package_id := null; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists schedules_stamp on public.schedules;
create trigger schedules_stamp before insert or update on public.schedules for each row execute function public.schedule_stamp();

-- ───────── 7. 회원 요청 (수업 일정 요청 · 취소 요청) ─────────
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('book', 'cancel')),
  member_id text not null references public.members(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  schedule_id text references public.schedules(id) on delete cascade,  -- 취소 요청 대상
  want_at timestamptz,                                                   -- 수업 일정 요청: 원하는 시각
  minutes int not null default 50,
  reason text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists requests_trainer_idx on public.requests(trainer_id, status);
create unique index if not exists requests_one_cancel on public.requests(schedule_id) where kind = 'cancel' and status = 'pending';

-- 강사가 승인 또는 거절. 수업 일정 요청은 승인할 때 시각을 바꿀 수 있음
create or replace function public.decide_request(rid uuid, ok boolean, at timestamptz default null, mins int default null) returns text
language plpgsql security definer set search_path = public as $$
declare r public.requests; sid text;
begin
  select * into r from public.requests where id = rid for update;
  if r.id is null or r.status <> 'pending' then raise exception 'not_pending'; end if;
  if not ((r.trainer_id = auth.uid() and public.is_active_trainer()) or public.is_master()) then raise exception 'not_allowed'; end if;
  perform set_config('app.admin', '1', true);
  update public.requests set status = case when ok then 'approved' else 'rejected' end, decided_at = now() where id = rid;
  if ok and r.kind = 'book' then
    sid := 'rq' || replace(r.id::text, '-', '');
    insert into public.schedules (id, trainer_id, member_id, kind, starts_at, minutes, note)
      values (sid, r.trainer_id, r.member_id, 'lesson', coalesce(at, r.want_at), coalesce(mins, r.minutes), r.reason);
  elsif ok and r.kind = 'cancel' then
    update public.schedules set status = 'canceled', cancel_reason = r.reason where id = r.schedule_id;
    sid := r.schedule_id;
  end if;
  perform public.notify_member(r.member_id, 'decided',
    case when r.kind = 'book' then '수업 일정 요청' else '취소 요청' end || case when ok then ' 승인' else ' 거절' end,
    case when ok and r.kind = 'book' then to_char(coalesce(at, r.want_at) at time zone 'Asia/Seoul', 'MM.DD HH24:MI') || ' 수업이 잡혔어요.'
         when ok then '수업이 취소됐어요. 세션은 소진되지 않아요.' else '강사가 요청을 거절했어요.' end, coalesce(sid, r.schedule_id));
  perform set_config('app.admin', '', true);
  return sid;
end $$;

-- ───────── 8. 과제 ─────────
-- 도장(앱이 계산): 기한 안 제출 = 제출 완료, 기한 뒤 제출 = 지연 제출, 기한이 지나도 안 함 = 미제출
create table if not exists public.assignments (
  id text primary key,
  trainer_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  member_id text not null references public.members(id) on delete cascade,
  title text not null default '',
  items jsonb not null default '[]'::jsonb,   -- [{exId, name, muscle, cat, sets:[{w, r, rir}]}]
  due_on date not null,
  note text not null default '',
  done_at timestamptz,
  photos jsonb not null default '[]'::jsonb,
  member_note text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists assignments_member_idx on public.assignments(member_id, due_on);
create or replace function public.assignment_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and not public.is_master() then new.trainer_id := auth.uid(); end if;
    new.created_at := now(); new.done_at := null; new.photos := '[]'::jsonb; new.member_note := '';
  elsif coalesce(current_setting('app.admin', true), '') <> '1' then
    new.trainer_id := old.trainer_id; new.member_id := old.member_id; new.created_at := old.created_at;
    new.done_at := old.done_at; new.photos := old.photos; new.member_note := old.member_note;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists assignments_stamp on public.assignments;
create trigger assignments_stamp before insert or update on public.assignments for each row execute function public.assignment_stamp();

-- 회원이 완료 체크 + 인증 사진으로 제출. 과제 운동은 회원 운동 기록에 자동으로 들어감(다시 입력하지 않게)
create or replace function public.submit_assignment(aid text, pics jsonb default '[]'::jsonb, memo text default '') returns timestamptz
language plpgsql security definer set search_path = public as $$
declare a public.assignments; t timestamptz := now(); d date := (now() at time zone 'Asia/Seoul')::date;
begin
  select * into a from public.assignments where id = aid for update;
  if a.id is null or not public.is_member_owner(a.member_id) then raise exception 'not_allowed'; end if;
  if a.done_at is not null then raise exception 'already_done'; end if;
  perform set_config('app.admin', '1', true);
  update public.assignments set done_at = t, photos = coalesce(pics, '[]'::jsonb), member_note = coalesce(memo, '') where id = aid;
  insert into public.sessions (id, member_id, date, time, entries, note, assignment_id, created_by)
    values ('as_' || aid, a.member_id, d, to_char(t at time zone 'Asia/Seoul', 'HH24:MI'),
      (select coalesce(jsonb_agg(jsonb_build_object('id', 'as' || n, 'kind', 'strength') || (x - 'id')), '[]'::jsonb) from jsonb_array_elements(a.items) with ordinality as e(x, n)),
      '과제: ' || coalesce(nullif(a.title, ''), '운동 과제'), aid, auth.uid())
    on conflict (id) do nothing;
  perform public.notify_user(a.trainer_id, 'submitted', '과제 제출',
    coalesce(nullif((select name from public.members where id = a.member_id), ''), '회원') || ' 회원이 ' || case when d > a.due_on then '기한이 지나 ' else '' end || '과제를 제출했어요.', aid);
  perform set_config('app.admin', '', true);
  return t;
end $$;

-- ───────── 9. 알림 ─────────
create table if not exists public.notifications (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default '',
  title text not null default '',
  body text not null default '',
  ref text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

create or replace function public.notify_user(uid uuid, k text, t text, b text, r text) returns void
language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, kind, title, body, ref) select uid, k, t, b, r where uid is not null and uid is distinct from auth.uid();
$$;
create or replace function public.notify_member(mid text, k text, t text, b text, r text) returns void
language sql security definer set search_path = public as $$
  select public.notify_user((select user_id from public.members where id = mid), k, t, b, r);
$$;
create or replace function public.notify_trainers(mid text, k text, t text, b text, r text) returns void
language sql security definer set search_path = public as $$
  select public.notify_user(trainer_id, k, t, b, r) from public.member_trainers where member_id = mid;
$$;
create or replace function public.tname(tid uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(p.tprofile->>'nickname', ''), nullif(p.display_name, ''), '강사') from public.profiles p where p.id = tid;
$$;
create or replace function public.mname(mid text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(name, ''), '회원') from public.members where id = mid;
$$;
create or replace function public.kst(t timestamptz) returns text
language sql immutable as $$ select to_char(t at time zone 'Asia/Seoul', 'MM.DD HH24:MI'); $$;

-- 일정이 생기거나 바뀌면 회원에게 알림 (요청 승인으로 생긴 일정은 위에서 따로 알림)
create or replace function public.schedule_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare k text;
begin
  if coalesce(current_setting('app.admin', true), '') = '1' then return coalesce(new, old); end if;
  if tg_op = 'INSERT' then
    if coalesce(current_setting('app.bulk', true), '') = '1' then return new; end if;
    k := case when new.kind = 'bonus' then '보강' else '수업' end;
    perform public.notify_member(new.member_id, 'schedule', '새 ' || k || ' 일정', public.tname(new.trainer_id) || ' 강사 · ' || public.kst(new.starts_at), new.id);
  elsif tg_op = 'UPDATE' then
    if new.status = 'canceled' and old.status <> 'canceled' then
      perform public.notify_member(new.member_id, 'schedule', '일정 취소', public.kst(new.starts_at) || ' 일정이 취소됐어요.', new.id);
    elsif new.starts_at <> old.starts_at or new.minutes <> old.minutes then
      perform public.notify_member(new.member_id, 'schedule', '일정 변경', public.kst(old.starts_at) || ' → ' || public.kst(new.starts_at), new.id);
    end if;
  elsif tg_op = 'DELETE' and old.starts_at > now() and old.status = 'planned' then
    perform public.notify_member(old.member_id, 'schedule', '일정 취소', public.kst(old.starts_at) || ' 일정이 취소됐어요.', old.id);
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists schedules_notify on public.schedules;
create trigger schedules_notify after insert or update or delete on public.schedules for each row execute function public.schedule_notify();

-- 여러 날짜를 한꺼번에 잡기: 한 번에 저장하고 알림은 한 개만
create or replace function public.bulk_schedule(rows jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare x jsonb; n int := 0; mid text;
begin
  if not public.is_active_trainer() then raise exception 'not_allowed'; end if;
  perform set_config('app.bulk', '1', true);
  for x in select * from jsonb_array_elements(rows) loop
    mid := x->>'member_id';
    if not (public.is_linked_trainer(mid) or public.is_master()) then raise exception 'not_allowed'; end if;
    insert into public.schedules (id, trainer_id, member_id, kind, starts_at, minutes, note)
      values (x->>'id', auth.uid(), mid, coalesce(x->>'kind', 'lesson'), (x->>'starts_at')::timestamptz, coalesce((x->>'minutes')::int, 50), coalesce(x->>'note', ''));
    n := n + 1;
  end loop;
  perform set_config('app.bulk', '', true);
  if n > 0 then perform public.notify_member(mid, 'schedule', '새 일정 ' || n || '개', public.tname(auth.uid()) || ' 강사가 일정을 한꺼번에 잡았어요.', null); end if;
  return n;
end $$;

create or replace function public.request_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_user(new.trainer_id, 'request',
    case when new.kind = 'book' then '수업 일정 요청' else '취소 요청' end,
    public.mname(new.member_id) || ' 회원 · ' || case when new.kind = 'book' then public.kst(new.want_at)
      else public.kst((select starts_at from public.schedules where id = new.schedule_id)) end
      || case when new.reason <> '' then ' · ' || new.reason else '' end, new.id::text);
  return new;
end $$;
drop trigger if exists requests_notify on public.requests;
create trigger requests_notify after insert on public.requests for each row execute function public.request_notify();
create or replace function public.request_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.created_by := auth.uid(); new.created_at := now(); new.status := 'pending'; new.decided_at := null;
  if new.kind = 'cancel' then
    select s.trainer_id, s.member_id into new.trainer_id, new.member_id from public.schedules s where s.id = new.schedule_id and s.status = 'planned' and s.starts_at > now();
    if new.trainer_id is null then raise exception 'not_allowed'; end if;
  elsif new.want_at is null then raise exception 'need_time';
  end if;
  return new;
end $$;
drop trigger if exists requests_stamp on public.requests;
create trigger requests_stamp before insert on public.requests for each row execute function public.request_stamp();

create or replace function public.assignment_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_member(new.member_id, 'assignment', '새 과제', public.tname(new.trainer_id) || ' 강사 · 기한 ' || to_char(new.due_on, 'MM.DD'), new.id);
  return new;
end $$;
drop trigger if exists assignments_notify on public.assignments;
create trigger assignments_notify after insert on public.assignments for each row execute function public.assignment_notify();

create or replace function public.read_notifications(upto bigint default null) returns void
language sql security definer set search_path = public as $$
  update public.notifications set read = true where user_id = auth.uid() and not read and (upto is null or id <= upto);
$$;

-- 마스터: 구독 만료일·강사 등급 지정 (결제 연동 전 임시). p_plan이 null이면 등급은 그대로
drop function if exists public.set_subscription(uuid, date);
create or replace function public.set_subscription(uid uuid, until date, p_plan text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_master() then raise exception 'master_only'; end if;
  update public.profiles set sub_until = until, plan = coalesce(p_plan, plan) where id = uid;
end $$;

-- 강사 등급별 회원 수 한도 (null = 무제한)
create or replace function public.plan_limit(p text) returns int
language sql immutable as $$
  select case p when 'basic' then 15 when 'standard' then 30 when 'pro' then null else 0 end;
$$;
-- 강사가 회원을 새로 등록할 때 등급 한도 확인: 강사 회원 목록 전체(코드 입력 전 대기 포함). 마스터는 제한 없음
drop trigger if exists members_limit on public.members;
create or replace function public.member_limit_check() returns trigger
language plpgsql security definer set search_path = public as $$
declare pr public.profiles; lim int;
begin
  if new.trainer_id is null or new.user_id is not null then return new; end if;
  select * into pr from public.profiles where id = new.trainer_id;
  if pr.is_master then return new; end if;
  lim := public.plan_limit(pr.plan);
  if lim is not null and (select count(*) from public.member_trainers t where t.trainer_id = new.trainer_id) >= lim then
    raise exception 'member_limit';
  end if;
  return new;
end $$;
create trigger members_limit before insert on public.members for each row execute function public.member_limit_check();

-- 예전 회원 구독료 면제·구독 회원 전용 코드 규칙 정리 (2026-11-26 회원 무료로 바뀜)
drop function if exists public.member_fee_waived(uuid);
drop function if exists public.fee_status(uuid);
drop function if exists public.trainer_slots(uuid);
drop function if exists public.member_lock_check(text);
alter table public.members drop column if exists sub_only;

-- 구독 신청 (결제 연동 전): 마스터들에게 알림. 하루 한 번만
drop function if exists public.request_subscription();
create or replace function public.request_subscription(p_plan text default null) returns text
language plpgsql security definer set search_path = public as $$
declare me public.profiles; pname text := case p_plan when 'basic' then '베이직' when 'standard' then '스탠다드' when 'pro' then '프로' else null end;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null then raise exception 'not_signed_in'; end if;
  if exists (select 1 from public.notifications n where n.kind = 'subreq' and n.ref = me.id::text and n.created_at > now() - interval '1 day' and n.body like '%' || coalesce(pname, '') || '%') then return 'already'; end if;
  insert into public.notifications (user_id, kind, title, body, ref)
    select p.id, 'subreq', '구독 신청', coalesce(nullif(me.display_name, ''), '이름 없음') || ' ' || case when me.role = 'trainer' then '강사' else '회원' end || '가 ' || coalesce(pname || ' 등급 ', '') || '구독을 신청했어요.', me.id::text
    from public.profiles p where p.is_master and p.id <> me.id;
  return 'sent';
end $$;

-- ───────── 10. 접근 규칙 (Row Level Security) ─────────
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke all on all tables in schema public from anon;

alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (public.is_master() or public.connected(auth.uid(), id));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid() or public.is_master()) with check (id = auth.uid() or public.is_master());

alter table public.members enable row level security;
drop policy if exists members_select on public.members;
-- (user_id is null and trainer_id = 나): 방금 등록한 회원을 insert … returning으로 바로 받기 위해 (연결 행은 등록 직후 트리거가 만듦)
create policy members_select on public.members for select to authenticated using (user_id = auth.uid() or (user_id is null and trainer_id = auth.uid()) or public.can_access_member(id));
drop policy if exists members_insert on public.members;
create policy members_insert on public.members for insert to authenticated with check (
  (user_id = auth.uid() and trainer_id is null and not exists (select 1 from public.members m where m.user_id = auth.uid()))
  or (user_id is null and trainer_id = auth.uid() and public.is_active_trainer()));
drop policy if exists members_update on public.members;
create policy members_update on public.members for update to authenticated using (public.can_access_member(id)) with check (public.can_access_member(id));
drop policy if exists members_delete on public.members;
create policy members_delete on public.members for delete to authenticated using (
  public.is_master()
  or (user_id = auth.uid() and not exists (select 1 from public.member_trainers t where t.member_id = members.id))
  or (user_id is null and public.is_linked_trainer(id) and not exists (select 1 from public.member_trainers t where t.member_id = members.id and t.trainer_id <> auth.uid())));

alter table public.member_trainers enable row level security;
drop policy if exists member_trainers_select on public.member_trainers;
create policy member_trainers_select on public.member_trainers for select to authenticated using (public.can_access_member(member_id));
alter table public.member_aliases enable row level security;
drop policy if exists member_aliases_select on public.member_aliases;
create policy member_aliases_select on public.member_aliases for select to authenticated using (public.can_access_member(member_id));

alter table public.measurements enable row level security;
alter table public.sessions enable row level security;
do $$ declare t text; begin
  foreach t in array array['measurements', 'sessions'] loop
    execute format('drop policy if exists %1$s_select on public.%1$s', t);
    execute format('create policy %1$s_select on public.%1$s for select to authenticated using (public.can_access_member(member_id))', t);
    execute format('drop policy if exists %1$s_insert on public.%1$s', t);
    execute format('create policy %1$s_insert on public.%1$s for insert to authenticated with check (public.can_access_member(member_id))', t);
    execute format('drop policy if exists %1$s_update on public.%1$s', t);
    execute format('create policy %1$s_update on public.%1$s for update to authenticated using (public.can_edit_record(member_id, created_by, created_at)) with check (public.can_access_member(member_id))', t);
    execute format('drop policy if exists %1$s_delete on public.%1$s', t);
    execute format('create policy %1$s_delete on public.%1$s for delete to authenticated using (public.can_edit_record(member_id, created_by, created_at))', t);
  end loop;
end $$;

alter table public.exercises enable row level security;
drop policy if exists exercises_select on public.exercises;
create policy exercises_select on public.exercises for select to authenticated using (created_by is null or public.is_master() or public.connected(auth.uid(), created_by));
drop policy if exists exercises_insert on public.exercises;
create policy exercises_insert on public.exercises for insert to authenticated with check (true);
drop policy if exists exercises_update on public.exercises;
create policy exercises_update on public.exercises for update to authenticated using (created_by = auth.uid() or public.is_master()) with check (true);
drop policy if exists exercises_delete on public.exercises;
create policy exercises_delete on public.exercises for delete to authenticated using (created_by = auth.uid() or public.is_master());

-- 패키지·일정·과제: 연결된 회원 것만 강사가 만들고 고침, 회원은 보기만
alter table public.packages enable row level security;
alter table public.schedules enable row level security;
alter table public.assignments enable row level security;
do $$ declare t text; begin
  foreach t in array array['packages', 'schedules', 'assignments'] loop
    execute format('drop policy if exists %1$s_select on public.%1$s', t);
    execute format('create policy %1$s_select on public.%1$s for select to authenticated using (public.can_access_member(member_id))', t);
    execute format('drop policy if exists %1$s_insert on public.%1$s', t);
    execute format('create policy %1$s_insert on public.%1$s for insert to authenticated with check (public.is_master() or (public.is_active_trainer() and public.is_linked_trainer(member_id)))', t);
    execute format('drop policy if exists %1$s_update on public.%1$s', t);
    execute format('create policy %1$s_update on public.%1$s for update to authenticated using (public.is_master() or (trainer_id = auth.uid() and public.is_active_trainer() and public.is_linked_trainer(member_id))) with check (public.is_master() or public.is_linked_trainer(member_id))', t);
    execute format('drop policy if exists %1$s_delete on public.%1$s', t);
    execute format('create policy %1$s_delete on public.%1$s for delete to authenticated using (public.is_master() or (trainer_id = auth.uid() and public.is_linked_trainer(member_id)))', t);
  end loop;
end $$;

alter table public.requests enable row level security;
drop policy if exists requests_select on public.requests;
create policy requests_select on public.requests for select to authenticated using (public.is_master() or trainer_id = auth.uid() or public.is_member_owner(member_id));
drop policy if exists requests_insert on public.requests;
create policy requests_insert on public.requests for insert to authenticated with check (
  public.is_member_owner(member_id) and exists (select 1 from public.member_trainers t where t.member_id = requests.member_id and t.trainer_id = requests.trainer_id));
drop policy if exists requests_update on public.requests;
drop policy if exists requests_delete on public.requests;
create policy requests_delete on public.requests for delete to authenticated using (status = 'pending' and public.is_member_owner(member_id));

alter table public.notifications enable row level security;
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete to authenticated using (user_id = auth.uid());

-- 함수 실행 권한: 로그인한 사람만
do $$ declare f text; begin
  foreach f in array array['claim_member(text)', 'unlink_trainer(text, uuid)', 'set_fav_exercises(text[])', 'decide_request(uuid, boolean, timestamptz, integer)',
    'submit_assignment(text, jsonb, text)', 'bulk_schedule(jsonb)', 'read_notifications(bigint)', 'set_subscription(uuid, date, text)', 'request_subscription(text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  foreach f in array array['notify_user(uuid, text, text, text, text)', 'notify_member(text, text, text, text, text)', 'notify_trainers(text, text, text, text, text)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

-- ───────── 11. 사진·영상 저장소 ─────────
-- 경로: <회원 id>/<파일> (운동 기록·과제 인증 사진), lib/<운동 id>/<파일> (운동 시범). 파일 하나 최대 50MB
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('session-media', 'session-media', false, 52428800, array['image/*', 'video/*'])
on conflict (id) do nothing;
drop policy if exists session_media_select on storage.objects;
create policy session_media_select on storage.objects for select to authenticated
  using (bucket_id = 'session-media' and ((storage.foldername(name))[1] = 'lib' or public.can_access_member((storage.foldername(name))[1])));
drop policy if exists session_media_insert on storage.objects;
create policy session_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'session-media' and ((storage.foldername(name))[1] = 'lib' or public.can_access_member((storage.foldername(name))[1])));
drop policy if exists session_media_delete on storage.objects;
create policy session_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'session-media' and (((storage.foldername(name))[1] = 'lib' and (public.is_master() or not exists (
    select 1 from public.exercises e where e.id = (storage.foldername(name))[2] and e.created_by is distinct from auth.uid())))
    or ((storage.foldername(name))[1] <> 'lib' and public.can_access_member((storage.foldername(name))[1]))));

-- ───────── 12. 마스터 지정 (한 번만, 직접 실행) ─────────
-- 앱에서 가입한 뒤 아래 줄의 이메일을 바꿔 SQL Editor에서 실행하세요.
--   update public.profiles set is_master = true, role = 'trainer' where id = (select id from auth.users where email = '내이메일@example.com');
