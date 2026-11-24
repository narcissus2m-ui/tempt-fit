# TEMPT FIT

회원과 강사를 잇는 PT 앱. 강사가 회원을 등록해 초대 코드로 연결하고, 수업 개설(세션 수·소진 기한), 일정(일간·주간·월간·여러 날 한꺼번에), 회원 요청(수업 일정·취소), 노쇼, 과제(도장), 알림을 관리합니다. 인바디·운동 기록·심박·영양·회복 가이드는 TEMPT PT 키트에서 이어받았습니다.

- 앱: React 18 단일 파일 `app/app.jsx` → `node build/build.mjs app/` → `app/tempt-fit.html` + `docs/index.html`
- 서버: Supabase (로그인 + Postgres + Storage). `supabase/schema.sql` 하나로 새 서버 구성 (다시 실행해도 안전)
- 공개: GitHub Pages, `main` 브랜치의 `/docs` 폴더

## 1. 서버 만들기 (한 번)

1. supabase.com 에서 새 프로젝트를 만듭니다. (DB 비밀번호는 직접 정하고 보관)
2. **SQL Editor** → `supabase/schema.sql` 전체를 붙여넣고 **Run**.
3. 본인 계정으로 앱에서 **강사**로 가입한 뒤, SQL Editor에서 마스터로 지정:
   ```sql
   update public.profiles set is_master = true, role = 'trainer'
   where id = (select id from auth.users where email = '본인 이메일');
   ```
4. **Project Settings → API**에서 *Project URL*과 *anon public* 키를 복사합니다.
   - 앱에 넣는 키는 **anon public 키만**. `service_role` / `sb_secret_` 키는 앱·채팅·저장소 어디에도 넣지 않습니다.
5. `app/app.jsx`의 `SUPABASE_URL`, `SUPABASE_ANON_KEY`에 넣고 빌드하거나, 비워 둔 채 앱의 **사람 아이콘 → 서버 설정**에서 넣습니다.
6. (선택) Authentication → URL Configuration의 Site URL을 GitHub Pages 주소로 바꾸면 인증 메일 링크가 앱으로 돌아옵니다.

## 2. 빌드 · 공개

```bash
npm i
node build/build.mjs app/              # app/tempt-fit.html, docs/index.html
python3 manual-src/build_manual.py     # docs/guide/member.html, trainer.html
python3 manual-src/glossary-src/make.py  # docs/guide/glossary.html
```
GitHub 저장소 Settings → Pages → *Deploy from a branch* → `main` / `/docs`.

## 3. 테스트

로컬 Postgres 16(사용자 postgres / 비밀번호 pg / DB sb)에 `tests/test-supabase-shim.sql`을 먼저, 그다음 `supabase/schema.sql`을 실행한 뒤:
```bash
TZ=Asia/Seoul node tests/e2e-fit.js /tmp/fitshots
```
강사·회원·두 번째 강사·마스터 계정으로 연결, 수업 개설, 일정(일간·주간·월간·일괄), 요청 승인, 노쇼, 세션 복구, 과제 도장, 알림, 구독, 서버 권한(RLS), 440px·320px 화면 넘침까지 확인합니다 (122개).

## 원칙

- 권한은 화면과 서버(RLS) 둘 다에서 막습니다. 역할: 마스터 / 강사 / 회원.
- 세션 소진·남은 세션·과제 도장은 저장하지 않고 일정에서 계산합니다 (삭제·취소하면 자동 복구).
- "선생님"이 아니라 "강사".
- 아이폰 17 Pro Max(440×956) 기준, 320px에서도 글자 넘침·쪼개짐 없음.
- 회원 실명단·전화번호는 저장소에 올리지 않습니다. 안내서 화면은 예시 데이터만.
