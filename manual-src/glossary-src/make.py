import re, html, os
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # 저장소 루트
head = open(R + '/docs/guide/member.html').read()  # build_manual.py를 먼저 실행
icon = re.search(r'<link rel="icon"[^>]*>', head).group(0)
G = [
("운동 기록 · 근력", [
 ("rir","RIR","남은 반복 수 (Reps In Reserve)",
  ["한 세트를 끝냈을 때 <b>정말 한계까지 하면 몇 번 더 할 수 있었는지</b>를 숫자로 적는 방법이에요. RIR 0은 더 이상 한 번도 못 드는 완전한 한계, RIR 2는 2회 더 할 힘이 남은 상태예요.",
   "같은 10회라도 여유 있게 한 10회와 겨우 해낸 10회는 강도가 다르죠. RIR을 함께 적으면 실제 강도를 더 정확히 알 수 있어요.",
   "이 앱은 1RM을 추정할 때 <b>반복 수 + RIR</b>을 한계 반복으로 봐요. 예: 80kg × 8회, RIR 2 → 80kg으로 10회가 한계인 것으로 계산해요. 회복 계산에서도 RIR 0–1(실패 근접) 세트가 있으면 회복 시간을 12시간 더 잡아요."],
  "기록하기의 세트 입력 칸, 1RM 계산, 회복"),
 ("rpe","RPE","운동 자각도 (Rating of Perceived Exertion)",
  ["지금 하는 운동이 <b>얼마나 힘들게 느껴지는지</b>를 1(아주 편함)부터 10(최대로 힘듦)까지 매긴 점수예요.",
   "근력 운동에서는 RPE 10 = RIR 0, RPE 8 = RIR 2처럼 서로 바꿔 생각할 수 있어요. 유산소 운동에서는 말하기 정도와 함께 강도를 가늠하는 데 써요. 예: RPE 3–4는 문장으로 대화할 수 있는 정도, RPE 9–10은 말을 할 수 없는 정도예요."],
  "심박 탭 Zone 1–5 가이드"),
 ("1rm","1RM","1회 최대 중량 (One-Repetition Maximum)",
  ["어떤 운동에서 <b>딱 한 번 들 수 있는 가장 무거운 무게</b>예요. 근력 수준을 비교하고, 목적에 맞는 훈련 무게를 정하는 기준이 돼요.",
   "실제로 최대 무게를 드는 건 부상 위험이 있어서, 이 앱은 기록한 세트(무게 × 반복 + RIR)로 1RM을 <b>추정</b>해요. 3–10회 기록으로 추정할 때 가장 정확하고, 반복 수가 많을수록 오차가 커져요.",
   "%1RM은 1RM의 몇 퍼센트 무게인지를 뜻해요. 예: 1RM이 100kg이면 75% 1RM은 75kg이에요."],
  "운동 → 1RM 계산"),
 ("rm","RM","최대 반복 (Repetition Maximum)",
  ["어떤 무게로 <b>최대 몇 번까지 들 수 있는지</b>를 나타내요. 10RM은 딱 10번까지 들 수 있는 무게, 5RM은 딱 5번까지 들 수 있는 무게예요.",
   "강도표의 1RM–20RM은 1회부터 20회까지 각각 한계가 되는 무게를 추정해 보여 줘요. 보통 1–5RM은 근력, 6–12RM은 근비대, 13–20RM 이상은 근지구력 훈련에 써요."],
  "1RM 계산의 강도표, 회복 탭 세트 간 휴식 가이드"),
 ("rmf","Epley · Brzycki · Lombardi","1RM 추정 공식",
  ["여러 번 든 기록으로 1RM을 계산하는 대표 공식들이에요.",
   "<b>Epley</b>: 무게 × (1 + 반복 ÷ 30). <b>Brzycki</b>: 무게 × 36 ÷ (37 − 반복). <b>Lombardi</b>: 무게 × 반복<sup>0.1</sup>.",
   "반복이 적을 때는 세 공식 결과가 비슷하지만, 반복이 많아질수록 차이가 커져요. 이 앱은 기본으로 세 공식의 <b>평균</b>을 써서 한쪽으로 치우치지 않게 해요."],
  "운동 → 1RM 계산의 계산 공식"),
 ("volume","볼륨","운동량 (주간 세트 수)",
  ["근력 운동의 양을 말해요. 이 앱에서는 <b>부위별로 최근 7일 동안 한 세트 수</b>로 계산해요.",
   "운동의 주 부위는 1세트 그대로, 함께 쓰인 보조 부위는 0.5세트로 셉니다. 예: 벤치프레스 4세트 → 가슴 4세트, 삼두·어깨 각 2세트.",
   "연구에서는 부위당 <b>주 10세트 이상</b>일 때 근육이 더 잘 컸고, 같은 볼륨이면 한 번에 몰아서 하기보다 주 2회 이상 나눠 하는 편이 유리했어요."],
  "회복 탭 최근 7일 부위별 볼륨, 홈 부위별 회복 상태"),
 ("hyper","근비대 · 근력 · 근지구력","훈련 목적",
  ["<b>근비대</b>는 근육의 크기를 키우는 것, <b>근력</b>은 무거운 무게를 드는 최대 힘, <b>근지구력</b>은 가벼운 무게를 여러 번 오래 반복하는 능력이에요.",
   "목적에 따라 무게와 휴식이 달라요. 근력은 1–5RM 무게로 3–5분 쉬고, 근비대는 6–12RM 무게로 1–3분, 근지구력은 13–20RM 이상 무게로 30–90초 쉬는 것이 일반적이에요."],
  "1RM 강도표 목적 칸, 회복 탭 세트 간 휴식 가이드"),
 ("joint","다관절 · 단관절 운동","",
  ["<b>다관절 운동</b>은 스쿼트·데드리프트·벤치프레스처럼 여러 관절이 함께 움직이는 운동이에요. 큰 근육을 많이 쓰고 무거운 무게를 다뤄서 세트 사이에 더 오래 쉬어요(2–3분).",
   "<b>단관절 운동</b>은 바벨 컬·레그 컬처럼 한 관절만 움직이는 운동이에요. 특정 근육을 집중해서 쓰고, 상대적으로 짧게 쉬어도 돼요(1–2분)."],
  "회복 탭 세트 간 휴식 가이드"),
]),
("체성분 (인바디)", [
 ("inbody","인바디","체성분 측정",
  ["몸에 약한 전류를 흘려 <b>몸무게를 근육·지방·수분 등으로 나눠 재는</b> 체성분 측정이에요(InBody는 측정기 브랜드 이름이에요).",
   "측정값은 수분 상태에 따라 달라지므로, 비교하려면 <b>같은 시간대(가능하면 아침 공복), 운동 전, 화장실 다녀온 뒤</b>에 재는 것이 좋아요.",
   "이 앱은 키·체중·골격근량·체지방률을 입력받아 제지방량, BMI, FFMI를 계산하고, 체지방률이 있으면 더 정확한 기초대사량 공식을 써요."],
  "회원(내 정보) 탭 인바디 · 신체 측정"),
 ("smm","골격근량","Skeletal Muscle Mass",
  ["팔·다리·몸통을 움직이는, 뼈에 붙은 근육(골격근)의 무게예요. 인바디 결과지에 kg으로 나와요.",
   "근력 운동과 충분한 단백질로 늘릴 수 있고, 같은 체중이라도 골격근량이 많을수록 기초대사량이 높고 체형이 탄탄해 보여요."],
  "홈 최근 인바디, 회원 탭 측정 기록"),
 ("bf","체지방률","Body Fat %",
  ["몸무게 중 <b>지방이 차지하는 비율(%)</b>이에요. 예: 60kg에 체지방률 25%면 지방이 15kg이에요.",
   "체중보다 몸의 구성을 더 잘 보여 줘서, 감량이나 린매스업의 진행을 확인할 때 중요해요. 이 앱은 ACE 기준으로 체지방률 구간(운동선수·피트니스·평균·비만)을 함께 보여 줘요."],
  "홈 최근 인바디, 회원 탭, 영양 탭"),
 ("lbm","제지방량","Lean Body Mass",
  ["몸무게에서 지방을 뺀 나머지, 즉 <b>근육·뼈·장기·수분 등의 무게</b>예요. 계산: 체중 × (1 − 체지방률).",
   "열량을 쓰는 조직 대부분이 여기에 들어 있어서, 기초대사량과 단백질 목표량을 정할 때 체중보다 더 정확한 기준이 돼요. 이 앱은 체지방률이 있으면 제지방 kg당 단백질 양을 계산해요."],
  "회원 탭 신체 조성 분석, 영양 탭"),
 ("bmi","BMI","체질량지수 (Body Mass Index)",
  ["체중(kg)을 키(m)의 제곱으로 나눈 값이에요. 예: 키 1.64m, 체중 57kg → 57 ÷ (1.64 × 1.64) ≈ 21.2.",
   "계산이 간단해 많이 쓰지만 <b>근육과 지방을 구분하지 못해요</b>. 근육이 많은 사람은 BMI가 높게 나올 수 있으니 체지방률과 함께 보세요."],
  "회원 탭 신체 조성 분석"),
 ("ffmi","FFMI","제지방량 지수 (Fat-Free Mass Index)",
  ["제지방량(kg)을 키(m)의 제곱으로 나눈 값으로, <b>키를 고려한 근육량 지표</b>예요. BMI의 근육 버전이라고 생각하면 돼요.",
   "‘보정’ 값은 키가 1.8m가 아닌 사람도 비교할 수 있게 키 차이를 보정한 값이에요. 일반적으로 남성은 18–20, 여성은 14–17 정도가 평균 범위예요."],
  "회원 탭 신체 조성 분석"),
 ("ace","ACE 체지방 분류","American Council on Exercise",
  ["미국운동협회(ACE)가 정한 <b>성별 체지방률 구간</b>이에요.",
   "여성: 필수지방 10–13%, 운동선수 14–20%, 피트니스 21–24%, 평균 25–31%, 비만 32% 이상. 남성: 필수지방 2–5%, 운동선수 6–13%, 피트니스 14–17%, 평균 18–24%, 비만 25% 이상."],
  "회원 탭 신체 조성 분석, 영양 탭 조언"),
]),
("영양 · 열량", [
 ("bmr","BMR","기초대사량 (Basal Metabolic Rate)",
  ["숨쉬기·체온 유지·심장 박동처럼 <b>아무것도 하지 않고 쉬기만 해도 하루에 쓰는 열량</b>이에요.",
   "하루 소비 열량의 가장 큰 부분(보통 60–70%)을 차지해요. 근육량이 많을수록 높아요. 이 앱은 체지방률이 있으면 Katch-McArdle, 없으면 Mifflin-St Jeor 공식으로 계산해요."],
  "영양 탭 에너지"),
 ("tdee","TDEE","하루 총 소비 열량 (Total Daily Energy Expenditure)",
  ["기초대사량에 운동·일상 활동으로 쓰는 열량을 더한 <b>하루 동안 실제로 쓰는 총 열량</b>이에요. 계산: BMR × 활동계수.",
   "TDEE만큼 먹으면 체중이 유지되고, 덜 먹으면 감량, 더 먹으면 증량돼요. 이 앱의 목표 섭취량은 목적(다이어트·린매스업·벌크업 등)에 따라 TDEE에서 일정 비율을 빼거나 더해 정해요."],
  "영양 탭 에너지, 목표"),
 ("act","활동계수","Activity Factor",
  ["평소 얼마나 움직이는지를 숫자로 나타낸 값으로, 기초대사량에 곱해 하루 총 소비 열량을 구해요.",
   "보통 1.2(거의 운동 안 함)부터 1.9(매우 활동적)까지 써요. 이 앱은 <b>최근 14일 운동 기록 횟수</b>로 자동 계산해요(예: 주 3–4회 → 1.55). 영양 탭에서 ‘수동’을 골라 직접 정할 수도 있어요."],
  "홈 상단, 영양 탭 활동계수"),
 ("mifflin","Mifflin-St Jeor 공식","기초대사량 공식",
  ["키·체중·나이·성별로 기초대사량을 계산하는 공식이에요. 일반인 대상 연구에서 가장 정확한 편이라 널리 써요.",
   "남성: 10 × 체중 + 6.25 × 키(cm) − 5 × 나이 + 5. 여성: 같은 식에서 + 5 대신 − 161.",
   "체지방률을 모를 때 이 앱이 쓰는 공식이에요."],
  "영양 탭 에너지, 홈 오늘 목표 섭취"),
 ("katch","Katch-McArdle 공식","제지방량 기반 기초대사량 공식",
  ["<b>제지방량</b>으로 기초대사량을 계산하는 공식이에요. BMR = 370 + 21.6 × 제지방량(kg).",
   "성별·나이 대신 실제 근육 등 제지방을 반영해서, 근육이 많거나 적은 사람에게 더 정확해요. 인바디 체지방률이 있으면 이 앱은 이 공식을 써요."],
  "영양 탭 에너지, 홈 오늘 목표 섭취"),
 ("macro","탄단지","3대 영양소",
  ["<b>탄</b>수화물·<b>단</b>백질·<b>지</b>방, 열량을 내는 3대 영양소의 줄임말이에요. 1g당 열량은 탄수화물 4kcal, 단백질 4kcal, 지방 9kcal예요.",
   "이 앱은 목표 열량 안에서 단백질을 먼저 정하고(체중 또는 제지방 kg당), 지방을 정한 뒤 남은 열량을 탄수화물로 채워요. 식단 방식(균형식·키토제닉·카니보어)에 따라 비율이 달라져요."],
  "영양 탭 목표, 식단 방식별 비율 비교, 홈"),
 ("keto","키토제닉 식단","Ketogenic Diet",
  ["탄수화물을 하루 총열량의 5–10% 정도로 아주 적게 먹고, 지방을 많이(65–75%) 먹는 식단이에요.",
   "탄수화물이 부족하면 몸이 지방에서 ‘케톤’을 만들어 연료로 써요. 적응 기간(2–4주)에는 고강도 운동 수행이 떨어질 수 있어요."],
  "영양 탭 식단 방식"),
 ("carni","카니보어 식단","Carnivore Diet",
  ["고기·생선·달걀 등 <b>동물성 식품 위주</b>로 먹고 탄수화물을 거의 먹지 않는 식단이에요.",
   "단백질과 지방 비율이 높고 식이섬유가 거의 없어요. 장기적인 효과에 대한 연구는 아직 적어서 전문가와 상의하며 하는 것이 좋아요."],
  "영양 탭 식단 방식"),
 ("ketoflu","키토 플루","Keto Flu",
  ["키토제닉 식단을 시작한 초기에 생길 수 있는 두통·피로·무기력·어지러움 같은 증상이에요.",
   "탄수화물을 줄이면 몸에서 수분과 나트륨이 빠져나가면서 생기는 경우가 많아요. 물과 나트륨·칼륨·마그네슘을 의식해서 챙기면 줄어들어요."],
  "영양 탭 키토제닉 주의사항"),
 ("ea","에너지 가용성","Energy Availability",
  ["먹은 열량에서 운동으로 쓴 열량을 빼고 <b>제지방량(kg)으로 나눈 값</b>이에요. 몸이 운동 말고 생명 유지·회복에 쓸 수 있는 열량이 얼마나 남는지를 보여 줘요.",
   "<b>30kcal/kg 미만</b>이면 호르몬·면역·뼈 건강과 회복에 문제가 생길 위험이 커져요. 감량 중이라도 이 아래로 오래 떨어지지 않게 하세요."],
  "영양 탭 조언"),
 ("reds","RED-S","상대적 에너지 결핍 (Relative Energy Deficiency in Sport)",
  ["운동량에 비해 <b>너무 적게 먹어서</b> 몸에 쓸 에너지가 부족해진 상태예요.",
   "피로, 잦은 부상, 생리 불순, 골밀도 저하, 기분 변화, 운동 수행 저하로 이어질 수 있어요. 에너지 가용성이 계속 30kcal/kg 아래라면 섭취량을 늘리거나 감량 속도를 늦추세요."],
  "영양 탭 조언"),
]),
("심박 · 유산소", [
 ("bpm","bpm","beats per minute",["1분 동안 심장이 뛰는 횟수예요. 심박수의 단위로 써요."],"심박 탭, 홈 심박 존"),
 ("hrmax","최대심박 (HRmax)","Maximum Heart Rate",
  ["심장이 1분에 뛸 수 있는 <b>최대 횟수</b>예요. 운동 강도 구간(심박 존)을 정하는 기준이 돼요.",
   "직접 재려면 최대 강도로 운동해야 해서 보통 나이로 추정해요. 이 앱은 기본으로 Tanaka 공식(208 − 0.7 × 나이)을 써요."],
  "심박 탭 최대심박수 설정, 홈 심박 존"),
 ("rhr","안정시 심박","Resting Heart Rate",
  ["편히 쉬고 있을 때의 1분 심박수예요. <b>아침에 일어나자마자 누운 채로 1분</b> 재면 가장 정확해요.",
   "심폐 체력이 좋아질수록 낮아지는 경향이 있어요(성인 보통 60–80, 운동하는 사람은 더 낮기도 해요). 입력하면 Karvonen 방식으로 더 개인에게 맞는 심박 존을 계산해요. 평소보다 갑자기 높으면 피로나 컨디션 저하의 신호일 수 있어요."],
  "회원(내 정보) 탭, 심박 탭"),
 ("hrr","여유심박 (HRR)","Heart Rate Reserve",
  ["최대심박에서 안정시 심박을 뺀 값이에요. 쉬는 상태에서 최대까지 <b>운동에 쓸 수 있는 심박 범위</b>를 뜻해요.",
   "예: 최대심박 186, 안정시 심박 61 → 여유심박 125. ‘60–70% HRR’은 이 125의 60–70%를 안정시 심박에 더한 범위예요(136–149bpm)."],
  "심박 탭 존 계산 방식, Zone 1–5 가이드"),
 ("karvonen","Karvonen 방식","여유심박으로 운동 강도 정하기",
  ["목표 심박 = 안정시 심박 + (최대심박 − 안정시 심박) × 강도%. 여유심박(HRR)을 이용해 운동 강도를 정하는 방법이에요.",
   "안정시 심박을 반영하므로 같은 나이라도 체력에 따라 다른 범위가 나와요. 그래서 단순히 최대심박의 %로 정하는 방식보다 사람마다 더 잘 맞아요. 안정시 심박이 없으면 %최대심박 방식을 써요."],
  "심박 탭 존 계산 방식"),
 ("tanaka","Tanaka 공식","최대심박 추정 공식",
  ["최대심박 = 208 − 0.7 × 나이. 많은 사람을 분석해 만든 최대심박 추정 공식이에요.",
   "흔히 쓰는 ‘220 − 나이’는 특히 40세 이상에서 최대심박을 낮게 잡는 경향이 있어서, 이 앱은 Tanaka 공식을 기본으로 써요."],
  "심박 탭 최대심박수 설정"),
 ("zone","심박 존 (Zone 1–5)","Heart Rate Zones",
  ["유산소 운동 강도를 심박수에 따라 <b>5단계로 나눈 구간</b>이에요. 숫자가 클수록 힘들어요.",
   "Z1 회복(편하게 대화 가능) · Z2 유산소 기초(문장으로 대화 가능, 지방을 주로 씀) · Z3 템포(짧은 문장만) · Z4 젖산역치(단어 몇 개) · Z5 최대(대화 불가, 인터벌).",
   "운동 일지에 유산소 평균 심박을 적으면 이 앱이 어느 존에서 운동했는지 자동으로 분류해서 주간 분포를 보여 줘요."],
  "심박 탭, 홈 심박 존"),
 ("vo2","VO2max","최대 산소 섭취량",
  ["운동할 때 몸이 1분 동안 받아들여 쓸 수 있는 <b>산소의 최대량</b>이에요. 심장·폐·근육이 함께 일하는 능력, 즉 심폐 체력을 대표하는 지표예요.",
   "높을수록 같은 운동을 덜 힘들게 할 수 있고 건강 지표와도 관련이 깊어요. Zone 5 인터벌 같은 고강도 운동이 VO2max를 높이는 데 효과적이에요."],
  "심박 탭 Zone 5"),
 ("lt","젖산역치","Lactate Threshold",
  ["운동 강도를 올리다 보면 어느 순간 <b>갑자기 숨이 차고 다리가 무거워지는</b> 지점이 있어요. 피로와 관련된 물질(젖산)이 빠르게 쌓이기 시작하는 이 강도를 젖산역치라고 해요.",
   "역치 근처(Zone 4)에서 훈련하면 이 지점이 올라가서, 더 빠른 속도를 더 오래 유지할 수 있게 돼요."],
  "심박 탭 Zone 4"),
 ("mito","미토콘드리아","Mitochondria",
  ["세포 안에서 <b>산소를 이용해 에너지를 만드는 작은 공장</b>이에요.",
   "Zone 2처럼 편안한 강도로 꾸준히 하는 유산소 운동이 미토콘드리아의 수와 기능을 늘려서, 지방을 연료로 잘 쓰고 덜 지치는 몸을 만들어 줘요."],
  "심박 탭 Zone 2"),
 ("interval","인터벌","Interval Training",
  ["아주 힘든 구간과 쉬는(가벼운) 구간을 <b>번갈아 반복</b>하는 훈련이에요. 예: 30초 전력 + 90초 천천히 × 6회.",
   "짧은 시간에 심폐 체력(VO2max)을 크게 높일 수 있지만 몸에 부담이 커서, 주 1–2회 정도로 충분히 회복하며 하는 것이 좋아요."],
  "심박 탭 Zone 5"),
 ("glyco","해당과정","Glycolysis",
  ["탄수화물(포도당)을 산소 없이 빠르게 쪼개 에너지를 만드는 과정이에요.",
   "전력 질주나 무거운 세트처럼 짧고 강한 운동에서 많이 써요. 그래서 탄수화물을 크게 줄이는 키토제닉 초기에는 이런 고강도 운동 수행이 떨어질 수 있어요."],
  "영양 탭 키토제닉 주의사항"),
]),
]
keys=[e[0] for g in G for e in g[1]]
need="rir rpe 1rm rm rmf volume hyper joint inbody smm bf lbm bmi ffmi ace bmr tdee act mifflin katch macro keto carni ea reds hrmax rhr hrr karvonen tanaka zone bpm vo2 lt mito interval glyco ketoflu".split()
assert sorted(keys)==sorted(need),(set(need)-set(keys),set(keys)-set(need))
toc=''.join(f'<li><a href="#g{i}">{n}</a></li>' for i,(n,_) in enumerate(G))
body=''
for i,(gn,items) in enumerate(G):
    body+=f'<section id="g{i}"><h2>{gn}</h2>'
    for k,t,sub,ps,where in items:
        body+=f'<article class="term" id="{k}"><h3>{t}{f" <small>{sub}</small>" if sub else ""}</h3>'+''.join(f'<p>{p}</p>' for p in ps)+f'<p class="where">앱에서 보는 곳: {where}</p></article>'
    body+='</section>'
