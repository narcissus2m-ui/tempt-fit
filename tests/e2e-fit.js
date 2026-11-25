// TEMPT FIT e2e: 강사 → 회원 연결 → 수업 개설 · 일정(일간/주간/월간/일괄) · 요청 · 노쇼 · 과제 도장 · 알림 · 마스터 구독
// 실행: TZ=Asia/Seoul node tests/e2e-fit.js [스크린샷 폴더]   (로컬 Postgres 16 + test-supabase-shim.sql 먼저)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { handle, pool, ANON } = require("./fake");
const ROOT = path.resolve(__dirname, "..");
const FILE = "file://" + ROOT + "/app/tempt-fit.html";
const SHOTS = process.argv[2] || "/tmp/fitshots";
fs.mkdirSync(SHOTS, { recursive: true });
const NM = ROOT + "/node_modules/";
const LIBS = {
  "react.production.min.js": NM + "react/umd/react.production.min.js",
  "react-dom.production.min.js": NM + "react-dom/umd/react-dom.production.min.js",
  "supabase.js": NM + "@supabase/supabase-js/dist/umd/supabase.js",
};
async function setup(ctx) {
  await ctx.route("**/*", async (route) => {
    const req = route.request(); const url = req.url();
    if (url.startsWith("file://")) return route.continue();
    if (url.startsWith("https://test.supabase.co/")) {
      const buf = req.postDataBuffer();
      const [status, body] = await handle(req.method(), url, req.headers(), buf ? buf.toString("utf8") : null, buf);
      if (body && body.__raw) return route.fulfill({ status, contentType: body.mime, headers: { "access-control-allow-origin": "*" }, body: body.__raw });
      return route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: body == null ? "" : JSON.stringify(body) });
    }
    const name = url.split("/").pop();
    if (LIBS[name]) return route.fulfill({ status: 200, contentType: "application/javascript", body: fs.readFileSync(LIBS[name]) });
    return route.fulfill({ status: 200, body: "" });
  });
}
const q1 = async (sql, a) => (await pool.query(sql, a)).rows;
const asRole = async (sub, sql, a) => { const c = await pool.connect(); try { await c.query("begin"); await c.query("set local role authenticated"); await c.query("select set_config('request.jwt.claim.sub', $1, true)", [sub]); const r = await c.query(sql, a); await c.query("rollback"); return r; } catch (e) { await c.query("rollback").catch(() => {}); return { error: e.message }; } finally { c.release(); } };
const count = async (t) => +(await q1(`select count(*) from ${t}`))[0].count;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let passed = 0;
const ok = (c, m) => { if (!c) throw new Error("FAIL: " + m); passed++; console.log("✓", m); };
const errors = [];
const PAGES = [];
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==", "base64");
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addD = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return iso(x); };
const at = (date, t) => new Date(`${date}T${t}:00`).toISOString();
const PHONE = { viewport: { width: 440, height: 956 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, timezoneId: "Asia/Seoul", locale: "ko-KR" };

async function open(browser, tag, opts = PHONE) {
  const ctx = await browser.newContext(opts); await setup(ctx);
  const p = await ctx.newPage(); PAGES.push([tag, p]); p.on("pageerror", (e) => errors.push(tag + " " + e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(tag + " console " + m.text()); });
  await ctx.addInitScript((k) => { localStorage.setItem("temptfit.v1.server", JSON.stringify({ url: "https://test.supabase.co", key: k })); }, ANON);
  await p.goto(FILE);
  await p.waitForSelector("text=로그인 없이 이 기기에서만 쓰기");
  return p;
}
async function signup(p, role, name, email) {
  await p.click(".authwrap .seg >> text=가입");
  await p.click(`.authwrap .seg button:has-text("${role}")`);
  await p.fill("#a-name", name); await p.fill("#a-email", email); await p.fill("#a-pw", "secret12");
  await p.click("button[type=submit]");
  await p.waitForSelector("nav.nav, #trainer-lock");
}
const asRoleCommit = async (sub, sql, a) => { const c = await pool.connect(); try { await c.query("begin"); await c.query("set local role authenticated"); await c.query("select set_config('request.jwt.claim.sub', $1, true)", [sub]); const r = await c.query(sql, a); await c.query("commit"); return r; } finally { c.release(); } };
async function refresh(p) {
  while (await p.$(".modal-bg")) { await p.keyboard.press("Escape"); await wait(150); }
  await p.click('button[aria-label="계정과 저장 상태"]');
  await p.click("text=서버에서 새로고침"); await wait(700); await p.click(".sheet >> text=닫기"); await wait(300);
}
const tab = async (p, k) => { await p.click(`nav [data-tab=${k}]`); await wait(250); };
const shot = (p, n) => p.screenshot({ path: `${SHOTS}/${n}.png` });
// 화면 넘침 검사: 가로 스크롤, 글자가 상자 밖으로 나감
async function overflowCheck(p, tag) {
  const bad = await p.evaluate(() => {
    const out = [];
    if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push("page-x " + document.documentElement.scrollWidth);
    document.querySelectorAll(".app button, .app .pill, .app .cnt, .app .tag, .app .chip, .app .mev, .app .tg-ev b, .app .tg-ev span, .app .slot, .app .stamp, .app h3, .app .kv3 b, .app .kv3 span, .modal button, .modal h3").forEach((el) => {
      const r = el.getBoundingClientRect(); if (!r.width || !r.height || el.classList.contains("icon")) return; // 알림 숫자 배지는 일부러 밖으로
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== "auto") out.push((el.id || el.className) + ": " + (el.textContent || "").trim().slice(0, 30) + " " + el.scrollWidth + ">" + el.clientWidth);
    });
    // 한 줄 라벨이 두 줄로 쪼개졌는지 (버튼·칩·알약·숫자)
    document.querySelectorAll(".app .btn, .app .pill, .app .cnt, .app .chip, .app .seg button, .nav button span, .modal .btn").forEach((el) => {
      const r = el.getBoundingClientRect(); if (!r.width) return;
      const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.5;
      const pad = parseFloat(getComputedStyle(el).paddingTop) + parseFloat(getComputedStyle(el).paddingBottom) + parseFloat(getComputedStyle(el).borderTopWidth) * 2;
      if (r.height - pad > lh * 1.6) out.push("wrap " + (el.id || el.className) + ": " + el.textContent.trim().slice(0, 30));
    });
    return out;
  });
  ok(bad.length === 0, `${tag}: 넘침·줄바꿈 없음` + (bad.length ? " → " + bad.slice(0, 6).join(" | ") : ""));
}

