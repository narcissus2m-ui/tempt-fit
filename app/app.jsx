/* TEMPT FIT — 회원·강사 일정 연동 + 근거 기반 운동·영양 관리
   데이터 원칙: 회원/신체/운동 기록은 한 곳에만 저장하고, 모든 탭은 같은 저장소에서 파생값을 계산한다. */
const { useState, useMemo, useContext, createContext, useEffect, useRef } = React;

/* ───────── 근거 문헌 ───────── */
const REFS = {
  tanaka: "Tanaka H, Monahan KD, Seals DR. Age-predicted maximal heart rate revisited. J Am Coll Cardiol. 2001;37(1):153-156.",
  gellish: "Gellish RL, et al. Longitudinal modeling of the relationship between age and maximal heart rate. Med Sci Sports Exerc. 2007;39(5):822-829.",
  fox: "Fox SM, Naughton JP, Haskell WL. Physical activity and the prevention of coronary heart disease. Ann Clin Res. 1971;3(6):404-432.",
  karvonen: "Karvonen MJ, Kentala E, Mustala O. The effects of training on heart rate: a longitudinal study. Ann Med Exp Biol Fenn. 1957;35(3):307-315.",
  seiler: "Seiler S. What is best practice for training intensity and duration distribution in endurance athletes? Int J Sports Physiol Perform. 2010;5(3):276-291.",
  who: "Bull FC, et al. WHO 2020 guidelines on physical activity and sedentary behaviour. Br J Sports Med. 2020;54(24):1451-1462.",
  donnelly: "Donnelly JE, et al. ACSM Position Stand: Appropriate physical activity intervention strategies for weight loss and prevention of weight regain. Med Sci Sports Exerc. 2009;41(2):459-471.",
  wilson: "Wilson JM, et al. Concurrent training: a meta-analysis examining interference of aerobic and resistance exercises. J Strength Cond Res. 2012;26(8):2293-2307.",
  mifflin: "Mifflin MD, St Jeor ST, et al. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr. 1990;51(2):241-247.",
  katch: "McArdle WD, Katch FI, Katch VL. Exercise Physiology: Nutrition, Energy, and Human Performance (Katch-McArdle 공식, BMR = 370 + 21.6 × 제지방량).",
  helms: "Helms ER, Aragon AA, Fitschen PJ. Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation. J Int Soc Sports Nutr. 2014;11:20.",
  morton: "Morton RW, et al. A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength. Br J Sports Med. 2018;52(6):376-384.",
  jager: "Jäger R, et al. ISSN Position Stand: protein and exercise. J Int Soc Sports Nutr. 2017;14:20.",
  iraki: "Iraki J, Fitschen P, Espinar S, Helms E. Nutrition recommendations for bodybuilders in the off-season: a narrative review. Sports. 2019;7(7):154.",
  garthe: "Garthe I, et al. Effect of two different weight-loss rates on body composition and strength and power-related performance in elite athletes. Int J Sport Nutr Exerc Metab. 2011;21(2):97-104.",
  redS: "Mountjoy M, et al. IOC consensus statement on relative energy deficiency in sport (RED-S): 2018 update. Br J Sports Med. 2018;52(11):687-697.",
  ace: "American Council on Exercise (ACE). 성별 체지방률 분류표 (필수지방·운동선수·피트니스·평균·비만).",
  paoli: "Paoli A, Rubini A, Volek JS, Grimaldi KA. Beyond weight loss: a review of the therapeutic uses of very-low-carbohydrate (ketogenic) diets. Eur J Clin Nutr. 2013;67(8):789-796.",
  westman: "Westman EC, et al. Low-carbohydrate nutrition and metabolism. Am J Clin Nutr. 2007;86(2):276-284.",
  aragon: "Aragon AA, et al. ISSN position stand: diets and body composition. J Int Soc Sports Nutr. 2017;14:16.",
  lennerz: "Lennerz BS, et al. Behavioral characteristics and self-reported health status among 2029 adults consuming a \"carnivore diet\". Curr Dev Nutr. 2021;5(12):nzab133.",
  bilsborough: "Bilsborough S, Mann N. A review of issues of dietary protein intake in humans. Int J Sport Nutr Exerc Metab. 2006;16(2):129-152.",
  kouri: "Kouri EM, et al. Fat-free mass index in users and nonusers of anabolic-androgenic steroids. Clin J Sport Med. 1995;5(4):223-228.",
  epley: "Epley B. Poundage Chart. Boyd Epley Workout. Lincoln, NE; 1985. (1RM = w × (1 + r/30))",
  brzycki: "Brzycki M. Strength testing: predicting a one-rep max from reps-to-fatigue. J Phys Educ Recreat Dance. 1993;64(1):88-90.",
  lombardi: "Lombardi VP. Beginning Weight Training. Dubuque, IA: W.C. Brown; 1989. (1RM = w × r^0.10)",
  lesuer: "LeSuer DA, et al. The accuracy of prediction equations for estimating 1-RM performance in the bench press, squat, and deadlift. J Strength Cond Res. 1997;11(4):211-213.",
  reynolds: "Reynolds JM, Gordon TJ, Robergs RA. Prediction of one repetition maximum strength from multiple repetition maximum testing and anthropometry. J Strength Cond Res. 2006;20(3):584-592.",
  zourdos: "Zourdos MC, et al. Novel resistance training-specific RPE scale measuring repetitions in reserve. J Strength Cond Res. 2016;30(1):267-275.",
  helmsRIR: "Helms ER, et al. Application of the repetitions in reserve-based rating of perceived exertion scale for resistance training. Strength Cond J. 2016;38(4):42-49.",
  schoenVol: "Schoenfeld BJ, Ogborn D, Krieger JW. Dose-response relationship between weekly resistance training volume and increases in muscle mass. J Sports Sci. 2017;35(11):1073-1082.",
  schoenFreq: "Schoenfeld BJ, Ogborn D, Krieger JW. Effects of resistance training frequency on measures of muscle hypertrophy. Sports Med. 2016;46(11):1689-1697.",
  schoenLoad: "Schoenfeld BJ, Grgic J, Ogborn D, Krieger JW. Strength and hypertrophy adaptations between low- vs. high-load resistance training. J Strength Cond Res. 2017;31(12):3508-3523.",
  schoenRest: "Schoenfeld BJ, et al. Longer interset rest periods enhance muscle strength and hypertrophy in resistance-trained men. J Strength Cond Res. 2016;30(7):1805-1812.",
  acsm: "ACSM. Progression models in resistance training for healthy adults. Med Sci Sports Exerc. 2009;41(3):687-708.",
  macdougall: "MacDougall JD, et al. The time course for elevated muscle protein synthesis following heavy resistance exercise. Can J Appl Physiol. 1995;20(4):480-486.",
};

/* ───────── 도메인 상수 ───────── */
const MUSCLES = {
  chest: { name: "가슴", size: "L" }, back: { name: "등", size: "L" }, shoulders: { name: "어깨", size: "M" },
  biceps: { name: "이두", size: "S" }, triceps: { name: "삼두", size: "S" }, quads: { name: "대퇴사두", size: "L" },
  hamstrings: { name: "햄스트링", size: "L" }, glutes: { name: "둔근", size: "L" }, calves: { name: "종아리", size: "S" },
  abs: { name: "복근", size: "S" },
};
const BASE_RECOVERY_H = { L: 72, M: 60, S: 48 };
const EQUIPMENT = ["바벨", "덤벨", "플레이트", "케틀벨", "클럽벨", "머신", "케이블", "맨몸", "밴드", "기타"];
// 운동 종류: 헬스 / 필라테스 (도구 목록이 다름)
const CATS = [["gym", "헬스"], ["pilates", "필라테스"]];
const PILATES_EQ = ["체어", "바렐", "리포머", "캐딜락", "매트"];
const FAV_MAX = 5;
const eqFor = (cat) => (cat === "pilates" ? PILATES_EQ : EQUIPMENT);
// 기본 운동 (서버의 운동 목록 표에도 같은 id로 들어 있음). p = 주 부위, s = 보조 부위, eq = 도구
const DEFAULT_EXERCISES = [
  { id: "bench", name: "벤치프레스", p: ["chest"], s: ["triceps", "shoulders"], eq: "바벨" },
  { id: "incline_db", name: "인클라인 덤벨프레스", p: ["chest"], s: ["shoulders", "triceps"], eq: "덤벨" },
  { id: "dip", name: "딥스", p: ["chest", "triceps"], s: ["shoulders"], eq: "맨몸" },
  { id: "ohp", name: "오버헤드프레스", p: ["shoulders"], s: ["triceps"], eq: "바벨" },
  { id: "lateral", name: "사이드 레터럴 레이즈", p: ["shoulders"], s: [], eq: "덤벨" },
  { id: "pushdown", name: "트라이셉스 푸시다운", p: ["triceps"], s: [], eq: "케이블" },
  { id: "deadlift", name: "데드리프트", p: ["hamstrings", "glutes", "back"], s: ["quads"], eq: "바벨" },
  { id: "row", name: "바벨 로우", p: ["back"], s: ["biceps"], eq: "바벨" },
  { id: "pullup", name: "풀업", p: ["back"], s: ["biceps"], eq: "맨몸" },
  { id: "latpull", name: "랫풀다운", p: ["back"], s: ["biceps"], eq: "머신" },
  { id: "curl", name: "바벨 컬", p: ["biceps"], s: [], eq: "바벨" },
  { id: "squat", name: "백스쿼트", p: ["quads", "glutes"], s: ["hamstrings"], eq: "바벨" },
  { id: "legpress", name: "레그프레스", p: ["quads"], s: ["glutes"], eq: "머신" },
  { id: "rdl", name: "루마니안 데드리프트", p: ["hamstrings"], s: ["glutes", "back"], eq: "바벨" },
  { id: "hipthrust", name: "힙 쓰러스트", p: ["glutes"], s: ["hamstrings"], eq: "바벨" },
  { id: "legcurl", name: "레그 컬", p: ["hamstrings"], s: [], eq: "머신" },
  { id: "calf", name: "카프 레이즈", p: ["calves"], s: [], eq: "머신" },
  { id: "cablecrunch", name: "케이블 크런치", p: ["abs"], s: [], eq: "케이블" },
].map((e) => ({ ...e, cat: "gym", note: "", media: [] })).concat([
  { id: "pi_footwork", name: "풋워크", p: ["quads", "glutes"], s: ["calves"], eq: "리포머" },
  { id: "pi_hundred", name: "헌드레드", p: ["abs"], s: [], eq: "매트" },
  { id: "pi_rollup", name: "롤업", p: ["abs"], s: [], eq: "매트" },
  { id: "pi_elephant", name: "엘리펀트", p: ["hamstrings", "abs"], s: [], eq: "리포머" },
  { id: "pi_longstretch", name: "롱 스트레치", p: ["abs", "shoulders"], s: ["chest"], eq: "리포머" },
  { id: "pi_rolldown", name: "롤다운", p: ["abs"], s: ["back"], eq: "캐딜락" },
  { id: "pi_legspring", name: "레그 스프링", p: ["hamstrings", "glutes"], s: ["abs"], eq: "캐딜락" },
  { id: "pi_pumpchair", name: "풋워크 (체어)", p: ["quads", "glutes"], s: ["calves"], eq: "체어" },
  { id: "pi_swanchair", name: "스완 (체어)", p: ["back"], s: ["glutes"], eq: "체어" },
  { id: "pi_swanbarrel", name: "스완 (바렐)", p: ["back"], s: ["glutes"], eq: "바렐" },
  { id: "pi_sidestretch", name: "사이드 스트레치", p: ["abs"], s: [], eq: "바렐" },
].map((e) => ({ ...e, cat: "pilates", note: "", media: [] })));
// 지금 쓰는 운동 목록 (앱이 그릴 때마다 db.exercises로 갱신)
let EX = Object.fromEntries(DEFAULT_EXERCISES.map((e) => [e.id, e]));
let PEOPLE = {}; // id -> { name, role } 서버에서 볼 수 있는 계정
const setPeople = (p) => { PEOPLE = p || {}; };
const setCatalog = (list) => { EX = Object.fromEntries((list || DEFAULT_EXERCISES).map((e) => [e.id, e])); };
// 세션의 종목: 목록의 운동(exId, 이름·부위 사본도 같이 저장) 또는 예전 방식의 직접 입력(name + muscle)
const exKey = (en) => (en.exId ? en.exId : "c:" + (en.name || "").trim());
const exName = (en) => (en.exId ? EX[en.exId]?.name || en.name || "삭제된 운동" : en.name || "운동");
const exDef = (en) => { const e = en.exId && EX[en.exId]; if (e) return e; const p = (en.mus || (en.muscle ? [en.muscle] : [])).filter((k) => MUSCLES[k]); return p.length ? { p, s: [] } : null; };
const exCat = (e) => (e && e.cat) || "gym";
const entryCat = (en) => (en.kind === "cardio" ? "gym" : en.cat || exCat(EX[en.exId]));
const entryLabel = (e) => (e.kind === "cardio" ? `${e.mode} ${e.minutes}분` : exName(e));
const GOALS = {
  diet: { name: "다이어트", kcal: -0.2, protKg: 2.2, protLbm: 2.6, hr: "fatloss" },
  lean: { name: "린매스업", kcal: 0.05, protKg: 2.0, protLbm: 2.4, hr: "hypertrophy" },
  bulk: { name: "벌크업", kcal: 0.15, protKg: 1.8, protLbm: 2.2, hr: "hypertrophy" },
  maintain: { name: "유지·건강", kcal: 0, protKg: 1.6, protLbm: 2.0, hr: "health" },
  endurance: { name: "지구력 향상", kcal: 0, protKg: 1.6, protLbm: 2.0, hr: "polarized" },
};
const ZONES = [
  { z: 1, lo: 0.5, hi: 0.6, name: "회복", use: "워밍업·쿨다운·회복일", feel: "RPE 1–2 · 대화 자유로움", fuel: "지방 위주" },
  { z: 2, lo: 0.6, hi: 0.7, name: "유산소 기초", use: "지방 산화·미토콘드리아·심폐 기초", feel: "RPE 3–4 · 문장 대화 가능", fuel: "지방 > 탄수" },
  { z: 3, lo: 0.7, hi: 0.8, name: "템포", use: "유산소 파워·지구력 유지", feel: "RPE 5–6 · 짧은 문장만", fuel: "혼합" },
  { z: 4, lo: 0.8, hi: 0.9, name: "젖산역치", use: "역치 상승·고강도 지속 능력", feel: "RPE 7–8 · 단어 몇 개", fuel: "탄수 위주" },
  { z: 5, lo: 0.9, hi: 1.0, name: "최대", use: "VO2max·인터벌", feel: "RPE 9–10 · 대화 불가", fuel: "탄수·무산소" },
];
const DIET_STYLES = {
  balanced: { name: "균형식", ref: ["helms", "jager"], ratio: "탄 40–55 · 단 20–30 · 지 25–30%",
    how: "목표별 단백질 → 지방 25–30% → 나머지 탄수화물",
    foods: "현미·고구마·귀리, 닭가슴살·생선·달걀, 견과·올리브유, 채소·과일" },
  keto: { name: "키토제닉", ref: ["paoli", "westman", "aragon"], ratio: "탄 5–10 · 단 20–25 · 지 65–75%",
    how: "순탄수 20–50g(총열량 5% 이하)으로 케톤 상태 유도 → 단백질은 목표량 유지 → 나머지 지방",
    foods: "육류·생선·달걀, 버터·올리브유·아보카도, 치즈, 잎채소·브로콜리, 견과 소량",
    cautions: ["적응기 2–4주 동안 고강도·해당과정 위주 운동 수행이 떨어질 수 있습니다", "나트륨·칼륨·마그네슘을 의식적으로 보충합니다 (키토 플루 예방)", "근비대 목표에서는 균형식 대비 제지방 증가가 작았다는 연구가 있어 감량기에 더 적합합니다"] },
  carnivore: { name: "카니보어", ref: ["lennerz", "bilsborough"], ratio: "탄 0–2 · 단 25–35 · 지 65–75%",
    how: "동물성 식품만 섭취, 탄수화물은 달걀·유제품 미량 → 단백질은 총열량 35% 이하로 제한 → 나머지 지방",
    foods: "소·돼지고기(지방 있는 부위), 생선·해산물, 달걀, 버터·우지, 간 등 내장육",
    cautions: ["장기 효과에 대한 대조 연구가 부족하며 근거는 관찰·자가보고 수준입니다", "식이섬유·비타민 C 공급원이 없으므로 내장육·혈액검사로 관리합니다", "LDL 콜레스테롤이 크게 오를 수 있어 시작 전·후 지질 검사를 권합니다", "단백질이 총열량 35%를 넘으면 처리 한계를 넘을 수 있어 지방으로 열량을 채웁니다"] },
};
const macrosFor = (style, target, baseProtein, sex, weightKg) => {
  let protein, carb, fat;
  if (style === "keto") {
    carb = Math.min(50, Math.max(20, (target * 0.05) / 4));
    protein = Math.min(baseProtein, (target * 0.25) / 4);
    fat = Math.max(0, (target - protein * 4 - carb * 4) / 9);
  } else if (style === "carnivore") {
    carb = 5;
    protein = Math.min(Math.max(baseProtein, 2.0 * weightKg), (target * 0.35) / 4);
    fat = Math.max(0, (target - protein * 4 - carb * 4) / 9);
  } else {
    protein = baseProtein;
    fat = Math.max((target * (sex === "F" ? 0.3 : 0.25)) / 9, (sex === "F" ? 0.8 : 0.6) * weightKg);
    carb = Math.max(0, (target - protein * 4 - fat * 9) / 4);
  }
  return { protein, carb, fat };
};
const HR_TEMPLATES = {
  fatloss: { name: "체지방 감량", total: [200, 300], dist: [10, 65, 15, 5, 5], ref: ["donnelly", "who"],
    note: "주 200–300분 중강도 유산소가 유의한 체중 감량과 연관. 근손실을 막기 위해 근력운동과 병행." ,
    week: ["Z2 40분", "근력 + Z1 10분", "Z2 45분", "근력", "Z3 20분 + Z2 20분", "Z2 60분 (걷기·자전거)", "휴식"] },
  health: { name: "건강·기초체력", total: [150, 300], dist: [10, 70, 15, 5, 0], ref: ["who"],
    note: "WHO 권고: 주 150–300분 중강도(대략 Z2–Z3) 또는 75–150분 고강도.",
    week: ["Z2 30분", "근력", "Z2 30분", "휴식", "Z3 20분", "Z2 40분", "휴식"] },
  polarized: { name: "지구력(80/20 양극화)", total: [240, 420], dist: [20, 60, 5, 10, 5], ref: ["seiler"],
    note: "엘리트 지구력 선수의 훈련 강도 분포는 약 80% 저강도, 20% 고강도.",
    week: ["Z2 60분", "Z4 4×8분 인터벌", "Z1–2 45분", "휴식", "Z5 6×3분 인터벌", "Z2 90분 장거리", "Z1 30분"] },
  hypertrophy: { name: "근비대 병행", total: [60, 120], dist: [20, 70, 10, 0, 0], ref: ["wilson"],
    note: "유산소 빈도·시간이 늘수록 근비대·근력 간섭이 커짐. 저충격 Z2 위주로 짧게, 하체 운동일과 분리.",
    week: ["근력", "Z2 20분", "근력", "휴식", "근력", "Z2 30분 (자전거)", "휴식"] },
};
const ACTIVITY = [
  { max: 0, f: 1.2, label: "운동 거의 안 함" }, { max: 2, f: 1.375, label: "주 1–2회" },
  { max: 4, f: 1.55, label: "주 3–4회" }, { max: 6, f: 1.725, label: "주 5–6회" }, { max: 99, f: 1.9, label: "주 7회 이상" },
];
// 성별·나이가 비어 있는 회원(엑셀로 들여온 회원 등)도 화면이 깨지지 않게
const sexShort = (s) => (s === "M" ? "남" : s === "F" ? "여" : "성별 미입력");
const ageText = (a) => (a != null ? `${a}세` : "나이 미입력");
const BF_CLASS = {
  M: [[5, "필수지방"], [13, "운동선수"], [17, "피트니스"], [24, "평균"], [99, "비만"]],
  F: [[13, "필수지방"], [20, "운동선수"], [24, "피트니스"], [31, "평균"], [99, "비만"]],
};

/* ───────── 계산 함수 (모든 탭이 공유) ───────── */
const uid = () => Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 9); // 기기 여러 대에서 만들어도 겹치지 않게
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const todayISO = () => iso(new Date());
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const r1 = (x) => Math.round(x * 10) / 10;
const ageOf = (birth) => {
  if (!birth) return null; const b = new Date(birth), n = new Date();
  let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a;
};
const hrMaxOf = (m) => {
  const a = ageOf(m.birth); if (m.hrFormula === "measured" && m.hrMaxMeasured) return +m.hrMaxMeasured;
  if (a == null) return null;
  if (m.hrFormula === "fox") return 220 - a; if (m.hrFormula === "gellish") return Math.round(207 - 0.7 * a);
  return Math.round(208 - 0.7 * a);
};
const zonesOf = (m) => {
  const max = hrMaxOf(m); if (!max) return [];
  const rest = +m.restingHR || 0, karv = m.zoneMethod !== "pct" && rest > 0;
  const bpm = (p) => Math.round(karv ? rest + p * (max - rest) : p * max);
  return ZONES.map((z) => ({ ...z, from: bpm(z.lo), to: bpm(z.hi) }));
};
const zoneForHR = (zones, hr) => { if (!zones.length || !hr) return null; let k = null; zones.forEach((z) => { if (hr >= z.from) k = z.z; }); return k; };
const F1RM = {
  epley: { name: "Epley", f: (w, r) => (r === 1 ? w : w * (1 + r / 30)), pct: (r) => (r === 1 ? 1 : 1 / (1 + r / 30)) },
  brzycki: { name: "Brzycki", f: (w, r) => w * 36 / (37 - r), pct: (r) => (37 - r) / 36 },
  lombardi: { name: "Lombardi", f: (w, r) => w * Math.pow(r, 0.1), pct: (r) => Math.pow(r, -0.1) },
};
const e1rm = (w, r, formula = "avg") => {
  if (!w || !r || r > 30) return 0;
  if (formula === "avg") return (F1RM.epley.f(w, r) + F1RM.brzycki.f(w, r) + F1RM.lombardi.f(w, r)) / 3;
  return F1RM[formula].f(w, r);
};
const pctFor = (r, formula = "avg") => formula === "avg" ? (F1RM.epley.pct(r) + F1RM.brzycki.pct(r) + F1RM.lombardi.pct(r)) / 3 : F1RM[formula].pct(r);
const roundTo = (x, step) => Math.round(x / step) * step;
const sessionTime = (s) => new Date(`${s.date}T${s.time || "19:00"}`);

function derive(db, memberId) {
  const m = db.members.find((x) => x.id === memberId);
  if (!m) return null;
  const meas = db.measurements.filter((x) => x.memberId === memberId).sort((a, b) => a.date.localeCompare(b.date));
  const latest = meas[meas.length - 1] || null;
  const sessions = db.sessions.filter((x) => x.memberId === memberId).sort((a, b) => sessionTime(b) - sessionTime(a));
  const age = ageOf(m.birth);
  const zones = zonesOf(m);

  // 신체 조성
  let body = null;
  if (latest) {
    const h = latest.heightCm / 100, w = +latest.weightKg;
    const fatKg = latest.bodyFatPct ? w * latest.bodyFatPct / 100 : null;
    const lbm = fatKg != null ? w - fatKg : null;
    const bmi = w / (h * h);
    const ffmi = lbm ? lbm / (h * h) : null;
    const cls = latest.bodyFatPct && BF_CLASS[m.sex] ? BF_CLASS[m.sex].find(([mx]) => latest.bodyFatPct <= mx)[1] : null;
    body = { ...latest, fatKg, lbm, bmi, ffmi, ffmiN: ffmi ? ffmi + 6.1 * (1.8 - h) : null, cls };
  }

  // 활동계수: 운동 일지 최근 14일 → 주당 세션 수
  const since14 = new Date(); since14.setDate(since14.getDate() - 14);
  const recent14 = sessions.filter((s) => sessionTime(s) >= since14).length;
  const perWeek = recent14 / 2;
  const autoAct = ACTIVITY.find((a) => perWeek <= a.max);
  const actFactor = m.activityMode === "manual" ? +m.activityManual : autoAct.f;

  // 대사량
  let energy = null;
  if (body && age != null) {
    const mif = 10 * body.weightKg + 6.25 * body.heightCm - 5 * age + (m.sex === "M" ? 5 : -161);
    const km = body.lbm ? 370 + 21.6 * body.lbm : null;
    const method = km ? "katch" : "mifflin";
    const bmr = km || mif;
    const tdee = bmr * actFactor;
    const g = GOALS[m.goal];
    let target = tdee * (1 + g.kcal);
    const floored = target < bmr; if (floored) target = bmr;
    const baseProtein = body.lbm ? g.protLbm * body.lbm : g.protKg * body.weightKg;
    const style = DIET_STYLES[m.dietStyle] ? m.dietStyle : "balanced";
    const styles = Object.fromEntries(Object.keys(DIET_STYLES).map((k) => [k, macrosFor(k, target, baseProtein, m.sex, body.weightKg)]));
    const { protein, carb, fat } = styles[style];
    const ea = body.lbm ? target / body.lbm : null; // 운동 소비 제외 전 값 (상한 추정)
    const weekly = ((target - tdee) * 7) / 7700;
    energy = { mif, km, method, bmr, tdee, target, floored, protein, fat, carb, ea, weekly, goal: g, style, styles, baseProtein };
  }

  // 운동 기록 → 1RM 추정 & 부위별 볼륨/회복
  const best = {}; // exId -> {e1rm, w, r, rir, date}
  const history = {}; // exId -> [{date, e1rm}]
  const names = {}; // 종목 키 -> 이름
  sessions.slice().reverse().forEach((s) => s.entries.forEach((en) => {
    if (en.kind !== "strength" || entryCat(en) === "pilates") return;
    let top = 0, topSet = null;
    en.sets.forEach((st) => {
      const reps = +st.r + (+st.rir || 0); const v = e1rm(+st.w, reps);
      if (v > top) { top = v; topSet = st; }
    });
    if (!top) return;
    const k = exKey(en); names[k] = exName(en);
    (history[k] = history[k] || []).push({ date: s.date, e1rm: top });
    if (!best[k] || top > best[k].e1rm) best[k] = { e1rm: top, ...topSet, date: s.date };
  }));

  const now = new Date(); const since7 = new Date(); since7.setDate(since7.getDate() - 7);
  const weekly = Object.fromEntries(Object.keys(MUSCLES).map((k) => [k, { sets: 0, days: new Set() }]));
  const recovery = {};
  Object.keys(MUSCLES).forEach((k) => {
    for (const s of sessions) {
      let eff = 0, minRir = 9;
      s.entries.forEach((en) => {
        if (en.kind !== "strength") return; const ex = exDef(en); if (!ex) return;
        const wgt = ex.p.includes(k) ? 1 : ex.s.includes(k) ? 0.5 : 0; if (!wgt) return;
        eff += wgt * en.sets.length; if (wgt === 1) en.sets.forEach((st) => { minRir = Math.min(minRir, +st.rir || 0); });
      });
      if (eff > 0) {
        const base = BASE_RECOVERY_H[MUSCLES[k].size];
        const need = base + (eff >= 8 ? 12 : 0) + (minRir <= 1 ? 12 : 0);
        const elapsed = (now - sessionTime(s)) / 36e5;
        recovery[k] = { last: s.date, eff, minRir, need, elapsed, pct: Math.min(1, Math.max(0, elapsed / need)), readyAt: new Date(sessionTime(s).getTime() + need * 36e5) };
        break;
      }
    }
  });
  sessions.filter((s) => sessionTime(s) >= since7).forEach((s) => s.entries.forEach((en) => {
    if (en.kind !== "strength") return; const ex = exDef(en); if (!ex) return;
    ex.p.forEach((k) => { weekly[k].sets += en.sets.length; weekly[k].days.add(s.date); });
    ex.s.forEach((k) => { weekly[k].sets += 0.5 * en.sets.length; });
  }));

  // 유산소: 평균 심박 → 존 (심박 탭의 존 정의를 그대로 사용)
  const zoneMin = [0, 0, 0, 0, 0];
  sessions.filter((s) => sessionTime(s) >= since7).forEach((s) => s.entries.forEach((en) => {
    if (en.kind !== "cardio") return; const z = zoneForHR(zones, +en.avgHR); if (z) zoneMin[z - 1] += +en.minutes;
  }));

  return { m, meas, latest, body, sessions, age, zones, hrMax: hrMaxOf(m), perWeek, recent14, autoAct, actFactor, energy, best, history, names, weekly, recovery, zoneMin };
}

/* ───────── 샘플 데이터 ───────── */
function sampleDB() {
  const A = "m_minjun", B = "m_seoyeon";
  const st = (w, r, rir, n = 3) => Array.from({ length: n }, () => ({ w, r, rir }));
  const S = (memberId, ago, time, entries) => ({ id: uid(), memberId, date: daysAgo(ago), time, entries: entries.map((e) => ({ id: uid(), ...e })) });
  const str = (exId, sets) => ({ kind: "strength", exId, sets });
  const car = (mode, minutes, avgHR) => ({ kind: "cardio", mode, minutes, avgHR });
  return {
    sample: true,
    exercises: DEFAULT_EXERCISES.map((e) => ({ ...e })),
    activeId: A,
    members: [
      { id: A, name: "김민준", sex: "M", birth: "1991-05-12", phone: "010-1234-5678", goal: "diet", restingHR: 62, hrFormula: "tanaka", zoneMethod: "karvonen", activityMode: "auto", activityManual: 1.55, meals: 4, memo: "허리 디스크 이력, 데드리프트 중량 주의" },
      { id: B, name: "이서연", sex: "F", birth: "1996-09-03", phone: "010-9876-5432", goal: "lean", restingHR: 58, hrFormula: "tanaka", zoneMethod: "karvonen", activityMode: "auto", activityManual: 1.55, meals: 3, memo: "하체·둔근 발달 희망" },
    ],
    measurements: [
      { id: uid(), memberId: A, date: daysAgo(56), heightCm: 178, weightKg: 83.2, smmKg: 35.9, bodyFatPct: 23.1 },
      { id: uid(), memberId: A, date: daysAgo(28), heightCm: 178, weightKg: 81.6, smmKg: 36.1, bodyFatPct: 21.4 },
      { id: uid(), memberId: A, date: daysAgo(2), heightCm: 178, weightKg: 80.3, smmKg: 36.3, bodyFatPct: 19.8 },
      { id: uid(), memberId: B, date: daysAgo(60), heightCm: 163, weightKg: 55.8, smmKg: 21.6, bodyFatPct: 27.4 },
      { id: uid(), memberId: B, date: daysAgo(30), heightCm: 163, weightKg: 56.3, smmKg: 22.2, bodyFatPct: 26.3 },
      { id: uid(), memberId: B, date: daysAgo(3), heightCm: 163, weightKg: 56.9, smmKg: 22.8, bodyFatPct: 25.4 },
    ],
    sessions: [
      S(A, 13, "19:30", [str("bench", st(70, 8, 2)), str("ohp", st(40, 8, 2)), str("pushdown", st(25, 12, 1))]),
      S(A, 11, "19:30", [str("squat", st(90, 6, 2)), str("rdl", st(70, 10, 2)), str("calf", st(60, 15, 1))]),
      S(A, 10, "07:00", [car("러닝", 40, 138)]),
      S(A, 9, "19:30", [str("row", st(65, 10, 2)), str("latpull", st(55, 10, 1)), str("curl", st(30, 12, 1))]),
      S(A, 6, "19:30", [str("bench", st(72.5, 8, 1, 4)), str("incline_db", st(26, 10, 1)), str("lateral", st(10, 15, 1)), str("pushdown", st(27.5, 12, 1))]),
      S(A, 5, "07:00", [car("사이클", 45, 132)]),
      S(A, 4, "19:30", [str("squat", st(95, 5, 1, 4)), str("legpress", st(160, 12, 2)), str("legcurl", st(40, 12, 1)), str("calf", st(60, 15, 1))]),
      S(A, 3, "07:00", [car("인터벌 러닝", 25, 162)]),
      S(A, 2, "19:30", [str("deadlift", st(120, 5, 2)), str("pullup", st(0, 8, 1)), str("row", st(67.5, 10, 1)), str("curl", st(32.5, 10, 1))]),
      S(A, 1, "20:00", [str("bench", [{ w: 75, r: 8, rir: 1 }, { w: 75, r: 7, rir: 0 }, { w: 70, r: 9, rir: 1 }]), str("dip", st(0, 12, 2)), str("cablecrunch", st(30, 15, 2))]),
      S(B, 12, "12:00", [str("squat", st(45, 10, 2)), str("hipthrust", st(70, 10, 2)), str("legcurl", st(25, 12, 2))]),
      S(B, 10, "12:00", [str("latpull", st(30, 12, 2)), str("ohp", st(20, 10, 2)), str("lateral", st(4, 15, 1))]),
      S(B, 8, "07:30", [car("러닝", 35, 150)]),
      S(B, 5, "12:00", [str("squat", st(50, 8, 2, 4)), str("hipthrust", st(80, 10, 1, 4)), str("rdl", st(40, 10, 2))]),
      S(B, 3, "12:00", [str("latpull", st(32.5, 10, 1)), str("row", st(30, 12, 2)), str("incline_db", st(8, 12, 1)), str("curl", st(12.5, 12, 1))]),
      S(B, 1, "12:00", [str("hipthrust", st(85, 8, 1, 4)), str("legpress", st(90, 12, 1)), str("calf", st(30, 15, 1)), str("cablecrunch", st(20, 15, 2))]),
      S(B, 0, "07:30", [car("사이클", 30, 141)]),
    ],
  };
}