out=f'''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TEMPT FIT 용어집</title>
<meta name="description" content="TEMPT FIT 앱에 나오는 운동·체성분·영양·심박 용어 해설">
{icon}
<style>:root{{--bg:#f7f4ee;--paper:#fffdf9;--ink:#1d1b18;--muted:#6b645a;--line:#e4dccd;--gold:#a8842f;--gold-soft:#f3ead4}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#141311;--paper:#1c1a17;--ink:#eee8dc;--muted:#a69d8d;--line:#35302a;--gold:#d8b665;--gold-soft:#2b2518}}}}
:root[data-theme="dark"]{{--bg:#141311;--paper:#1c1a17;--ink:#eee8dc;--muted:#a69d8d;--line:#35302a;--gold:#d8b665;--gold-soft:#2b2518}}
*{{box-sizing:border-box}}html{{-webkit-text-size-adjust:100%;scroll-behavior:smooth}}
body{{margin:0;background:var(--bg);color:var(--ink);font:16px/1.7 -apple-system,"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif;word-break:keep-all;overflow-wrap:anywhere}}
.wrap{{max-width:760px;margin:0 auto;padding:0 16px 64px}}
header{{text-align:center;padding:32px 0 20px}}
header .brand{{font:600 14px/1 Georgia,serif;letter-spacing:.32em;color:var(--gold)}}
header h1{{font-size:26px;margin:10px 0 6px}}header p{{color:var(--muted);margin:0}}
.tools{{padding:10px 0;border-bottom:1px solid var(--line);margin-bottom:16px}}
.tools input{{width:100%;font:inherit;padding:10px 14px;border:1px solid var(--line);border-radius:10px;background:var(--paper);color:var(--ink)}}
.tools ol{{list-style:none;display:flex;flex-wrap:wrap;gap:6px;padding:0;margin:8px 0 0}}
.tools a{{display:inline-block;padding:3px 12px;border:1px solid var(--line);border-radius:99px;color:var(--ink);text-decoration:none;font-size:14px;background:var(--paper)}}
section{{margin:0 0 24px}}section>h2{{font-size:19px;color:var(--gold);margin:0 0 10px}}
article.term{{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin:0 0 12px;scroll-margin-top:16px;transition:box-shadow .3s,border-color .3s}}
article.term:target{{border-color:var(--gold);box-shadow:0 0 0 3px var(--gold-soft)}}
article.term h3{{font-size:18px;margin:0 0 6px}}article.term h3 small{{display:block;font-size:13px;font-weight:400;color:var(--muted)}}
article.term p{{margin:6px 0}}.where{{font-size:14px;color:var(--muted)}}
.none{{display:none;color:var(--muted);text-align:center}}
footer{{color:var(--muted);font-size:13px;text-align:center;margin-top:28px}}
</style>
</head>
<body><div class="wrap">
<header><div class="brand">TEMPT FIT</div><h1>용어집</h1><p>앱에 나오는 운동·체성분·영양·심박 용어를 쉽게 풀어 썼어요.</p></header>
<div class="tools"><input id="q" type="search" placeholder="용어 찾기 (예: RIR, 기초대사량)" aria-label="용어 찾기"><ol>{toc}</ol></div>
{body}
<p class="none" id="none">찾는 용어가 없어요.</p>
<footer>앱의 수치는 공인 공식에 따른 추정치이며 의료적 진단을 대신하지 않습니다.</footer>
</div>
<script>
const q=document.getElementById('q'),arts=[...document.querySelectorAll('article.term')];
q.addEventListener('input',()=>{{const v=q.value.trim().toLowerCase();let n=0;arts.forEach(a=>{{const ok=!v||a.textContent.toLowerCase().includes(v);a.style.display=ok?'':'none';if(ok)n++;}});document.querySelectorAll('section').forEach(s=>{{s.style.display=[...s.querySelectorAll('article')].some(a=>a.style.display!=='none')?'':'none'}});document.getElementById('none').style.display=n?'none':'block';}});
</script>
</body></html>
'''
open(R + '/docs/guide/glossary.html','w').write(out)
print(len(keys),'terms')