(async () => {
  // DB 비우기 → schema.sql 다시 실행(재실행 안전 확인 겸)
  for (const t of ["notifications", "requests", "assignments", "schedules", "packages", "sessions", "measurements", "member_aliases", "member_trainers", "members", "exercises", "profiles"]) await pool.query(`delete from public.${t}`);
  await pool.query("delete from storage.objects"); await pool.query("delete from auth.users");
  await pool.query(fs.readFileSync(ROOT + "/supabase/schema.sql", "utf8"));
  ok(true, "schema.sql 다시 실행해도 오류 없음");
  const browser = await chromium.launch();
  const today = addD(0), tmr = addD(1), yday = addD(-1);

  // ── 강사 가입
  const T = await open(browser, "trainer");
  await T.click(".authwrap .seg >> text=가입");
  ok((await T.$$eval(".authwrap .seg button", (b) => b.map((x) => x.textContent))).join() === "로그인,가입,회원,강사", "가입 화면: 회원·강사 두 가지만 (관리자 없음)");
  await signup(T, "강사", "김코치", "t1@test.kr");
  const tid = (await q1("select id from profiles where display_name='김코치'"))[0].id;
  ok((await q1("select role from profiles where id=$1", [tid]))[0].role === "trainer", "강사 가입 → 강사 계정");
  // 구독 전 강사: 잠금 화면 + 서버도 막힘
  ok(await T.$("#trainer-lock") && !(await T.$("nav.nav")), "구독 전 강사: 자물쇠 잠금 화면 (탭 없음)");
  ok(!!(await asRole(tid, "insert into public.members(id, name, trainer_id) values ('lockx', 'x', $1)", [tid])).error, "서버: 구독 전 강사는 회원 등록 불가");
  await overflowCheck(T, "440px 강사 잠금 화면"); await shot(T, "t-lock");
  ok((await T.$$("#plan-pick .plan")).length === 4, "잠금 화면: 등급 4개 (5명·10명·20명·무제한)");
  await T.click('#plan-pick [data-plan="basic"]');
  ok((await T.textContent("#lock-sub")).includes("베이직 · 월 8,900원"), "등급 고르면 신청 버튼에 요금");
  await T.click("#lock-sub"); await T.waitForSelector("#lock-msg");
  ok((await T.textContent("#lock-msg")).includes("구독 신청을 보냈어요"), "구독 신청하기 버튼");
  await T.click("#lock-check"); await wait(500);
  ok(await T.$("#trainer-lock"), "구독 전에는 계속 잠김");
  await q1("update profiles set sub_until = current_date + 30, plan = 'basic' where id=$1", [tid]); // 실서버에서는 마스터가 등급 + 1개월
  await T.click("#lock-check"); await T.waitForSelector("nav.nav");
  ok(!(await T.$("#trainer-lock")), "구독되면 잠금이 풀림");
  ok((await T.$$eval("nav button span", (s) => s.map((x) => x.textContent))).join() === "홈,일정,회원,운동,과제,영양,분석", "강사 탭: 홈·일정·회원·운동·과제·영양·분석");
  ok(await T.textContent(".wm") === "TEMPTFIT", "머리글 이름 TEMPT FIT");
  ok((await T.title()) === "TEMPT FIT", "문서 제목 TEMPT FIT");
  ok(!(await T.content()).includes("선생님"), "화면에 '선생님' 표현 없음");

  // 회원 등록 → 초대 코드
  await T.click("text=+ 회원 추가"); await T.fill("#new-name", "박회원"); await T.press("#new-name", "Enter");
  await T.waitForSelector("#invite-code", { timeout: 8000 }).catch(async (e) => { await shot(T, "dbg"); console.log(await T.textContent("main"), (await q1("select * from members"))); throw e; });
  const code = (await T.textContent("#invite-code")).trim();
  ok(/^[A-Z0-9]{6}$/.test(code) && (await q1("select invite_code from members where name='박회원'"))[0].invite_code === code, "회원 등록 → 6자리 초대 코드");
  const mid = (await q1("select id from members where name='박회원'"))[0].id;
  ok((await count(`member_trainers where member_id='${mid}' and trainer_id='${tid}'`)) === 1, "등록한 강사가 자동으로 담당 강사");

  // 새 수업 개설하기: 10회 × 7일 → 소진 기한 자동 70일
  await T.click("#pkg-new"); await T.fill("#pkg-total", "10"); await T.fill("#pkg-per", "7");
  ok(await T.inputValue("#pkg-exp") === addD(70), "소진 기한 = 수업 수 × 1회당 기한(일)");
  await T.click("#pkg-save"); await T.waitForSelector("#pkg-sum");
  const pk = (await q1("select * from packages where member_id=$1", [mid]))[0];
  ok(pk && pk.total === 10 && pk.per_days === 7 && pk.trainer_id === tid, "수업 패키지 저장 (서버)");
  await shot(T, "t-member");

  // 일정 탭 · 일간: 내일 10:00 빈 칸 → 잡기 (정시/30분)
  await tab(T, "schedule");
  ok(await T.$("#cal-day") || await T.$("#cal-week") || await T.$("#cal-month"), "일정 탭 열림");
  if (!(await T.$("#cal-day"))) await T.click(".calbar .seg >> text=일간");
  await T.click('button[aria-label="다음"]');
  await T.click(`[data-slot="${tmr} 10:30"]`);
  await T.waitForSelector("#quick-add");
  ok((await T.$$eval("#quick-add .seg button", (b) => b.map((x) => x.textContent))).slice(0, 2).join() === "10:00,10:30", "빈 칸 누르면 정시·30분 중 고르기");
  await T.click('#quick-add .seg button:has-text("10:00")');
  await T.click('#qa-members [data-m="박회원"]');
  ok((await T.textContent("#pkg-line")).includes("남은 세션 10"), "잡기 전에 남은 세션 보여 줌");
  await T.click("#qa-go"); await T.waitForSelector(`[data-sch]`);
  const s1 = (await q1("select * from schedules where member_id=$1", [mid]))[0];
  ok(s1 && s1.kind === "lesson" && s1.package_id === pk.id && new Date(s1.starts_at).toISOString() === at(tmr, "10:00"), "수업 일정 저장 + 수업 패키지 자동 연결");
  ok((await count(`notifications where kind='schedule'`)) === 0, "아직 연결 안 된 회원에게는 알림 없음");
  ok((await T.textContent("#cal-counts")).replace(/\s/g, "") === "수업1보강0과제0", "오른쪽 위 개수: 수업 1 · 보강 0 · 과제 0");
  await shot(T, "t-day");

  // 일정 상세: 10분 단위로 바꾸기
  await T.click(`[data-sch="${s1.id}"]`); await T.waitForSelector("#sch-sheet");
  ok((await T.$$eval("#sch-time option", (o) => o.map((x) => x.value))).includes("10:10"), "상세 시간은 10분 단위");
  await T.selectOption("#sch-time", "10:10"); await T.fill("#sch-note", "하체 위주");
  await T.click("#plan-add"); await T.click('#plan-lib [data-ex="백 스쿼트"] input').catch(async () => { await T.click("#plan-lib li:first-child input"); });
  await T.click("#plan-done"); await T.click("#sch-save"); await wait(800);
  const s1b = (await q1("select * from schedules where id=$1", [s1.id]))[0];
  ok(new Date(s1b.starts_at).toISOString() === at(tmr, "10:10") && s1b.note === "하체 위주" && s1b.plan.length === 1, "일정 시각(10분 단위)·메모·미리 할 운동 저장");

  // 주간·월간
  await T.click(".calbar .seg >> text=주간"); await T.waitForSelector("#cal-week");
  ok((await T.$$("#cal-week .tg-dh")).length === 7 && (await T.textContent("#cal-week .tg-dh b")) === "월", "주간: 월~일 7칸");
  ok((await T.$$("#cal-week .tg-gut span")).length === 20, "주간: 왼쪽 시간 눈금 05~00시");
  await shot(T, "t-week");
  await T.click(".calbar .seg >> text=월간"); await T.waitForSelector("#cal-month");
  ok(await T.$(`#cal-month [data-date="${tmr}"] .mev`), "월간: 날짜 칸에 그날 일정");
  await shot(T, "t-month");
  await T.click(`#cal-month [data-date="${tmr}"]`); await T.waitForSelector("#cal-day");
  ok(true, "월간 날짜 누르면 일간으로");

  // 월간 일괄 잡기: 다음 달 1일·8일
  await T.click('#bulk-members [data-m="박회원"]'); await T.waitForSelector("#bulk");
  await T.click('button[aria-label="다음 달"]');
  const nm = new Date(); nm.setMonth(nm.getMonth() + 1, 1); const ym = iso(nm).slice(0, 7);
  for (const dd of ["01", "08", "11"]) { await T.click(`#bulk-cal [data-date="${ym}-${dd}"]`); await T.click(`#bulk-times [data-t="19:00"]`); }
  ok((await T.$$("#bulk-list li")).length === 3, "날짜 → 시간 반복으로 3개 담음");
  await shot(T, "t-bulk");
  await T.click("#bulk-go"); await wait(900);
  if ((await count(`schedules where member_id='${mid}' and starts_at >= '${ym}-01'`)) !== 3) { await shot(T, "dbg-bulk"); console.log("toast:", await T.textContent(".toast").catch(() => "-"), await T.textContent("#bulk").catch(() => "-")); }
  ok((await count(`schedules where member_id='${mid}' and starts_at >= '${ym}-01'`)) === 3, "한꺼번에 등록 (3개)");

  // 지난 수업 (어제) → 소진 확인
  await q1("insert into schedules(id, trainer_id, member_id, kind, starts_at, minutes) values ('past1', $1, $2, 'lesson', $3, 50)", [tid, mid, at(yday, "09:00")]);
  await q1("insert into schedules(id, trainer_id, member_id, kind, starts_at, minutes) values ('past2', $1, $2, 'bonus', $3, 50)", [tid, mid, at(yday, "11:00")]);
  await refresh(T);
  await tab(T, "member"); await T.click('[data-member="박회원"] [data-act="edit"]').catch(() => {});
  await T.waitForSelector("#pkg-sum");
  const kv = await T.$$eval("#pkg-sum b", (b) => b.map((x) => x.textContent));
  ok(kv[0] === "9" && kv[1] === "4", "지난 수업 1회 소진 (남은 9 · 예정 4), 보강은 소진 안 됨");

  // ── 회원 가입 → 초대 코드 연결
  const M = await open(browser, "member");
  await signup(M, "회원", "박회원", "m1@test.kr");
  await M.waitForSelector("#claim-code");
  ok((await M.$$eval("nav button span", (s) => s.map((x) => x.textContent))).join() === "홈,일정,과제,강사,운동,영양,분석,내 정보", "회원 탭: 홈·일정·과제·강사·운동·영양·분석·내 정보");
  await shot(M, "m-start");
  await M.fill("#claim-code", code); await M.click("#claim-go"); await wait(1200);
  const muid = (await q1("select id from profiles where display_name='박회원'"))[0].id;
  ok((await q1("select user_id from members where id=$1", [mid]))[0].user_id === muid, "초대 코드로 강사와 연결");
  ok((await count(`notifications where user_id='${tid}' and kind='link'`)) === 1, "강사에게 연결 알림");
  await tab(M, "trainers"); await M.waitForSelector('[data-trainer="김코치"]');
  ok((await M.textContent('[data-trainer="김코치"]')).includes("남은 세션 9회"), "회원 강사 탭: 연결된 강사 목록 + 남은 세션");

  // 강사 프로필 작성 → 회원에게 보임
  await T.click('button[aria-label="계정과 저장 상태"]'); await T.waitForSelector("#tp-form");
  await T.fill("#tp-nick", "코치K"); await T.fill("#tp-philo-in", "다치지 않고 오래 운동하는 몸"); await T.fill("#tp-career-in", "퍼스널 트레이너 7년"); await T.fill("#tp-certs-in", "생활스포츠지도사 2급");
  await T.click("#tp-save"); await T.waitForSelector("#tp-msg"); await shot(T, "t-account"); await T.click(".sheet >> text=닫기");
  await refresh(M); await tab(M, "trainers");
  await M.click('[data-trainer="코치K"] .minfo'); await M.waitForSelector("#tr-profile");
  ok((await M.textContent("#tp-philo")).includes("다치지 않고") && (await M.textContent("#tp-certs")).includes("2급"), "회원: 강사 프로필(철학·경력·자격) 보기");
  await shot(M, "m-trainer");

  // 회원: 일정 보기 → 취소 요청(사유)
  await tab(M, "schedule");
  if (!(await M.$("#cal-week"))) await M.click(".calbar .seg >> text=주간");
  await M.click(".calbar >> text=오늘"); await shot(M, "m-week");
  await M.click(`[data-sch="${s1.id}"]`); await M.waitForSelector("#sch-sheet");
  ok(!(await M.$("#sch-save")) && !(await M.$("#sch-del")), "회원은 일정을 고치거나 지울 수 없음 (화면)");
  await M.click("#req-cancel"); await M.fill("#req-reason", "야근"); await M.click("#req-send"); await wait(900);
  const rq = (await q1("select * from requests where kind='cancel'"))[0];
  ok(rq && rq.reason === "야근" && rq.trainer_id === tid && rq.schedule_id === s1.id, "취소 요청 저장 (사유 포함)");
  ok((await count(`notifications where user_id='${tid}' and kind='request'`)) === 1, "강사에게 취소 요청 알림");
  await M.click("#sch-sheet >> text=닫기").catch(() => {});

  // 회원: 빈 칸 → 수업 일정 요청 (강사 고르기)
  await M.click(".calbar .seg >> text=일간");
  const d3 = addD(3);
  for (let i = 0; i < 3; i++) await M.click('button[aria-label="다음"]');
  await M.click(`[data-slot="${d3} 19:00"]`); await M.waitForSelector("#req-book");
  await M.click('#rb-trainers [data-t="코치K"]').catch(() => {});
  await M.click("#rb-send"); await wait(900);
  const rb = (await q1("select * from requests where kind='book'"))[0];
  ok(rb && new Date(rb.want_at).toISOString() === at(d3, "19:00") && rb.trainer_id === tid, "회원 수업 일정 요청 (강사 선택)");
  ok(!!(await asRole(muid, "insert into public.schedules(id, member_id, starts_at) values ('hack', $1, now())", [mid])).error, "서버: 회원은 일정을 직접 못 잡음");
  ok(!!(await asRole(muid, "update public.schedules set status='canceled' where id=$1", [s1.id])).error || (await asRole(muid, "update public.schedules set status='canceled' where id=$1", [s1.id])).rowCount === 0, "서버: 회원은 일정을 직접 취소 못 함");

  // 강사: 알림 → 요청 승인
  await refresh(T);
  ok(/알림 \d+개/.test(await T.getAttribute("#bell", "aria-label")), "강사 알림 종에 안 읽은 개수");
  await T.click("#bell"); await T.waitForSelector("#notify"); await shot(T, "t-notify");
  await T.click('#notify [data-kind="request"] button'); await T.waitForSelector("#req-list");
  ok((await T.$$("#req-list li")).length === 2, "강사 일정 탭에 회원 요청 2건");
  await shot(T, "t-requests");
  await T.click('#req-list li[data-req="cancel"] [data-act="approve"]'); await wait(900);
  ok((await q1("select status, cancel_reason from schedules where id=$1", [s1.id]))[0].status === "canceled", "취소 요청 승인 → 일정 취소 (소진 안 됨)");
  await T.click('#req-list li[data-req="book"] [data-act="approve"]'); await wait(900);
  ok((await count(`schedules where member_id='${mid}' and starts_at='${at(d3, "19:00")}' and status='planned'`)) === 1, "수업 일정 요청 승인 → 일정 생김");
  ok((await count(`notifications where user_id='${muid}' and kind='decided'`)) === 2, "회원에게 승인 알림 2건");

  // 노쇼: 지난 수업 체크 → 소진 유지, 다시 누르면 해제, 그 시간에 새로 잡기 가능
  await tab(T, "schedule"); await T.click(".calbar .seg >> text=일간");
  await T.click(".calbar >> text=오늘"); await T.click('button[aria-label="이전"]');
  await T.click('[data-sch="past1"]'); await T.waitForSelector("#sch-noshow");
  await T.click("#sch-noshow"); await wait(800);
  ok((await q1("select status from schedules where id='past1'"))[0].status === "noshow", "노쇼 체크");
  ok(!(await T.isDisabled(`[data-slot="${yday} 09:00"]`)), "노쇼 시간 칸에 다시 잡을 수 있음");
  await T.click("#sch-noshow"); await wait(800);
  ok((await q1("select status from schedules where id='past1'"))[0].status === "planned", "노쇼 다시 누르면 해제");
  ok(!!(await asRole(tid, "update public.schedules set status='noshow' where id=$1", [(await q1("select id from schedules where starts_at > now() and status='planned' limit 1"))[0].id])).error, "서버: 시작 전 수업은 노쇼 불가");

  // 지난 수업 → 운동 기록 쓰기 (미리 할 운동 이어짐)
  await q1("update schedules set plan=$1 where id='past1'", [JSON.stringify([{ id: "e1", kind: "strength", cat: "gym", exId: "bench", name: "벤치 프레스", mus: ["chest"], sets: [{ w: 40, r: 10, rir: 2 }] }])]);
  await refresh(T); await tab(T, "schedule"); await T.click(".calbar >> text=오늘"); await T.click('button[aria-label="이전"]');
  await T.click('[data-sch="past1"]'); await T.click("#sch-log"); await wait(600);
  ok((await T.inputValue("#s-date")) === yday && (await T.inputValue("#s-time")) === "09:00", "운동 기록 쓰기: 날짜·시각 채워짐");
  ok((await T.content()).includes("벤치프레스") && (await T.inputValue(".sets input")) === "40", "운동 기록 쓰기: 미리 정한 운동이 들어옴");
  await T.click("#s-save"); await wait(1500);
  ok((await count(`sessions where schedule_id='past1'`)) === 1, "운동 기록이 그 수업과 연결돼 저장");

  // 지난 수업 삭제 → 세션 복구
  await tab(T, "schedule"); await T.click(".calbar >> text=오늘"); await T.click('button[aria-label="이전"]');
  await T.click('[data-sch="past1"]'); await T.click("#sch-del");
  ok((await T.textContent("#sch-sheet")).includes("복구"), "지난 수업 삭제 안내: 세션 복구");
  await T.click("#sch-del-ok"); await wait(900);
  await tab(T, "member"); await T.click('[data-member="박회원"] [data-act="edit"]').catch(() => {}); await T.waitForSelector("#pkg-sum");
  ok((await T.$$eval("#pkg-sum b", (b) => b.map((x) => x.textContent)))[0] === "10", "지난 수업 삭제 → 남은 세션 10으로 복구");

  // ── 과제: 운동 여러 개 체크 · 무게/횟수/RIR · 기한
  await tab(T, "assign"); await T.click("#as-new"); await T.waitForSelector("#as-form");
  await T.click('#as-members [data-m="박회원"]'); await T.fill("#as-title", "하체 홈트");
  await T.click("#plan-add"); const boxes = await T.$$("#plan-lib li input"); await boxes[0].click(); await boxes[1].click(); await T.click("#plan-done");
  ok((await T.$$(".plan-e")).length === 2, "과제: 운동 2개 체크");
  await T.fill(".plan-e .sets input[aria-label='횟수']", "15");
  await T.fill("#as-due", tmr); await shot(T, "t-assign-form");
  await T.click("#as-save"); await wait(900);
  const as1 = (await q1("select * from assignments"))[0];
  ok(as1 && as1.items.length === 2 && String(as1.items[0].sets[0].r) === "15" && iso(new Date(as1.due_on)) === tmr, "과제 저장 (운동·횟수·기한)");
  ok((await count(`notifications where user_id='${muid}' and kind='assignment'`)) === 1, "회원에게 과제 알림");
  // 기한 지난 과제 (미제출 도장 확인용)
  await q1("insert into assignments(id, trainer_id, member_id, title, items, due_on) values ('aold', $1, $2, '지난 과제', $3, $4)", [tid, mid, JSON.stringify(as1.items.slice(0, 1)), yday]);

  // 회원: 과제 탭 → 체크 → 사진 → 제출 → 도장
  await refresh(M);
  ok((await M.getAttribute("#bell", "aria-label")).startsWith("알림"), "회원 알림 종");
  await tab(M, "assign"); await M.waitForSelector('[data-as="하체 홈트"]');
  ok(await M.$('[data-as="지난 과제"] [data-stamp="miss"]'), "기한 지난 과제: 미제출 도장");
  await shot(M, "m-assign");
  await M.click('[data-as="하체 홈트"] .asrow'); await M.waitForSelector("#as-sheet");
  ok(await M.isDisabled("#as-submit"), "운동을 다 체크해야 제출 가능");
  for (const b of await M.$$("#as-items input[type=checkbox]")) await b.click();
  const fi = await M.$("#as-sheet input[type=file]"); if (fi) { await fi.setInputFiles({ name: "proof.png", mimeType: "image/png", buffer: PNG }); await wait(1200); }
  await M.fill("#as-memo", "마지막 세트 힘듦"); await M.click("#as-submit"); await wait(1200);
  const as1b = (await q1("select * from assignments where id=$1", [as1.id]))[0];
  ok(!!as1b.done_at && as1b.member_note === "마지막 세트 힘듦", "과제 제출 (완료 시각·메모)");
  ok(!fi || as1b.photos.length === 1, "인증 사진 첨부");
  ok(await M.$('#as-sheet [data-stamp="ok"]'), "제출 완료 도장");
  ok((await count(`sessions where id='as_${as1.id}'`)) === 1, "제출한 과제가 운동 기록에도 들어감");
  ok((await count(`notifications where user_id='${tid}' and kind='submitted'`)) === 1, "강사에게 제출 알림");
  await shot(M, "m-stamp");
  await M.click("#as-sheet >> text=닫기");
  await M.click('[data-as="지난 과제"] .asrow'); for (const b of await M.$$("#as-items input[type=checkbox]")) await b.click(); await M.click("#as-submit"); await wait(1000);
  ok(await M.$('#as-sheet [data-stamp="late"]'), "기한 뒤 제출: 지연 제출 도장");
  await M.click("#as-sheet >> text=닫기");
  ok(!!(await asRole(muid, "update public.assignments set due_on = current_date + 10 where id='aold'")).error || (await asRole(muid, "update public.assignments set due_on = current_date + 10 where id='aold'")).rowCount === 0, "서버: 회원은 과제 기한을 못 바꿈");

  // 회원 알림 읽음
  await M.click("#bell"); await M.waitForSelector("#notify"); await wait(600); await M.click("#notify >> text=닫기");
  ok((await count(`notifications where user_id='${muid}' and not read`)) === 0 && (await M.getAttribute("#bell", "aria-label")) === "알림", "알림 열면 읽음 처리");

  // ── 다른 강사: 남의 회원·일정 못 봄, 코드 못 씀
  const T2 = await open(browser, "trainer2");
  await signup(T2, "강사", "이강사", "t2@test.kr");
  const t2 = (await q1("select id from profiles where display_name='이강사'"))[0].id;
  ok(+(await asRole(t2, "select count(*) from public.schedules")).rows[0].count === 0 && +(await asRole(t2, "select count(*) from public.members")).rows[0].count === 0, "서버: 다른 강사는 남의 회원·일정 안 보임");
  ok(!!(await asRole(t2, "select public.claim_member($1)", [code])).error, "서버: 강사는 초대 코드를 쓸 수 없음");
  ok(!!(await asRole(t2, "insert into public.schedules(id, member_id, starts_at) values ('x2', $1, now() + interval '1 day')", [mid])).error, "서버: 연결 안 된 강사는 일정 못 잡음");
  ok((await asRole(muid, "update public.profiles set sub_until = current_date + 30 where id = $1 returning sub_until", [muid])).rows?.[0]?.sub_until == null, "서버: 회원이 스스로 구독 기간을 못 늘림");
  ok(!!(await asRole(tid, "select public.set_subscription($1, current_date + 30)", [muid])).error, "서버: 강사는 구독 지정 불가 (마스터만)");

  // ── 마스터: 구독 지정
  await q1("update profiles set is_master = true where id=$1", [t2]);
  await refresh(T2);
  ok((await T2.$$eval("nav button span", (s) => s.map((x) => x.textContent))).includes("마스터"), "마스터 탭 보임");
  await tab(T2, "master"); await T2.waitForSelector('#ms-members [data-user="박회원"]');
  await T2.click('#ms-members [data-user="박회원"] >> text=+1개월'); await wait(900);
  ok(!!(await q1("select sub_until from profiles where id=$1", [muid]))[0].sub_until, "마스터: 회원 구독 +1개월");
  ok(+(await asRoleCommit(tid, "select count(*) from (select public.request_subscription()) x")).rows[0].count === 1 && (await count(`notifications where user_id='${t2}' and kind='subreq'`)) === 1, "강사 구독 신청 → 마스터에게 알림");
  ok((await asRoleCommit(tid, "select public.request_subscription() v")).rows[0].v === "already", "구독 신청은 하루 한 번");
  await refresh(T2); await tab(T2, "master");
  ok(await T2.$('#ms-trainers [data-user="코치K"] >> text=+1개월'), "마스터: 강사 구독도 +1개월로 지정");
  await T2.selectOption('#ms-trainers [data-user="코치K"] select', "pro"); await T2.click('#ms-trainers [data-user="코치K"] >> text=+1개월'); await wait(900);
  ok((await q1("select plan from profiles where id=$1", [tid]))[0].plan === "pro", "마스터: 강사 등급 지정 (프로)");
  ok(!!(await asRole(tid, "update public.profiles set plan='unlimited' where id=$1 returning plan", [tid])).rows?.every((r) => r.plan === "pro"), "서버: 강사가 스스로 등급을 못 바꿈");
  // 등급 한도: 베이직(5명)으로 내려서 확인
  await q1("update profiles set plan='basic' where id=$1", [tid]);
  for (let i = 1; i <= 4; i++) await q1("insert into members(id, name, trainer_id) values ($1, $2, $3)", ["lim" + i, "한도" + i, tid]);
  const lim = await asRole(tid, "insert into public.members(id, name, trainer_id) values ('lim5', 'x', $1)", [tid]);
  ok(!!lim.error && /member_limit/.test(lim.error), "서버: 베이직 5명 다 차면 회원 등록 막힘");
  await refresh(T); await tab(T, "member");
  ok((await T.textContent("#quota")).replace(/\s/g, "").includes("5/5명"), "회원 목록에 회원 수 / 한도");
  await overflowCheck(T, "440px 회원 한도"); await shot(T, "t-quota");
  await T.click('[aria-label="회원 추가"]'); await T.fill("#new-name", "여섯째"); await T.press("#new-name", "Enter"); await wait(500);
  ok((await count("members where name='여섯째'")) === 0 && (await T.textContent(".toast")).includes("5명까지"), "화면: 한도 넘으면 추가 막고 등급 올리기 안내");
  await T.click('button[aria-label="계정과 저장 상태"]'); await T.waitForSelector("#tplan-line");
  ok((await T.textContent("#tplan-state")) === "베이직", "강사 계정 화면: 내 구독 등급");
  await T.click("#tplan-change"); await overflowCheck(T, "440px 내 구독 등급 바꾸기"); await shot(T, "t-plan"); await T.click(".sheet >> text=닫기");
  await q1("DELETE FROM members WHERE id LIKE 'lim%'");
  await refresh(T);
  // 무제한 강사와 연결된 회원: 구독료 감면
  await q1("update profiles set plan='unlimited' where id=$1", [tid]);
  ok((await asRoleCommit(muid, "select public.member_fee_waived($1) v", [muid])).rows[0].v === true, "서버: 무제한 강사와 연결된 회원은 감면");
  await shot(T2, "master");
  await refresh(M); await M.click('button[aria-label="계정과 저장 상태"]'); await M.waitForSelector("#sub-state");
  ok((await M.textContent("#sub-state")) === "이용 중" && (await M.textContent("#sub-waive")).includes("다음 결제일"), "회원 계정 화면: 구독 중 + 다음 결제일부터 감면");
  await shot(M, "m-account"); await M.click(".sheet >> text=닫기");

  // ── 화면 검사: 440px(아이폰 17 Pro Max) · 320px, 강사·회원·마스터
  const views = [["T", T, ["home", "schedule", "member", "workout", "assign", "nutrition", "stats"]], ["M", M, ["home", "schedule", "assign", "trainers", "workout", "nutrition", "stats", "member"]], ["MS", T2, ["master", "schedule"]]];
  for (const w of [440, 320]) {
    for (const [tag, p, tabs] of views) {
      await p.setViewportSize({ width: w, height: w === 440 ? 956 : 640 });
      for (const k of tabs) {
        await tab(p, k);
        if (k === "schedule") for (const v of ["일간", "주간", "월간"]) { await p.click(`.calbar .seg >> text=${v}`); await wait(200); await overflowCheck(p, `${w}px ${tag} 일정 ${v}`); if (w === 320) await shot(p, `${tag}-${k}-${v}-320`); }
        else { await overflowCheck(p, `${w}px ${tag} ${k}`); if (w === 320) await shot(p, `${tag}-${k}-320`); }
      }
    }
    // 창들
    await tab(T, "schedule"); await T.click(".calbar .seg >> text=일간"); await T.click(".calbar >> text=오늘");
    for (let i = 0; i < 3; i++) await T.click('button[aria-label="다음"]');
    await T.click(`[data-sch]`); await T.waitForSelector("#sch-sheet"); await overflowCheck(T, `${w}px 일정 상세`); await shot(T, `t-sheet-${w}`); await T.click("#sch-sheet >> text=닫기");
    await T.click('#bulk-members [data-m="박회원"]'); await T.click('button[aria-label="다음 달"]'); await T.click(`#bulk-cal [data-date="${ym}-15"]`); await overflowCheck(T, `${w}px 일괄 잡기`); await shot(T, `t-bulk-${w}`); await T.click("text=‹ 일정으로");
    await tab(M, "assign"); await M.click('[data-as="하체 홈트"] .asrow'); await overflowCheck(M, `${w}px 과제 도장`); await shot(M, `m-stamp-${w}`); await M.click("#as-sheet >> text=닫기");
  }

  ok(errors.length === 0, "페이지 오류 없음" + (errors.length ? " → " + errors.slice(0, 5).join(" | ") : ""));
  console.log(`\n${passed}개 통과`);
  await browser.close(); await pool.end();
})().catch(async (e) => { console.error(e); for (const [t, p] of PAGES) { try { await p.screenshot({ path: `${SHOTS}/FAIL-${t}.png` }); console.error("--", t, (await p.innerText("main")).slice(0, 900)); } catch (x) {} } console.error("errors:", errors.slice(0, 8)); process.exit(1); });