/* ───────── 저장소 (단일 원천) ───────── */
const KEY = "temptfit.v1";
const Store = createContext(null);
function loadDB() {
  try { const raw = localStorage.getItem(KEY); if (raw) { const x = JSON.parse(raw); if (!x.exercises) x.exercises = DEFAULT_EXERCISES.map((e) => ({ ...e }));
      else if (!x.pilatesSeeded) { const have = new Set(x.exercises.map((e) => e.id)); x.exercises = x.exercises.map((e) => ({ ...e, cat: e.cat || "gym" })).concat(DEFAULT_EXERCISES.filter((e) => e.cat === "pilates" && !have.has(e.id)).map((e) => ({ ...e }))); }
      x.pilatesSeeded = true; return x; } } catch (e) {}
  return sampleDB();
}
function useStore() { return useContext(Store); }

/* ───────── 서버 저장 (Supabase) · 로그인 ─────────
   저장 원칙은 그대로: 회원 / 인바디 / 운동 세션 3개만 서버 DB에 두고, 나머지는 기기에서 계산.
   모든 수정은 update() 한 곳을 거치므로, 바뀐 행만 골라 서버로 보냅니다(0.7초 모아서). */
// 서버 주소와 공개(anon) 키. 비워 두면 앱의 [계정 > 서버 설정]에서 넣을 수 있습니다(기기에 기억).
const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = ""; // 공개용 anon 키 (접근 제한은 DB 규칙이 담당)
const CFG_KEY = KEY + ".server", LOCAL_ONLY_KEY = KEY + ".localOnly", ACTIVE_KEY = KEY + ".active", UPLOADED_KEY = KEY + ".uploaded";
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
function serverCfg() {
  try { const c = JSON.parse(lsGet(CFG_KEY) || "null"); if (c && c.url && c.key) return c; } catch (e) {}
  return SUPABASE_URL && SUPABASE_ANON_KEY ? { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, builtIn: true } : null;
}
// 자동 로그인: 켜면 로그인 정보를 이 기기에 계속 저장(localStorage), 끄면 브라우저(앱)를 닫을 때 지워지는 sessionStorage에만
const REMEMBER_KEY = KEY + ".remember";
const rememberOn = () => { try { return localStorage.getItem(REMEMBER_KEY) !== "0"; } catch (e) { return true; } };
const setRemember = (on) => { try { localStorage.setItem(REMEMBER_KEY, on ? "1" : "0"); } catch (e) {} };
const authStore = {
  getItem: (k) => { try { return (rememberOn() ? localStorage : sessionStorage).getItem(k); } catch (e) { return null; } },
  setItem: (k, v) => { try { const on = rememberOn(); (on ? localStorage : sessionStorage).setItem(k, v); (on ? sessionStorage : localStorage).removeItem(k); } catch (e) {} },
  removeItem: (k) => { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) {} },
};
let sbCache = null;
function getSB(cfg) {
  if (!cfg || !window.supabase) return null;
  if (!sbCache || sbCache.url !== cfg.url || sbCache.key !== cfg.key) {
    let client = null;
    try { client = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: KEY + ".auth", storage: authStore } }); } catch (e) {}
    sbCache = { url: cfg.url, key: cfg.key, client };
  }
  return sbCache.client;
}
function errMsg(e) {
  const s = String((e && (e.message || e.error_description)) || e || "");
  if (/fetch|network|load failed/i.test(s)) return "서버에 연결할 수 없습니다. 인터넷 연결과 서버 주소를 확인하세요.";
  if (/does not exist|PGRST20[25]|schema cache/i.test(s) || (e && (e.code === "42P01" || e.code === "PGRST205"))) return "서버에 표가 아직 없습니다. 안내서대로 schema.sql을 SQL Editor에서 실행하세요.";
  if (/Invalid login credentials/i.test(s)) return "이메일 또는 비밀번호가 맞지 않습니다.";
  if (/Email not confirmed/i.test(s)) return "메일 인증이 아직 안 됐습니다. 메일함의 인증 링크를 누른 뒤 다시 로그인하세요.";
  if (/already registered|already been registered/i.test(s)) return "이미 가입된 이메일입니다. 로그인해 주세요.";
  if (/rate limit|too many/i.test(s)) return "잠시 뒤에 다시 시도해 주세요. 짧은 시간에 요청이 너무 많았습니다.";
  if (/Email address .* is invalid|invalid format|validate email/i.test(s)) return "이 이메일 주소는 쓸 수 없습니다. 다른 주소로 가입해 주세요.";
  if (/Signups not allowed/i.test(s)) return "지금은 새 가입이 막혀 있습니다. 잠시 뒤 다시 시도하세요.";
  if (/Password should be/i.test(s)) return "비밀번호는 6자 이상이어야 합니다.";
  if (/master_only/.test(s)) return "마스터만 할 수 있는 작업이에요.";
  if (/Database error saving new user/i.test(s)) return "가입 정보를 저장하지 못했어요. 잠시 뒤 다시 시도하세요.";
  if (/not_allowed/.test(s)) return "이 작업을 할 권한이 없어요.";
  if (/noshow_future/.test(s)) return "노쇼는 수업 시작 시간이 지난 뒤에 체크할 수 있어요.";
  if (/past_cancel/.test(s)) return "이미 지난 일정은 취소할 수 없어요. 지우려면 삭제를 누르세요.";
  if (/already_done/.test(s)) return "이미 제출한 과제예요.";
  if (/need_time/.test(s)) return "시각을 정해 주세요.";
  if (/member_only/.test(s)) return "회원 계정만 할 수 있어요.";
  if (/not_linked/.test(s)) return "연결된 회원·강사만 할 수 있어요.";
  if (/duplicate key|already pending|unique/i.test(s)) return "이미 보낸 요청이 있어요.";
  if (/not_pending|already_decided/.test(s)) return "이미 처리된 요청이에요.";
  if (/not_future|bad_schedule/.test(s)) return "이미 시작했거나 취소된 일정이에요.";
  if (/exceeded the maximum allowed size|Payload too large|413/i.test(s)) return "파일이 너무 큽니다. 50MB 이하로 올려 주세요.";
  if (/mime type|invalid_mime/i.test(s)) return "사진이나 영상 파일만 올릴 수 있습니다.";
  if (/invalid_code/.test(s)) return "코드가 맞지 않거나 이미 사용된 코드입니다.";
  if (/already_linked/.test(s)) return "이미 연결된 코드입니다.";
  if (/row-level security|permission denied/i.test(s)) return "이 기록을 바꿀 권한이 없습니다.";
  if (/Invalid API key|JWT/i.test(s)) return "서버 키가 맞지 않습니다. anon public 키를 다시 확인하세요.";
  return s || "알 수 없는 오류";
}

// 앱 객체 ↔ DB 행
const SERVER_ONLY = ["inviteCode", "linked", "trainerId", "trainerIds", "mine", "userId"];
const ROLE_NAME = { trainer: "강사", member: "회원" };
const BUCKET = "session-media";
const memberRow = (m) => { const data = { ...m }; delete data.id; delete data.name; SERVER_ONLY.forEach((k) => delete data[k]); return { id: m.id, name: m.name || "", data }; };
const fromMemberRow = (r, me, links) => ({ ...(r.data || {}), id: r.id, name: r.name, inviteCode: r.invite_code, linked: !!r.user_id, userId: r.user_id || null, trainerId: r.trainer_id, trainerIds: links.filter((l) => l.member_id === r.id).map((l) => l.trainer_id), mine: r.user_id === me });
// 기록마다 쓴 사람·쓴 시각 (서버가 정하고 앱은 보여 주기만)
const recMeta = (r) => ({ by: r.created_by || null, createdAt: r.created_at || null });
const numOrNull = (v) => (v == null || v === "" || isNaN(+v) ? null : +v);
const measRow = (x) => ({ id: x.id, member_id: x.memberId, date: x.date, height_cm: numOrNull(x.heightCm), weight_kg: numOrNull(x.weightKg), smm_kg: numOrNull(x.smmKg), body_fat_pct: numOrNull(x.bodyFatPct) });
const fromMeasRow = (r) => ({ id: r.id, memberId: r.member_id, date: String(r.date).slice(0, 10), heightCm: numOrNull(r.height_cm), weightKg: numOrNull(r.weight_kg), smmKg: numOrNull(r.smm_kg), bodyFatPct: numOrNull(r.body_fat_pct), ...recMeta(r) });
const sessRow = (s) => ({ id: s.id, member_id: s.memberId, date: s.date, time: s.time || null, entries: s.entries || [], trainer_ids: s.trainerIds || [], note: s.note || "", schedule_id: s.scheduleId || null });
const fromSessRow = (r) => ({ id: r.id, memberId: r.member_id, date: String(r.date).slice(0, 10), time: r.time || "", entries: r.entries || [], trainerIds: r.trainer_ids || [], note: r.note || "", scheduleId: r.schedule_id || null, assignmentId: r.assignment_id || null, ...recMeta(r) });
// 세션·과제에 붙은 사진·영상 경로 전부 (지운 기록의 파일을 저장소에서도 지우는 데 사용)
const mediaPaths = (db) => {
  const out = new Set();
  (db.sessions || []).forEach((s) => (s.entries || []).forEach((e) => (e.media || []).forEach((x) => out.add(x.path))));
  (db.exercises || []).forEach((e) => (e.media || []).forEach((x) => out.add(x.path)));
  (db.assignments || []).forEach((a) => (a.photos || []).forEach((x) => out.add(x.path)));
  return out;
};
const exRow = (e) => ({ id: e.id, name: e.name || "", category: exCat(e), muscles: e.p || [], muscles2: e.s || [], equipment: e.eq || "", note: e.note || "", media: e.media || [] });
const fromExRow = (r) => ({ id: r.id, name: r.name, cat: r.category || "gym", p: r.muscles || [], s: r.muscles2 || [], eq: r.equipment || "", note: r.note || "", media: r.media || [], by: r.created_by || null, base: !r.created_by });
const TABLES = [["members", memberRow], ["measurements", measRow], ["sessions", sessRow], ["exercises", exRow]];
// 일정·패키지·요청·과제 (서버 함수와 직접 저장, 계산은 앱)
const fromPkgRow = (r) => ({ id: r.id, trainerId: r.trainer_id, memberId: r.member_id, total: r.total, perDays: r.per_days, startsOn: String(r.starts_on).slice(0, 10), expiresOn: String(r.expires_on).slice(0, 10), note: r.note || "", createdAt: r.created_at });
const fromSchRow = (r) => ({ id: r.id, trainerId: r.trainer_id, memberId: r.member_id, kind: r.kind, at: new Date(r.starts_at), minutes: r.minutes, status: r.status, packageId: r.package_id, plan: r.plan || [], note: r.note || "", cancelReason: r.cancel_reason || "" });
const fromReqRow = (r) => ({ id: r.id, kind: r.kind, memberId: r.member_id, trainerId: r.trainer_id, scheduleId: r.schedule_id, at: r.want_at ? new Date(r.want_at) : null, minutes: r.minutes, reason: r.reason || "", status: r.status, createdAt: r.created_at, decidedAt: r.decided_at });
const fromAsRow = (r) => ({ id: r.id, trainerId: r.trainer_id, memberId: r.member_id, title: r.title || "", items: r.items || [], dueOn: String(r.due_on).slice(0, 10), note: r.note || "", doneAt: r.done_at ? new Date(r.done_at) : null, photos: r.photos || [], memberNote: r.member_note || "", createdAt: r.created_at });
const tNameOf = (p) => (p && ((p.tprofile && p.tprofile.nickname) || p.display_name)) || "강사";

async function fetchAll(sb, table, order = ["created_at", "id"]) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let q = sb.from(table).select("*"); order.forEach((c) => { q = q.order(c); });
    const { data, error } = await q.range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) return out;
  }
}
async function loadServer(sb, user) {
  const ok = (r) => { if (r.error) throw r.error; return r.data || []; };
  const [profs, mem, links, meas, sess, exs, pkgs, schs, reqs, asg, notes] = await Promise.all([
    fetchAll(sb, "profiles", ["created_at", "id"]),
    fetchAll(sb, "members"), fetchAll(sb, "member_trainers", ["created_at", "member_id", "trainer_id"]), fetchAll(sb, "measurements"), fetchAll(sb, "sessions"), fetchAll(sb, "exercises"),
    fetchAll(sb, "packages"), fetchAll(sb, "schedules", ["starts_at", "id"]), fetchAll(sb, "requests"), fetchAll(sb, "assignments"),
    sb.from("notifications").select("*").order("id", { ascending: false }).limit(100).then(ok),
  ]);
  const meta = user.user_metadata || {};
  const p0 = profs.find((p) => p.id === user.id) || { id: user.id, display_name: meta.display_name || "", role: meta.role === "trainer" ? "trainer" : "member" };
  const master = !!p0.is_master;
  const profile = { ...p0, role: p0.role === "trainer" || master ? "trainer" : "member" };
  const people = Object.fromEntries(profs.map((p) => [p.id, { name: tNameOf(p), realName: p.display_name || "", role: p.role === "trainer" || p.is_master ? "trainer" : "member", master: !!p.is_master, tprofile: p.tprofile || {}, subUntil: p.sub_until || null }]));
  const staff = profs.filter((p) => p.role === "trainer" || p.is_master).map((p) => ({ id: p.id, name: tNameOf(p), role: "trainer", tprofile: p.tprofile || {} }));
  const members = mem.map((r) => fromMemberRow(r, user.id, links));
  const mids = new Set(members.map((m) => m.id));
  const saved = lsGet(ACTIVE_KEY);
  return {
    profile, staff, people, master, notes,
    db: { server: true, sample: false, activeId: (members.find((m) => m.id === saved) || members.find((m) => m.mine) || members[0] || {}).id || null,
      members, measurements: meas.map(fromMeasRow).filter((x) => mids.has(x.memberId)), sessions: sess.map(fromSessRow).filter((x) => mids.has(x.memberId)), exercises: exs.map(fromExRow),
      packages: pkgs.map(fromPkgRow), schedules: schs.map(fromSchRow), requests: reqs.map(fromReqRow), assignments: asg.map(fromAsRow) },
  };
}
function diffDB(a, b) {
  const out = {}; let n = 0;
  for (const [k, toRow] of TABLES) {
    const real = (L) => (L || []).filter((x) => !x.tpl);
    const A = new Map(real(a[k]).map((x) => [x.id, JSON.stringify(toRow(x))]));
    const d = { add: [], change: [], del: [] };
    for (const x of real(b[k])) { const row = toRow(x); if (!A.has(x.id)) d.add.push(row); else if (A.get(x.id) !== JSON.stringify(row)) d.change.push(row); }
    const B = new Set(real(b[k]).map((x) => x.id));
    for (const id of A.keys()) if (!B.has(id)) d.del.push(id);
    n += d.add.length + d.change.length + d.del.length; out[k] = d;
  }
  out.count = n; return out;
}
// 다시 보내도 안전하도록(중간 실패 후 재시도) 추가는 upsert로
async function pushDiff(sb, diff, me) {
  const ok = (r) => { if (r.error) throw r.error; return r.data; };
  const now = () => new Date().toISOString();
  const M = diff.members; let created = [];
  const owner = me.role === "member" ? { user_id: me.id } : { trainer_id: me.id };
  if (M.add.length) created = ok(await sb.from("members").upsert(M.add.map((r) => ({ ...r, ...owner })), { onConflict: "id", ignoreDuplicates: true }).select("id,invite_code,user_id,trainer_id")) || [];
  for (const r of M.change) ok(await sb.from("members").update({ name: r.name, data: r.data, updated_at: now() }).eq("id", r.id));
  for (const t of ["exercises", "measurements", "sessions"]) {
    const D = diff[t];
    if (D.del.length) ok(await sb.from(t).delete().in("id", D.del));
    const up = D.add.concat(D.change).map((r) => (t !== "measurements" ? { ...r, updated_at: now() } : r));
    if (up.length) ok(await sb.from(t).upsert(up, { onConflict: "id" }));
  }
  // 기록에서 빠진 사진·영상은 저장소에서도 지움 (회원을 지우기 전에, 실패해도 기록 저장은 유지)
  if (diff.removedMedia && diff.removedMedia.length) { try { await sb.storage.from(BUCKET).remove(diff.removedMedia); } catch (e) {} }
  if (M.del.length) ok(await sb.from("members").delete().in("id", M.del));
  return created;
}
function localDBRaw() { try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }

/* 로그인 · 가입 화면 */
function AuthScreen({ sb, onLocal, onSettings }) {
  const [tab, setTab] = useState("in");
  const [f, setF] = useState({ email: "", pw: "", name: "", role: "member" });
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(null);
  const set = (k, v) => setF({ ...f, [k]: v });
  useEffect(() => { const el = msg && document.getElementById("a-msg"); if (el) el.scrollIntoView({ block: "center", behavior: "smooth" }); }, [msg]);
  const [remember, setRememberS] = useState(rememberOn);
  const submit = async (e) => {
    e.preventDefault(); setMsg(null);
    const email = f.email.replace(/\s+/g, "");
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) { setMsg({ err: true, t: "이메일 주소를 정확히 입력하세요. 예: name@gmail.com" }); return; }
    if (f.pw.length < 6) { setMsg({ err: true, t: "비밀번호는 6자 이상으로 입력하세요." }); return; }
    if (tab === "up" && !f.name.trim()) { setMsg({ err: true, t: "이름을 입력하세요." }); return; }
    setBusy(true);
    setRemember(remember);
    try {
      if (tab === "in") {
        const { error } = await sb.auth.signInWithPassword({ email, password: f.pw });
        if (error) throw error;
      } else {
        const data0 = { role: f.role, display_name: f.name.trim() };
        const { data, error } = await sb.auth.signUp({ email, password: f.pw, options: { data: data0 } });
        if (error) throw error;
        if (!data.session) { setMsg({ t: "가입 완료! 메일함에 온 인증 링크를 누른 뒤 여기서 로그인하세요." }); setTab("in"); }
      }
    } catch (err) { setMsg({ err: true, t: errMsg(err) }); }
    setBusy(false);
  };
  return (
    <div className="app">
      <header className="top"><div className="brand"><img src={window.TEMPT_MARK} alt="" className="mark" /><div className="wm"><b>TEMPT</b><small>FIT</small></div></div></header>
      <main className="main">
        <div className="stack authwrap">
          <Card title={tab === "in" ? "로그인" : "회원가입"} right={<Seg value={tab} options={[["in", "로그인"], ["up", "가입"]]} onChange={(v) => { setTab(v); setMsg(null); }} small />}>
            <form className="form" onSubmit={submit} noValidate>
              {tab === "up" && <Field label="나는"><Seg value={f.role} options={[["member", "회원"], ["trainer", "강사"]]} onChange={(v) => set("role", v)} small /></Field>}
              {tab === "up" && f.role === "member" && <p className="small muted" id="a-member-hint">회원은 가입한 뒤 강사에게 받은 초대 코드를 넣으면 강사와 연결돼요. 코드가 없어도 혼자 기록할 수 있어요.</p>}
              {tab === "up" && f.role === "trainer" && <p className="small muted" id="a-trainer-hint">강사는 가입한 뒤 회원을 등록하고 초대 코드를 보내 연결해요.</p>}
              {tab === "up" && <Field label="이름"><input id="a-name" value={f.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" /></Field>}
              <Field label="이메일"><input id="a-email" type="email" inputMode="email" autoCapitalize="off" autoCorrect="off" spellCheck="false" value={f.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" /></Field>
              <Field label="비밀번호" hint={tab === "up" ? "6자 이상" : ""}><input id="a-pw" type="password" value={f.pw} onChange={(e) => set("pw", e.target.value)} autoComplete={tab === "in" ? "current-password" : "new-password"} /></Field>
              <label className="check" htmlFor="a-remember"><input id="a-remember" type="checkbox" checked={remember} onChange={(e) => setRememberS(e.target.checked)} /><span>자동 로그인</span><em className="muted small">{remember ? "이 기기에서 로그인 상태 유지" : "브라우저를 닫으면 로그아웃"}</em></label>
              {msg && <p id="a-msg" className={"small" + (msg.err ? " errtxt" : "")} role="status" >{msg.t}</p>}
              <button className="btn" type="submit" disabled={busy}>{busy ? "잠시만요…" : tab === "in" ? "로그인" : "가입하기"}</button>
            </form>
          </Card>
          <p className="small muted center">로그인하면 PC·휴대폰 어디서든 같은 기록을 봅니다. 강사는 회원 수업 일정과 과제를 관리하고, 회원은 강사에게 받은 초대 코드로 연결해 일정과 과제를 함께 봅니다.</p>
          <div className="row center"><button className="linkbtn" onClick={onLocal}>로그인 없이 이 기기에서만 쓰기</button><button className="linkbtn" onClick={onSettings}>서버 설정</button></div>
        </div>
      </main>
    </div>
  );
}

/* 회원 계정: 아직 기록이 없을 때 (강사 초대 코드 연결 또는 혼자 시작) */
function MemberStart() {
  const { srv, update } = useStore();
  const solo = () => update((x) => { const id = uid(); x.members.push({ id, name: srv.profile.display_name || "나", sex: "M", birth: "1995-01-01", phone: "", goal: "maintain", restingHR: "", hrFormula: "tanaka", zoneMethod: "karvonen", activityMode: "auto", activityManual: 1.55, meals: 4, memo: "", mine: true, userId: srv.user.id }); x.activeId = id; });
  return (
    <div className="stack">
      <ClaimCard first />
      <Card title="혼자 시작하기"><p className="small muted">강사 없이 내 기록부터 쓰고 싶다면 바로 시작하세요. 나중에 초대 코드를 받으면 강사 탭에서 연결할 수 있어요.</p><button className="btn ghost" onClick={solo}>내 기록 만들기</button></Card>
    </div>
  );
}

/* 회원: 강사에게 받은 초대 코드 넣기 (여러 강사와 연결 가능) */
function ClaimCard({ first }) {
  const { srv } = useStore();
  const [code, setCode] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState(""), [ok, setOk] = useState("");
  const claim = async () => {
    if (!code.trim()) return; setBusy(true); setErr(""); setOk("");
    await srv.flush();
    const { error } = await srv.sb.rpc("claim_member", { code: code.trim() });
    if (error) { setErr(errMsg(error)); setBusy(false); return; }
    setCode(""); setOk("연결했어요. 강사 목록에서 확인하세요."); await srv.reload(); setBusy(false);
  };
  return (
    <Card title={first ? "강사와 연결" : "초대 코드 입력"}>
      <p className="small">강사에게 받은 6자리 초대 코드를 넣으면 그 강사와 연결돼요. 강사가 기록해 둔 인바디·운동 기록과 수업 일정도 이어서 봅니다.</p>
      <div className="addbar flat"><input id="claim-code" placeholder="예: 7F3K9Q" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} onKeyDown={(e) => e.key === "Enter" && claim()} /><button className="btn" id="claim-go" onClick={claim} disabled={busy || !code.trim()}>연결</button></div>
      {err && <p className="small errtxt" id="claim-err">{err}</p>}
      {ok && <p className="small" id="claim-ok">{ok}</p>}
    </Card>
  );
}

/* 강사: 회원 정보 화면의 앱 연결 카드 (초대 코드, 연결 해제) */
function LinkCard({ m }) {
  const { srv, staff } = useStore();
  const [busy, setBusy] = useState(false), [ask, setAsk] = useState(false), [err, setErr] = useState("");
  if (!srv || srv.profile.role === "member" || m.mine) return null;
  const others = (m.trainerIds || []).filter((id) => id !== srv.user.id);
  const unlink = async () => {
    setBusy(true); setErr("");
    await srv.flush();
    const { error } = await srv.sb.rpc("unlink_trainer", { mid: m.id, tid: srv.user.id });
    if (error) setErr(errMsg(error)); else await srv.reload();
    setBusy(false); setAsk(false);
  };
  const sub = m.userId ? subState(PEOPLE[m.userId]?.subUntil) : null;
  return (
    <Card title="회원 앱 연결" right={<span className={"pill" + (m.linked ? " ok" : "")}>{m.linked ? "연결됨" : "대기"}</span>}>
      {others.length > 0 && <p className="small muted" id="m-trainers">함께 맡은 강사: {staffNames(staff, others)}</p>}
      {m.linked ? <>
        <p className="small">{m.name} 회원이 자기 계정으로 로그인해 같은 기록과 일정을 봅니다.{sub && <> 구독: <b className={sub.on ? "gold" : ""}>{sub.label}</b></>}</p>
      </> : m.inviteCode ? <>
        <p className="invite"><span className="muted small">초대 코드</span><b id="invite-code">{m.inviteCode}</b></p>
        <p className="small muted">회원이 앱에서 ‘회원’으로 가입한 뒤 이 코드를 넣으면 연결됩니다. 이미 앱을 쓰던 회원이면 그 기록에 합쳐져요.</p>
      </> : <p className="small muted">서버에 저장되면 초대 코드가 생깁니다…</p>}
      {!ask ? <button className="btn ghost small" id="m-leave" onClick={() => setAsk(true)}>연결 해제</button> :
        <div className="row wrap"><span className="small">{m.linked || others.length ? "이 회원과 연결이 끊기고 앞으로의 일정이 지워져요. 회원 기록은 회원에게 남아요." : "앱과 연결되지 않은 회원이라 기록이 모두 지워져요."}</span><button className="btn danger small" id="m-leave-ok" onClick={unlink} disabled={busy}>해제</button><button className="btn ghost small" onClick={() => setAsk(false)}>취소</button></div>}
      {err && <p className="small errtxt">{err}</p>}
    </Card>
  );
}

// 구독 상태 (결제 연동 전: 마스터가 만료일 지정)
const subState = (until) => {
  if (!until) return { on: false, label: "미구독" };
  const on = until >= todayISO();
  return { on, label: on ? `이용 중 · ${until.slice(2).replace(/-/g, ".")}까지` : `만료 · ${until.slice(2).replace(/-/g, ".")}` };
};

// 회원 정렬: 한글(가나다) 먼저, 그다음 영문(ABC), 그 밖의 이름
const nameGroup = (s) => { const c = (s || "").trim().charAt(0); return /[ㄱ-ㅎ가-힣]/.test(c) ? 0 : /[A-Za-z]/.test(c) ? 1 : 2; };
const byName = (a, b) => nameGroup(a.name) - nameGroup(b.name) || (a.name || "").localeCompare(b.name || "", "ko", { sensitivity: "base", numeric: true });
const sortMembers = (list) => list.slice().sort(byName);
const matchMember = (m, q) => { const t = q.trim().toLowerCase(); if (!t) return true; const dg = t.replace(/\D/g, ""); return (m.name || "").toLowerCase().includes(t) || (dg.length >= 3 && (m.phone || "").replace(/\D/g, "").includes(dg)); };

/* 회원 목록: 검색 + 가나다·ABC 순, 누르면 그 회원 정보 화면으로 */
// 회원 탭 첫 화면
function MemberListView({ onPick, onEdit, onAdd }) {
  const { db } = useStore();
  const cur = db.members.find((m) => m.id === db.activeId);
  return (
    <Card title={`회원 목록 · ${db.members.length}명`} right={onAdd && <button className="btn small" aria-label="회원 추가" onClick={onAdd}>+ 회원 추가</button>}>
      <p className="small muted" id="ml-cur">{cur ? <>지금 선택: <b className="gold">{cur.name || "(이름 없음)"}</b> · 홈·운동·심박·영양·회복 탭이 이 회원 기준으로 바뀌어요.</> : "회원을 선택하면 모든 탭이 그 회원 기준으로 바뀌어요."}</p>
      <MemberBrowser onPick={onPick} onEdit={onEdit} />
    </Card>
  );
}
function MemberBrowser({ onPick, onEdit }) {
  const { db, srv, staff } = useStore();
  const [q, setQ] = useState("");
  const list = sortMembers(db.members.filter((m) => matchMember(m, q)));
  const last = useMemo(() => { const o = {}; db.sessions.forEach((s) => { if (!o[s.memberId] || s.date > o[s.memberId]) o[s.memberId] = s.date; }); return o; }, [db.sessions]);
  const staffView = srv && srv.profile.role !== "member";
  return (
      <div className="mbrowser">
        <input id="ml-q" className="search" type="search" placeholder="이름 또는 전화번호 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        {list.length === 0 && <p className="small muted center" style={{ marginTop: 16 }}>‘{q}’에 맞는 회원이 없습니다.</p>}
        <ul className="mlist">
          {list.map((m) => (
            <li key={m.id} className={"mlrow" + (m.id === db.activeId ? " on" : "")} data-member={m.name}>
              <button type="button" className="minfo" onClick={() => onPick(m.id)} aria-label={(m.name || "회원") + " 선택"}>
                <span className="mname">{m.name || "(이름 없음)"}{m.id === db.activeId && <span className="tag pt selt">선택됨</span>}</span>
                <span className="muted small ml1">{GOALS[m.goal]?.name || ""}{m.phone ? <> · <span className="nw">{m.phone}</span></> : ""}</span>
                {staffView && (m.trainerIds || []).length > 0 && <span className="muted small ml1">담당 {staffNames(staff, m.trainerIds)}</span>}
                <span className="muted small ml1">{last[m.id] ? "최근 운동 " + last[m.id].slice(5).replace("-", ".") : "운동 기록 없음"}</span>
              </button>
              <div className="mbtns">
                <button type="button" className={"btn small" + (m.id === db.activeId ? " ghost" : "")} data-act="select" disabled={m.id === db.activeId} onClick={() => onPick(m.id)}>{m.id === db.activeId ? "선택됨" : "선택"}</button>
                <button type="button" className="btn ghost small" data-act="edit" onClick={() => (onEdit || onPick)(m.id)}>수정</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
  );
}

const staffNames = (staff, ids) => (ids || []).map((id) => (staff || []).find((p) => p.id === id)?.name || PEOPLE[id]?.name || "강사").join(", ");

/* 계정 · 서버 설정 시트 */
function SyncBadge({ sync, local }) {
  if (local) return <span className="pill">이 기기에만 저장</span>;
  const t = { loading: "불러오는 중", saving: "저장 중…", saved: "서버에 저장됨", error: "저장 실패", idle: "" }[sync.state];
  return <span className={"pill" + (sync.state === "saved" ? " ok" : sync.state === "error" ? " bad" : "")}>{t}</span>;
}
function ServerSettings({ cfg, onSave }) {
  const [url, setUrl] = useState(cfg?.url || ""), [key, setKey] = useState(cfg?.builtIn ? "" : cfg?.key || ""), [err, setErr] = useState("");
  const save = () => {
    const u = url.trim().replace(/\/+$/, ""), k = key.trim();
    if (!/^https:\/\/[^\s/]+$/.test(u)) { setErr("주소는 https://로 시작하는 Project URL 전체를 넣으세요. 예: https://abcdefgh.supabase.co"); return; }
    if (k.length < 20) { setErr("anon public 키 전체를 붙여넣으세요."); return; }
    if (/^sb_secret_/.test(k) || /service_role/.test(atobSafe(k.split(".")[1]))) { setErr("service_role 키는 넣으면 안 됩니다. anon public 키를 넣으세요."); return; }
    onSave({ url: u, key: k });
  };
  return (
    <div className="form">
      <Field label="Project URL"><input id="s-url" placeholder="https://xxxx.supabase.co" value={url} onChange={(e) => setUrl(e.target.value)} autoCapitalize="off" /></Field>
      <Field label="anon public 키" hint="Supabase > Project Settings > API"><textarea id="s-key" rows="3" value={key} onChange={(e) => setKey(e.target.value)} autoCapitalize="off" spellCheck="false" /></Field>
      {err && <p className="small errtxt">{err}</p>}
      <div className="row"><button className="btn" onClick={save}>저장하고 연결</button>{cfg && !cfg.builtIn && <button className="btn ghost small" onClick={() => onSave(null)}>서버 설정 지우기</button>}</div>
    </div>
  );
}
function atobSafe(s) { try { return atob((s || "").replace(/-/g, "+").replace(/_/g, "/")); } catch (e) { return ""; } }

function AccountSheet({ onClose, cfg, saveCfg, srv, sync, flush, local, goLogin, logout, localData, importLocal }) {
  const [showCfg, setShowCfg] = useState(!cfg);
  return (
    <div className="sheet" role="dialog" aria-modal="true">
      <div className="sheet-h"><b>계정 · 저장</b><button className="btn ghost small" onClick={onClose}>닫기</button></div>
      <div className="sheet-b"><div className="stack">
        {srv ? <Card title={srv.profile.display_name || srv.user.email} right={<SyncBadge sync={sync} />}>
          <p className="small muted">{srv.user.email} · {srv.master ? "마스터 · 강사" : ROLE_NAME[srv.profile.role] || "회원"}</p>
          {sync.state === "error" && <p className="small errtxt">{sync.msg} 바뀐 내용은 이 화면이 열려 있는 동안 기억하고 있다가 다시 보냅니다.</p>}
          <div className="row">
            {sync.state === "error" && <button className="btn small" onClick={flush}>다시 저장</button>}
            <button className="btn ghost small" onClick={() => srv.reload()}>서버에서 새로고침</button>
          </div>
          <button className="btn wide logout" id="acct-logout" onClick={logout}>로그아웃</button>
        </Card> : <Card title="이 기기에만 저장 중" right={<SyncBadge local />}>
          <p className="small">지금은 기록이 이 브라우저 안에만 있습니다. 서버에 연결하고 로그인하면 PC·휴대폰 어디서든 같은 기록을 보고, 회원도 자기 계정으로 볼 수 있습니다.</p>
          {cfg && <button className="btn" onClick={goLogin}>로그인하기</button>}
        </Card>}
        {srv && <Card title="사용법 안내서">
          <div className="row wrap" id="acct-guide">
            {srv.profile.role === "member" ? <a className="btn small" href="guide/member.html" target="_blank" rel="noopener">회원용 안내서 열기</a> : <>
              <a className="btn small" href="guide/trainer.html" target="_blank" rel="noopener">강사용 안내서 열기</a>
              <a className="btn ghost small" href="guide/member.html" target="_blank" rel="noopener">회원용 안내서</a></>}
          </div>
          <div className="row wrap" style={{ marginTop: 8 }}><a id="acct-glossary" className="btn ghost small" href="guide/glossary.html" target="_blank" rel="noopener">용어집 · RIR, 1RM, 기초대사량 등</a></div>
          <p className="small muted">{srv.profile.role === "member" ? "가입, 강사 연결, 일정·과제, 기록 보기·남기기를 순서대로 설명해요." : "회원 등록·초대 코드, 수업 개설, 일정, 과제, 운동 기록을 설명해요. 회원에게 보여 줄 회원용 안내서도 있어요."} 앱에서 점선 밑줄이 있는 용어는 누르면 짧은 설명이 떠요.</p>
        </Card>}
        {srv && srv.profile.role === "trainer" && <TrainerProfileForm />}
        {srv && srv.profile.role === "member" && <SubCard />}
        {srv && localData && <Card title="이 기기에 있던 기록 올리기">
          <p className="small">로그인 전에 이 기기에 저장한 회원 {localData.members.length}명(인바디 {localData.measurements.length}회, 운동 {localData.sessions.length}회)이 있습니다. 서버로 옮기면 다른 기기에서도 보입니다.</p>
          <button className="btn" onClick={importLocal}>서버로 올리기</button>
        </Card>}
        <Card title="서버 설정" right={cfg ? <span className="pill ok">설정됨</span> : <span className="pill">없음</span>} onClick={showCfg ? undefined : () => setShowCfg(true)}>
          {showCfg ? <ServerSettings cfg={cfg} onSave={saveCfg} /> : <p className="small muted">{cfg.url} · 바꾸려면 누르세요</p>}
        </Card>
      </div></div>
    </div>
  );
}

/* ───────── UI 기본 요소 ───────── */
const fmt = (x, d = 0) => (x == null || isNaN(x) ? "—" : Number(x).toLocaleString("ko-KR", { maximumFractionDigits: d, minimumFractionDigits: d }));
/* 제목 속 숫자는 고딕체로 */
const dg = (x) => Array.isArray(x) ? x.map((y, i) => (typeof y === "string" ? <React.Fragment key={"d" + i}>{dg(y)}</React.Fragment> : y))
  : typeof x !== "string" ? x : x.split(/(\d[\d.,:–\-/%]*)/).map((p, i) => (i % 2 ? <span key={i} className="dg">{p}</span> : p));
function Card({ title, right, children, onClick, tone }) {
  return (
    <section className={"card" + (onClick ? " tap" : "") + (tone ? " " + tone : "")} onClick={onClick}>
      {(title || right) && <header className="card-h"><h3>{dg(tx(title))}</h3>{right}</header>}
      {children}
    </section>
  );
}
/* ───────── 용어 말풍선 ─────────
   회원이 모를 수 있는 용어·약자: 누르면 짧은 설명이 뜨고, 다시 누르면 닫힘. 끝에 용어집(guide/glossary.html#키) 링크 */
const TERMS = {
  rir: { t: "RIR (남은 반복 수)", d: "세트를 마쳤을 때 몇 번 더 할 수 있었는지를 적는 숫자예요. RIR 2면 2회 더 할 힘이 남았다는 뜻이에요." },
  rpe: { t: "RPE (운동 자각도)", d: "지금 운동이 얼마나 힘든지를 1(아주 편함)부터 10(최대)까지 매긴 점수예요." },
  "1rm": { t: "1RM (1회 최대 중량)", d: "딱 한 번 들 수 있는 가장 무거운 무게예요. 이 앱은 실제로 들지 않고 여러 번 든 기록으로 추정해요." },
  rm: { t: "RM (최대 반복)", d: "그 무게로 최대 몇 번 들 수 있는지예요. 10RM은 딱 10번 들 수 있는 무게예요." },
  rmf: { t: "1RM 추정 공식", d: "Epley·Brzycki·Lombardi는 여러 번 든 기록으로 1RM을 계산하는 공식이에요. 반복 수가 많을수록 공식마다 결과가 조금씩 달라져요." },
  volume: { t: "볼륨 (운동량)", d: "이 앱에서는 부위별로 일주일 동안 한 세트 수예요. 보조로 쓰인 부위는 0.5세트로 셉니다." },
  hyper: { t: "근비대 · 근력 · 근지구력", d: "근비대는 근육을 키우는 것, 근력은 무거운 무게를 드는 힘, 근지구력은 가벼운 무게를 오래 반복하는 힘이에요." },
  joint: { t: "다관절 · 단관절 운동", d: "다관절은 스쿼트처럼 여러 관절이 함께 움직이는 운동, 단관절은 바벨 컬처럼 한 관절만 움직이는 운동이에요." },
  inbody: { t: "인바디 (체성분 측정)", d: "몸무게를 근육·지방·수분으로 나눠 재는 체성분 측정이에요. 골격근량과 체지방률을 여기서 얻어요." },
  smm: { t: "골격근량", d: "팔·다리·몸통을 움직이는 근육의 무게예요. 인바디로 측정해요." },
  bf: { t: "체지방률", d: "몸무게 중 지방이 차지하는 비율(%)이에요." },
  lbm: { t: "제지방량", d: "몸무게에서 지방을 뺀 나머지(근육·뼈·수분 등) 무게예요." },
  bmi: { t: "BMI (체질량지수)", d: "몸무게(kg)를 키(m)의 제곱으로 나눈 값이에요. 근육과 지방을 구분하지 못해 참고용이에요." },
  ffmi: { t: "FFMI (제지방량 지수)", d: "키를 고려한 근육량 지표예요. 제지방량을 키(m)의 제곱으로 나눠요." },
  ace: { t: "ACE 체지방 분류", d: "미국운동협회(ACE)가 정한 성별 체지방률 구간(운동선수·피트니스·평균·비만)이에요." },
  bmr: { t: "BMR (기초대사량)", d: "아무것도 하지 않고 쉬기만 해도 하루에 쓰는 열량이에요." },
  tdee: { t: "TDEE (하루 총 소비 열량)", d: "기초대사량에 활동계수를 곱한, 하루 동안 실제로 쓰는 열량이에요. 목표 섭취량은 여기서 더하거나 빼서 정해요." },
  act: { t: "활동계수", d: "평소 활동량을 숫자로 나타낸 값이에요. 이 앱은 최근 14일 운동 횟수로 자동 계산해 기초대사량에 곱해요." },
  mifflin: { t: "Mifflin-St Jeor 공식", d: "키·몸무게·나이·성별로 기초대사량을 계산하는 공식이에요. 체지방률을 모를 때 써요." },
  katch: { t: "Katch-McArdle 공식", d: "제지방량으로 기초대사량을 계산하는 공식이에요. 인바디 체지방률이 있으면 이 공식을 써요." },
  macro: { t: "탄단지", d: "탄수화물·단백질·지방, 열량을 내는 3대 영양소예요." },
  keto: { t: "키토제닉 식단", d: "탄수화물을 아주 적게, 지방을 많이 먹어 몸이 지방을 주 연료로 쓰게 하는 식단이에요." },
  carni: { t: "카니보어 식단", d: "고기·생선·달걀 같은 동물성 식품 위주로 먹고 탄수화물을 거의 먹지 않는 식단이에요." },
  ea: { t: "에너지 가용성", d: "먹은 열량에서 운동으로 쓴 열량을 빼고 제지방량으로 나눈 값이에요. 30kcal/kg보다 낮으면 회복과 호르몬에 무리가 갈 수 있어요." },
  hrmax: { t: "최대심박 (HRmax)", d: "심장이 1분에 뛸 수 있는 최대 횟수예요. 나이로 추정해요." },
  rhr: { t: "안정시 심박", d: "편히 쉬고 있을 때의 1분 심박수예요. 아침에 일어나자마자 재면 가장 정확해요." },
  hrr: { t: "여유심박 (HRR)", d: "최대심박에서 안정시 심박을 뺀 값으로, 운동에 쓸 수 있는 심박 범위예요." },
  karvonen: { t: "Karvonen 방식", d: "여유심박으로 운동 강도를 정하는 방법이에요. 안정시 심박을 반영해서 사람마다 더 잘 맞아요." },
  tanaka: { t: "Tanaka 공식", d: "최대심박을 208 − 0.7×나이로 추정하는 공식이에요. 흔히 쓰는 220−나이보다 오차가 작아요." },
  zone: { t: "심박 존 (Zone 1–5)", d: "운동 강도를 심박수에 따라 5단계로 나눈 구간이에요. 숫자가 클수록 힘든 운동이에요." },
  bpm: { t: "bpm", d: "1분 동안 심장이 뛰는 횟수예요." },
  vo2: { t: "VO2max (최대 산소 섭취량)", d: "운동할 때 몸이 쓸 수 있는 산소의 최대치로, 심폐 체력을 보여 주는 지표예요." },
  lt: { t: "젖산역치", d: "운동이 갑자기 힘들어지며 피로 물질이 빠르게 쌓이기 시작하는 강도예요. 이 지점을 높이면 더 오래 빠르게 운동할 수 있어요." },
  mito: { t: "미토콘드리아", d: "세포 안에서 산소로 에너지를 만드는 작은 공장이에요. Zone 2 운동으로 늘릴 수 있어요." },
  interval: { t: "인터벌", d: "아주 힘든 구간과 쉬는 구간을 번갈아 반복하는 훈련이에요." },
  glyco: { t: "해당과정", d: "탄수화물(포도당)을 빠르게 분해해 에너지를 만드는 과정이에요. 고강도 운동에서 많이 써요." },
  reds: { t: "RED-S (상대적 에너지 결핍)", d: "운동량에 비해 너무 적게 먹어 생기는 상태예요. 피로·부상·생리 불순·골밀도 저하로 이어질 수 있어요." },
  ketoflu: { t: "키토 플루", d: "키토제닉 식단 초기에 생기는 두통·피로·무기력 같은 증상이에요. 물과 전해질을 챙기면 줄어요." },
};
/* 문자열 속 용어 자동 표시: 긴 것부터, 문자열마다 용어당 첫 번째만 */
const TERM_TOKENS = [
  ["Katch-McArdle", "katch"], ["Mifflin", "mifflin"], ["Karvonen", "karvonen"], ["Tanaka", "tanaka"], ["VO2max", "vo2"],
  ["Epley", "rmf"], ["Brzycki", "rmf"], ["Lombardi", "rmf"], ["HRmax", "hrmax"], ["HRR", "hrr"], ["TDEE", "tdee"], ["BMR", "bmr"],
  ["RED-S", "reds"], ["FFMI", "ffmi"], ["BMI", "bmi"], ["ACE", "ace"], ["RIR", "rir"], ["RPE", "rpe"], ["1RM", "1rm"], ["bpm", "bpm"],
  ["에너지 가용성", "ea"], ["안정시 심박", "rhr"], ["여유심박", "hrr"], ["최대심박수", "hrmax"], ["최대심박", "hrmax"], ["활동계수", "act"],
  ["골격근량", "smm"], ["골격근", "smm"], ["체지방률", "bf"], ["체지방", "bf"], ["제지방량", "lbm"], ["제지방", "lbm"], ["젖산역치", "lt"], ["미토콘드리아", "mito"],
  ["인터벌", "interval"], ["해당과정", "glyco"], ["키토 플루", "ketoflu"], ["키토제닉", "keto"], ["카니보어", "carni"], ["탄단지", "macro"],
  ["볼륨", "volume"], ["심박 존", "zone"], ["인바디", "inbody"], ["근비대", "hyper"], ["근지구력", "hyper"], ["다관절", "joint"], ["단관절", "joint"],
];
const TERM_RE = new RegExp("(^|[^A-Za-z0-9])(" + TERM_TOKENS.map(([w]) => w.replace(/[-]/g, "\\-")).join("|") + ")(?![A-Za-z])", "g");
const TERM_OF = Object.fromEntries(TERM_TOKENS);
function tx(s) {
  if (typeof s !== "string") return s;
  const out = [], seen = new Set(); let last = 0, m, i = 0;
  TERM_RE.lastIndex = 0;
  while ((m = TERM_RE.exec(s))) {
    const k = TERM_OF[m[2]], at = m.index + m[1].length; if (seen.has(k)) continue; seen.add(k);
    if (at > last) out.push(s.slice(last, at));
    out.push(<Term key={i++} k={k}>{m[2]}</Term>); last = at + m[2].length;
  }
  if (!out.length) return s;
  if (last < s.length) out.push(s.slice(last));
  return out;
}
let termSeq = 0;
function Term({ k, children }) {
  const info = TERMS[k]; const id = useRef(++termSeq).current; const ref = useRef(null), pop = useRef(null);
  const [pos, setPos] = useState(null);
  useEffect(() => {
    if (!pos) return;
    const other = (e) => { if (e.detail !== id) setPos(null); };
    const outside = (e) => { if (ref.current && ref.current.contains(e.target)) return; if (pop.current && pop.current.contains(e.target)) return; setPos(null); };
    const close = () => setPos(null);
    window.addEventListener("term-open", other); document.addEventListener("pointerdown", outside, true);
    window.addEventListener("scroll", close, true); window.addEventListener("resize", close);
    return () => { window.removeEventListener("term-open", other); document.removeEventListener("pointerdown", outside, true); window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close); };
  }, [pos]);
  if (!info) return children;
  const toggle = (e) => {
    e.stopPropagation(); e.preventDefault();
    if (pos) { setPos(null); return; }
    const r = ref.current.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight, w = Math.min(300, vw - 24);
    const left = Math.max(12, Math.min(vw - w - 12, r.left + r.width / 2 - w / 2));
    const below = r.bottom + 190 < vh || r.top < 200;
    setPos({ left, w, top: below ? r.bottom + 8 : null, bottom: below ? null : vh - r.top + 8 });
    window.dispatchEvent(new CustomEvent("term-open", { detail: id }));
  };
  return (<>
    <span ref={ref} className={"term" + (pos ? " on" : "")} role="button" tabIndex={0} data-term={k} aria-expanded={!!pos}
      onClick={toggle} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggle(e); }}>{children || info.t}</span>
    {pos && ReactDOM.createPortal(
      <div ref={pop} className="termpop" role="dialog" aria-label={info.t} onClick={(e) => e.stopPropagation()}
        style={{ left: pos.left, width: pos.w, top: pos.top ?? "auto", bottom: pos.bottom ?? "auto" }}>
        <b>{info.t}</b><p>{info.d}</p>
        <a href={"guide/glossary.html#" + k} target="_blank" rel="noopener">자세한 설명 보기 ›</a>
      </div>, document.body)}
  </>);
}
function Cite({ ids }) {
  const { openRefs } = useStore();
  return <button className="cite" onClick={(e) => { e.stopPropagation(); openRefs(ids); }}>근거 {ids.length}</button>;
}
function Seg({ value, options, onChange, small }) {
  return (
    <div className={"seg" + (small ? " sm" : "")} role="tablist">
      {options.map(([v, l]) => <button key={v} type="button" role="tab" aria-selected={value === v} className={value === v ? "on" : ""} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}
function Field({ label, children, hint }) {
  return <label className="field"><span>{tx(label)}</span>{children}{hint && <em>{tx(hint)}</em>}</label>;
}
/* 계산에 쓰인 입력값 칸: 다른 수치 칸(kv3)과 같은 모양. 누르면 그 값을 고치는 탭으로 */
function Source({ label, value, sub, onClick }) {
  const Tag = onClick ? "button" : "div";
  return <Tag type={onClick ? "button" : undefined} className={"srct" + (onClick ? " tap" : "")} onClick={onClick}>
    <span className="srct-l">{tx(label)}{onClick && <i aria-hidden="true">›</i>}</span>
    <b>{value}</b>{sub && <span className="srct-s">{sub}</span>}
  </Tag>;
}
function Spark({ data, h = 44, unit = "" }) {
  if (data.length < 2) return <p className="muted small">기록이 2개 이상이면 추세가 표시됩니다.</p>;
  const w = 300, vals = data.map((d) => d.v), mn = Math.min(...vals), mx = Math.max(...vals), pad = (mx - mn) * 0.15 || 1;
  const x = (i) => 6 + (i * (w - 12)) / (data.length - 1), y = (v) => 6 + (h - 12) * (1 - (v - mn + pad) / (mx - mn + 2 * pad));
  const pts = data.map((d, i) => `${x(i)},${y(d.v)}`).join(" ");
  const last = data[data.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="spark" preserveAspectRatio="none" aria-label={`추세, 최근 ${fmt(last.v, 1)}${unit}`}>
      <polyline points={`${x(0)},${h} ${pts} ${x(data.length - 1)},${h}`} fill="var(--accent-soft)" stroke="none" />
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <circle cx={x(data.length - 1)} cy={y(last.v)} r="3.5" fill="var(--accent)" />
    </svg>
  );
}
function Bar({ pct, color }) { return <div className="bar"><i style={{ width: `${Math.min(100, Math.max(0, pct * 100))}%`, background: color || "var(--accent)" }} /></div>; }
const ZCOL = ["var(--z1)", "var(--z2)", "var(--z3)", "var(--z4)", "var(--z5)"];

/* ───────── 홈 ───────── */
function Home({ d, go }) {
  const { m, body, energy, zones, recovery, weekly, sessions, zoneMin } = d;
  const ready = Object.keys(MUSCLES).filter((k) => !recovery[k] || recovery[k].pct >= 1);
  const resting = Object.keys(MUSCLES).filter((k) => recovery[k] && recovery[k].pct < 1);
  const tpl = HR_TEMPLATES[GOALS[m.goal].hr];
  const cardioWeek = zoneMin.reduce((a, b) => a + b, 0);
  const lowVol = Object.entries(weekly).filter(([, v]) => v.sets < 10).map(([k]) => MUSCLES[k].name);
  return (
    <div className="stack">
      <div className="hero">
        <div>
          <p className="eyebrow">{GOALS[m.goal].name} · {sexShort(m.sex)} · {ageText(d.age)}</p>
          <h2>{m.name} 회원님</h2>
          <p className="muted small">최근 14일 운동 {d.recent14}회 · <Term k="act">활동계수</Term> {d.actFactor}</p>
        </div>
        <button className="btn ghost" onClick={() => go("member")}>프로필</button>
      </div>

      <div className="grid2">
        <Card title="오늘 목표 섭취" onClick={() => go("nutrition")} right={<span className="chip">{energy ? (energy.method === "katch" ? <Term k="katch">Katch-McArdle</Term> : <Term k="mifflin">Mifflin</Term>) : ""}</span>}>
          {energy ? <>
            <p className="big">{fmt(energy.target)}<small> kcal</small></p>
            <div className="macro-row"><span>단 {fmt(energy.protein)}g</span><span>탄 {fmt(energy.carb)}g</span><span>지 {fmt(energy.fat)}g</span></div>
          </> : <p className="muted">신체 정보를 입력하면 계산됩니다.</p>}
        </Card>
        <Card title="최근 인바디" onClick={() => go("member")} right={body && <span className="muted small">{body.date}</span>}>
          {body ? <div className="kv3">
            <div><b>{fmt(body.weightKg, 1)}<small>kg</small></b><span>체중</span></div>
            <div><b>{fmt(body.smmKg, 1)}<small>kg</small></b><span><Term k="smm">골격근</Term></span></div>
            <div><b>{fmt(body.bodyFatPct, 1)}<small>%</small></b><span><Term k="bf">체지방</Term></span></div>
          </div> : <p className="muted">아직 측정 기록이 없습니다.</p>}
        </Card>
      </div>

      <Card title="부위별 회복 상태" onClick={() => go("recovery")} right={<span className="muted small">운동 가능 {ready.length}/10</span>}>
        <div className="chips">
          {ready.map((k) => <span key={k} className="chip ok">{MUSCLES[k].name}</span>)}
          {resting.map((k) => <span key={k} className="chip wait">{MUSCLES[k].name} {Math.round(recovery[k].pct * 100)}%</span>)}
        </div>
        {lowVol.length > 0 && <p className="small muted" style={{ marginTop: 10 }}>이번 주 10세트 미만: {lowVol.join(", ")}</p>}
      </Card>

      <Card title="심박 존" onClick={() => go("heart")} right={<span className="muted small">최대 {d.hrMax} bpm</span>}>
        <div className="zstrip">{zones.map((z) => <div key={z.z} style={{ background: ZCOL[z.z - 1] }}><b>Z{z.z}</b><span>{z.from}–{z.to}</span></div>)}</div>
        <p className="small muted" style={{ marginTop: 10 }}>이번 주 유산소 {cardioWeek}분 · 템플릿 「{tpl.name}」 목표 <span className="nw">{tpl.total[0]}–{tpl.total[1]}분</span></p>
        <Bar pct={cardioWeek / tpl.total[0]} />
      </Card>

      <Card title="최근 운동" onClick={() => go("workout")} right={<span className="muted small">{sessions.length}회 기록</span>}>
        {sessions.slice(0, 3).map((s) => <SessionLine key={s.id} s={s} />)}
      </Card>
    </div>
  );
}
/* 한 줄에 들어가는 만큼만 이름을 보여 주고 나머지는 "외 N개" (글자 잘림·줄바꿈 없이) */
let _fitCtx = null;
function FitList({ items, className }) {
  const ref = useRef(null); const [k, setK] = useState(items.length);
  const key = items.join("\u0001");
  const fit = () => {
    const el = ref.current; if (!el) return;
    const w = el.clientWidth; if (!w) return;
    _fitCtx = _fitCtx || document.createElement("canvas").getContext("2d");
    const cs = getComputedStyle(el); _fitCtx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const n = items.length; let best = 0;
    for (let i = n; i >= 1; i--) { const t = items.slice(0, i).join(" · ") + (i < n ? ` 외 ${n - i}개` : ""); if (_fitCtx.measureText(t).width <= w - 2) { best = i; break; } }
    setK(best);
  };
  React.useLayoutEffect(() => { fit(); const ro = window.ResizeObserver ? new ResizeObserver(fit) : null; if (ro && ref.current) ro.observe(ref.current); return () => ro && ro.disconnect(); }, [key]);
  const n = items.length;
  return <span ref={ref} className={className} title={items.join(" · ")}>{k === 0 ? <span className="more">운동 {n}개</span> : <>{items.slice(0, k).join(" · ")}{k < n && <span className="more"> 외 {n - k}개</span>}</>}</span>;
}
function SessionLine({ s }) {
  const names = s.entries.map(entryLabel);
  const media = s.entries.reduce((a, e) => a + (e.media || []).length, 0);
  const sets = s.entries.reduce((a, e) => a + (e.kind === "strength" ? e.sets.length : 0), 0);
  return <div className="sline"><span className="date">{s.date.slice(5).replace("-", ".")}</span><FitList className="names" items={names} />{(s.trainerIds || []).length > 0 && <span className="tag pt">수업</span>}{media > 0 && <span className="muted small">첨부 {media}</span>}{sets > 0 && <span className="muted small">{sets}세트</span>}</div>;
}

/* 저장 버튼: 입력하면 자동 저장되지만, 눌러서 바로 저장하고 상태를 확인할 수 있게 */
function SaveBar() {
  const { srv, sync } = useStore();
  const [done, setDone] = useState(0);
  const save = async () => { if (srv) await srv.flush(); setDone(Date.now()); };
  const t = (ms) => new Date(ms).toTimeString().slice(0, 5);
  const st = !srv ? (done ? `이 기기에 저장했어요 (${t(done)})` : "입력하는 대로 이 기기에 자동 저장됩니다")
    : sync.state === "saving" ? "저장 중…" : sync.state === "error" ? "저장 실패: " + sync.msg
    : sync.state === "saved" && sync.at ? `서버에 저장됨 (${t(sync.at)}) · 입력하는 대로 자동 저장` : "입력하는 대로 자동 저장됩니다";
  return (
    <div className="savebar">
      <button className="btn" id="m-save" onClick={save} disabled={srv && sync.state === "saving"}>회원 정보 저장</button>
      <span className={"small" + (srv && sync.state === "error" ? " errtxt" : " muted")} role="status">{st}</span>
    </div>
  );
}

/* ───────── 회원 · 신체 기록 ───────── */
function MemberTab({ d, onBack }) {
  const { update, srv } = useStore();
  const { m, meas, body } = d;
  const role = srv?.profile.role;
  // 서버 규칙과 같게: 마스터, 강사 없이 혼자 쓰는 회원 본인, 앱 연결 전이고 나만 맡은 회원의 강사
  const tids = m.trainerIds || [];
  const canDelete = !srv || srv.master || (m.mine ? !tids.length : !m.linked && tids.every((id) => id === srv.user.id));
  const [form, setForm] = useState({ date: todayISO(), heightCm: body?.heightCm || "", weightKg: "", smmKg: "", bodyFatPct: "" });
  const [confirmDel, setConfirmDel] = useState(false);
  const up = (k, v) => update((x) => { x.members = x.members.map((mm) => (mm.id === m.id ? { ...mm, [k]: v } : mm)); });
  const addMeas = () => {
    if (!form.heightCm || !form.weightKg) return;
    update((x) => { x.measurements.push({ id: uid(), memberId: m.id, date: form.date, heightCm: +form.heightCm, weightKg: +form.weightKg, smmKg: form.smmKg ? +form.smmKg : null, bodyFatPct: form.bodyFatPct ? +form.bodyFatPct : null, ...stampRec(srv) }); });
    setForm({ ...form, weightKg: "", smmKg: "", bodyFatPct: "" });
  };
  const delMember = () => update((x) => {
    x.members = x.members.filter((mm) => mm.id !== m.id);
    x.measurements = x.measurements.filter((r) => r.memberId !== m.id);
    x.sessions = x.sessions.filter((r) => r.memberId !== m.id);
    x.activeId = x.members[0]?.id || null;
  });
  return (
    <div className="stack">
      {onBack && <button className="btn ghost small back" id="m-back" onClick={onBack}>‹ 회원 목록</button>}
      <Card title="회원 정보" right={<span className="muted small">한 번 입력하면 영양·심박·회복 탭에 반영</span>}>
        <div className="form">
          <Field label="이름"><input id="m-name" value={m.name} onChange={(e) => up("name", e.target.value)} /></Field>
          <Field label="성별"><Seg value={m.sex} options={[["M", "남"], ["F", "여"]]} onChange={(v) => up("sex", v)} small /></Field>
          <Field label="생년월일" hint={d.age != null ? `만 ${d.age}세` : ""}><input id="m-birth" type="date" value={m.birth} onChange={(e) => up("birth", e.target.value)} /></Field>
          <Field label="연락처"><input id="m-phone" value={m.phone || ""} onChange={(e) => up("phone", e.target.value)} /></Field>
          <Field label="운동 목적">
            <select id="m-goal" value={m.goal} onChange={(e) => up("goal", e.target.value)}>{Object.entries(GOALS).map(([k, g]) => <option key={k} value={k}>{g.name}</option>)}</select>
          </Field>
          <Field label="안정시 심박 (bpm)" hint="아침 기상 직후 1분 측정"><input id="m-rhr" type="number" inputMode="numeric" value={m.restingHR || ""} onChange={(e) => up("restingHR", e.target.value ? +e.target.value : "")} /></Field>
          {role === "member" && (m.trainerIds || []).length ? <div className="field"><span>강사 메모 (부상·특이사항)</span><p className="note" id="m-memo-ro">{m.memo || "없음"}</p><em>강사가 적는 칸이에요. 바꿀 내용은 강사에게 말해 주세요.</em></div>
            : <Field label="메모 (부상·특이사항)" ><textarea id="m-memo" rows="2" value={m.memo || ""} onChange={(e) => up("memo", e.target.value)} /></Field>}
        </div>
        <SaveBar />
      </Card>

      <LinkCard m={m} />
      {srv && role === "trainer" && !m.mine && <PackageCard m={m} />}

      <Card title="인바디 · 신체 측정 추가">
        <div className="form cols">
          <Field label="측정일"><input id="b-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="키 cm"><input id="b-h" type="number" inputMode="decimal" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} /></Field>
          <Field label="체중 kg"><input id="b-w" type="number" inputMode="decimal" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} /></Field>
          <Field label="골격근량 kg"><input id="b-smm" type="number" inputMode="decimal" value={form.smmKg} onChange={(e) => setForm({ ...form, smmKg: e.target.value })} /></Field>
          <Field label="체지방률 %" hint="있으면 제지방 기반 공식 사용"><input id="b-bf" type="number" inputMode="decimal" value={form.bodyFatPct} onChange={(e) => setForm({ ...form, bodyFatPct: e.target.value })} /></Field>
        </div>
        <button className="btn" onClick={addMeas} disabled={!form.heightCm || !form.weightKg}>측정 기록 저장</button>
      </Card>

      {body && <Card title="신체 조성 분석" right={<Cite ids={["ace", "kouri"]} />}>
        <div className="kv3">
          <div><b>{fmt(body.bmi, 1)}</b><span>{tx("BMI")}</span></div>
          <div><b>{fmt(body.lbm, 1)}</b><span>{tx("제지방량 kg")}</span></div>
          <div><b>{fmt(body.ffmiN, 1)}</b><span>{tx("FFMI(보정)")}</span></div>
        </div>
        {body.cls && <p className="small" style={{ marginTop: 10 }}>체지방률 {body.bodyFatPct}% → <b>{m.sex === "M" ? "남성" : "여성"} 기준 「{body.cls}」</b> 범위 (<Term k="ace">ACE</Term>)</p>}
      </Card>}

      <Card title="측정 이력" right={<span className="muted small">{meas.length}회</span>}>
        <div className="grid2 tight">
          <div><p className="small muted">체중 kg</p><Spark data={meas.map((x) => ({ v: x.weightKg }))} unit="kg" /></div>
          <div><p className="small muted">체지방 %</p><Spark data={meas.filter((x) => x.bodyFatPct).map((x) => ({ v: x.bodyFatPct }))} unit="%" /></div>
        </div>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>날짜</th><th>키</th><th>체중</th><th><Term k="smm">골격근</Term></th><th><Term k="bf">체지방</Term></th><th /></tr></thead>
          <tbody>{meas.slice().sort((a, b) => b.date.localeCompare(a.date)).map((x) => <tr key={x.id} data-meas={x.id}>
            <td>{x.date}{srv && <RecTag r={x} m={m} />}</td><td>{x.heightCm}</td><td>{x.weightKg}</td><td>{x.smmKg ?? "—"}</td><td>{x.bodyFatPct ?? "—"}</td>
            <td className="nowrap">{canEditRec(srv, x, m) && <button className="x" aria-label="삭제" onClick={() => update((y) => { y.measurements = y.measurements.filter((r) => r.id !== x.id); })}>×</button>}</td>
          </tr>)}</tbody>
        </table></div>
        {srv && <p className="small muted">{m.mine ? "내가 쓴 기록만 지울 수 있어요." : "강사는 자기가 쓴 지 3일 안의 기록만 지울 수 있어요."}</p>}
      </Card>

      {canDelete && <div className="danger-zone">
        {!confirmDel ? <button className="btn ghost small" onClick={() => setConfirmDel(true)}>이 회원 삭제</button> :
          <div className="row"><span className="small">{m.name} 회원의 모든 기록이 삭제됩니다.</span><button className="btn danger small" onClick={delMember}>삭제</button><button className="btn ghost small" onClick={() => setConfirmDel(false)}>취소</button></div>}
      </div>}
    </div>
  );
}

/* ───────── 운동 일지 + 강도 계산기 ───────── */
/* ───────── 사진·영상 (Supabase Storage, 회원 폴더별) ───────── */
const signedCache = new Map(); // path -> { url, exp }
function useSignedUrls(paths) {
  const { srv } = useStore();
  const key = paths.join("|");
  const [, bump] = useState(0);
  useEffect(() => {
    if (!srv || !paths.length) return;
    const need = paths.filter((p) => { const c = signedCache.get(p); return !c || c.exp < Date.now() + 60000; });
    if (!need.length) return;
    let alive = true;
    srv.sb.storage.from(BUCKET).createSignedUrls(need, 3600).then(({ data }) => {
      (data || []).forEach((r) => { if (r.signedUrl && r.path) signedCache.set(r.path, { url: r.signedUrl, exp: Date.now() + 3600e3 }); });
      if (alive) bump((n) => n + 1);
    }).catch(() => {});
    return () => { alive = false; };
  }, [key, !!srv]);
  return (p) => signedCache.get(p)?.url || null;
}
function MediaThumbs({ items, onRemove }) {
  const url = useSignedUrls((items || []).map((x) => x.path));
  const [open, setOpen] = useState(null);
  if (!items || !items.length) return null;
  return (
    <div className="media">
      {items.map((x, i) => { const u = url(x.path); return (
        <div key={x.path} className="thumb">
          {!u ? <span className="ph">{x.type === "video" ? "영상" : "사진"}</span>
            : x.type === "video" ? <video src={u + "#t=0.1"} preload="metadata" muted playsInline onClick={() => setOpen(x)} />
            : <img src={u} alt={x.name || "운동 사진"} loading="lazy" onClick={() => setOpen(x)} />}
          {x.type === "video" && <span className="play" aria-hidden="true">▶</span>}
          {onRemove && <button className="x" aria-label="첨부 삭제" onClick={() => onRemove(i)}>×</button>}
        </div>); })}
      {open && <div className="viewer" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
        {open.type === "video" ? <video src={url(open.path)} controls autoPlay playsInline onClick={(e) => e.stopPropagation()} /> : <img src={url(open.path)} alt={open.name || ""} />}
        <button className="btn ghost small" onClick={() => setOpen(null)}>닫기</button>
      </div>}
    </div>
  );
}
// 사진은 긴 변 1600px JPEG로 줄여서 올림 (휴대폰 원본 사진은 너무 큼)
async function shrinkImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    if (k === 1 && file.size < 1.5e6) return file;
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch (e) { return file; }
}
const MAX_FILE = 50 * 1024 * 1024;
function MediaPicker({ memberId, folder, onAdd, label = "사진·영상 첨부" }) {
  const { srv } = useStore();
  const [busy, setBusy] = useState(0), [err, setErr] = useState("");
  const ref = useRef(null);
  if (!srv) return <p className="small muted">사진·영상 첨부는 로그인하면 쓸 수 있어요.</p>;
  const pick = async (files) => {
    setErr("");
    for (const f0 of Array.from(files || [])) {
      const video = f0.type.startsWith("video/");
      if (!video && !f0.type.startsWith("image/")) { setErr("사진이나 영상만 첨부할 수 있어요."); continue; }
      setBusy((n) => n + 1);
      try {
        const f = video ? f0 : await shrinkImage(f0);
        if (f.size > MAX_FILE) throw new Error(`${f0.name}: 50MB 이하만 올릴 수 있어요. 영상은 짧게 자르거나 화질을 낮춰 주세요.`);
        const ext = ((f.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5)) || (video ? "mp4" : "jpg");
        const path = `${folder || memberId}/${uid()}.${ext}`;
        const { error } = await srv.sb.storage.from(BUCKET).upload(path, f, { contentType: f.type || undefined, upsert: false });
        if (error) throw error;
        onAdd({ path, type: video ? "video" : "image", name: f0.name });
      } catch (e) { setErr(errMsg(e)); }
      setBusy((n) => n - 1);
    }
    if (ref.current) ref.current.value = "";
  };
  return (
    <div className="mpick">
      <label className="btn ghost small">{label}<input ref={ref} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => pick(e.target.files)} /></label>
      {busy > 0 && <span className="small muted">올리는 중…</span>}
      {err && <span className="small errtxt">{err}</span>}
    </div>
  );
}
const dropFiles = (srv, paths) => { if (srv && paths.length) srv.sb.storage.from(BUCKET).remove(paths).catch(() => {}); };

/* 세션 한 건 상세 (캘린더·일지·복기에서 같이 사용) */
const setsText = (en) => entryCat(en) === "pilates" ? en.sets.map((x) => `${x.w !== "" && x.w != null ? x.w + " · " : ""}${x.r}회`).join(", ") : en.sets.map((x) => `${x.w}×${x.r}${x.rir != null && x.rir !== "" ? `@${x.rir}` : ""}`).join(", ");
const sessWho = (staff, s) => ((s.trainerIds || []).length ? staffNames(staff, s.trainerIds) + " 강사와 수업" : "개인 운동");
function EntryLine({ en, d }) {
  if (en.kind === "cardio") { const z = zoneForHR(d.zones, en.avgHR); return <p className="small">{en.mode} {en.minutes}분 · 평균 {en.avgHR}bpm{z && <> · <span className="zt" style={{ background: ZCOL[z - 1] }}>Z{z}</span></>}</p>; }
  return <p className="small"><b>{exName(en)}</b>{EX[en.exId]?.eq && <span className="muted"> · {EX[en.exId].eq}</span>} {setsText(en)}</p>;
}
const isStaff = (srv) => !srv || srv.profile.role !== "member";
const EDIT_DAYS = 3;
const stampRec = (srv) => (srv ? { by: srv.user.id, createdAt: new Date().toISOString() } : {});
const recAge = (r) => (r.createdAt ? (Date.now() - new Date(r.createdAt).getTime()) / 864e5 : 0);
// 서버 규칙과 같게: 마스터는 언제든, 회원은 자기가 쓴 기록, 강사는 자기가 쓴 기록을 3일 안에
const canEditRec = (srv, r, m) => {
  if (!srv || srv.master) return true;
  if (r.by && r.by !== srv.user.id) return false;
  if (m && m.mine) return true;
  return (m?.trainerIds || []).includes(srv.user.id) && recAge(r) < EDIT_DAYS;
};
const whyNoEdit = (srv, r, m) => {
  if (r.by && r.by !== srv.user.id) return m && m.mine ? "강사가 쓴 기록은 그 강사만 고칠 수 있어요." : (PEOPLE[r.by]?.role === "member" ? "회원이 직접 남긴 기록은 회원만 고칠 수 있어요." : "다른 강사가 쓴 기록이라 볼 수만 있어요.");
  return `쓴 지 ${EDIT_DAYS}일이 지난 기록은 강사가 고칠 수 없어요.`;
};
// 기록 출처 표시: 강사 화면에서 회원이 직접 쓴 기록
function RecTag({ r, m }) {
  const { srv } = useStore();
  if (!srv || m.mine || !r.by || r.by === srv.user.id) return null;
  const p = PEOPLE[r.by];
  return <span className="tag src">{p && p.role === "trainer" ? p.name + " 강사" : "회원 기록"}</span>;
}
const alertMsg = (t) => { try { window.dispatchEvent(new CustomEvent("tempt-msg", { detail: t })); } catch (e) {} };
function SessionDetail({ s, d }) {
  const { update, staff, srv } = useStore();
  const can = canEditRec(srv, s, d.m);
  const [edit, setEdit] = useState(false), [ask, setAsk] = useState(false);
  const setMedia = (eid, fn) => update((x) => { x.sessions = x.sessions.map((ss) => (ss.id !== s.id ? ss : { ...ss, entries: ss.entries.map((e) => (e.id === eid ? { ...e, media: fn(e.media || []) } : e)) })); });
  return (
    <div className="sdetail" data-session={s.id}>
      <p className="small"><b>{s.time || "시간 미입력"}</b> · <span className={"tag" + ((s.trainerIds || []).length ? " pt" : "")}>{sessWho(staff, s)}</span>{s.entries.some((en) => entryCat(en) === "pilates") && <span className="tag eq">필라테스</span>}<RecTag r={s} m={d.m} />{s.assignmentId && <span className="tag pt">과제</span>}</p>
      {s.note && <p className="note">{s.note}</p>}
      {s.entries.map((en) => (
        <div key={en.id} className="sd-e">
          <EntryLine en={en} d={d} />
          <MediaThumbs items={en.media} onRemove={edit ? (i) => setMedia(en.id, (a) => a.filter((_, j) => j !== i)) : null} />
          {edit && <MediaPicker memberId={s.memberId} onAdd={(it) => setMedia(en.id, (a) => [...a, it])} label="이 운동에 사진·영상 추가" />}
        </div>
      ))}
      {!can ? <p className="small muted noedit">{whyNoEdit(srv, s, d.m)}</p> : <div className="row">
        <button className="btn small" data-edit-session={s.id} onClick={() => window.dispatchEvent(new CustomEvent("tempt-edit-session", { detail: s.id }))}>기록 수정</button>
        {srv && <button className="btn ghost small" onClick={() => setEdit(!edit)}>{edit ? "완료" : "사진·영상 편집"}</button>}
        {!ask ? <button className="btn ghost small" onClick={() => setAsk(true)}>기록 삭제</button> : <>
          <span className="small">이 기록과 첨부 파일이 지워집니다.</span>
          <button className="btn danger small" onClick={() => update((x) => { x.sessions = x.sessions.filter((r) => r.id !== s.id); })}>삭제</button>
          <button className="btn ghost small" onClick={() => setAsk(false)}>취소</button></>}
      </div>}
    </div>
  );
}

/* ───────── 운동: 캘린더 · 기록 · 복기 · 강도 계산기 ───────── */
function WorkoutTab({ d, sub, setSub }) {
  const [preset, setPreset] = useState(null);
  const [editId, setEditId] = useState(null);
  useEffect(() => {
    const top = () => { const el = document.querySelector(".main"); if (el) el.scrollTop = 0; window.scrollTo(0, 0); };
    const on = (e) => { setEditId(e.detail); setSub("log"); top(); };
    // 일정 → 운동 기록 쓰기 (App이 회원을 바꾼 뒤 보냄)
    window.addEventListener("tempt-edit-session", on);
    return () => window.removeEventListener("tempt-edit-session", on);
  }, []);
  useTabCmd("tempt-log-preset", (p) => { setEditId(null); setPreset(p); setSub("log"); const el = document.querySelector(".main"); if (el) el.scrollTop = 0; });
  return (
    <div className="stack">
      <Seg value={sub} options={[["cal", "캘린더"], ["log", "기록하기"], ["review", "운동 복기"], ["calc", "1RM 계산"]]} onChange={setSub} />
      {sub === "cal" ? <CalendarView d={d} onAdd={(date) => { setPreset(date); setSub("log"); }} />
        : sub === "review" ? <ReviewView d={d} />
        : sub === "calc" ? <CalcView d={d} />
        : <LogView d={d} preset={preset} clearPreset={() => setPreset(null)} editId={editId} clearEdit={() => setEditId(null)} />}
    </div>
  );
}

const WD = ["일", "월", "화", "수", "목", "금", "토"];
function CalendarView({ d, onAdd }) {
  const today = todayISO();
  const [ym, setYm] = useState(today.slice(0, 7));
  const [sel, setSel] = useState(today);
  const byDate = useMemo(() => {
    const m = {};
    d.sessions.forEach((s) => (m[s.date] = m[s.date] || []).push(s));
    Object.values(m).forEach((a) => a.sort((x, y) => (x.time || "").localeCompare(y.time || "")));
    return m;
  }, [d.sessions]);
  const [y, mo] = ym.split("-").map(Number);
  const lead = new Date(y, mo - 1, 1).getDay(), days = new Date(y, mo, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${ym}-${String(i + 1).padStart(2, "0")}`)];
  const shift = (n) => setYm(iso(new Date(y, mo - 1 + n, 1)).slice(0, 7));
  const inMonth = d.sessions.filter((s) => s.date.startsWith(ym));
  const pt = inMonth.filter((s) => (s.trainerIds || []).length).length;
  const days_ = new Set(inMonth.map((s) => s.date)).size;
  const list = byDate[sel] || [];
  return (
    <>
      <Card title={`${y}년 ${mo}월`} right={<div className="row nowrap">
        <button className="btn ghost small" aria-label="이전 달" onClick={() => shift(-1)}>‹</button>
        <button className="btn ghost small" onClick={() => { setYm(today.slice(0, 7)); setSel(today); }}>오늘</button>
        <button className="btn ghost small" aria-label="다음 달" onClick={() => shift(1)}>›</button></div>}>
        <p className="small muted">운동한 날 {days_}일 · 강사와 수업 {pt}회 · 개인 운동 {inMonth.length - pt}회</p>
        <div className="cal">
          {WD.map((w, i) => <div key={w} className={"cal-wd" + (i === 0 ? " sun" : i === 6 ? " sat" : "")}>{w}</div>)}
          {cells.map((c, i) => {
            if (!c) return <div key={"e" + i} />;
            const ss = byDate[c] || []; const hasPT = ss.some((s) => (s.trainerIds || []).length);
            return (
              <button key={c} data-date={c} className={"cal-d" + (c === sel ? " sel" : "") + (c === today ? " today" : "") + (ss.length ? " has" : "")} onClick={() => setSel(c)}
                aria-label={`${mo}월 ${+c.slice(8)}일${ss.length ? `, 운동 ${ss.length}회, ${ss[0].time || ""}` : ""}`} aria-pressed={c === sel}>
                <span className="n">{+c.slice(8)}</span>
                {ss.length > 0 && <span className={"cmark" + (hasPT ? " pt" : "")}>{ss.length > 1 ? ss.length : ""}</span>}
                {ss.length > 0 && <span className="t">{ss[0].time}</span>}
              </button>
            );
          })}
        </div>
        <p className="small muted legend"><span className="cmark pt" /> 강사와 수업 <span className="cmark" /> 개인 운동 · 숫자는 그날 운동 횟수, 아래는 시작 시각</p>
      </Card>
      <Card title={`${+sel.slice(5, 7)}월 ${+sel.slice(8)}일 ${WD[new Date(sel + "T00:00").getDay()]}요일`} right={<button className="btn small" onClick={() => onAdd(sel)}>이 날 기록하기</button>}>
        {list.map((s) => <SessionDetail key={s.id} s={s} d={d} />)}
        {!list.length && <p className="small muted">이 날은 운동 기록이 없습니다.</p>}
      </Card>
    </>
  );
}

function ReviewView({ d }) {
  const [view, setView] = useState("review");
  const [cat, setCat] = useState(() => { try { return localStorage.getItem("tempt.cat") || "gym"; } catch (e) { return "gym"; } });
  const pickCat = (c) => { setCat(c); try { localStorage.setItem("tempt.cat", c); } catch (e) {} };
  return (
    <>
      <div id="rv-cat"><Seg value={cat} options={CATS} onChange={pickCat} /></div>
      <Seg value={view} options={[["review", "기록 복기"], ["lib", "운동 목록"]]} onChange={setView} small />
      {view === "lib" ? <ExerciseLibrary d={d} cat={cat} /> : <ReviewList d={d} cat={cat} />}
    </>
  );
}

/* 운동 목록: 공용 사전 (이름만으로 추가, 부위·도구·설명·시범 사진/영상 수정, 삭제) */
const musNames = (ks) => (ks || []).map((k) => MUSCLES[k]?.name).filter(Boolean).join("·");
function canEditEx(srv, e) { return !srv || (!e.tpl && (srv.master || (!!e.by && e.by === srv.user.id))); }
// 운동을 추가한 사람: 기본 운동 / 내가 추가 / ○○ 강사(회원) 추가
const exBy = (srv, e) => {
  const cn = "";
  if (!e.by || e.base) return cn + "기본 운동";
  if (!srv || e.by === srv.user.id) return cn + "내가 추가";
  const p = PEOPLE[e.by]; return cn + `${p?.name || "다른 사람"} ${ROLE_NAME[p?.role] || ""} 추가`.replace(/\s+추가$/, " 추가");
};
function MusclePicks({ value, onChange, other = [] }) {
  return <div className="chips">{Object.entries(MUSCLES).map(([k, v]) => (
    <button key={k} type="button" className={"chip tog" + (value.includes(k) ? " on" : "")} aria-pressed={value.includes(k)} disabled={other.includes(k)}
      onClick={() => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k])}>{v.name}</button>))}</div>;
}
function ExerciseEditor({ e, uses, onDone }) {
  const { update, srv } = useStore();
  const [ask, setAsk] = useState(false);
  const set = (patch) => update((x) => { x.exercises = x.exercises.map((y) => (y.id === e.id ? { ...y, ...patch } : y)); });
  const del = () => { update((x) => { x.exercises = x.exercises.filter((y) => y.id !== e.id); }); onDone(); };
  return (
    <div className="exedit" onClick={(ev) => ev.stopPropagation()}>
      <Field label="운동 이름"><input id="ex-name" value={e.name} onChange={(ev) => set({ name: ev.target.value })} /></Field>
      <div className="field"><span>주 부위</span><MusclePicks value={e.p || []} other={e.s || []} onChange={(v) => set({ p: v })} /></div>
      <div className="field"><span>보조 부위</span><MusclePicks value={e.s || []} other={e.p || []} onChange={(v) => set({ s: v })} /><em>주 부위는 세트 수 그대로, 보조 부위는 절반으로 주간 볼륨·회복에 반영됩니다</em></div>
      <div className="field"><span>운동 도구</span><div className="chips" id="ex-eq">{eqFor(exCat(e)).map((q) => (
        <button key={q} type="button" className={"chip tog" + (e.eq === q ? " on" : "")} aria-pressed={e.eq === q} onClick={() => set({ eq: e.eq === q ? "" : q })}>{q}</button>))}</div></div>
      <Field label="자세 포인트 · 설명"><textarea id="ex-note" rows="2" placeholder={exCat(e) === "pilates" ? "예: 스프링 레드 2개, 골반 중립 유지하고 숨 내쉬며 밀기" : "예: 견갑을 모으고 바를 가슴 아래쪽으로"} value={e.note || ""} onChange={(ev) => set({ note: ev.target.value })} /></Field>
      <div className="field"><span>시범 사진 · 영상</span>
        <MediaThumbs items={e.media} onRemove={(i) => set({ media: e.media.filter((_, j) => j !== i) })} />
        <MediaPicker folder={"lib/" + e.id} onAdd={(it) => update((x) => { x.exercises = x.exercises.map((y) => (y.id === e.id ? { ...y, media: [...(y.media || []), it] } : y)); })} />
      </div>
      <div className="row">
        <button className="btn small" onClick={onDone}>완료</button>
        {!ask ? <button className="btn ghost small" onClick={() => setAsk(true)}>이 운동 삭제</button> : <>
          <span className="small">{uses ? `지난 기록 ${uses}회는 그대로 남고, ` : ""}목록에서만 빠집니다.</span>
          <button className="btn danger small" onClick={del}>삭제</button><button className="btn ghost small" onClick={() => setAsk(false)}>취소</button></>}
      </div>
      {srv && <p className="small muted">고친 내용은 바로 저장되고, {srv.profile.role === "trainer" ? "나와 연결된 회원" : "나와 연결된 강사"}의 운동 목록에 같이 반영됩니다.</p>}
    </div>
  );
}
function ExerciseLibrary({ d, cat = "gym" }) {
  const { db, update, srv, favs = [], toggleFav } = useStore();
  const [favMsg, setFavMsg] = useState("");
  const [name, setName] = useState(""), [q, setQ] = useState(""), [eq, setEq] = useState(""), [mus, setMus] = useState(""), [open, setOpen] = useState(null);
  const uses = useMemo(() => { const o = {}; db.sessions.forEach((s) => s.entries.forEach((en) => { if (en.exId) o[en.exId] = (o[en.exId] || 0) + 1; })); return o; }, [db.sessions]);
  const all = (db.exercises || []).filter((e) => exCat(e) === cat);
  const catName = cat === "pilates" ? "필라테스" : "헬스";
  useEffect(() => { setEq(""); setOpen(null); }, [cat]);
  const list0 = sortMembers(all.filter((e) => (!q.trim() || e.name.toLowerCase().includes(q.trim().toLowerCase())) && (!eq || e.eq === eq) && (!mus || (e.p || []).includes(mus) || (e.s || []).includes(mus))));
  const list = [...list0.filter((e) => favs.includes(e.id)), ...list0.filter((e) => !favs.includes(e.id))];
  const favN = all.filter((e) => favs.includes(e.id)).length;
  const star = (e) => { const okk = toggleFav(e); setFavMsg(okk ? "" : `즐겨찾기는 ${catName} ${FAV_MAX}개까지예요. 다른 운동의 별을 먼저 빼 주세요.`); };
  const add = () => {
    const nm = name.trim(); if (!nm) return;
    const dup = all.find((e) => e.name.replace(/\s/g, "") === nm.replace(/\s/g, ""));
    // 다른 종류(헬스/필라테스)에 같은 이름이 있어도 따로 추가 가능
    if (dup) { setOpen(dup.id); setName(""); setQ(""); return; }
    const id = "x" + uid();
    update((x) => { x.exercises = [...(x.exercises || []), { id, name: nm, cat, p: [], s: [], eq: "", note: "", media: [], by: srv?.user.id || null }]; });
    setName(""); setQ(""); setOpen(id);
  };
  return (
    <>
      {<Card title={`${catName} 운동 추가`}>
        <div className="addbar flat"><input id="ex-new" placeholder={`운동 이름 (예: ${cat === "pilates" ? "티저" : "케틀벨 스윙"})`} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} /><button className="btn" onClick={add} disabled={!name.trim()}>추가</button></div>
        <p className="small muted">추가한 뒤 부위·도구·설명·시범 영상은 아래에서 언제든 채울 수 있어요. 같은 이름이 이미 있으면 그 운동을 열어 줍니다. 추가한 운동은 나와 연결된 강사·회원이 함께 보고, 고치거나 지우는 건 추가한 사람만 할 수 있어요.</p>
      </Card>}
      <Card title={`${catName} 운동 목록 · ${all.length}개`} right={<span className="muted small" id="fav-n">★ {favN}/{FAV_MAX}</span>}>
        <p className="small muted">별을 누르면 즐겨찾기(최대 {FAV_MAX}개)가 돼요. 목록 맨 위, 기록하기, 1RM 계산에서 먼저 보입니다.</p>
        {favMsg && <p className="warn small" id="fav-msg">{favMsg}</p>}
        <input id="ex-q" className="search" type="search" placeholder="운동 이름 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="row wrap exfilter">
          <select id="ex-fmus" value={mus} onChange={(e) => setMus(e.target.value)}><option value="">모든 부위</option>{Object.entries(MUSCLES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select>
          <select id="ex-feq" value={eq} onChange={(e) => setEq(e.target.value)}><option value="">모든 도구</option>{eqFor(cat).map((x) => <option key={x}>{x}</option>)}</select>
        </div>
        {list.length === 0 && <p className="small muted center">조건에 맞는 운동이 없습니다.</p>}
        <ul className="mlist">{list.map((e) => { const isOpen = open === e.id, can = canEditEx(srv, e); return (
          <li key={e.id} className={"exrow" + (isOpen ? " open" : "")} data-ex={e.name}>
            <div className="exhead">
            <button type="button" className={"star" + (favs.includes(e.id) ? " on" : "")} aria-pressed={favs.includes(e.id)} aria-label={e.name + " 즐겨찾기"} onClick={() => star(e)}>{favs.includes(e.id) ? "★" : "☆"}</button>
            <button className="mrow" onClick={() => setOpen(isOpen ? null : e.id)} aria-expanded={isOpen}>
              <span className="mname">{e.name}</span>
              <span className="muted small mlast"><span className={"tag by" + (e.by && srv && e.by === srv.user.id ? " me" : "")}>{exBy(srv, e)}</span>{uses[e.id] ? ` 기록 ${uses[e.id]}회` : ""}{(e.media || []).length ? ` · 영상/사진 ${(e.media || []).length}` : ""}</span>
              <span className="muted small">{musNames(e.p) || "부위 미정"}{(e.s || []).length ? ` (+${musNames(e.s)})` : ""}{e.eq ? <span className="tag eq">{e.eq}</span> : null}</span>
            </button>
            </div>
            {isOpen && (can ? <ExerciseEditor e={e} uses={uses[e.id] || 0} onDone={() => setOpen(null)} /> : <div className="exedit">
              {e.note && <p className="note">{e.note}</p>}<MediaThumbs items={e.media} />
              <p className="small muted">{e.base ? "기본 운동은 모두가 함께 써요. 바꾸고 싶으면 내 운동으로 새로 추가하세요." : "추가한 사람만 고치거나 지울 수 있어요."}</p></div>)}
          </li>); })}</ul>
      </Card>
    </>
  );
}

function ReviewList({ d, cat = "gym" }) {
  const { staff } = useStore();
  const [q, setQ] = useState(""), [onlyMedia, setOnlyMedia] = useState(false), [open, setOpen] = useState(null);
  // 기록된 운동을 종목별로 모음 (세션은 최신순이라 items[0]이 가장 최근)
  const lib = useMemo(() => {
    const m = new Map();
    d.sessions.forEach((s) => s.entries.forEach((en) => {
      if (entryCat(en) !== cat) return;
      const cardio = en.kind === "cardio";
      const k = cardio ? "cardio:" + en.mode : exKey(en);
      const it = m.get(k) || { k, name: cardio ? en.mode : exName(en), cardio, custom: !cardio && !en.exId, items: [], media: 0 };
      it.items.push({ s, en }); it.media += (en.media || []).length; m.set(k, it);
    }));
    return [...m.values()];
  }, [d.sessions, cat]);
  const list = lib.filter((it) => (!q.trim() || it.name.includes(q.trim())) && (!onlyMedia || it.media > 0));
  return (
    <>
      <Card title={cat === "pilates" ? "필라테스 복기" : "헬스 복기"} right={<span className="muted small">{lib.length}종목</span>}>
        <p className="small muted">{cat === "pilates" ? "필라테스 수업에서 한 동작을" : "수업에서 배운 운동을"} 종목별로 모았습니다. 혼자 운동할 때 지난 세트와 강사 메모, 사진·영상을 다시 보세요.</p>
        <div className="row wrap">
          <input id="rv-q" className="grow" placeholder="운동 이름 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className={"chip tog" + (onlyMedia ? " on" : "")} aria-pressed={onlyMedia} onClick={() => setOnlyMedia(!onlyMedia)}>사진·영상 있는 것만</button>
        </div>
      </Card>
      {list.length === 0 && <p className="small muted center">조건에 맞는 운동이 없습니다.</p>}
      {list.map((it) => { const last = it.items[0]; const isOpen = open === it.k; return (
        <Card key={it.k} title={it.name} onClick={isOpen ? undefined : () => setOpen(it.k)} right={<span className="muted small">{it.items.length}회{it.media ? ` · 첨부 ${it.media}` : ""}</span>}>
          <p className="small">최근 {last.s.date.slice(5).replace("-", ".")} · {sessWho(staff, last.s)}{it.custom && <span className="muted"> · 직접 입력</span>}</p>
          {!it.cardio && <p className="small muted">{setsText(last.en)}</p>}
          {isOpen && EX[it.k] && (EX[it.k].note || (EX[it.k].media || []).length > 0) && <div className="demo">
            <p className="small"><b>운동 목록의 설명·시범</b>{EX[it.k].eq ? ` · ${EX[it.k].eq}` : ""}</p>
            {EX[it.k].note && <p className="note">{EX[it.k].note}</p>}
            <MediaThumbs items={EX[it.k].media} />
          </div>}
          {!isOpen ? <MediaThumbs items={(last.en.media || []).slice(0, 4)} /> : <div className="rv-list">
            {it.items.map(({ s, en }) => (
              <div key={s.id + en.id} className="rv-i">
                <p className="small"><b>{s.date.replace(/-/g, ".")} {s.time}</b> · {sessWho(staff, s)}</p>
                <EntryLine en={en} d={d} />
                {s.note && <p className="note">{s.note}</p>}
                <MediaThumbs items={en.media} />
              </div>))}
            <button className="btn ghost small" onClick={() => setOpen(null)}>접기</button>
          </div>}
        </Card>); })}
    </>
  );
}

function LogView({ d, preset, clearPreset, editId, clearEdit }) {
  const { update, srv, staff } = useStore();
  const me = srv?.user.id, role = srv?.profile.role;
  // 고치는 중인 기록 (없으면 새 기록)
  const orig = editId ? d.sessions.find((x) => x.id === editId) : null;
  // 수업한 강사 후보: 이 회원의 담당 강사 (+ 기록하는 내가 강사면 나, 고치는 기록에 이미 있던 강사)
  const tCands = role === "member" ? [] : staff.filter((t) => (d.m.trainerIds || []).includes(t.id) || t.id === me || (orig?.trainerIds || []).includes(t.id));
  const defT = role && role !== "member" && me ? [me] : [];
  const blank = (date) => ({ date: date || todayISO(), time: new Date().toTimeString().slice(0, 5), entries: [], trainerIds: defT, note: "" });
  const [draft, setDraft] = useState(() => blank(preset));
  useEffect(() => {
    if (!preset) return;
    // 일정에서 넘어오면 날짜·시각·미리 정한 운동·강사·메모를 그대로 채움
    if (typeof preset === "object") setDraft({ ...blank(preset.date), time: preset.time || blank().time, entries: (preset.entries || []).map((e) => ({ ...JSON.parse(JSON.stringify(e)), id: uid(), media: [] })), trainerIds: preset.trainerIds || defT, note: preset.note || "", scheduleId: preset.scheduleId || null });
    else setDraft((x) => ({ ...x, date: preset }));
    clearPreset();
  }, [preset]);
  useEffect(() => {
    if (!orig) return;
    const c = JSON.parse(JSON.stringify(orig));
    setDraft({ date: c.date, time: c.time || "", entries: c.entries || [], trainerIds: c.trainerIds || [], note: c.note || "" });
  }, [editId]);
  const editing = !!orig;
  const cancelEdit = () => { clearEdit(); setDraft(blank()); };
  const mediaPaths = (es) => es.flatMap((e) => (e.media || []).map((m) => m.path)).filter(Boolean);
  const [exId, setExId] = useState("bench");
  const [custom, setCustom] = useState({ name: "", muscle: "", eq: "" });
  const { db } = useStore();
  // 운동 목록을 도구별로 묶어 가나다순으로
  const [mode, setMode] = useState("strength");
  const pcat = mode === "pilates" ? "pilates" : "gym";
  const { favs = [] } = useStore();
  const favList = favs.map((id) => EX[id]).filter((e) => e && exCat(e) === pcat);
  const groups = useMemo(() => {
    const g = {}; sortMembers((db.exercises || []).filter((e) => exCat(e) === pcat)).forEach((e) => (g[e.eq || "기타·미정"] = g[e.eq || "기타·미정"] || []).push(e));
    return [...eqFor(pcat), "기타·미정"].filter((k) => g[k]).map((k) => [k, g[k]]);
  }, [db.exercises, pcat]);
  // 헬스/필라테스를 바꾸면 그 종류의 첫 운동을 고름
  useEffect(() => { if (mode === "cardio") return; if (exId !== "__new" && exCat(EX[exId]) === pcat) return; setExId(groups[0]?.[1][0]?.id || "__new"); }, [pcat]);
  const [cardio, setCardio] = useState({ mode: "러닝", minutes: 30, avgHR: "" });
  // 직접 입력한 운동은 운동 목록에도 추가해서 다음부터 바로 고를 수 있게
  const addEx = () => {
    let ex;
    if (exId === "__new") {
      const nm = custom.name.trim(); if (!nm) return;
      ex = (db.exercises || []).find((e) => exCat(e) === pcat && e.name.replace(/\s/g, "") === nm.replace(/\s/g, ""));
      if (!ex) {
        ex = { id: "x" + uid(), name: nm, cat: pcat, p: custom.muscle ? [custom.muscle] : [], s: [], eq: custom.eq || "", note: "", media: [], by: srv?.user.id || null };
        const nx = ex; update((x) => { x.exercises = [...(x.exercises || []), nx]; });
      }
      setCustom({ name: "", muscle: "", eq: "" }); if (ex.id) setExId(ex.id);
    } else ex = EX[exId];
    if (!ex) return;
    const b = d.best[ex.id];
    // 이름·부위 사본도 저장 → 나중에 목록에서 지워도 지난 기록은 그대로
    setDraft((x) => ({ ...x, entries: [...x.entries, { id: uid(), kind: "strength", cat: exCat(ex), exId: ex.id, name: ex.name, mus: ex.p || [], sets: [exCat(ex) === "pilates" ? { w: "", r: 10, rir: 3 } : { w: b ? roundTo(b.w, 2.5) : ex.eq === "맨몸" ? 0 : 20, r: 10, rir: 2 }], media: [] }] }));
  };
  const addCardio = () => { if (!cardio.avgHR) return; setDraft((x) => ({ ...x, entries: [...x.entries, { id: uid(), kind: "cardio", ...cardio, minutes: +cardio.minutes, avgHR: +cardio.avgHR, media: [] }] })); };
  const setEntry = (id, fn) => setDraft((x) => ({ ...x, entries: x.entries.map((e) => (e.id === id ? fn(e) : e)) }));
  const dropEntry = (en) => { if (!editing) dropFiles(srv, (en.media || []).map((m) => m.path)); setDraft((x) => ({ ...x, entries: x.entries.filter((e) => e.id !== en.id) })); };
  const toggleT = (id) => setDraft((x) => ({ ...x, trainerIds: x.trainerIds.includes(id) ? x.trainerIds.filter((t) => t !== id) : [...x.trainerIds, id] }));
  const save = () => {
    if (!draft.entries.length) return;
    const tIds = draft.trainerIds.filter((id) => tCands.some((t) => t.id === id));
    if (editing) {
      const keep = new Set(mediaPaths(draft.entries)); dropFiles(srv, mediaPaths(orig.entries || []).filter((p) => !keep.has(p)));
      update((x) => { x.sessions = x.sessions.map((r) => (r.id !== orig.id ? r : { ...r, date: draft.date, time: draft.time, entries: draft.entries, trainerIds: tIds, note: draft.note.trim() })); });
      clearEdit(); setDraft(blank()); return;
    }
    update((x) => { x.sessions.push({ id: uid(), memberId: d.m.id, ...draft, trainerIds: tIds, note: draft.note.trim(), ...stampRec(srv) }); });
    setDraft(blank());
  };
  const cz = zoneForHR(d.zones, +cardio.avgHR);
  const mediaRow = (en) => <>
    <MediaThumbs items={en.media} onRemove={(i) => { if (!editing) dropFiles(srv, [en.media[i].path]); setEntry(en.id, (x) => ({ ...x, media: x.media.filter((_, j) => j !== i) })); }} />
    <MediaPicker memberId={d.m.id} onAdd={(it) => setEntry(en.id, (x) => ({ ...x, media: [...(x.media || []), it] }))} />
  </>;
  return (
    <>
      <Card title={editing ? `기록 수정 · ${orig.date.slice(5).replace("-", "/")}` : "새 운동 기록"} tone={editing ? "editing" : undefined} right={editing ? <button className="btn ghost small" id="s-cancel" onClick={cancelEdit}>수정 취소</button> : null}>
        <div className="form cols">
          <Field label="날짜"><input id="s-date" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field>
          <Field label="시작 시각" hint="캘린더와 회복 시간 계산에 사용"><input id="s-time" type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} /></Field>
        </div>
        {tCands.length > 0 && <div className="field"><span>수업한 강사</span>
          <div className="chips" id="s-trainers">{tCands.map((t) => <button key={t.id} type="button" className={"chip tog" + (draft.trainerIds.includes(t.id) ? " on" : "")} aria-pressed={draft.trainerIds.includes(t.id)} onClick={() => toggleT(t.id)}>{t.name}</button>)}</div>
          <em>{draft.trainerIds.filter((id) => tCands.some((t) => t.id === id)).length ? "고른 강사와의 수업으로 기록됩니다" : "아무도 고르지 않으면 개인 운동으로 기록됩니다"}</em></div>}
        <Field label="수업 내용 · 메모"><textarea id="s-note" rows="2" placeholder="예: 힙힌지 패턴 교정, 다음 시간 데드리프트 진도" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></Field>
        <div id="s-mode"><Seg value={mode} options={[["strength", "헬스"], ["pilates", "필라테스"], ["cardio", "유산소"]]} onChange={setMode} small /></div>
        {mode !== "cardio" ? <div style={{ marginTop: 10 }}>
          <div className="row wrap">
            <select id="s-ex" value={exId} onChange={(e) => setExId(e.target.value)} className="grow">
              {favList.length > 0 && <optgroup label="★ 즐겨찾기">{favList.map((e) => <option key={"f" + e.id} value={e.id}>★ {e.name}</option>)}</optgroup>}
              {groups.map(([g, list]) => <optgroup key={g} label={g}>{list.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</optgroup>)}
              <option value="__new">+ 직접 입력 (운동 목록에 추가)…</option>
            </select>
            <button className="btn" onClick={addEx} disabled={exId === "__new" && !custom.name.trim()}>종목 추가</button>
          </div>
          {exId === "__new" && <div className="form cols" style={{ marginTop: 8 }}>
            <Field label="운동 이름"><input id="s-custom" placeholder={pcat === "pilates" ? "예: 티저" : "예: 케틀벨 스윙"} value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} /></Field>
            <Field label="주로 쓰는 부위" hint="고르면 회복·주간 볼륨에도 반영"><select id="s-muscle" value={custom.muscle} onChange={(e) => setCustom({ ...custom, muscle: e.target.value })}>
              <option value="">선택 안 함</option>{Object.entries(MUSCLES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select></Field>
            <Field label="도구"><select id="s-eq" value={custom.eq} onChange={(e) => setCustom({ ...custom, eq: e.target.value })}>
              <option value="">선택 안 함</option>{eqFor(pcat).map((x) => <option key={x}>{x}</option>)}</select></Field>
          </div>}
        </div> : <div style={{ marginTop: 10 }}>
          <div className="form cols">
            <Field label="종류"><input id="c-mode" value={cardio.mode} onChange={(e) => setCardio({ ...cardio, mode: e.target.value })} /></Field>
            <Field label="시간 (분)"><input id="c-min" type="number" inputMode="numeric" value={cardio.minutes} onChange={(e) => setCardio({ ...cardio, minutes: e.target.value })} /></Field>
            <Field label="평균 심박" hint={cz ? `→ Zone ${cz} 로 자동 분류` : "심박 탭의 존 기준 적용"}><input id="c-hr" type="number" inputMode="numeric" value={cardio.avgHR} onChange={(e) => setCardio({ ...cardio, avgHR: e.target.value })} /></Field>
          </div>
          <button className="btn" onClick={addCardio} disabled={!cardio.avgHR}>유산소 추가</button>
        </div>}

        {draft.entries.map((en) => en.kind === "cardio" ? (
          <div key={en.id} className="entry"><div className="entry-h"><b>{en.mode}</b><span className="muted small">{en.minutes}분 · {en.avgHR}bpm · Z{zoneForHR(d.zones, en.avgHR) || "?"}</span>
            <button className="x" aria-label="종목 빼기" onClick={() => dropEntry(en)}>×</button></div>{mediaRow(en)}</div>
        ) : (
          <div key={en.id} className="entry">
            <div className="entry-h"><b>{exName(en)}</b>
              {d.best[exKey(en)] && <span className="muted small">추정 1RM {fmt(d.best[exKey(en)].e1rm, 1)}kg</span>}
              <button className="x" aria-label="종목 빼기" onClick={() => dropEntry(en)}>×</button></div>
            {entryCat(en) === "pilates" ? <div className="sets-h"><span>세트</span><span>스프링·강도</span><span>회</span><span /><span /></div>
              : <div className="sets-h"><span>세트</span><span>kg</span><span>회</span><span><Term k="rir">RIR</Term></span><span /></div>}
            {en.sets.map((s, i) => (
              <div key={i} className="sets">
                <span className="muted">{i + 1}</span>
                <input type={entryCat(en) === "pilates" ? "text" : "number"} inputMode={entryCat(en) === "pilates" ? "text" : "decimal"} placeholder={entryCat(en) === "pilates" ? "예: 레드2" : ""} value={s.w} onChange={(e) => setEntry(en.id, (x) => ({ ...x, sets: x.sets.map((y, j) => (j === i ? { ...y, w: e.target.value } : y)) }))} />
                <input type="number" inputMode="numeric" value={s.r} onChange={(e) => setEntry(en.id, (x) => ({ ...x, sets: x.sets.map((y, j) => (j === i ? { ...y, r: e.target.value } : y)) }))} />
                {entryCat(en) === "pilates" ? <span /> : <select value={s.rir} onChange={(e) => setEntry(en.id, (x) => ({ ...x, sets: x.sets.map((y, j) => (j === i ? { ...y, rir: +e.target.value } : y)) }))}>{[0, 1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}</select>}
                <button className="x" onClick={() => setEntry(en.id, (x) => ({ ...x, sets: x.sets.filter((_, j) => j !== i) }))}>×</button>
              </div>
            ))}
            <button className="btn ghost small" onClick={() => setEntry(en.id, (x) => ({ ...x, sets: [...x.sets, { ...x.sets[x.sets.length - 1] || { w: 20, r: 10, rir: 2 } }] }))}>+ 세트</button>
            {mediaRow(en)}
          </div>
        ))}
        {draft.entries.length > 0 && <button className="btn wide" id="s-save" onClick={save}>{editing ? "수정한 내용 저장" : "운동 저장 · 캘린더·1RM·회복에 반영"}</button>}
      </Card>

      <Card title="기록" right={<Cite ids={["zourdos", "helmsRIR"]} />}>
        {d.sessions.map((s) => (
          <details key={s.id} className="sess">
            <summary><SessionLine s={s} /></summary>
            <SessionDetail s={s} d={d} />
          </details>
        ))}
      </Card>
    </>
  );
}
/* 가로로 끌어서 넘기는 운동 선택 바 (휴대폰은 손가락, PC는 마우스 드래그) */
function ExStrip({ items, value, onPick }) {
  const ref = useRef(null), drag = useRef(null);
  const down = (e) => { if (e.pointerType !== "mouse") return; drag.current = { x: e.clientX, left: ref.current.scrollLeft, moved: false }; };
  const move = (e) => { const g = drag.current; if (!g) return; const dx = e.clientX - g.x; if (Math.abs(dx) > 5) g.moved = true; if (g.moved) ref.current.scrollLeft = g.left - dx; };
  const up = () => { setTimeout(() => { drag.current = null; }, 0); };
  return (
    <div className="exstrip" id="k-strip" ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} role="listbox" aria-label="1RM을 볼 운동">
      {items.map((it) => (
        <button key={it.k} type="button" role="option" aria-selected={value === it.k} data-ex={it.name} className={"exchip" + (value === it.k ? " on" : "") + (it.best ? "" : " none")}
          onClick={(e) => { if (drag.current && drag.current.moved) { e.preventDefault(); return; } onPick(it); }}>
          <b>{it.fav && <span className="fv">★ </span>}{it.name}</b><small>{it.best ? `1RM ${fmt(it.best.e1rm, 1)}kg` : "기록 없음"}</small>
        </button>))}
    </div>
  );
}

// 1RM 공식·표 단위 설명 (반복 수 r, 중량 w)
const FORMULA_HELP = {
  avg: "세 공식(Epley·Brzycki·Lombardi)의 평균이에요. 한쪽으로 치우치지 않아 기본값으로 권장해요.",
  epley: "1RM = 중량 × (1 + 반복/30). 가장 널리 쓰는 공식으로, 반복이 많을수록 조금 높게 나와요.",
  brzycki: "1RM = 중량 × 36 ÷ (37 − 반복). 10회 이하 저반복에서 정확하고, 반복이 많으면 크게 높아져요.",
  lombardi: "1RM = 중량 × 반복^0.1. 셋 중 가장 낮게(보수적으로) 나오는 편이에요.",
};
const STEP_HELP = {
  2.5: "아래 강도표 중량을 2.5kg 단위로 반올림해요. 바벨에 양쪽 1.25kg 원판을 끼우는 기준이에요.",
  1: "1kg 단위로 반올림해요. 1kg 간격 덤벨이나 머신 무게에 맞출 때 쓰세요.",
  0.5: "0.5kg 단위로 반올림해요. 작은 원판(0.25kg)으로 세밀하게 올릴 때 쓰세요.",
};
function CalcView({ d }) {
  const { db, favs = [] } = useStore();
  const [kq, setKq] = useState("");
  const logged = Object.keys(d.best);
  // 헬스 운동 목록 + 목록에 없는 예전 직접 입력 기록. 기록 있는 운동을 앞에
  const items = useMemo(() => {
    const gym = (db.exercises || []).filter((e) => exCat(e) === "gym").map((e) => ({ k: e.id, name: e.name, best: d.best[e.id] }));
    const extra = logged.filter((k) => !gym.some((g) => g.k === k)).map((k) => ({ k, name: d.names[k] || k, best: d.best[k] }));
    const all = sortMembers([...gym, ...extra]).map((x) => ({ ...x, fav: favs.includes(x.k) }));
    const fav = favs.map((id) => all.find((x) => x.k === id)).filter(Boolean);
    return [...fav, ...all.filter((x) => !x.fav && x.best), ...all.filter((x) => !x.fav && !x.best)];
  }, [db.exercises, d.best, favs]);
  const shown = kq.trim() ? items.filter((x) => x.name.toLowerCase().replace(/\s/g, "").includes(kq.trim().toLowerCase().replace(/\s/g, ""))) : items;
  const [src, setSrc] = useState(logged.length ? "log" : "manual");
  const [exId, setExId] = useState(logged.includes("bench") ? "bench" : logged[0] || "bench");
  const exNm = (items.find((x) => x.k === exId) || {}).name || d.names[exId] || "";
  const pick = (it) => { setExId(it.k); setSrc(it.best ? "log" : "manual"); };
  const [w, setW] = useState(80), [r, setR] = useState(8), [rir, setRir] = useState(0);
  const [formula, setFormula] = useState("avg");
  const [step, setStep] = useState(2.5);
  const b = d.best[exId];
  const useW = src === "log" && b ? +b.w : +w, useR = src === "log" && b ? +b.r + (+b.rir || 0) : +r + +rir;
  const one = e1rm(useW, useR, formula);
  const hist = (d.history[exId] || []).map((h) => ({ v: h.e1rm }));
  const band = (n) => (n <= 5 ? ["근력", "s1", "3–5분"] : n <= 12 ? ["근비대", "s2", "1.5–3분"] : ["근지구력", "s3", "30–90초"]);
  return (
    <>
      <Card title="운동 고르기" right={<span className="muted small">옆으로 넘겨서 선택</span>}>
        <input id="k-q" className="search" type="search" placeholder="운동 이름 검색" value={kq} onChange={(e) => setKq(e.target.value)} />
        {shown.length ? <ExStrip items={shown} value={exId} onPick={pick} /> : <p className="small muted" style={{ margin: "8px 0 12px" }}>"{kq}"에 맞는 헬스 운동이 없어요. 운동 복기 → 운동 목록에서 추가할 수 있어요.</p>}
        <Seg value={src} options={[["log", "운동 기록에서"], ["manual", "직접 입력"]]} onChange={setSrc} small />
        {src === "log" ? (b ? <div style={{ marginTop: 10 }}>
          <p className="small" id="k-best"><b>{exNm}</b> 최고 세트 {b.w}kg × {b.r}회 (<Term k="rir">RIR</Term> {b.rir}) · <span className="nw">{b.date}</span></p>
          {hist.length > 1 && <><p className="small muted">추정 1RM 추세</p><Spark data={hist} unit="kg" /></>}
        </div> : <p className="muted small" style={{ marginTop: 10 }}>{exNm ? `${exNm}은(는) 아직 헬스 기록이 없어요. 기록하기에서 남기거나 직접 입력으로 계산하세요.` : "헬스 기록이 없습니다."}</p>) : (<>
          {!b && exNm && <p className="muted small" style={{ marginTop: 10 }}>{exNm}은(는) 아직 헬스 기록이 없어요. 아래 중량·횟수로 계산합니다.</p>}
          <div className="form cols" style={{ marginTop: 10 }}>
            <Field label="중량 kg"><input id="k-w" type="number" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} /></Field>
            <Field label="반복 수"><input id="k-r" type="number" inputMode="numeric" value={r} onChange={(e) => setR(e.target.value)} /></Field>
            <Field label="RIR"><select id="k-rir" value={rir} onChange={(e) => setRir(+e.target.value)}>{[0, 1, 2, 3, 4].map((v) => <option key={v}>{v}</option>)}</select></Field>
          </div></>
        )}
        <div className="calc-opts" style={{ marginTop: 12 }}>
          <div className="field"><span>계산 공식</span>
            <Seg value={formula} options={[["avg", "평균"], ["epley", "Epley"], ["brzycki", "Brzycki"], ["lombardi", "Lombardi"]]} onChange={setFormula} small />
            <em id="k-fhelp">{tx(FORMULA_HELP[formula])}</em></div>
          <div className="field"><span>표 중량 단위</span>
            <Seg value={step} options={[[2.5, "2.5kg"], [1, "1kg"], [0.5, "0.5kg"]]} onChange={setStep} small />
            <em id="k-shelp">{STEP_HELP[step]}</em></div>
        </div>
      </Card>

      <Card title={src === "log" && b ? `추정 1RM · ${exNm}` : "추정 1RM"} right={<Cite ids={["epley", "brzycki", "lombardi", "lesuer", "reynolds"]} />}>
        <p className="big">{fmt(one, 1)}<small> kg</small></p>
        <div className="kv3">{Object.entries(F1RM).map(([k, f]) => <div key={k}><b>{fmt(e1rm(useW, useR, k), 1)}</b><span>{f.name}</span></div>)}</div>
        {useR > 10 && <p className="warn small">반복 수가 10회를 넘으면 공식 간 오차가 커집니다. 3–10회 기록으로 추정하는 것이 더 정확합니다.</p>}
      </Card>

      <Card title={src === "log" && b ? `1RM–20RM 강도표 · ${exNm}` : "1RM–20RM 강도표"} right={<Cite ids={["schoenLoad", "schoenRest", "acsm"]} />}>
        <div className="tbl-wrap"><table className="tbl rm">
          <thead><tr><th><Term k="rm">RM</Term></th><th>%<Term k="1rm">1RM</Term></th><th>중량</th><th>목적</th><th>세트 간 휴식</th></tr></thead>
          <tbody>{Array.from({ length: 20 }, (_, i) => i + 1).map((n) => { const p = pctFor(n, formula); const [nm, cls, rest] = band(n); return (
            <tr key={n} className={n === Math.round(useR) ? "hl" : ""}><td><b>{n}</b></td><td>{fmt(p * 100, 0)}%</td><td><b>{fmt(roundTo(one * p, step), step < 1 ? 1 : step === 2.5 ? 1 : 0)}</b></td><td><span className={"band " + cls}>{nm}</span></td><td className="muted">{rest}</td></tr>); })}</tbody>
        </table></div>
        <p className="small muted" style={{ marginTop: 8 }}>근비대는 실패 근처까지 수행하면 저중량(약 30% 1RM 이상)·고중량 모두 비슷하게 일어나고, 최대 근력은 고중량에서 더 크게 향상됩니다.</p>
      </Card>
    </>
  );
}

/* ───────── 심박 존 ───────── */
function HeartTab({ d, go }) {
  const { update } = useStore();
  const { m, zones, zoneMin } = d;
  const up = (k, v) => update((x) => { x.members = x.members.map((mm) => (mm.id === m.id ? { ...mm, [k]: v } : mm)); });
  const [tplKey, setTplKey] = useState(GOALS[m.goal].hr);
  useEffect(() => setTplKey(GOALS[m.goal].hr), [m.id, m.goal]);
  const tpl = HR_TEMPLATES[tplKey];
  const total = zoneMin.reduce((a, b) => a + b, 0);
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  return (
    <div className="stack">
      <Card title="최대심박수 설정" right={<Cite ids={["tanaka", "gellish", "fox", "karvonen"]} />}>
        <div className="srcgrid"><Source label="나이" value={ageText(d.age)} sub="회원 정보" onClick={() => go("member")} /><Source label="안정시 심박" value={m.restingHR ? `${m.restingHR} bpm` : "—"} sub="회원 정보" onClick={() => go("member")} /></div>
        <Field label="공식">
          <select id="h-f" value={m.hrFormula} onChange={(e) => up("hrFormula", e.target.value)}>
            <option value="tanaka">Tanaka (208 − 0.7×나이) · 권장</option>
            <option value="gellish">Gellish (207 − 0.7×나이)</option>
            <option value="fox">Fox (220 − 나이)</option>
            <option value="measured">실측값 사용</option>
          </select>
        </Field>
        {m.hrFormula === "measured" && <Field label="실측 최대심박"><input id="h-m" type="number" inputMode="numeric" value={m.hrMaxMeasured || ""} onChange={(e) => up("hrMaxMeasured", e.target.value)} /></Field>}
        <Field label="존 계산 방식">
          <Seg value={m.zoneMethod} options={[["karvonen", "여유심박(Karvonen)"], ["pct", "%최대심박"]]} onChange={(v) => up("zoneMethod", v)} small />
        </Field>
        <p className="big">{d.hrMax}<small> bpm 최대</small></p>
        <p className="small muted">{tx("220−나이 공식은 40세 이상에서 최대심박을 과소평가하는 경향이 있어 Tanaka 공식을 기본으로 씁니다. 안정시 심박이 있으면 개인차를 반영하는 Karvonen 방식이 더 정확합니다.")}</p>
      </Card>

      <Card title="Zone 1–5 가이드">
        {zones.map((z) => (
          <div key={z.z} className="zone">
            <div className="zbadge" style={{ background: ZCOL[z.z - 1] }}>Z{z.z}</div>
            <div className="zbody">
              <div className="row between"><b>{tx(z.name)}</b><b className="num nw">{z.from}–{z.to} bpm</b></div>
              <p className="small">{tx(z.use)}</p>
              <p className="small muted">{tx(`${z.feel} · ${Math.round(z.lo * 100)}–${Math.round(z.hi * 100)}% ${m.zoneMethod === "pct" ? "HRmax" : "HRR"} · ${z.fuel}`)}</p>
            </div>
          </div>
        ))}
      </Card>

      <Card title="주간 템플릿" right={<Cite ids={tpl.ref} />}>
        <select id="h-t" value={tplKey} onChange={(e) => setTplKey(e.target.value)}>{Object.entries(HR_TEMPLATES).map(([k, t]) => <option key={k} value={k}>{t.name}{k === GOALS[m.goal].hr ? " (목적 기반 추천)" : ""}</option>)}</select>
        <p className="small" style={{ marginTop: 8 }}>{tpl.note}</p>
        <p className="small muted">주 <span className="nw">{tpl.total[0]}–{tpl.total[1]}분</span> · 분포 {tpl.dist.map((p, i) => <React.Fragment key={i}>{i ? " / " : ""}<span className="nw">Z{i + 1} {p}%</span></React.Fragment>)}</p>
        <ul className="wlist" id="h-week">{tpl.week.map((t, i) => {
          const rest = t === "휴식";
          return <li key={i} className={"wrow" + (rest ? " rest" : "")}><b className={i >= 5 ? "we" : ""}>{days[i]}</b>
            <span className="wtxt">{t.split(/(Z\d)/).map((x, j) => (/^Z\d$/.test(x) ? <span key={j} className="zt" style={{ background: ZCOL[+x[1] - 1] }}>{x}</span> : x))}</span></li>;
        })}</ul>
      </Card>

      <Card title="이번 주 실제 존 분포" right={<span className="muted small">운동 일지 유산소 {total}분</span>}>
        {zoneMin.map((min, i) => {
          const goal = (tpl.total[0] * tpl.dist[i]) / 100;
          return <div key={i} className="zrow"><span className="zt" style={{ background: ZCOL[i] }}>Z{i + 1}</span><div className="grow"><Bar pct={goal ? min / goal : min ? 1 : 0} color={ZCOL[i]} /></div><span className="num small zval">{min}/{Math.round(goal)}분</span></div>;
        })}
        <p className="small muted" style={{ marginTop: 8 }}>운동 일지에 평균 심박과 시간을 기록하면 위 존 기준으로 자동 분류됩니다.</p>
      </Card>
    </div>
  );
}

/* ───────── 영양 ───────── */
function NutritionTab({ d, go }) {
  const { update } = useStore();
  const { m, body, energy } = d;
  const up = (k, v) => update((x) => { x.members = x.members.map((mm) => (mm.id === m.id ? { ...mm, [k]: v } : mm)); });
  if (!body || !energy) return <Card title="영양 가이드"><p className="muted">회원 탭에서 키·체중을 입력하면 계산됩니다.</p><button className="btn" onClick={() => go("member")}>신체 정보 입력</button></Card>;
  const e = energy, kc = [e.protein * 4, e.carb * 4, e.fat * 9], tot = kc[0] + kc[1] + kc[2];
  const meals = m.meals || 4;
  return (
    <div className="stack">
      <Card title="계산에 쓰인 데이터">
        <div className="srcgrid">
          <Source label={body.date ? `체중 · ${body.date.slice(5).replace("-", "/")}` : "체중"} value={`${body.weightKg}kg`} sub={`${sexShort(m.sex)} · ${ageText(d.age)} · ${body.heightCm}cm`} onClick={() => go("member")} />
          <Source label="제지방량" value={body.lbm ? `${fmt(body.lbm, 1)}kg` : "—"} sub={`체지방 ${body.bodyFatPct ?? "—"}%`} onClick={() => go("member")} />
          <Source label="운동 빈도" value={d.autoAct.label} sub={`최근 14일 ${d.recent14}회`} onClick={() => go("workout")} />
        </div>
        <Field label="운동 목적 (회원 정보와 동일)">
          <Seg value={m.goal} options={Object.entries(GOALS).map(([k, g]) => [k, g.name])} onChange={(v) => up("goal", v)} small />
        </Field>
        <Field label="식단 방식" hint="회원별로 저장 · 아래 탄단지와 홈 화면에 바로 반영">
          <Seg value={energy.style} options={Object.entries(DIET_STYLES).map(([k, s]) => [k, s.name])} onChange={(v) => up("dietStyle", v)} small />
        </Field>
        <Field label="활동계수">
          <div className="row wrap">
            <Seg value={m.activityMode} options={[["auto", `자동 ${d.autoAct.f}`], ["manual", "수동"]]} onChange={(v) => up("activityMode", v)} small />
            {m.activityMode === "manual" && <select id="n-act" value={m.activityManual} onChange={(ev) => up("activityManual", +ev.target.value)}>{ACTIVITY.map((a) => <option key={a.f} value={a.f}>{a.f} · {a.label}</option>)}</select>}
          </div>
        </Field>
      </Card>

      <Card title="에너지" right={<Cite ids={["mifflin", "katch"]} />}>
        <div className="kv3">
          <div className={e.method === "mifflin" ? "pick" : ""}><b>{fmt(e.mif)}</b><span><Term k="bmr">BMR</Term></span><span><Term k="mifflin">Mifflin</Term></span></div>
          <div className={e.method === "katch" ? "pick" : ""}><b>{fmt(e.km)}</b><span><Term k="bmr">BMR</Term></span><span><Term k="katch">Katch</Term></span></div>
          <div><b>{fmt(e.tdee)}</b><span><Term k="tdee">TDEE</Term></span><span>×{d.actFactor}</span></div>
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>{tx(e.method === "katch" ? "인바디 체지방률이 있어 제지방량 기반 Katch-McArdle 공식을 사용합니다. 근육량이 많거나 적은 회원에게 더 정확합니다." : "체지방률이 없어 성별·나이·키·체중 기반 Mifflin-St Jeor 공식을 사용합니다.")}</p>
      </Card>

      <Card title={`목표: ${e.goal.name} · ${DIET_STYLES[e.style].name}`} right={<Cite ids={m.goal === "diet" ? ["helms", "garthe", "redS"] : m.goal === "endurance" || m.goal === "maintain" ? ["jager", "morton"] : ["iraki", "morton"]} />} tone="feature">
        <p className="big">{fmt(e.target)}<small> kcal / 일</small></p>
        <p className="small">TDEE 대비 {e.goal.kcal > 0 ? "+" : ""}{Math.round(e.goal.kcal * 100)}% · 예상 체중 변화 주 {e.weekly > 0 ? "+" : ""}{fmt(e.weekly, 2)}kg ({fmt((e.weekly / body.weightKg) * 100, 2)}% 체중)</p>
        <div className="macros">
          {[["단백질", e.protein, kc[0], "var(--z4)", e.style === "keto" ? "목표량 유지 · 총열량 25% 이하" : e.style === "carnivore" ? "체중 kg당 2.0g 이상 · 총열량 35% 이하" : body.lbm ? `제지방 kg당 ${e.goal.protLbm}g` : `체중 kg당 ${e.goal.protKg}g`],
            ["탄수화물", e.carb, kc[1], "var(--z3)", e.style === "keto" ? "순탄수 20–50g · 케톤 상태 유지선" : e.style === "carnivore" ? "달걀·유제품 미량" : "남은 열량"],
            ["지방", e.fat, kc[2], "var(--z5)", e.style === "balanced" ? `${m.sex === "F" ? 30 : 25}% · 최소 ${m.sex === "F" ? 0.8 : 0.6}g/kg` : "남은 열량 (주 에너지원)"]].map(([n, g, k, c, why]) => (
            <div key={n} className="macro">
              <div className="row between"><b>{n}</b><span className="num"><b>{fmt(g)}</b>g · {Math.round((k / tot) * 100)}%</span></div>
              <Bar pct={k / tot} color={c} />
              <p className="small muted">{why} · 한 끼 {fmt(g / meals)}g</p>
            </div>))}
        </div>
        <Field label="하루 끼니 수"><Seg value={meals} options={[[3, "3끼"], [4, "4끼"], [5, "5끼"]]} onChange={(v) => up("meals", v)} small /></Field>
      </Card>

      <Card title="식단 방식별 비율 비교" right={<Cite ids={DIET_STYLES[e.style].ref} />}>
        <p className="small muted">같은 목표 열량 {fmt(e.target)}kcal 기준입니다. 눌러서 이 회원의 식단 방식으로 지정할 수 있습니다.</p>
        <div className="dstyles">
          {Object.entries(DIET_STYLES).map(([k, st]) => {
            const x = e.styles[k], kk = [x.carb * 4, x.protein * 4, x.fat * 9], t = kk[0] + kk[1] + kk[2];
            return (
              <button key={k} className={"dstyle" + (k === e.style ? " on" : "")} onClick={() => up("dietStyle", k)} aria-pressed={k === e.style}>
                <div className="row between"><b>{st.name}</b><span className="small muted">{st.ratio}</span></div>
                <div className="stackbar">{kk.map((v, i) => <i key={i} style={{ width: `${(v / t) * 100}%`, background: ["var(--z3)", "var(--z4)", "var(--z5)"][i] }} />)}</div>
                <div className="row between small num mrat"><span>탄 {fmt(x.carb)}g · {Math.round((kk[0] / t) * 100)}%</span><span>단 {fmt(x.protein)}g · {Math.round((kk[1] / t) * 100)}%</span><span>지 {fmt(x.fat)}g · {Math.round((kk[2] / t) * 100)}%</span></div>
              </button>
            );
          })}
        </div>
        <p className="small" style={{ marginTop: 10 }}><b>{DIET_STYLES[e.style].name} 계산 방식</b> · {DIET_STYLES[e.style].how}</p>
        <p className="small muted">추천 식품: {DIET_STYLES[e.style].foods}</p>
        {DIET_STYLES[e.style].cautions && <ul className="list small" style={{ marginTop: 8 }}>{DIET_STYLES[e.style].cautions.map((c, i) => <li key={i}>{tx(c)}</li>)}</ul>}
      </Card>

      <Card title={m.sex === "M" ? "남성 맞춤 체크" : m.sex === "F" ? "여성 맞춤 체크" : "맞춤 체크 (성별을 입력하면 더 정확해요)"}>
        <ul className="list">
          {m.sex === "F" && <li>지방 섭취를 체중 kg당 0.8g 이상, 총열량의 30% 수준으로 유지합니다. 지나친 저지방·저열량은 생리 주기와 골 건강에 영향을 줄 수 있습니다.</li>}
          {e.ea != null && <li className={e.ea < 30 ? "warn" : ""}>제지방 kg당 섭취 열량 {fmt(e.ea, 1)}kcal{tx(e.ea < 30 ? " · 운동 소비량을 빼면 에너지 가용성 30kcal/kg 미만 위험 구간입니다. 감량 폭을 줄이세요." : " (운동 소비량 제외 전 값, 30 미만이면 RED-S 위험)")}</li>}
          {e.floored && <li className="warn">계산된 목표가 기초대사량보다 낮아 BMR({fmt(e.bmr)}kcal)로 하한을 걸었습니다.</li>}
          {m.goal === "diet" && <li>감량 속도는 주당 체중의 0.5–1%가 근손실을 줄이는 범위입니다. 느린 감량(주 0.7%)이 제지방 유지에 유리했습니다.</li>}
          {(m.goal === "bulk" || m.goal === "lean") && <li>{m.goal === "bulk" ? "벌크업은 주당 체중의 0.25–0.5% 증가를 목표로 하고, 그 이상은 체지방 증가 비율이 커집니다." : "린매스업은 소폭 잉여(+5%)로 체지방 증가를 최소화하며 근육량을 늘립니다. 체중이 2주 이상 정체되면 100–150kcal 올립니다."}</li>}
          {body.cls && <li>현재 체지방률 「{body.cls}」 범위{(body.cls === "평균" || body.cls === "비만") && m.goal === "bulk" ? " · 벌크업 전에 감량 또는 린매스업을 먼저 고려하세요." : ""}</li>}
        </ul>
      </Card>
    </div>
  );
}

/* ───────── 회복 · 볼륨 ───────── */
function RecoveryTab({ d }) {
  const { recovery, weekly } = d;
  const fmtT = (dt) => `${dt.getMonth() + 1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, "0")}시`;
  return (
    <div className="stack">
      <Card title="부위별 회복" right={<Cite ids={["acsm", "macdougall"]} />}>
        <p className="small muted">{tx("기본 회복 시간: 큰 근육(가슴·등·하체) 72h, 어깨 60h, 작은 근육(팔·종아리·복근) 48h. 해당 세션에서 8세트 이상이면 +12h, 실패 근접(RIR 0–1)이면 +12h.")}</p>
        <div className="rgrid">
          {Object.entries(MUSCLES).map(([k, mu]) => {
            const r = recovery[k]; const pct = r ? r.pct : 1; const st = pct >= 1 ? "ok" : pct >= 0.7 ? "mid" : "low";
            return (
              <div key={k} className={"rcell " + st}>
                <div className="row between"><b>{mu.name}</b><span className="num small">{Math.round(pct * 100)}%</span></div>
                <Bar pct={pct} color={st === "ok" ? "var(--ok)" : st === "mid" ? "var(--z3)" : "var(--z5)"} />
                <p className="small muted rsub">{r ? (pct >= 1 ? <><span>준비됨</span><span>마지막 {r.last.slice(5).replace("-", "/")}</span></> : <><span>{fmtT(r.readyAt)} 이후</span><span>회복 {r.need}시간</span></>) : "최근 기록 없음"}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="최근 7일 부위별 볼륨" right={<Cite ids={["schoenVol", "schoenFreq"]} />}>
        <p className="small muted">{tx("주당 10세트 이상에서 근비대가 더 컸고, 같은 볼륨이면 주 2회 이상 나눠 하는 편이 유리했습니다. 보조근은 0.5세트로 계산합니다.")}</p>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>부위</th><th>세트</th><th style={{ width: "40%" }}>10–20세트 기준</th><th>빈도</th></tr></thead>
          <tbody>{Object.entries(weekly).map(([k, v]) => {
            const st = v.sets < 10 ? "low" : v.sets > 20 ? "high" : "ok";
            return <tr key={k}><td>{MUSCLES[k].name}</td><td className="num"><b>{fmt(v.sets, 1)}</b></td><td><Bar pct={v.sets / 20} color={st === "ok" ? "var(--ok)" : st === "low" ? "var(--z3)" : "var(--z5)"} /></td><td className={v.days.size < 2 ? "muted" : ""}>{v.days.size}회</td></tr>;
          })}</tbody>
        </table></div>
      </Card>

      <Card title="세트 간 휴식 가이드" right={<Cite ids={["schoenRest", "acsm"]} />}>
        <div className="tbl-wrap"><table className="tbl rest" id="rest-guide">
          <thead><tr><th>목적</th><th>강도</th><th>휴식</th></tr></thead>
          <tbody>
            <tr><td><span className="band s1">근력</span></td><td>1–5RM<small>85% 이상</small></td><td><b>3–5분</b></td></tr>
            <tr><td><span className="band s2">근비대</span></td><td>6–12RM<small>67–85%</small></td><td><b>2–3분</b><small><Term k="joint">다관절</Term></small><b>1–2분</b><small><Term k="joint">단관절</Term></small></td></tr>
            <tr><td><span className="band s3">근지구력</span></td><td>13–20RM+<small>67% 이하</small></td><td><b>30–90초</b></td></tr>
          </tbody>
        </table></div>
        <p className="small muted" style={{ marginTop: 8 }}>훈련된 남성에서 3분 휴식이 1분 휴식보다 근력·근비대 모두 더 큰 향상을 보였습니다.</p>
      </Card>
    </div>
  );
}

/* ───────── 근거 · 구조 시트 ───────── */
function Sheet({ ids, onClose }) {
  const [view, setView] = useState(ids ? "refs" : "arch");
  const list = ids || Object.keys(REFS);
  return (
    <div className="sheet" role="dialog" aria-modal="true">
      <div className="sheet-h"><Seg value={view} options={[["refs", ids ? "이 계산의 근거" : "전체 근거"], ["arch", "데이터 구조"]]} onChange={setView} small /><button className="btn ghost small" onClick={onClose}>닫기</button></div>
      <div className="sheet-b">
        {view === "refs" ? <ol className="refs">{list.map((k) => <li key={k}>{REFS[k]}</li>)}</ol> : <Arch />}
      </div>
    </div>
  );
}
function Arch() {
  return (
    <div className="stack">
      <p className="small">모든 데이터는 아래 세 테이블에만 저장되고, 화면에 보이는 값은 모두 여기서 계산됩니다. 같은 값을 두 탭에서 따로 입력하는 일이 없습니다.</p>
      <pre className="code">{`Member      id, name, sex, birth, phone, goal,
            restingHR, hrFormula, zoneMethod,
            activityMode, activityManual, meals, memo
Measurement id, memberId, date, heightCm, weightKg,
            smmKg, bodyFatPct          (인바디 1회 = 1행)
Session     id, memberId, date, time, trainerIds[], note
            entries[]  strength: exId | name+muscle, sets[{w, r, rir}]
                       cardio:   mode, minutes, avgHR
                       media[]:  사진·영상 파일 경로`}</pre>
      <div className="flow">
        <div><b>회원 정보</b><span>나이·성별·목적·안정시 심박</span></div>
        <div><b>인바디</b><span>키·체중·골격근·체지방</span></div>
        <div><b>운동 일지</b><span>세트·RIR·유산소 심박</span></div>
      </div>
      <ul className="list small">
        <li><b>영양</b> ← 성별·나이(회원) + 최신 인바디 + 최근 14일 운동 빈도(일지)</li>
        <li><b>심박 존</b> ← 나이·안정시 심박(회원). 일지의 유산소 평균 심박을 이 존으로 자동 분류</li>
        <li><b>1RM 계산기</b> ← 일지의 종목별 최고 세트(반복+RIR)</li>
        <li><b>회복</b> ← 일지의 마지막 부위별 세트 수·RIR·시각 (직접 입력한 운동은 고른 부위로)</li>
        <li><b>캘린더 · 운동 복기</b> ← 같은 운동 세션을 날짜별·종목별로 다시 보여줌 (따로 저장하지 않음)</li>
        <li><b>목적</b>은 회원 정보 한 곳에 저장. 영양 탭과 심박 템플릿이 같은 값을 읽고 수정합니다</li>
      </ul>
      <p className="small muted">서버(Supabase/Postgres)에는 회원·측정·운동 기록 표와 로그인 계정 profiles(마스터·강사·회원), 회원↔강사 연결(member_trainers), 수업 패키지(packages), 일정(schedules), 회원 요청(requests), 과제(assignments), 알림(notifications), 사진·영상 저장소가 있습니다. 강사는 연결된 회원만, 회원은 자기 기록과 연결된 강사의 일정·과제만 보고, 마스터는 전체를 봅니다. 세션 소진·남은 세션·과제 도장 같은 계산값은 서버에 저장하지 않고 일정에서 바로 계산합니다.</p>
    </div>
  );
}

/* ═════════ TEMPT FIT: 일정 · 수업 패키지 · 요청 · 과제 · 강사 · 알림 ═════════ */
const SCH_KIND = { lesson: "수업", bonus: "보강" };
const DAY_START = 5, DAY_END = 24; // 05시 ~ 00시
const WD_MON = ["월", "화", "수", "목", "금", "토", "일"];
const pad2 = (n) => String(n).padStart(2, "0");
const hm = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const dayOf = (d) => iso(d);
const atOf = (date, time) => new Date(`${date}T${time}:00`);
const addDays = (date, n) => { const x = new Date(date + "T00:00"); x.setDate(x.getDate() + n); return iso(x); };
const mondayOf = (date) => { const x = new Date(date + "T00:00"); const k = (x.getDay() + 6) % 7; x.setDate(x.getDate() - k); return iso(x); };
const mdText = (date) => `${+date.slice(5, 7)}.${+date.slice(8)}`;
const wdOf = (date) => WD[new Date(date + "T00:00").getDay()];
const schEnd = (s) => new Date(s.at.getTime() + s.minutes * 6e4);
// 상태: 예정 / 완료(시간 지남) / 노쇼 / 취소
const schState = (s, now = new Date()) => (s.status === "canceled" ? "canceled" : s.status === "noshow" ? "noshow" : schEnd(s) <= now ? "done" : "planned");
const STATE_NAME = { planned: "예정", done: "완료", noshow: "노쇼", canceled: "취소" };
// 30분 단위 시간 (05:00 ~ 23:30), 10분 단위 시간 (05:00 ~ 23:50)
const SLOTS30 = Array.from({ length: (DAY_END - DAY_START) * 2 }, (_, i) => `${pad2(DAY_START + (i >> 1))}:${i % 2 ? "30" : "00"}`);
const SLOTS10 = Array.from({ length: (DAY_END - DAY_START) * 6 }, (_, i) => `${pad2(DAY_START + Math.floor(i / 6))}:${pad2((i % 6) * 10)}`);
const MINUTES = Array.from({ length: 18 }, (_, i) => (i + 1) * 10);
const DEF_MIN = 50;
const shortName = (n) => { const t = (n || "").trim(); return /^[가-힣]{3,4}$/.test(t) ? t.slice(1) : t.slice(0, 3); };
// 월간 칸용 두 글자 이름 (김민수 → 민수, Alex → Al)
const tinyName = (n) => { const t = (n || "").trim(); return /^[가-힣]{3,}$/.test(t) ? t.slice(-2) : t.slice(0, 2); };
const memberName = (db, id) => db.members.find((m) => m.id === id)?.name || "회원";
// 탭 사이 명령: 받는 탭이 아직 안 떴으면 떴을 때 꺼내 씀
const tabCmd = (ev, detail) => { window["__" + ev] = detail; window.dispatchEvent(new CustomEvent(ev, { detail })); };
function useTabCmd(ev, fn) {
  useEffect(() => {
    const f = (e) => { window["__" + ev] = null; fn(e.detail || {}); };
    window.addEventListener(ev, f);
    const p = window["__" + ev]; if (p) { window["__" + ev] = null; fn(p); }
    return () => window.removeEventListener(ev, f);
  }, []);
}
const runSrv = async (srv, fn) => { await srv.flush(); const r = await fn(); if (r && r.error) { alertMsg(errMsg(r.error)); return null; } await srv.reload(); return r ? r.data ?? true : true; };

// 수업 패키지 계산 (저장하지 않음): 소진 = 취소되지 않은 수업 중 끝난 것, 예정 = 아직 안 끝난 것
function pkgStats(db, p, now = new Date()) {
  const ls = (db.schedules || []).filter((s) => s.packageId === p.id && s.kind === "lesson" && s.status !== "canceled");
  const used = ls.filter((s) => schEnd(s) <= now).length, future = ls.length - used;
  const expired = todayISO() > p.expiresOn;
  return { ...p, used, future, remain: Math.max(0, p.total - used), canBook: p.total - used - future, expired, daysLeft: Math.round((new Date(p.expiresOn + "T00:00") - new Date(todayISO() + "T00:00")) / 864e5) };
}
function pairStats(db, tid, mid) {
  const pk = (db.packages || []).filter((p) => p.trainerId === tid && p.memberId === mid).sort((a, b) => (a.startsOn + a.createdAt).localeCompare(b.startsOn + b.createdAt)).map((p) => pkgStats(db, p));
  const live = pk.filter((p) => !p.expired || p.future > 0);
  const sum = (k, L = live) => L.reduce((a, p) => a + p[k], 0);
  const loose = (db.schedules || []).filter((s) => s.trainerId === tid && s.memberId === mid && s.kind === "lesson" && s.status !== "canceled" && !s.packageId);
  const cur = pk.find((p) => !p.expired && p.canBook > 0) || pk[pk.length - 1] || null;
  return { list: pk, cur, total: sum("total"), used: sum("used"), future: sum("future"), remain: sum("remain"), canBook: sum("canBook") - loose.length, loose: loose.length, expiresOn: cur ? cur.expiresOn : null, expired: cur ? cur.expired : false };
}
// 과제 도장: 기한 안 제출 / 기한 뒤 제출 / 기한이 지나도 안 함
function asStamp(a) {
  if (a.doneAt) return dayOf(a.doneAt) <= a.dueOn ? "ok" : "late";
  return todayISO() > a.dueOn ? "miss" : null;
}
const STAMP = { ok: "제출 완료", late: "지연 제출", miss: "미제출" };
function Stamp({ k, small }) { return k ? <span className={"stamp st-" + k + (small ? " sm" : "")} data-stamp={k}>{STAMP[k]}</span> : null; }

// 화면에서 쓰는 일정 목록 (강사: 내가 잡은 일정, 회원: 내 일정)
function useMySchedules() {
  const { db, srv } = useStore();
  const role = srv?.profile.role;
  return useMemo(() => {
    const mine = new Set(db.members.filter((m) => m.mine).map((m) => m.id));
    const sch = (db.schedules || []).filter((s) => (role === "member" ? mine.has(s.memberId) : s.trainerId === srv.user.id));
    const asg = (db.assignments || []).filter((a) => (role === "member" ? mine.has(a.memberId) : a.trainerId === srv.user.id));
    return { sch, asg, mine };
  }, [db.schedules, db.assignments, db.members, role]);
}
function countIn(sch, asg, from, to) {
  const inR = (date) => date >= from && date <= to;
  const live = sch.filter((s) => s.status !== "canceled" && inR(dayOf(s.at)));
  return { lesson: live.filter((s) => s.kind === "lesson").length, bonus: live.filter((s) => s.kind === "bonus").length, task: asg.filter((a) => inR(a.dueOn)).length };
}
function Counts({ c }) {
  return <span className="cnts" id="cal-counts"><span className="cnt k-lesson">수업 <b>{c.lesson}</b></span><span className="cnt k-bonus">보강 <b>{c.bonus}</b></span><span className="cnt k-task">과제 <b>{c.task}</b></span></span>;
}

/* ───────── 일정 탭 ───────── */
function ScheduleTab() {
  const { db, srv } = useStore();
  const role = srv.profile.role;
  const { sch, asg, mine } = useMySchedules();
  const [view, setView] = useState(() => lsGet(KEY + ".calview") || "day");
  const [date, setDate] = useState(todayISO());
  const [open, setOpen] = useState(null);   // 일정 상세 (id 또는 {new})
  const [quick, setQuick] = useState(null); // 빈 칸 터치 {date, time}
  const [bulk, setBulk] = useState(null);   // 일괄 잡기 {memberId}
  useEffect(() => { lsSet(KEY + ".calview", view); }, [view]);
  useTabCmd("tempt-cal", (x) => { if (x.date) setDate(x.date); if (x.view) setView(x.view); if (x.open) setOpen(x.open); if (x.bulk) setBulk(x.bulk); });
  const pending = (db.requests || []).filter((r) => r.status === "pending" && (role === "member" ? mine.has(r.memberId) : r.trainerId === srv.user.id));
  const range = view === "day" ? [date, date] : view === "week" ? [mondayOf(date), addDays(mondayOf(date), 6)] : [date.slice(0, 8) + "01", iso(new Date(+date.slice(0, 4), +date.slice(5, 7), 0))];
  const shift = (n) => setDate(view === "day" ? addDays(date, n) : view === "week" ? addDays(date, 7 * n) : iso(new Date(+date.slice(0, 4), +date.slice(5, 7) - 1 + n, 1)));
  const title = view === "day" ? `${mdText(date)} ${wdOf(date)}요일` : view === "week" ? `${mdText(range[0])} – ${mdText(range[1])}` : `${+date.slice(0, 4)}년 ${+date.slice(5, 7)}월`;
  const tap = (d, t) => setQuick({ date: d, time: t });
  if (bulk) return <BulkSchedule memberId={bulk.memberId} onClose={() => setBulk(null)} />;
  const isMem = role === "member";
  const myMembers = sortMembers(db.members.filter((m) => !m.mine && (m.trainerIds || []).includes(srv.user.id)));
  return (
    <div className="stack">
      {pending.length > 0 && <RequestList list={pending} />}
      <Card title={title} right={<Counts c={countIn(sch, asg, range[0], range[1])} />}>
        <div className="calbar">
          <Seg value={view} options={[["day", "일간"], ["week", "주간"], ["month", "월간"]]} onChange={setView} small />
          <div className="row nowrap">
            <button className="btn ghost small" aria-label="이전" onClick={() => shift(-1)}>‹</button>
            <button className="btn ghost small" onClick={() => setDate(todayISO())}>오늘</button>
            <button className="btn ghost small" aria-label="다음" onClick={() => shift(1)}>›</button>
          </div>
        </div>
        {view === "day" && <TimeGrid days={[date]} sch={sch} asg={asg} onTap={tap} onOpen={setOpen} />}
        {view === "week" && <TimeGrid days={Array.from({ length: 7 }, (_, i) => addDays(range[0], i))} sch={sch} asg={asg} onTap={tap} onOpen={setOpen} onDay={(d) => { setDate(d); setView("day"); }} />}
        {view === "month" && <MonthGrid ym={date.slice(0, 7)} sch={sch} asg={asg} onDay={(d) => { setDate(d); setView("day"); }} />}
        <p className="small muted legend"><span className="lg k-lesson" />수업 <span className="lg k-bonus" />보강 <span className="lg k-task" />과제 기한 <span className="lg k-noshow" />노쇼 · {isMem ? "빈 칸을 누르면 수업 일정을 요청해요" : "빈 칸 위쪽은 정시, 아래쪽은 30분에 잡아요"}</p>
      </Card>
      {!isMem && <Card title="여러 날 한꺼번에 잡기">
        <p className="small muted">회원을 고르면 월간 달력이 떠요. 날짜를 누르고 시간을 고르는 걸 반복해 한 번에 등록해요.</p>
        <div className="chips" id="bulk-members">{myMembers.length ? myMembers.map((m) => <button key={m.id} type="button" className="chip tog" data-m={m.name} onClick={() => setBulk({ memberId: m.id })}>{m.name}</button>) : <span className="small muted">연결된 회원이 없어요. 회원 탭에서 먼저 등록하세요.</span>}</div>
      </Card>}
      {open && <ScheduleSheet id={open.id} draft={open.draft} onClose={() => setOpen(null)} />}
      {quick && (isMem ? <RequestBook date={quick.date} time={quick.time} onClose={() => setQuick(null)} /> : <QuickAdd date={quick.date} time={quick.time} onClose={() => setQuick(null)} onMore={(dft) => { setQuick(null); setOpen({ draft: dft }); }} />)}
    </div>
  );
}

/* 일간·주간: 왼쪽 시간 눈금 + 날짜 열. 칸 위쪽 반은 정시, 아래쪽 반은 30분 */
const HOUR_PX = 52;
function TimeGrid({ days, sch, asg, onTap, onOpen, onDay }) {
  const { db, srv } = useStore();
  const isMem = srv.profile.role === "member";
  const now = new Date(), today = todayISO();
  const hours = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);
  const week = days.length > 1;
  const top = (d) => ((d.getHours() + d.getMinutes() / 60) - DAY_START) * HOUR_PX;
  const busy = (date, t) => sch.some((s) => { const st = schState(s, now); if (st === "canceled" || st === "noshow") return false; const a = atOf(date, t); return a >= s.at && a < schEnd(s); });
  return (
    <div className={"tgrid" + (week ? " wk" : " dy")} id={week ? "cal-week" : "cal-day"}>
      <div className="tg-head">
        <span className="tg-gut" />
        {days.map((d) => { const due = asg.filter((a) => a.dueOn === d); return (
          <button type="button" key={d} className={"tg-dh" + (d === today ? " today" : "")} onClick={() => onDay && onDay(d)} disabled={!onDay} data-day={d}>
            {week ? <><b>{WD_MON[(new Date(d + "T00:00").getDay() + 6) % 7]}</b><span>{+d.slice(8)}</span></> : <b>{mdText(d)} {wdOf(d)}</b>}
            {due.length > 0 && <i className="tg-task" title="과제 기한">과제 {due.length}</i>}
          </button>); })}
      </div>
      <div className="tg-body" style={{ height: hours.length * HOUR_PX }}>
        <div className="tg-gut">{hours.map((h) => <span key={h} style={{ top: (h - DAY_START) * HOUR_PX }}>{pad2(h)}</span>)}<span style={{ top: hours.length * HOUR_PX }}>00</span></div>
        {days.map((d) => (
          <div key={d} className="tg-col" data-col={d}>
            {hours.map((h) => [0, 30].map((mm) => { const t = `${pad2(h)}:${mm ? "30" : "00"}`; return (
              <button type="button" key={t} className={"tg-slot" + (mm ? " half" : "")} style={{ top: (h - DAY_START) * HOUR_PX + (mm ? HOUR_PX / 2 : 0), height: HOUR_PX / 2 }}
                data-slot={`${d} ${t}`} aria-label={`${mdText(d)} ${t} ${isMem ? "수업 요청" : "일정 잡기"}`} disabled={busy(d, t)} onClick={() => onTap(d, t)} />); }))}
            {sch.filter((s) => dayOf(s.at) === d && s.status !== "canceled").map((s) => {
              const st = schState(s, now), h = Math.max(18, (s.minutes / 60) * HOUR_PX - 2);
              const nm = isMem ? PEOPLE[s.trainerId]?.name || "강사" : memberName(db, s.memberId);
              const req = (db.requests || []).some((r) => r.kind === "cancel" && r.scheduleId === s.id && r.status === "pending");
              return (
                <button type="button" key={s.id} className={`tg-ev k-${s.kind} s-${st}`} style={{ top: top(s.at) + 1, height: h }} data-sch={s.id} data-name={nm}
                  onClick={() => onOpen({ id: s.id })} aria-label={`${hm(s.at)} ${nm} ${SCH_KIND[s.kind]} ${STATE_NAME[st]}`}>
                  <b>{week ? tinyName(nm) : nm}</b>{!week && <span>{hm(s.at)}–{hm(schEnd(s))} · {SCH_KIND[s.kind]}{st !== "planned" ? " · " + STATE_NAME[st] : ""}</span>}
                  {week && <span>{hm(s.at)}</span>}{req && <i className="ev-req">취소 요청</i>}
                </button>);
            })}
            {d === today && now.getHours() >= DAY_START && <i className="tg-now" style={{ top: top(now) }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

/* 월간: 날짜 칸마다 그날 일정 미리보기, 누르면 일간으로 */
function MonthGrid({ ym, sch, asg, onDay, pick, picked }) {
  const { db, srv } = useStore();
  const isMem = srv.profile.role === "member";
  const [y, mo] = ym.split("-").map(Number);
  const lead = (new Date(y, mo - 1, 1).getDay() + 6) % 7, n = new Date(y, mo, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => `${ym}-${pad2(i + 1)}`)];
  const today = todayISO();
  return (
    <div className={"mgrid" + (pick ? " pick" : "") + (isMem ? "" : " byname")} id={pick ? "bulk-cal" : "cal-month"}>
      {WD_MON.map((w, i) => <div key={w} className={"cal-wd" + (i === 6 ? " sun" : i === 5 ? " sat" : "")}>{w}</div>)}
      {cells.map((c, i) => {
        if (!c) return <div key={"e" + i} />;
        const ss = sch.filter((s) => dayOf(s.at) === c && s.status !== "canceled").sort((a, b) => a.at - b.at);
        const due = asg.filter((a) => a.dueOn === c).length;
        const pk = picked && picked[c];
        return (
          <button type="button" key={c} data-date={c} className={"mcell" + (c === today ? " today" : "") + (ss.length ? " has" : "") + (pk ? " on" : "") + (pick && c < today ? " past" : "")}
            onClick={() => onDay(c)} aria-pressed={pick ? !!pk : undefined} aria-label={`${mo}월 ${+c.slice(8)}일, 일정 ${ss.length}개${due ? `, 과제 ${due}개` : ""}`}>
            <span className="n">{+c.slice(8)}</span>
            {pk ? <span className="mev k-pick">{pk.time || "?"}</span> : <>
              {ss.slice(0, 2).map((s) => <span key={s.id} className={`mev k-${s.kind} s-${schState(s)}`}><i>{hm(s.at)}</i><em> {tinyName(isMem ? PEOPLE[s.trainerId]?.name || "강사" : memberName(db, s.memberId))}</em></span>)}
              {ss.length > 2 && <span className="mev more">외 {ss.length - 2}개</span>}
              {due > 0 && <span className="mev k-task">과제 {due}</span>}
            </>}
          </button>
        );
      })}
    </div>
  );
}

/* 빈 칸 터치: 회원 고르고 바로 잡기 (정시·30분), 자세히는 상세 화면에서 10분 단위 */
function QuickAdd({ date, time, onClose, onMore }) {
  const { db, srv } = useStore();
  const members = sortMembers(db.members.filter((m) => !m.mine && (m.trainerIds || []).includes(srv.user.id)));
  const [mid, setMid] = useState(members.length === 1 ? members[0].id : ""), [kind, setKind] = useState("lesson"), [t, setT] = useState(time), [busy, setBusy] = useState(false), [q, setQ] = useState("");
  const shown = members.filter((m) => matchMember(m, q));
  const st = mid ? pairStats(db, srv.user.id, mid) : null;
  const go = async () => {
    setBusy(true);
    const ok = await runSrv(srv, () => srv.sb.from("schedules").insert({ id: "s" + uid(), member_id: mid, kind, starts_at: atOf(date, t).toISOString(), minutes: DEF_MIN }));
    setBusy(false); if (ok) { alertMsg(`${memberName(db, mid)} 회원 ${SCH_KIND[kind]}을 ${mdText(date)} ${t}에 잡았어요.`); onClose(); }
  };
  return (
    <Modal title={`${mdText(date)} ${wdOf(date)} · 일정 잡기`} onClose={onClose} id="quick-add">
      <div className="field"><span>시작 시각</span><Seg value={t} options={[t.slice(0, 3) + "00", t.slice(0, 3) + "30"].map((x) => [x, x])} onChange={setT} small /></div>
      <div className="field"><span>유형</span><Seg value={kind} options={[["lesson", "수업"], ["bonus", "보강 (세션 안 씀)"]]} onChange={setKind} small /></div>
      <div className="field"><span>회원</span>
        {members.length > 6 && <input className="search" type="search" placeholder="이름 검색" value={q} onChange={(e) => setQ(e.target.value)} />}
        <div className="chips" id="qa-members">{shown.map((m) => <button key={m.id} type="button" className={"chip tog" + (mid === m.id ? " on" : "")} aria-pressed={mid === m.id} data-m={m.name} onClick={() => setMid(m.id)}>{m.name}</button>)}</div>
        {!members.length && <em>연결된 회원이 없어요. 회원 탭에서 먼저 등록하세요.</em>}
      </div>
      {st && kind === "lesson" && <PkgLine st={st} />}
      <p className="small muted">수업 길이는 {DEF_MIN}분이에요. 10분 단위로 바꾸려면 ‘자세히’를 누르세요.</p>
      <div className="row wrap">
        <button className="btn" id="qa-go" disabled={!mid || busy} onClick={go}>{busy ? "잠시만요…" : "잡기"}</button>
        <button className="btn ghost small" id="qa-more" disabled={!mid} onClick={() => onMore({ memberId: mid, kind, date, time: t, minutes: DEF_MIN })}>자세히</button>
      </div>
    </Modal>
  );
}
function PkgLine({ st }) {
  if (!st.list.length) return <p className="small warn" id="pkg-line">아직 개설된 수업이 없어요. 회원 화면에서 ‘새 수업 개설하기’로 먼저 등록하세요. (잡을 수는 있어요)</p>;
  return <p className={"small" + (st.canBook <= 0 || st.expired ? " warn" : " muted")} id="pkg-line">
    <span className="nw">남은 세션 <b>{st.remain}</b></span> · <span className="nw">예정 {st.future}</span> · <span className="nw">더 잡을 수 있는 수 <b>{Math.max(0, st.canBook)}</b></span>{st.expiresOn ? <> · <span className="nw">기한 {mdText(st.expiresOn)}</span></> : ""}
    {st.canBook <= 0 ? " · 남은 세션보다 많이 잡게 돼요" : ""}{st.expired ? " · 기한이 지났어요" : ""}</p>;
}

/* 공용 창 */
function Modal({ title, onClose, children, id, wide }) {
  useEffect(() => { const f = (e) => e.key === "Escape" && onClose(); window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, []);
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className={"modal" + (wide ? " wide" : "")} id={id} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-h"><b>{title}</b><button className="btn ghost small" onClick={onClose}>닫기</button></div>
        <div className="modal-b">{children}</div>
      </div>
    </div>
  );
}

/* 일정 상세: 강사는 시각(10분 단위)·길이·유형·미리 할 운동·메모, 노쇼·취소·삭제. 회원은 보기와 취소 요청 */
function ScheduleSheet({ id, draft, onClose }) {
  const { db, srv } = useStore();
  const isMem = srv.profile.role === "member";
  const s0 = id ? (db.schedules || []).find((s) => s.id === id) : null;
  const [f, setF] = useState(() => s0 ? { memberId: s0.memberId, kind: s0.kind, date: dayOf(s0.at), time: hm(s0.at), minutes: s0.minutes, note: s0.note, plan: s0.plan || [] }
    : { memberId: draft.memberId, kind: draft.kind || "lesson", date: draft.date, time: draft.time, minutes: draft.minutes || DEF_MIN, note: "", plan: [] });
  const [busy, setBusy] = useState(false), [ask, setAsk] = useState(null), [reason, setReason] = useState("");
  if (id && !s0) return <Modal title="일정" onClose={onClose}><p className="small muted">지워진 일정이에요.</p></Modal>;
  const now = new Date();
  const st = s0 ? schState(s0, now) : "planned";
  const past = s0 && s0.at <= now;
  const mine = !isMem && (!s0 || s0.trainerId === srv.user.id || srv.master);
  const ro = isMem || !mine;
  const at = atOf(f.date, f.time);
  const clash = (db.schedules || []).filter((x) => x.id !== id && x.trainerId === (s0 ? s0.trainerId : srv.user.id) && x.status === "planned" && x.at < new Date(at.getTime() + f.minutes * 6e4) && schEnd(x) > at);
  const pst = !isMem && f.memberId ? pairStats(db, s0 ? s0.trainerId : srv.user.id, f.memberId) : null;
  const pkg = s0 && s0.packageId ? (db.packages || []).find((p) => p.id === s0.packageId) : null;
  const myReq = s0 && (db.requests || []).find((r) => r.kind === "cancel" && r.scheduleId === s0.id && r.status === "pending");
  const save = async () => {
    setBusy(true);
    const row = { member_id: f.memberId, kind: f.kind, starts_at: at.toISOString(), minutes: +f.minutes, note: f.note, plan: f.plan };
    const ok = await runSrv(srv, () => (s0 ? srv.sb.from("schedules").update(row).eq("id", s0.id) : srv.sb.from("schedules").insert({ id: "s" + uid(), ...row })));
    setBusy(false); if (ok) onClose();
  };
  const setStatus = async (status) => { setBusy(true); const ok = await runSrv(srv, () => srv.sb.from("schedules").update({ status }).eq("id", s0.id)); setBusy(false); setAsk(null); if (ok && status === "canceled") onClose(); };
  const del = async () => { setBusy(true); const ok = await runSrv(srv, () => srv.sb.from("schedules").delete().eq("id", s0.id)); setBusy(false); if (ok) { alertMsg(s0.kind === "lesson" && past ? "일정을 지웠어요. 소진된 세션이 복구됐어요." : "일정을 지웠어요."); onClose(); } };
  const askCancel = async () => { setBusy(true); const ok = await runSrv(srv, () => srv.sb.from("requests").insert({ kind: "cancel", schedule_id: s0.id, member_id: s0.memberId, trainer_id: s0.trainerId, reason: reason.trim() })); setBusy(false); if (ok) { alertMsg("취소 요청을 보냈어요. 강사가 확인하면 알려 드려요."); setAsk(null); } };
  const withdraw = async () => { setBusy(true); await runSrv(srv, () => srv.sb.from("requests").delete().eq("id", myReq.id)); setBusy(false); };
  const toLog = () => { window.dispatchEvent(new CustomEvent("tempt-go", { detail: { tab: "workout", log: { memberId: s0.memberId, preset: { date: dayOf(s0.at), time: hm(s0.at), entries: s0.plan || [], trainerIds: [s0.trainerId], note: s0.note || "", scheduleId: s0.id } } } })); onClose(); };
  const logged = s0 && db.sessions.some((x) => x.scheduleId === s0.id);
  const who = isMem ? (PEOPLE[s0.trainerId]?.name || "강사") + " 강사" : memberName(db, f.memberId) + " 회원";
  return (
    <Modal title={s0 ? `${who} · ${SCH_KIND[s0.kind]}` : `${who} · 새 일정`} onClose={onClose} id="sch-sheet" wide>
      {s0 && <p className="small" id="sch-state"><span className={`pill s-${st}`}>{STATE_NAME[st]}</span> {mdText(dayOf(s0.at))} {wdOf(dayOf(s0.at))} {hm(s0.at)}–{hm(schEnd(s0))} · {s0.minutes}분
        {s0.kind === "lesson" ? (st === "canceled" ? " · 세션 소진 안 됨" : st === "planned" ? " · 끝나면 세션 1회 소진" : " · 세션 1회 소진") : " · 보강은 세션을 쓰지 않아요"}</p>}
      {s0 && s0.cancelReason && <p className="small muted">취소 사유: {s0.cancelReason}</p>}
      {ro ? <>
        {s0.note && <p className="note">{s0.note}</p>}
        {(s0.plan || []).length > 0 && <div className="field"><span>미리 정한 운동</span>{s0.plan.map((en) => <EntryLine key={en.id} en={en} d={{ best: {} }} />)}</div>}
      </> : <div className="form">
        <Field label="유형"><Seg value={f.kind} options={[["lesson", "수업"], ["bonus", "보강 (세션 안 씀)"]]} onChange={(v) => setF({ ...f, kind: v })} small /></Field>
        <div className="form cols">
          <Field label="날짜"><input id="sch-date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="시작 (10분 단위)"><select id="sch-time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })}>{(SLOTS10.includes(f.time) ? SLOTS10 : [f.time, ...SLOTS10]).map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="길이"><select id="sch-min" value={f.minutes} onChange={(e) => setF({ ...f, minutes: +e.target.value })}>{MINUTES.map((x) => <option key={x} value={x}>{x}분</option>)}</select></Field>
        </div>
        {clash.length > 0 && <p className="small warn" id="sch-clash">같은 시간에 {clash.map((x) => memberName(db, x.memberId)).join(", ")} 회원 일정이 있어요.</p>}
        {pst && f.kind === "lesson" && <PkgLine st={pst} />}
        {pkg && <p className="small muted">이 수업은 {mdText(pkg.startsOn)}에 개설한 {pkg.total}회 수업에 들어가요.</p>}
        <Field label="메모"><textarea id="sch-note" rows="2" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="예: 하체 위주, 무릎 상태 확인" /></Field>
        <div className="field"><span>미리 할 운동 (수업 날 운동 기록으로 이어져요)</span><PlanEditor items={f.plan} onChange={(plan) => setF({ ...f, plan })} /></div>
        <button className="btn" id="sch-save" disabled={busy || !f.memberId} onClick={save}>{busy ? "저장 중…" : s0 ? "저장" : "일정 잡기"}</button>
      </div>}
      {s0 && !isMem && mine && <div className="sch-acts">
        {s0.kind === "lesson" && past && st !== "canceled" && <button className={"btn small" + (st === "noshow" ? " ghost" : " danger")} id="sch-noshow" disabled={busy} onClick={() => setStatus(st === "noshow" ? "planned" : "noshow")}>{st === "noshow" ? "노쇼 해제" : "노쇼 체크"}</button>}
        {past && st !== "canceled" && (logged ? <span className="small muted">운동 기록을 남겼어요.</span> : <button className="btn ghost small" id="sch-log" onClick={toLog}>운동 기록 쓰기</button>)}
        {!past && st === "planned" && (ask !== "cancel" ? <button className="btn ghost small" id="sch-cancel" onClick={() => setAsk("cancel")}>일정 취소</button>
          : <span className="row wrap"><span className="small">취소하면 세션이 소진되지 않아요.</span><button className="btn danger small" id="sch-cancel-ok" disabled={busy} onClick={() => setStatus("canceled")}>취소하기</button><button className="btn ghost small" onClick={() => setAsk(null)}>돌아가기</button></span>)}
        {ask !== "del" ? <button className="btn ghost small" id="sch-del" onClick={() => setAsk("del")}>삭제</button>
          : <span className="row wrap"><span className="small">{s0.kind === "lesson" && past && st !== "canceled" ? "지난 수업을 지우면 소진된 세션 1회가 복구돼요." : "이 일정을 지워요."}</span><button className="btn danger small" id="sch-del-ok" disabled={busy} onClick={del}>삭제</button><button className="btn ghost small" onClick={() => setAsk(null)}>돌아가기</button></span>}
        {st === "noshow" && <p className="small muted">노쇼로 표시된 시간에는 다른 수업을 새로 잡을 수 있어요. 노쇼도 세션 1회가 소진돼요.</p>}
      </div>}
      {s0 && isMem && st === "planned" && !past && <div className="sch-acts">
        {myReq ? <><span className="pill" id="req-pending">취소 요청됨 · 강사 확인 중</span><button className="btn ghost small" id="req-withdraw" disabled={busy} onClick={withdraw}>요청 거두기</button></>
          : ask !== "creq" ? <button className="btn ghost small" id="req-cancel" onClick={() => setAsk("creq")}>취소 요청</button>
          : <div className="form"><Field label="취소 사유 (선택)"><input id="req-reason" value={reason} maxLength={100} onChange={(e) => setReason(e.target.value)} placeholder="예: 야근이 잡혔어요" /></Field>
            <div className="row"><button className="btn small" id="req-send" disabled={busy} onClick={askCancel}>취소 요청 보내기</button><button className="btn ghost small" onClick={() => setAsk(null)}>돌아가기</button></div>
            <p className="small muted">강사가 승인하면 취소되고 세션은 소진되지 않아요. 확인 전에 수업 시간이 지나면 일단 소진되고, 나중에 승인되면 돌아와요.</p></div>}
      </div>}
    </Modal>
  );
}

/* 미리 할 운동 · 과제 운동 고르기: 운동 목록에서 여러 개 체크 → 운동마다 무게·횟수·RIR 세트 */
function PlanEditor({ items, onChange }) {
  const { db } = useStore();
  const [cat, setCat] = useState("gym"), [q, setQ] = useState(""), [pick, setPick] = useState(false);
  const has = new Set(items.map((x) => x.exId));
  const lib = sortMembers((db.exercises || []).filter((e) => exCat(e) === cat && (!q.trim() || e.name.replace(/\s/g, "").includes(q.replace(/\s/g, "")))));
  const toggle = (e) => {
    if (has.has(e.id)) onChange(items.filter((x) => x.exId !== e.id));
    else onChange([...items, { id: uid(), kind: "strength", cat: exCat(e), exId: e.id, name: e.name, mus: e.p || [], sets: [cat === "pilates" ? { w: "", r: 10, rir: 3 } : { w: e.eq === "맨몸" ? 0 : 20, r: 10, rir: 2 }] }]);
  };
  const setSets = (id, fn) => onChange(items.map((x) => (x.id === id ? { ...x, sets: fn(x.sets) } : x)));
  return (
    <div className="plan">
      {items.map((en) => (
        <div key={en.id} className="plan-e" data-plan={en.name}>
          <div className="row between"><b>{exName(en)}</b><button type="button" className="x" aria-label={en.name + " 빼기"} onClick={() => onChange(items.filter((x) => x.id !== en.id))}>×</button></div>
          <div className="sets-h"><span>세트</span><span>{en.cat === "pilates" ? "스프링·무게" : "무게 kg"}</span><span>횟수</span><span><Term k="rir">RIR</Term></span><span /></div>
          {en.sets.map((st, i) => (
            <div key={i} className="sets">
              <span>{i + 1}</span>
              <input type={en.cat === "pilates" ? "text" : "number"} inputMode="decimal" value={st.w} aria-label="무게" onChange={(e) => setSets(en.id, (a) => a.map((x, j) => (j === i ? { ...x, w: e.target.value } : x)))} />
              <input type="number" inputMode="numeric" value={st.r} aria-label="횟수" onChange={(e) => setSets(en.id, (a) => a.map((x, j) => (j === i ? { ...x, r: e.target.value } : x)))} />
              <select value={st.rir} aria-label="RIR" onChange={(e) => setSets(en.id, (a) => a.map((x, j) => (j === i ? { ...x, rir: +e.target.value } : x)))}>{[0, 1, 2, 3, 4, 5].map((k) => <option key={k}>{k}</option>)}</select>
              <button type="button" className="x" aria-label="세트 빼기" disabled={en.sets.length < 2} onClick={() => setSets(en.id, (a) => a.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
          <button type="button" className="linkbtn small" onClick={() => setSets(en.id, (a) => [...a, { ...a[a.length - 1] }])}>+ 세트</button>
        </div>
      ))}
      {!pick ? <button type="button" className="btn ghost small" id="plan-add" onClick={() => setPick(true)}>{items.length ? "+ 운동 더 고르기" : "+ 운동 고르기"}</button> : <div className="plan-pick">
        <div className="row wrap"><Seg value={cat} options={CATS} onChange={setCat} small /><input className="search grow" type="search" placeholder="운동 이름 검색" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <ul className="pick-list" id="plan-lib">{lib.map((e) => <li key={e.id}><label className="check" data-ex={e.name}><input type="checkbox" checked={has.has(e.id)} onChange={() => toggle(e)} /><span>{e.name}</span><small className="muted">{musNames(e.p)}{e.eq ? " · " + e.eq : ""}</small></label></li>)}</ul>
        <button type="button" className="btn small" id="plan-done" onClick={() => setPick(false)}>고르기 끝</button>
      </div>}
    </div>
  );
}

/* 요청 목록: 강사는 승인·거절(수업 일정 요청은 시각을 바꿔 승인 가능), 회원은 내 요청 상태와 거두기 */
function RequestList({ list }) {
  const { db, srv } = useStore();
  const isMem = srv.profile.role === "member";
  const [busy, setBusy] = useState(false), [alt, setAlt] = useState({});
  const decide = async (r, ok) => {
    setBusy(true);
    const a = alt[r.id];
    const args = { rid: r.id, ok, at: a ? atOf(a.date, a.time).toISOString() : null, mins: null };
    const res = await runSrv(srv, () => srv.sb.rpc("decide_request", args));
    setBusy(false); if (res) alertMsg(ok ? "승인했어요. 회원에게 알림이 갔어요." : "거절했어요.");
  };
  const withdraw = async (r) => { setBusy(true); await runSrv(srv, () => srv.sb.from("requests").delete().eq("id", r.id)); setBusy(false); };
  return (
    <Card title={isMem ? "보낸 요청" : "회원 요청"} tone="feature" right={<span className="pill bad" id="req-count">{list.length}건</span>}>
      <ul className="clist" id="req-list">{list.map((r) => { const s = r.scheduleId && (db.schedules || []).find((x) => x.id === r.scheduleId); const when = r.kind === "book" ? r.at : s ? s.at : null; const a = alt[r.id]; return (
        <li key={r.id} data-req={r.kind}>
          <span><b>{r.kind === "book" ? "수업 일정 요청" : "취소 요청"}</b> <span className="small">{isMem ? (PEOPLE[r.trainerId]?.name || "강사") + " 강사" : memberName(db, r.memberId) + " 회원"} · {when ? `${mdText(dayOf(when))} ${wdOf(dayOf(when))} ${hm(when)}` : ""}</span>
            {r.reason && <span className="small muted"> · “{r.reason}”</span>}</span>
          {isMem ? <button className="btn ghost small" disabled={busy} onClick={() => withdraw(r)}>거두기</button> : <span className="row wrap">
            {r.kind === "book" && (a ? <span className="row nowrap"><input type="date" value={a.date} onChange={(e) => setAlt({ ...alt, [r.id]: { ...a, date: e.target.value } })} /><select value={a.time} onChange={(e) => setAlt({ ...alt, [r.id]: { ...a, time: e.target.value } })}>{SLOTS10.map((x) => <option key={x}>{x}</option>)}</select></span>
              : <button className="btn ghost small" onClick={() => setAlt({ ...alt, [r.id]: { date: dayOf(r.at), time: hm(r.at) } })}>시각 바꾸기</button>)}
            <button className="btn small" data-act="approve" disabled={busy} onClick={() => decide(r, true)}>승인</button>
            <button className="btn ghost small" data-act="reject" disabled={busy} onClick={() => decide(r, false)}>거절</button></span>}
        </li>); })}</ul>
    </Card>
  );
}

/* 회원: 빈 칸·날짜를 눌러 수업 일정 요청 → 연결된 강사 중 고르기 */
function RequestBook({ date, time, trainerId, onClose }) {
  const { db, srv } = useStore();
  const me = db.members.find((m) => m.mine);
  const ts = (me?.trainerIds || []).map((id) => ({ id, name: PEOPLE[id]?.name || "강사" }));
  const [tid, setTid] = useState(trainerId || (ts.length === 1 ? ts[0].id : "")), [d, setD] = useState(date || todayISO()), [t, setT] = useState(time || "19:00"), [memo, setMemo] = useState(""), [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    const ok = await runSrv(srv, () => srv.sb.from("requests").insert({ kind: "book", member_id: me.id, trainer_id: tid, want_at: atOf(d, t).toISOString(), minutes: DEF_MIN, reason: memo.trim() }));
    setBusy(false); if (ok) { alertMsg("수업 일정 요청을 보냈어요. 강사가 승인하면 일정에 들어가요."); onClose(); }
  };
  return (
    <Modal title="수업 일정 요청하기" onClose={onClose} id="req-book">
      {!me ? <p className="small muted">먼저 강사 탭에서 강사와 연결하세요.</p> : !ts.length ? <p className="small muted">연결된 강사가 없어요. 강사 탭에서 초대 코드를 넣어 연결하세요.</p> : <>
        <div className="field"><span>강사</span><div className="chips" id="rb-trainers">{ts.map((x) => <button key={x.id} type="button" className={"chip tog" + (tid === x.id ? " on" : "")} aria-pressed={tid === x.id} data-t={x.name} onClick={() => setTid(x.id)}>{x.name}</button>)}</div></div>
        <div className="form cols">
          <Field label="날짜"><input id="rb-date" type="date" value={d} min={todayISO()} onChange={(e) => setD(e.target.value)} /></Field>
          <Field label="시각 (30분 단위)"><select id="rb-time" value={t} onChange={(e) => setT(e.target.value)}>{SLOTS30.map((x) => <option key={x}>{x}</option>)}</select></Field>
        </div>
        <Field label="메모 (선택)"><input id="rb-memo" value={memo} maxLength={100} onChange={(e) => setMemo(e.target.value)} placeholder="예: 하체 운동 원해요" /></Field>
        {tid && <PkgLine st={pairStats(db, tid, me.id)} />}
        <button className="btn" id="rb-send" disabled={!tid || busy || atOf(d, t) <= new Date()} onClick={send}>{busy ? "보내는 중…" : "요청 보내기"}</button>
      </>}
    </Modal>
  );
}

/* 월간 일괄 일정 잡기: 날짜 누르기 → 시간 고르기 반복 → 한꺼번에 등록 */
function BulkSchedule({ memberId, onClose }) {
  const { db, srv } = useStore();
  const m = db.members.find((x) => x.id === memberId);
  const [ym, setYm] = useState(todayISO().slice(0, 7));
  const [picked, setPicked] = useState({}); // date -> { time, kind }
  const [cur, setCur] = useState(null), [kind, setKind] = useState("lesson"), [mins, setMins] = useState(DEF_MIN), [busy, setBusy] = useState(false);
  const st = pairStats(db, srv.user.id, memberId);
  const { sch, asg } = useMySchedules();
  const today = todayISO();
  const dates = Object.keys(picked).sort();
  const lessons = dates.filter((d) => picked[d].time && picked[d].kind === "lesson").length;
  const ready = dates.filter((d) => picked[d].time);
  const tapDay = (d) => { if (d < today) return; if (picked[d] && cur === d) { const n = { ...picked }; delete n[d]; setPicked(n); setCur(null); return; } setPicked({ ...picked, [d]: picked[d] || { time: "", kind } }); setCur(d); };
  const setTime = (t) => { setPicked({ ...picked, [cur]: { ...picked[cur], time: t } }); };
  const taken = (d, t) => sch.some((s) => s.status === "planned" && dayOf(s.at) === d && atOf(d, t) < schEnd(s) && new Date(atOf(d, t).getTime() + mins * 6e4) > s.at);
  const shift = (n) => setYm(iso(new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + n, 1)).slice(0, 7));
  const late = st.expiresOn ? ready.filter((d) => d > st.expiresOn && picked[d].kind === "lesson") : [];
  const go = async () => {
    setBusy(true);
    const rows = ready.map((d) => ({ id: "s" + uid(), member_id: memberId, kind: picked[d].kind, starts_at: atOf(d, picked[d].time).toISOString(), minutes: mins }));
    const n = await runSrv(srv, () => srv.sb.rpc("bulk_schedule", { rows }));
    setBusy(false); if (n) { alertMsg(`${m?.name || "회원"} 회원 일정 ${rows.length}개를 한꺼번에 잡았어요.`); onClose(); }
  };
  return (
    <div className="stack" id="bulk">
      <button className="btn ghost small back" onClick={onClose}>‹ 일정으로</button>
      <Card title={`${m?.name || "회원"} 회원 · 일정 잡기`} right={<span className="muted small">{ready.length}개 담음</span>}>
        <PkgLine st={st} />
        <div className="row wrap">
          <Seg value={kind} options={[["lesson", "수업"], ["bonus", "보강"]]} onChange={(v) => { setKind(v); if (cur) setPicked({ ...picked, [cur]: { ...picked[cur], kind: v } }); }} small />
          <select id="bulk-min" value={mins} onChange={(e) => setMins(+e.target.value)} aria-label="수업 길이">{MINUTES.map((x) => <option key={x} value={x}>{x}분</option>)}</select>
        </div>
        <div className="calbar"><b>{+ym.slice(0, 4)}년 {+ym.slice(5)}월</b><div className="row nowrap"><button className="btn ghost small" aria-label="이전 달" onClick={() => shift(-1)}>‹</button><button className="btn ghost small" aria-label="다음 달" onClick={() => shift(1)}>›</button></div></div>
        <div className="bulkwrap">
          <MonthGrid ym={ym} sch={sch} asg={asg} onDay={tapDay} pick picked={picked} />
          {cur && <div className="slotpick" id="bulk-times">
            <p className="small"><b>{mdText(cur)} {wdOf(cur)}</b> 시간을 고르세요 <button type="button" className="linkbtn small" onClick={() => { const n = { ...picked }; delete n[cur]; setPicked(n); setCur(null); }}>이 날 빼기</button></p>
            <div className="slots">{SLOTS30.map((t) => <button key={t} type="button" className={"slot" + (picked[cur]?.time === t ? " on" : "")} data-t={t} disabled={taken(cur, t)} aria-pressed={picked[cur]?.time === t} onClick={() => setTime(t)}>{t}</button>)}</div>
          </div>}
        </div>
        <p className="small muted">날짜를 누르면 05시부터 00시까지 30분 단위 시간이 나와요. 이미 일정이 있는 시간은 고를 수 없어요. 고른 날짜를 한 번 더 누르면 빠져요.</p>
      </Card>
      {dates.length > 0 && <Card title="담은 일정">
        <ul className="clist" id="bulk-list">{dates.map((d) => <li key={d}><span><b>{mdText(d)} {wdOf(d)}</b> <span className="small">{picked[d].time || "시간을 고르세요"} · {SCH_KIND[picked[d].kind]}</span></span>
          <span className="row nowrap"><button className="btn ghost small" onClick={() => setCur(d)}>시간</button><button className="x" aria-label="빼기" onClick={() => { const n = { ...picked }; delete n[d]; setPicked(n); if (cur === d) setCur(null); }}>×</button></span></li>)}</ul>
        {lessons > Math.max(0, st.canBook) && <p className="small warn" id="bulk-over">더 잡을 수 있는 수({Math.max(0, st.canBook)}회)보다 수업을 {lessons - Math.max(0, st.canBook)}회 더 담았어요. 그래도 잡을 수 있어요.</p>}
        {late.length > 0 && <p className="small warn">소진 기한({mdText(st.expiresOn)})이 지난 날짜가 {late.length}개 있어요.</p>}
        <button className="btn" id="bulk-go" disabled={busy || !ready.length || ready.length !== dates.length} onClick={go}>{busy ? "등록 중…" : `한꺼번에 등록 (${ready.length}개)`}</button>
        {ready.length !== dates.length && <p className="small muted">시간을 안 고른 날짜가 있어요.</p>}
      </Card>}
    </div>
  );
}

/* 수업 패키지 (강사, 회원 정보 화면): 새 수업 개설하기 · 남은 세션 · 기한 */
function PackageCard({ m }) {
  const { db, srv } = useStore();
  const st = pairStats(db, srv.user.id, m.id);
  const [form, setForm] = useState(null), [busy, setBusy] = useState(false), [edit, setEdit] = useState(null), [ask, setAsk] = useState(null);
  const startNew = () => setForm({ total: 10, perDays: 7, startsOn: todayISO(), expiresOn: addDays(todayISO(), 70), auto: true, note: "" });
  const upd = (k, v) => setForm((f) => { const n = { ...f, [k]: v }; if (k !== "expiresOn" && n.auto && +n.total > 0 && +n.perDays > 0) n.expiresOn = addDays(n.startsOn, +n.total * +n.perDays); if (k === "expiresOn") n.auto = false; return n; });
  const create = async () => {
    setBusy(true);
    const ok = await runSrv(srv, () => srv.sb.from("packages").insert({ id: "p" + uid(), member_id: m.id, total: +form.total, per_days: +form.perDays, starts_on: form.startsOn, expires_on: form.expiresOn, note: form.note }));
    setBusy(false); if (ok) { setForm(null); alertMsg(`${form.total}회 수업을 개설했어요.`); }
  };
  const extend = async (p) => { setBusy(true); const ok = await runSrv(srv, () => srv.sb.from("packages").update({ expires_on: edit.expiresOn, total: +edit.total }).eq("id", p.id)); setBusy(false); if (ok) setEdit(null); };
  const del = async (p) => { setBusy(true); await runSrv(srv, () => srv.sb.from("packages").delete().eq("id", p.id)); setBusy(false); setAsk(null); };
  return (
    <Card title="수업 · 세션" right={<button className="btn small" id="pkg-new" onClick={startNew}>+ 새 수업 개설하기</button>}>
      {st.list.length ? <div className="kv3" id="pkg-sum">
        <div><b>{st.remain}</b><span>남은 세션</span></div>
        <div><b>{st.future}</b><span>예정 수업</span></div>
        <div><b className={st.canBook <= 0 ? "warnc" : ""}>{Math.max(0, st.canBook)}</b><span>더 잡을 수 있는 수</span></div>
      </div> : <p className="small muted">아직 개설된 수업이 없어요. 수업 수와 기한을 정해 개설하면 수업 일정이 지날 때마다 1회씩 자동으로 소진돼요.</p>}
      {form && <div className="pkgform" id="pkg-form">
        <div className="form cols">
          <Field label="수업 수"><input id="pkg-total" type="number" inputMode="numeric" min="1" value={form.total} onChange={(e) => upd("total", e.target.value)} /></Field>
          <Field label="1회당 소진 기한 (일)"><input id="pkg-per" type="number" inputMode="numeric" min="1" value={form.perDays} onChange={(e) => upd("perDays", e.target.value)} /></Field>
          <Field label="시작일"><input id="pkg-start" type="date" value={form.startsOn} onChange={(e) => upd("startsOn", e.target.value)} /></Field>
          <Field label="소진 기한" hint={form.auto ? `${form.total}회 × ${form.perDays}일` : "직접 정함"}><input id="pkg-exp" type="date" value={form.expiresOn} onChange={(e) => upd("expiresOn", e.target.value)} /></Field>
        </div>
        <Field label="메모 (선택)"><input id="pkg-note" value={form.note} onChange={(e) => upd("note", e.target.value)} placeholder="예: 11월 재등록" /></Field>
        <div className="row"><button className="btn" id="pkg-save" disabled={busy || !(+form.total > 0) || !form.expiresOn} onClick={create}>등록</button><button className="btn ghost small" onClick={() => setForm(null)}>취소</button></div>
      </div>}
      {st.list.length > 0 && <ul className="clist pkglist" id="pkg-list">{st.list.slice().reverse().map((p) => <li key={p.id} data-pkg={p.total}>
        <span><b>{p.total}회</b> <span className="small">· 1회당 {p.perDays}일 · {mdText(p.startsOn)}~{mdText(p.expiresOn)} · 소진 {p.used} · 남은 {p.remain}</span>
          {p.expired ? <span className="pill bad">기한 만료</span> : p.daysLeft <= 7 ? <span className="pill">D-{p.daysLeft}</span> : null}{p.note && <span className="small muted"> · {p.note}</span>}</span>
        {edit && edit.id === p.id ? <span className="row wrap"><input type="number" aria-label="수업 수" value={edit.total} onChange={(e) => setEdit({ ...edit, total: e.target.value })} style={{ width: 64 }} /><input type="date" aria-label="소진 기한" value={edit.expiresOn} onChange={(e) => setEdit({ ...edit, expiresOn: e.target.value })} /><button className="btn small" disabled={busy} onClick={() => extend(p)}>저장</button><button className="btn ghost small" onClick={() => setEdit(null)}>취소</button></span>
          : ask === p.id ? <span className="row wrap"><span className="small">이 수업 묶음을 지워요. 붙어 있던 일정은 남아요.</span><button className="btn danger small" disabled={busy} onClick={() => del(p)}>삭제</button><button className="btn ghost small" onClick={() => setAsk(null)}>취소</button></span>
          : <span className="row nowrap"><button className="btn ghost small" onClick={() => setEdit({ id: p.id, total: p.total, expiresOn: p.expiresOn })}>{p.expired ? "기한 연장" : "고치기"}</button><button className="x" aria-label="삭제" onClick={() => setAsk(p.id)}>×</button></span>}
      </li>)}</ul>}
      {st.expired && st.remain > 0 && <p className="small warn" id="pkg-expired">소진 기한이 지났는데 세션이 {st.remain}회 남아 있어요. 기한을 연장할지 정해 주세요.</p>}
      {st.loose > 0 && <p className="small muted">개설된 수업 밖에서 잡은 수업이 {st.loose}회 있어요.</p>}
      <div className="row wrap">
        <button className="btn ghost small" id="m-bulk" onClick={() => window.dispatchEvent(new CustomEvent("tempt-go", { detail: { tab: "schedule", cal: { bulk: { memberId: m.id } } } }))}>일정 잡기 (여러 날)</button>
        <button className="btn ghost small" id="m-assign" onClick={() => window.dispatchEvent(new CustomEvent("tempt-go", { detail: { tab: "assign", assign: { memberId: m.id } } }))}>과제 주기</button>
      </div>
    </Card>
  );
}

/* ───────── 과제 탭 ───────── */
function AssignTab() {
  const { db, srv } = useStore();
  const isMem = srv.profile.role === "member";
  const [form, setForm] = useState(null), [open, setOpen] = useState(null), [filter, setFilter] = useState("all");
  useTabCmd("tempt-assign", (x) => { if (x.memberId) setForm({ memberId: x.memberId }); if (x.open) setOpen(x.open); });
  const { asg } = useMySchedules();
  const sorted = asg.slice().sort((a, b) => (!!a.doneAt - !!b.doneAt) || a.dueOn.localeCompare(b.dueOn));
  const list = sorted.filter((a) => filter === "all" || (filter === "todo" ? !a.doneAt : !!a.doneAt));
  if (form && !isMem) return <AssignForm init={form} onClose={() => setForm(null)} />;
  const a0 = open && asg.find((a) => a.id === open);
  return (
    <div className="stack">
      {!isMem && <button className="btn" id="as-new" onClick={() => setForm({})}>+ 과제 주기</button>}
      <Card title={isMem ? "내 과제" : "보낸 과제"} right={<Seg value={filter} options={[["all", "전체"], ["todo", isMem ? "할 것" : "미제출"], ["done", "제출"]]} onChange={setFilter} small />}>
        {!list.length && <p className="small muted" id="as-empty">{isMem ? "받은 과제가 없어요. 강사가 과제를 보내면 알림이 와요." : "아직 보낸 과제가 없어요."}</p>}
        <ul className="aslist" id="as-list">{list.map((a) => { const k = asStamp(a), dl = Math.round((new Date(a.dueOn + "T00:00") - new Date(todayISO() + "T00:00")) / 864e5); return (
          <li key={a.id} data-as={a.title}>
            <button type="button" className="asrow" onClick={() => setOpen(a.id)}>
              <span className="grow"><b>{a.title || "운동 과제"}</b><span className="small muted">{isMem ? (PEOPLE[a.trainerId]?.name || "강사") + " 강사" : memberName(db, a.memberId) + " 회원"} · 운동 {a.items.length}개 · 기한 {mdText(a.dueOn)}{!a.doneAt && dl >= 0 ? ` · D-${dl}` : ""}</span></span>
              <Stamp k={k} small />
            </button>
          </li>); })}</ul>
      </Card>
      {a0 && <AssignSheet a={a0} onClose={() => setOpen(null)} onEdit={() => { setOpen(null); setForm({ edit: a0 }); }} />}
    </div>
  );
}
function AssignForm({ init, onClose }) {
  const { db, srv } = useStore();
  const e0 = init.edit;
  const members = sortMembers(db.members.filter((m) => !m.mine && (m.trainerIds || []).includes(srv.user.id)));
  const [f, setF] = useState(() => e0 ? { memberId: e0.memberId, title: e0.title, items: e0.items, dueOn: e0.dueOn, note: e0.note } : { memberId: init.memberId || (members.length === 1 ? members[0].id : ""), title: "", items: [], dueOn: addDays(todayISO(), 3), note: "" });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const row = { member_id: f.memberId, title: f.title.trim() || "운동 과제", items: f.items, due_on: f.dueOn, note: f.note.trim() };
    const ok = await runSrv(srv, () => (e0 ? srv.sb.from("assignments").update(row).eq("id", e0.id) : srv.sb.from("assignments").insert({ id: "a" + uid(), ...row })));
    setBusy(false); if (ok) { alertMsg(e0 ? "과제를 고쳤어요." : `${memberName(db, f.memberId)} 회원에게 과제를 보냈어요.`); onClose(); }
  };
  return (
    <div className="stack" id="as-form">
      <button className="btn ghost small back" onClick={onClose}>‹ 과제 목록</button>
      <Card title={e0 ? "과제 고치기" : "과제 주기"}>
        <div className="form">
          {!e0 && <div className="field"><span>회원</span><div className="chips" id="as-members">{members.map((m) => <button key={m.id} type="button" className={"chip tog" + (f.memberId === m.id ? " on" : "")} aria-pressed={f.memberId === m.id} data-m={m.name} onClick={() => setF({ ...f, memberId: m.id })}>{m.name}</button>)}</div>
            {!members.length && <em>연결된 회원이 없어요.</em>}</div>}
          <div className="form cols">
            <Field label="제목"><input id="as-title" value={f.title} maxLength={40} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="예: 하체 홈트" /></Field>
            <Field label="기한"><input id="as-due" type="date" value={f.dueOn} onChange={(e) => setF({ ...f, dueOn: e.target.value })} /></Field>
          </div>
          <div className="field"><span>운동 (여러 개 체크 → 무게·횟수·RIR)</span><PlanEditor items={f.items} onChange={(items) => setF({ ...f, items })} /></div>
          <Field label="설명 (선택)"><textarea id="as-note" rows="2" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="예: 세트 사이 1분 휴식, 무릎이 아프면 중단" /></Field>
          <button className="btn" id="as-save" disabled={busy || !f.memberId || !f.items.length || !f.dueOn} onClick={save}>{busy ? "보내는 중…" : e0 ? "저장" : "과제 보내기"}</button>
        </div>
      </Card>
    </div>
  );
}
function AssignSheet({ a, onClose, onEdit }) {
  const { db, srv } = useStore();
  const isMem = srv.profile.role === "member";
  const k = asStamp(a);
  const [checks, setChecks] = useState(() => a.items.map(() => !!a.doneAt)), [pics, setPics] = useState([]), [memo, setMemo] = useState(""), [busy, setBusy] = useState(false), [ask, setAsk] = useState(false), [stampKey, setStampKey] = useState(0);
  const allDone = checks.every(Boolean);
  const submit = async () => {
    setBusy(true);
    const ok = await runSrv(srv, () => srv.sb.rpc("submit_assignment", { aid: a.id, pics, memo: memo.trim() }));
    setBusy(false); if (ok) setStampKey((n) => n + 1);
  };
  const del = async () => { setBusy(true); const ok = await runSrv(srv, () => srv.sb.from("assignments").delete().eq("id", a.id)); setBusy(false); if (ok) onClose(); };
  return (
    <Modal title={a.title || "운동 과제"} onClose={onClose} id="as-sheet" wide>
      <div className="as-top">
        <p className="small">{isMem ? (PEOPLE[a.trainerId]?.name || "강사") + " 강사" : memberName(db, a.memberId) + " 회원"} · 기한 <b>{mdText(a.dueOn)} {wdOf(a.dueOn)}</b>{a.doneAt ? ` · 제출 ${mdText(dayOf(a.doneAt))} ${hm(a.doneAt)}` : ""}</p>
        <Stamp key={stampKey} k={k} />
      </div>
      {a.note && <p className="note">{a.note}</p>}
      <ul className="as-items" id="as-items">{a.items.map((en, i) => <li key={en.id || i}>
        <label className="check"><input type="checkbox" disabled={!isMem || !!a.doneAt} checked={checks[i]} onChange={() => setChecks(checks.map((c, j) => (j === i ? !c : c)))} />
          <span><b>{exName(en)}</b> <span className="small muted">{en.sets.length}세트 · {en.sets.map((s) => `${s.w !== "" && s.w != null ? s.w + (en.cat === "pilates" ? "" : "kg") + "×" : ""}${s.r}회`).join(", ")} · RIR {en.sets.map((s) => s.rir).join("/")}</span></span></label>
      </li>)}</ul>
      {a.doneAt ? <>
        {a.memberNote && <p className="note">회원 메모: {a.memberNote}</p>}
        <MediaThumbs items={a.photos} />
        {isMem && <p className="small muted">제출한 과제는 운동 기록에도 들어갔어요.</p>}
      </> : isMem ? <div className="form">
        <div className="field"><span>인증 사진</span><MediaThumbs items={pics} onRemove={(i) => setPics(pics.filter((_, j) => j !== i))} /><MediaPicker memberId={a.memberId} onAdd={(it) => setPics([...pics, it])} label="사진 첨부" /></div>
        <Field label="한 줄 메모 (선택)"><input id="as-memo" value={memo} maxLength={100} onChange={(e) => setMemo(e.target.value)} placeholder="예: 마지막 세트 힘들었어요" /></Field>
        <button className="btn" id="as-submit" disabled={busy || !allDone} onClick={submit}>{busy ? "제출 중…" : allDone ? "완료 · 제출하기" : "운동을 모두 체크하면 제출할 수 있어요"}</button>
        {todayISO() > a.dueOn && <p className="small warn">기한이 지났어요. 지금 제출하면 ‘지연 제출’ 도장이 찍혀요.</p>}
      </div> : <p className="small muted">회원이 제출하면 알림이 와요.</p>}
      {!isMem && a.trainerId === srv.user.id && <div className="row wrap sch-acts">
        {!a.doneAt && <button className="btn ghost small" onClick={onEdit}>고치기</button>}
        {!ask ? <button className="btn ghost small" onClick={() => setAsk(true)}>삭제</button> : <><span className="small">과제를 지워요.</span><button className="btn danger small" disabled={busy} onClick={del}>삭제</button><button className="btn ghost small" onClick={() => setAsk(false)}>취소</button></>}
      </div>}
    </Modal>
  );
}

/* ───────── 회원: 강사 탭 (연결된 강사 목록 → 강사 프로필) ───────── */
function TrainersTab() {
  const { db, srv } = useStore();
  const me = db.members.find((m) => m.mine);
  const [open, setOpen] = useState(null), [req, setReq] = useState(null);
  const ts = sortMembers((me?.trainerIds || []).map((id) => ({ id, name: PEOPLE[id]?.name || "강사", p: PEOPLE[id] || {} })));
  const now = new Date();
  const next = (tid) => (db.schedules || []).filter((s) => s.trainerId === tid && me && s.memberId === me.id && s.status === "planned" && s.at > now).sort((a, b) => a.at - b.at)[0];
  const t0 = open && ts.find((t) => t.id === open);
  if (t0) return <TrainerProfile t={t0} me={me} onBack={() => setOpen(null)} />;
  return (
    <div className="stack">
      <Card title={`내 강사 · ${ts.length}명`}>
        {ts.length ? <ul className="mlist" id="tr-list">{ts.map((t) => { const st = pairStats(db, t.id, me.id), nx = next(t.id); return (
          <li key={t.id} className="mlrow" data-trainer={t.name}>
            <button type="button" className="minfo" onClick={() => setOpen(t.id)}>
              <span className="mname">{t.name}</span>
              <span className="muted small ml1">{st.list.length ? `남은 세션 ${st.remain}회` : "개설된 수업 없음"}</span>
              <span className="muted small ml1">{nx ? `다음 수업 ${mdText(dayOf(nx.at))} ${hm(nx.at)}` : "잡힌 수업 없음"}</span>
            </button>
            <div className="mbtns"><button type="button" className="btn small" onClick={() => setOpen(t.id)}>프로필</button><button type="button" className="btn ghost small" onClick={() => setReq(t.id)}>수업 요청</button></div>
          </li>); })}</ul> : <p className="small muted">아직 연결된 강사가 없어요. 강사에게 받은 초대 코드를 아래에 넣으세요.</p>}
      </Card>
      <ClaimCard />
      {req && <RequestBook trainerId={req} onClose={() => setReq(null)} />}
    </div>
  );
}
function TrainerProfile({ t, me, onBack }) {
  const { db, srv } = useStore();
  const tp = t.p.tprofile || {};
  const st = pairStats(db, t.id, me.id);
  const [req, setReq] = useState(false), [ask, setAsk] = useState(false), [busy, setBusy] = useState(false);
  const now = new Date();
  const upcoming = (db.schedules || []).filter((s) => s.trainerId === t.id && s.memberId === me.id && s.status === "planned" && s.at > now).sort((a, b) => a.at - b.at).slice(0, 5);
  const unlink = async () => { setBusy(true); const ok = await runSrv(srv, () => srv.sb.rpc("unlink_trainer", { mid: me.id, tid: t.id })); setBusy(false); if (ok) onBack(); };
  const sec = (label, v, id) => v ? <div className="tp-sec" id={id}><span>{label}</span><p>{v}</p></div> : null;
  return (
    <div className="stack" id="tr-profile">
      <button className="btn ghost small back" onClick={onBack}>‹ 강사 목록</button>
      <Card title={t.name} tone="feature" right={<span className="muted small">강사</span>}>
        {tp.nickname && t.p.realName && tp.nickname !== t.p.realName && <p className="small muted">{t.p.realName}</p>}
        {sec("강사로서 철학", tp.philosophy, "tp-philo")}{sec("경력", tp.career, "tp-career")}{sec("자격", tp.certs, "tp-certs")}
        {!tp.philosophy && !tp.career && !tp.certs && <p className="small muted">강사가 아직 프로필을 작성하지 않았어요.</p>}
      </Card>
      <Card title="이 강사와의 수업" right={<button className="btn small" id="tp-req" onClick={() => setReq(true)}>수업 일정 요청</button>}>
        {st.list.length ? <div className="kv3"><div><b>{st.remain}</b><span>남은 세션</span></div><div><b>{st.future}</b><span>예정 수업</span></div><div><b>{st.expiresOn ? mdText(st.expiresOn) : "—"}</b><span>소진 기한</span></div></div>
          : <p className="small muted">아직 개설된 수업이 없어요.</p>}
        {upcoming.length > 0 && <ul className="clist">{upcoming.map((s) => <li key={s.id}><span><b>{mdText(dayOf(s.at))} {wdOf(dayOf(s.at))} {hm(s.at)}</b> <span className="small">{SCH_KIND[s.kind]} · {s.minutes}분</span></span></li>)}</ul>}
      </Card>
      <div className="danger-zone">{!ask ? <button className="btn ghost small" onClick={() => setAsk(true)}>이 강사와 연결 해제</button> :
        <div className="row wrap"><span className="small">연결을 끊으면 이 강사는 내 기록을 볼 수 없고 앞으로의 일정도 지워져요.</span><button className="btn danger small" disabled={busy} onClick={unlink}>해제</button><button className="btn ghost small" onClick={() => setAsk(false)}>취소</button></div>}</div>
      {req && <RequestBook trainerId={t.id} onClose={() => setReq(false)} />}
    </div>
  );
}

/* 강사 프로필 작성 (프로필 아이콘 → 계정 시트) */
function TrainerProfileForm() {
  const { srv } = useStore();
  const tp = srv.profile.tprofile || {};
  const [f, setF] = useState({ nickname: tp.nickname || srv.profile.display_name || "", philosophy: tp.philosophy || "", career: tp.career || "", certs: tp.certs || "" });
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const save = async () => {
    setBusy(true); setMsg("");
    const ok = await runSrv(srv, () => srv.sb.from("profiles").update({ tprofile: { nickname: f.nickname.trim(), philosophy: f.philosophy.trim(), career: f.career.trim(), certs: f.certs.trim() } }).eq("id", srv.user.id));
    setBusy(false); if (ok) setMsg("저장했어요. 연결된 회원의 강사 탭에 보여요.");
  };
  return (
    <Card title="강사 프로필" right={<span className="muted small">회원에게 보여요</span>}>
      <div className="form" id="tp-form">
        <Field label="이름 또는 닉네임"><input id="tp-nick" value={f.nickname} maxLength={20} onChange={(e) => setF({ ...f, nickname: e.target.value })} /></Field>
        <Field label="강사로서 철학"><textarea id="tp-philo-in" rows="3" value={f.philosophy} onChange={(e) => setF({ ...f, philosophy: e.target.value })} placeholder="예: 다치지 않고 오래 운동하는 몸을 만듭니다" /></Field>
        <Field label="경력"><textarea id="tp-career-in" rows="3" value={f.career} onChange={(e) => setF({ ...f, career: e.target.value })} placeholder="예: 2018~ 퍼스널 트레이너, 재활 PT 5년" /></Field>
        <Field label="자격"><textarea id="tp-certs-in" rows="2" value={f.certs} onChange={(e) => setF({ ...f, certs: e.target.value })} placeholder="예: 생활스포츠지도사 2급, NASM-CPT" /></Field>
        <button className="btn" id="tp-save" disabled={busy || !f.nickname.trim()} onClick={save}>{busy ? "저장 중…" : "프로필 저장"}</button>
        {msg && <p className="small" id="tp-msg">{msg}</p>}
      </div>
    </Card>
  );
}

/* ───────── 알림 ───────── */
function NotifySheet({ notes, onClose, onGo }) {
  const { srv } = useStore();
  useEffect(() => { if (notes.some((n) => !n.read)) srv.sb.rpc("read_notifications", { upto: notes[0]?.id || null }).then(() => srv.markRead()); }, []);
  const when = (t) => { const d = new Date(t); return `${mdText(dayOf(d))} ${hm(d)}`; };
  return (
    <div className="sheet" role="dialog" aria-modal="true" id="notify">
      <div className="sheet-h"><b>알림</b><button className="btn ghost small" onClick={onClose}>닫기</button></div>
      <div className="sheet-b">
        {!notes.length && <p className="small muted">새 알림이 없어요.</p>}
        <ul className="nlist">{notes.map((n) => <li key={n.id} className={n.read ? "" : "new"} data-kind={n.kind}>
          <button type="button" onClick={() => onGo(n)}><b>{n.title}</b><span className="small">{n.body}</span><span className="small muted">{when(n.created_at)}</span></button>
        </li>)}</ul>
      </div>
    </div>
  );
}

/* ───────── 마스터: 전체 강사·회원, 구독 상태 ───────── */
function MasterTab() {
  const { db, srv } = useStore();
  const [busy, setBusy] = useState(false), [q, setQ] = useState("");
  const ppl = Object.entries(PEOPLE).map(([id, p]) => ({ id, ...p }));
  const trainers = sortMembers(ppl.filter((p) => p.role === "trainer"));
  const members = sortMembers(ppl.filter((p) => p.role === "member").map((p) => ({ ...p, name: p.realName || p.name }))).filter((p) => !q.trim() || p.name.includes(q.trim()));
  const setSub = async (uid_, until) => { setBusy(true); await runSrv(srv, () => srv.sb.rpc("set_subscription", { uid: uid_, until })); setBusy(false); };
  const plusMonth = (u) => { const base = u && u >= todayISO() ? u : todayISO(); const x = new Date(base + "T00:00"); x.setMonth(x.getMonth() + 1); return iso(x); };
  const cnt = (tid) => db.members.filter((m) => (m.trainerIds || []).includes(tid)).length;
  return (
    <div className="stack">
      <Card title={`강사 · ${trainers.length}명`}>
        <ul className="clist" id="ms-trainers">{trainers.map((t) => { const s = subState(t.subUntil); return <li key={t.id} data-user={t.name}>
          <span><b>{t.name}</b> <span className="small muted">회원 {cnt(t.id)}명 · 이번 달 수업 {(db.schedules || []).filter((x) => x.trainerId === t.id && x.kind === "lesson" && x.status !== "canceled" && dayOf(x.at).startsWith(todayISO().slice(0, 7))).length}회</span>
            {" "}{t.master ? <span className="small gold">마스터</span> : <span className={"small" + (s.on ? " gold" : " warnc")}>{s.on ? s.label : "잠김 · " + s.label}</span>}</span>
          {!t.master && <span className="row nowrap"><button className="btn small" disabled={busy} onClick={() => setSub(t.id, plusMonth(t.subUntil))}>+1개월</button>{t.subUntil && <button className="btn ghost small" disabled={busy} onClick={() => setSub(t.id, null)}>해제</button>}</span>}
        </li>; })}</ul>
        <p className="small muted">구독하지 않은 강사는 가입만 되고, 잠금 화면에서 구독 신청을 보내요. +1개월을 누르면 바로 열려요.</p>
      </Card>
      <Card title={`회원 계정 · ${members.length}명`} right={<span className="muted small">구독 월 500원</span>}>
        <input className="search" type="search" placeholder="이름 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <ul className="clist" id="ms-members">{members.map((p) => { const s = subState(p.subUntil); return <li key={p.id} data-user={p.name}>
          <span><b>{p.name || "(이름 없음)"}</b> <span className={"small" + (s.on ? " gold" : " muted")}>{s.label}</span></span>
          <span className="row nowrap"><button className="btn small" disabled={busy} onClick={() => setSub(p.id, plusMonth(p.subUntil))}>+1개월</button>{p.subUntil && <button className="btn ghost small" disabled={busy} onClick={() => setSub(p.id, null)}>해제</button>}</span>
        </li>; })}</ul>
        <p className="small muted">결제 연동 전까지는 여기서 구독 기간을 직접 정해요. 지금은 구독하지 않아도 앱을 쓸 수 있고, 상태만 보여 줘요.</p>
      </Card>
    </div>
  );
}

/* 홈 맨 위: 오늘 일정 · 확인할 요청 · 남은 과제 */
function TodayCard({ go }) {
  const { db, srv } = useStore();
  const isMem = srv.profile.role === "member";
  const { sch, asg, mine } = useMySchedules();
  const now = new Date(), today = todayISO();
  const todays = sch.filter((s) => dayOf(s.at) === today && s.status !== "canceled").sort((a, b) => a.at - b.at);
  const next = sch.filter((s) => s.status === "planned" && s.at > now).sort((a, b) => a.at - b.at)[0];
  const reqs = (db.requests || []).filter((r) => r.status === "pending" && (isMem ? mine.has(r.memberId) : r.trainerId === srv.user.id)).length;
  const todo = asg.filter((a) => (isMem ? !a.doneAt : a.doneAt && dayOf(a.doneAt) >= addDays(today, -3))).length;
  const nm = (s) => (isMem ? (PEOPLE[s.trainerId]?.name || "강사") + " 강사" : memberName(db, s.memberId));
  return (
    <Card title={`오늘 일정 · ${todays.length}개`} tone="feature" right={<button className="btn ghost small" onClick={() => go("schedule")}>일정 보기</button>}>
      {todays.length ? <ul className="clist" id="today-list">{todays.map((s) => <li key={s.id}><span><b>{hm(s.at)}</b> {nm(s)} <span className="small muted">{SCH_KIND[s.kind]} · {STATE_NAME[schState(s, now)]}</span></span></li>)}</ul>
        : <p className="small muted">{next ? `다음 일정: ${mdText(dayOf(next.at))} ${wdOf(dayOf(next.at))} ${hm(next.at)} · ${nm(next)}` : "잡힌 일정이 없어요."}</p>}
      {(reqs > 0 || todo > 0) && <div className="row wrap" style={{ marginTop: 8 }}>
        {reqs > 0 && <button className="btn small" onClick={() => go("schedule")}>{isMem ? `보낸 요청 ${reqs}건` : `확인할 요청 ${reqs}건`}</button>}
        {todo > 0 && <button className="btn ghost small" onClick={() => go("assign")}>{isMem ? `남은 과제 ${todo}개` : `최근 제출한 과제 ${todo}개`}</button>}
      </div>}
    </Card>
  );
}


/* 강사 잠금: 구독 전에는 이 화면만 (결제 연동 전에는 구독 신청 → 마스터가 열어 줌) */
function TrainerLock() {
  const { srv } = useStore();
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const s = subState(srv.profile.sub_until);
  const ask = async () => {
    setBusy(true); setMsg("");
    const { data, error } = await srv.sb.rpc("request_subscription");
    setBusy(false);
    setMsg(error ? errMsg(error) : data === "already" ? "오늘 이미 신청했어요. 마스터가 확인하면 바로 열려요." : "구독 신청을 보냈어요. 마스터가 확인하면 바로 열려요.");
  };
  const check = async () => { setBusy(true); await srv.reload(); setBusy(false); setMsg("아직 잠겨 있어요. 열리면 이 화면이 바로 사라져요."); };
  return (
    <div className="stack lockwrap" id="trainer-lock">
      <div className="lockicon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2.5" /></svg></div>
      <Card title="강사 구독이 필요해요" tone="feature">
        <p className="small">가입은 끝났어요. 구독하면 TEMPT FIT 강사 기능을 모두 쓸 수 있어요.</p>
        <ul className="lockfeat small">
          <li>회원 등록 · 초대 코드로 회원과 연결</li>
          <li>수업 개설 · 세션 자동 소진</li>
          <li>일정 일간·주간·월간 · 여러 날 한꺼번에 잡기</li>
          <li>회원 요청 승인 · 과제 주기와 도장</li>
        </ul>
        {srv.profile.sub_until && !s.on && <p className="small warnc">구독이 {s.label.replace("만료 · ", "")}에 끝났어요.</p>}
        <button className="btn wide" id="lock-sub" disabled={busy} onClick={ask}>{busy ? "잠시만요…" : "구독 신청하기"}</button>
        {msg && <p className="small" id="lock-msg" role="status">{msg}</p>}
        <p className="small muted">결제 기능은 준비 중이에요. 지금은 신청하면 마스터가 확인하고 열어 드려요.</p>
        <button className="btn ghost small" id="lock-check" disabled={busy} onClick={check}>열렸는지 확인</button>
      </Card>
      <p className="small muted center">강사 프로필은 지금도 오른쪽 위 사람 아이콘에서 쓸 수 있어요.</p>
    </div>
  );
}

/* 회원: 구독 상태 (월 500원, 결제 연동 전) */
function SubCard() {
  const { srv } = useStore();
  const s = subState(srv.profile.sub_until);
  return (
    <Card title="구독" right={<span className={"pill" + (s.on ? " ok" : "")} id="sub-state">{s.on ? "이용 중" : "미구독"}</span>}>
      <p className="small">TEMPT FIT 회원 구독은 <b className="gold">월 500원</b>이에요. {s.on ? s.label.replace("이용 중 · ", "") + " 이용할 수 있어요." : srv.profile.sub_until ? s.label + "." : ""}</p>
      <p className="small muted">결제 기능은 준비 중이에요. 그동안은 구독하지 않아도 모든 기능을 쓸 수 있어요.</p>
    </Card>
  );
}

/* ───────── 앱 셸 ───────── */
// 탭: 강사·회원·이 기기 전용이 서로 다름 (마스터는 강사 탭 + 마스터)
const TABS_LOCAL = [["home", "홈"], ["member", "회원"], ["workout", "운동"], ["stats", "분석"]];
const TABS_TRAINER = [["home", "홈"], ["schedule", "일정"], ["member", "회원"], ["workout", "운동"], ["assign", "과제"], ["stats", "분석"]];
const TABS_MEMBER = [["home", "홈"], ["schedule", "일정"], ["assign", "과제"], ["trainers", "강사"], ["workout", "운동"], ["stats", "분석"], ["member", "내 정보"]];
const MASTER_TAB = ["master", "마스터"];
const ANA = [["heart", "심박"], ["nutrition", "영양"], ["recovery", "회복"]];
const ICONS = {
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  member: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9a8 8 0 0 1 16 0",
  workout: "M2 10h3v4H2zM19 10h3v4h-3zM5 7h3v10H5zM16 7h3v10h-3zM8 11h8v2H8z",
  schedule: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h3v3H8z",
  assign: "M8 4h8v3H8zM6 5H5v16h14V5h-1M8.5 13l2.5 2.5 4.5-5",
  trainers: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M17 7.5l1.2 2.3 2.5.4-1.8 1.8.4 2.5-2.3-1.2-2.3 1.2.4-2.5-1.8-1.8 2.5-.4z",
  stats: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  master: "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6zM9 12l2 2 4-4",
  bell: "M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4",
};
// 일정 시각(Date)이 문자열로 바뀌지 않게 복사
const deepCopy = (x) => (typeof structuredClone === "function" ? structuredClone(x) : JSON.parse(JSON.stringify(x), (k, v) => ((k === "at" || k === "doneAt") && typeof v === "string" ? new Date(v) : v)));
function App() {
  const [cfg, setCfg] = useState(serverCfg);
  const sb = useMemo(() => getSB(cfg), [cfg]);
  const [localOnly, setLocalOnly] = useState(() => lsGet(LOCAL_ONLY_KEY) === "1");
  const [session, setSession] = useState(undefined); // undefined = 확인 중
  const [profile, setProfile] = useState(null);
  const [staff, setStaff] = useState([]);
  const [smeta, setSmeta] = useState({ people: {}, master: false, extraEx: [] });
  const [notes, setNotes] = useState([]);
  const [bell, setBell] = useState(false);
  const [toast, setToast] = useState("");
  useEffect(() => { // 숫자 범위·날짜(100–150, 2026-11-21)가 줄 끝에서 쪼개지지 않게
    const root = document.querySelector(".app"); if (!root) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const v = n.nodeValue; if (/\d[–-]\d/.test(v)) { const nv = v.replace(/(\d)([–-])(?=\d)/g, "$1$2⁠"); if (nv !== v) n.nodeValue = nv; } }
  });
  useEffect(() => { const f = (e) => { setToast(e.detail); setTimeout(() => setToast(""), 3500); }; window.addEventListener("tempt-msg", f); return () => window.removeEventListener("tempt-msg", f); }, []);
  const [db, setDB] = useState(loadDB);
  const [sync, setSync] = useState({ state: "idle" });
  const [tab, setTab] = useState(() => lsGet(KEY + ".tab") || "home");
  const [ana, setAna] = useState(() => lsGet(KEY + ".ana") || "heart");
  const [sub, setSub] = useState("cal");
  const [refs, setRefs] = useState(null);
  const [acct, setAcct] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [favLocal, setFavLocal] = useState(() => { try { return JSON.parse(localStorage.getItem(KEY + ".favs")) || []; } catch (e) { return []; } });
  const [, bump] = useState(0);
  const synced = useRef(null), dbRef = useRef(db), timer = useRef(null), flushing = useRef(false), again = useRef(false), meRef = useRef(null), lastLoad = useRef(0), notesRef = useRef(notes);
  dbRef.current = db; notesRef.current = notes;

  const userId = session?.user?.id || null;
  const mode = !cfg || !sb || localOnly ? "local" : session === undefined ? "checking" : !session ? "auth" : !profile ? "loading" : "server";
  meRef.current = mode === "server" ? { sb, id: userId, role: profile.role } : null;

  // 로그인 상태 구독
  useEffect(() => {
    if (!sb) { setSession(null); return; }
    let alive = true;
    sb.auth.getSession().then(({ data }) => { if (alive) setSession(data.session || null); }).catch(() => alive && setSession(null));
    const { data } = sb.auth.onAuthStateChange((_e, s) => { if (alive) setSession(s || null); });
    return () => { alive = false; data?.subscription?.unsubscribe(); };
  }, [sb]);

  const reload = async () => {
    if (!sb || !session) return;
    setSync({ state: "loading" });
    try {
      const r = await loadServer(sb, session.user);
      synced.current = r.db; lastLoad.current = Date.now();
      setProfile(r.profile); setStaff(r.staff); setSmeta({ people: r.people, master: r.master, extraEx: [] }); setNotes(r.notes || []); setDB(r.db); setSync({ state: "saved", at: Date.now() });
    } catch (e) { setSync({ state: "error", msg: errMsg(e), load: true }); }
  };
  // 로그인/로그아웃 시 서버 기록 ↔ 이 기기 기록 전환
  useEffect(() => {
    if (userId && !localOnly && sb) { reload(); return; }
    synced.current = null; setProfile(null); setNotes([]);
    setDB((cur) => (cur.server ? loadDB() : cur));
  }, [userId, localOnly, sb]);

  // 이 기기 저장은 로그인 없이 쓸 때만
  useEffect(() => { if (!db.server) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} } else lsSet(ACTIVE_KEY, db.activeId || ""); }, [db]);
  useEffect(() => { lsSet(KEY + ".tab", tab); }, [tab]);
  useEffect(() => { lsSet(KEY + ".ana", ana); }, [ana]);

  // 바뀐 행만 서버로
  const flush = async () => {
    const me = meRef.current; clearTimeout(timer.current); timer.current = null;
    if (!me || !synced.current) return;
    if (flushing.current) { again.current = true; return; }
    const target = dbRef.current; if (!target.server) return;
    const diff = diffDB(synced.current, target);
    if (!diff.count) return;
    const now = mediaPaths(target); diff.removedMedia = [...mediaPaths(synced.current)].filter((p) => !now.has(p));
    flushing.current = true; setSync({ state: "saving" });
    try {
      const created = await pushDiff(me.sb, diff, me);
      synced.current = target;
      if (created.length) {
        const patch = (x) => ({ ...x, members: x.members.map((mm) => { const r = created.find((c) => c.id === mm.id); return r ? { ...mm, inviteCode: r.invite_code, linked: !!r.user_id, trainerId: r.trainer_id, mine: r.user_id === me.id } : mm; }) });
        synced.current = patch(synced.current); setDB(patch);
        reload(); // 서버가 정한 초대 코드·담당 강사를 받아 옴
      }
      setSync({ state: "saved", at: Date.now() });
    } catch (e) { setSync({ state: "error", msg: errMsg(e) }); }
    flushing.current = false;
    if (again.current) { again.current = false; flush(); }
  };
  useEffect(() => {
    if (!db.server || !synced.current) return;
    clearTimeout(timer.current); timer.current = setTimeout(flush, 700);
  }, [db]);
  const idle = () => !(timer.current || flushing.current || (synced.current && diffDB(synced.current, dbRef.current).count));
  // 화면을 떠날 때는 바로 저장, 돌아오면 다른 기기에서 바뀐 내용 불러오기
  useEffect(() => {
    const onVis = () => {
      if (!meRef.current || !synced.current) return;
      if (document.visibilityState === "hidden") { flush(); return; }
      if (idle() && Date.now() - lastLoad.current > 15000) reload();
    };
    document.addEventListener("visibilitychange", onVis); window.addEventListener("focus", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", onVis); };
  });
  // 새 알림 확인 (40초마다, 화면이 보일 때만). 새 알림이 있으면 일정·요청·과제를 다시 받아 옴
  useEffect(() => {
    if (mode !== "server") return;
    const t = setInterval(async () => {
      if (document.visibilityState !== "visible" || !idle()) return;
      try {
        const { data } = await sb.from("notifications").select("id").order("id", { ascending: false }).limit(1);
        const top = data && data[0] ? data[0].id : 0, known = notesRef.current[0] ? notesRef.current[0].id : 0;
        if (top > known) reload();
      } catch (e) {}
    }, 40000);
    return () => clearInterval(t);
  }, [mode, sb]);

  const update = (fn) => setDB((prev) => { const next = deepCopy(prev); fn(next); next.sample = false; return next; });
  setCatalog(db.exercises); setPeople(smeta.people);
  const d = useMemo(() => derive(db, db.activeId), [db]);
  const [mview, setMview] = useState("list"); // 회원 탭: 목록 → 정보
  const role = mode === "server" ? profile.role : null;
  const go = (t, view = "detail") => {
    if (ANA.some(([k]) => k === t)) { setAna(t); t = "stats"; }
    if (t === "member") setMview(view);
    setTab(t); const el = document.querySelector(".main"); if (el) el.scrollTop = 0;
  };
  // 다른 화면에서 온 이동 요청 (회원 화면 → 일정 잡기·과제 주기, 일정 → 운동 기록 쓰기)
  useEffect(() => {
    const f = (e) => {
      const x = e.detail || {};
      if (x.log) { update((y) => { y.activeId = x.log.memberId; }); tabCmd("tempt-log-preset", x.log.preset); }
      if (x.cal) tabCmd("tempt-cal", x.cal);
      if (x.assign) tabCmd("tempt-assign", x.assign);
      if (x.tab) go(x.tab);
    };
    window.addEventListener("tempt-go", f); return () => window.removeEventListener("tempt-go", f);
  }, []);
  const addMember = () => {
    if (!newName.trim()) return; const id = uid();
    update((x) => { x.members.push({ id, name: newName.trim(), sex: "M", birth: "1995-01-01", phone: "", goal: "maintain", restingHR: "", hrFormula: "tanaka", zoneMethod: "karvonen", activityMode: "auto", activityManual: 1.55, meals: 4, memo: "", ...(mode === "server" ? { trainerIds: [userId] } : {}) }); x.activeId = id; });
    setNewName(""); setAdding(false); setMview("detail"); setTab("member");
  };
  const saveCfg = (c) => {
    lsSet(CFG_KEY, c ? JSON.stringify(c) : null); lsSet(LOCAL_ONLY_KEY, null);
    setLocalOnly(false); setSession(undefined); setCfg(serverCfg()); setAcct(false);
  };
  const useLocal = () => { lsSet(LOCAL_ONLY_KEY, "1"); setLocalOnly(true); };
  const goLogin = () => { lsSet(LOCAL_ONLY_KEY, null); setLocalOnly(false); setAcct(false); };
  const logout = async () => { await flush(); setAcct(false); try { await sb.auth.signOut(); } catch (e) {} setSession(null); };
  const localRaw = mode === "server" && role === "trainer" && lsGet(UPLOADED_KEY) !== "1" ? localDBRaw() : null;
  const localData = localRaw && !localRaw.sample && localRaw.members?.length ? localRaw : null;
  const importLocal = () => {
    const L = localData; if (!L) return;
    update((x) => {
      const has = new Set(x.members.map((mm) => mm.id));
      const mem = L.members.filter((mm) => !has.has(mm.id)), ids = new Set(mem.map((mm) => mm.id));
      x.members.push(...mem);
      x.measurements.push(...L.measurements.filter((r) => ids.has(r.memberId)));
      x.sessions.push(...L.sessions.filter((r) => ids.has(r.memberId)));
      if (!x.activeId && mem[0]) x.activeId = mem[0].id;
    });
    lsSet(UPLOADED_KEY, "1"); bump((n) => n + 1);
  };
  const markRead = () => setNotes((L) => L.map((n) => ({ ...n, read: true })));
  const srv = mode === "server" ? { sb, user: session.user, profile, staff, reload, flush, markRead, ...smeta } : null;
  // 즐겨찾기 운동: 계정마다 (서버는 profiles.fav_exercises, 로컬은 이 기기)
  const favs = mode === "server" ? profile.fav_exercises || [] : favLocal;
  const setFavs = (ids) => {
    if (mode === "server") {
      setProfile((p) => ({ ...p, fav_exercises: ids }));
      sb.rpc("set_fav_exercises", { ids }).then(({ error }) => { if (error) setSync({ state: "error", msg: "즐겨찾기 저장 실패: " + error.message }); });
    } else { setFavLocal(ids); try { localStorage.setItem(KEY + ".favs", JSON.stringify(ids)); } catch (e) {} }
  };
  // 종류(헬스·필라테스)마다 5개까지. 넘으면 false
  const toggleFav = (e) => {
    if (favs.includes(e.id)) { setFavs(favs.filter((x) => x !== e.id)); return true; }
    if (favs.filter((x) => EX[x] && exCat(EX[x]) === exCat(e)).length >= FAV_MAX) return false;
    setFavs([...favs.filter((x) => EX[x]), e.id]); return true;
  };
  const ctx = { db, setDB, update, srv, toast, sync, favs, toggleFav, openMember: (id) => { update((x) => { x.activeId = id; }); go("member"); }, openAdd: () => setAdding(true), staff: srv ? staff : [], openRefs: (ids) => setRefs({ ids }) };
  const tabs = mode !== "server" ? TABS_LOCAL : role === "member" ? TABS_MEMBER : srv.master ? [...TABS_TRAINER, MASTER_TAB] : TABS_TRAINER;
  const cur = tabs.some(([k]) => k === tab) ? tab : "home";
  const unread = notes.filter((n) => !n.read).length;
  const locked = !!srv && role === "trainer" && !srv.master && !subState(profile.sub_until).on;
  const openNote = (n) => {
    setBell(false);
    if (n.kind === "schedule" || n.kind === "decided" || n.kind === "request") { const s = n.ref && (db.schedules || []).find((x) => x.id === n.ref); tabCmd("tempt-cal", s ? { date: dayOf(s.at), view: "day", open: { id: s.id } } : {}); go("schedule"); }
    else if (n.kind === "assignment" || n.kind === "submitted") { tabCmd("tempt-assign", n.ref && (db.assignments || []).some((a) => a.id === n.ref) ? { open: n.ref } : {}); go("assign"); }
    else if (n.kind === "subreq") go("master");
    else if (n.kind === "link") { if (role === "member") go("trainers"); else if (n.ref && db.members.some((m) => m.id === n.ref)) ctx.openMember(n.ref); else go("member", "list"); }
  };

  if (mode === "checking" || mode === "loading") return (
    <div className="app"><main className="main"><div className="stack authwrap">
      <Card title={sync.state === "error" ? "불러오지 못했습니다" : "불러오는 중…"}>
        {sync.state === "error" ? <><p className="small errtxt">{sync.msg}</p><div className="row"><button className="btn" onClick={reload}>다시 시도</button><button className="btn ghost small" onClick={logout}>로그아웃</button><button className="btn ghost small" onClick={useLocal}>이 기기에서만 쓰기</button></div></> : <p className="small muted">서버에서 기록과 일정을 가져오고 있습니다.</p>}
      </Card>
    </div></main></div>
  );
  if (mode === "auth") return <>
    <AuthScreen sb={sb} onLocal={useLocal} onSettings={() => setAcct(true)} />
    {acct && <AccountSheet onClose={() => setAcct(false)} cfg={cfg} saveCfg={saveCfg} sync={sync} />}
  </>;

  const body = () => {
    if (locked) return <TrainerLock />;
    // 회원 기록이 없어도 열리는 탭
    if (srv) {
      if (cur === "schedule") return <ScheduleTab />;
      if (cur === "assign") return <AssignTab />;
      if (cur === "trainers") return <TrainersTab />;
      if (cur === "master") return <MasterTab />;
    }
    if (!d) {
      if (role === "member") return <div className="stack">{cur === "home" && <TodayCard go={go} />}<MemberStart /></div>;
      return <div className="stack">{srv && cur === "home" && <TodayCard go={go} />}<Card title="회원이 없습니다" right={<button className="btn small" aria-label="회원 추가" onClick={() => setAdding(true)}>+ 회원 추가</button>}><p className="muted">+ 회원 추가 버튼으로 회원을 등록하세요.{role === "trainer" ? " 등록하면 초대 코드가 생기고, 회원이 그 코드를 넣으면 앱에서 연결돼요." : ""}</p></Card></div>;
    }
    const multi = role !== "member" || db.members.length > 1;
    const curBar = multi ? <div className="curbar" id="cur-member"><span><b>{d.m.name || "(이름 없음)"}</b> 회원 기록</span><button className="linkbtn small" onClick={() => go("member", "list")}>회원 바꾸기</button></div> : null;
    switch (cur) {
      case "member": {
        const hasList = role !== "member" || db.members.length > 1;
        if (hasList && mview === "list") return <MemberListView onPick={(id) => { const nm = db.members.find((m) => m.id === id)?.name || "회원"; update((x) => { x.activeId = id; }); alertMsg(`${nm} 회원을 선택했어요. 다른 탭도 이 회원 기준으로 바뀌어요.`); }} onEdit={(id) => { update((x) => { x.activeId = id; }); go("member"); }} onAdd={role !== "member" ? () => setAdding(true) : null} />;
        return <MemberTab key={d.m.id} d={d} onBack={hasList ? () => go("member", "list") : null} />;
      }
      case "workout": return <>{curBar}<WorkoutTab key={d.m.id} d={d} sub={sub} setSub={setSub} /></>;
      case "stats": return <div className="stack">{curBar}<Seg value={ana} options={ANA} onChange={setAna} />
        {ana === "nutrition" ? <NutritionTab d={d} go={go} /> : ana === "recovery" ? <RecoveryTab d={d} /> : <HeartTab key={d.m.id} d={d} go={go} />}</div>;
      default: return <div className="stack">{srv && <TodayCard go={go} />}<Home d={d} go={go} /></div>;
    }
  };
  const dot = mode === "local" ? "" : sync.state === "error" ? " bad" : sync.state === "saving" || sync.state === "loading" ? " busy" : " ok";
  return (
    <Store.Provider value={ctx}>
      <div className="app">
        <header className="top">
          <div className="brand"><img src={window.TEMPT_MARK} alt="" className="mark" /><div className="wm"><b>TEMPT</b><small>FIT</small></div></div>
          <div className="row nowrap">
            {srv && <button className="icon bell" id="bell" aria-label={unread ? `알림 ${unread}개` : "알림"} onClick={() => setBell(true)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS.bell} /></svg>{unread > 0 && <i className="badge">{unread > 9 ? "9+" : unread}</i>}</button>}
            <button className={"icon acct" + dot} aria-label="계정과 저장 상태" onClick={() => setAcct(true)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS.member} /></svg></button>
          </div>
        </header>
        {adding && role !== "member" && !locked && <div className="addbar"><input id="new-name" placeholder="새 회원 이름" autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMember()} /><button className="btn" onClick={addMember}>추가</button><button className="btn ghost small" onClick={() => { setAdding(false); setNewName(""); }}>취소</button></div>}
        {mode === "local" && <div className="notice">지금은 이 기기에만 저장됩니다. 일정·과제·강사 연결은 <button className="linkbtn" onClick={() => (cfg ? goLogin() : setAcct(true))}>{cfg ? "로그인" : "서버 연결"}</button>하면 쓸 수 있어요.{db.sample && <> 아래는 예시 회원 2명의 샘플입니다. <button className="linkbtn" onClick={() => setDB({ sample: false, activeId: null, members: [], measurements: [], sessions: [], exercises: db.exercises || DEFAULT_EXERCISES })}>모두 비우기</button></>}</div>}
        {mode === "server" && sync.state === "error" && <div className="notice bad">{sync.msg} <button className="linkbtn" onClick={flush}>다시 저장</button></div>}
        {toast && <div className="toast" role="status">{toast}</div>}
        <main className="main">{body()}
          <p className="foot">이 앱의 수치는 공인 공식에 따른 추정치이며 의료적 진단을 대신하지 않습니다. <button className="linkbtn" id="foot-refs" onClick={() => setRefs({ ids: null })}>근거·데이터 구조 보기</button>{mode === "local" && <> <button className="linkbtn" onClick={() => { setDB(sampleDB()); }}>샘플 데이터 다시 불러오기</button></>}</p>
        </main>
        {!locked && <nav className={"nav n" + tabs.length} style={{ gridTemplateColumns: `repeat(${tabs.length},1fr)` }}>
          {tabs.map(([k, l]) => <button key={k} data-tab={k} className={cur === k ? "on" : ""} onClick={() => go(k, "list")} aria-current={cur === k ? "page" : undefined}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS[k]} /></svg><span>{l}</span></button>)}
        </nav>}
        {refs && <Sheet ids={refs.ids} onClose={() => setRefs(null)} />}
        {bell && srv && <NotifySheet notes={notes} onClose={() => setBell(false)} onGo={openNote} />}
        {acct && <AccountSheet onClose={() => setAcct(false)} cfg={cfg} saveCfg={saveCfg} srv={srv} sync={sync} flush={flush} local={mode === "local"} goLogin={goLogin} logout={logout} localData={localData} importLocal={importLocal} />}
      </div>
    </Store.Provider>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
