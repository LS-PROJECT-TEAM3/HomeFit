# HomeFit AI

사회초년생이 공고 사이트, 날씨 예보, 시세를 직접 찾아보지 않아도 자기에게 맞는 주거 지원 공고·정책, 습도·결로 위험, 전월세 시세 변화를 대응할 시간이 남아 있을 때 알림으로 받고, 본인이 승인한 대응만 일정에 저장하며, 집을 고를 때는 관리비·교통비까지 더한 실질 주거비와 입주 전 점검으로 비교할 수 있게 하는 앱. 무엇을, 왜, 어디까지 만드는지는 `docs/Intent.md`에 있다.

프로젝트 3(팀 과제)이다. 평가 항목 전체와 채우는 곳은 `docs/프로젝트3-평가항목.md`(P3-01~38)에 있고, 모든 항목을 채운다.

## 팀 하네스
팀원 누구의 컴퓨터에서도 같은 규칙으로 작업하도록 하네스를 저장소에 둔다.
- 작업 흐름: @.claude/rules/harness.md
- 코드: @.claude/rules/code.md
- 시험·리뷰·문서화: @.claude/rules/quality.md
- 디자인 기본선: @.claude/rules/design.md
- Git·보안·병렬 작업: @.claude/rules/git-security.md
- 스킬: `.claude/skills/` (harness-ia, harness-journeys, harness-prd, harness-erd, harness-intent, harness-spec-plan, harness-qa, grill-with-docs, grilling, domain-modeling)
- 위 파일과 이 파일이 다르면 이 파일이 우선한다. 규칙을 바꾸면 PR로 바꾸고 이유를 적는다.
- `harness.md` 6절의 "사용자"는 이 저장소에서 작업하는 팀원 누구나다.

## 팀 작업 규칙 (안내서)
- 작업 전에 관련 기획 문서를 읽고, 요구마다 어느 문서에서 왔는지 출처 ID를 적는다. PR 설명에도 "어느 문서의 어느 요구를 만들었는지" 한 줄을 적는다.
- 조각마다 브랜치 하나, PR 하나. 리뷰 1명 이상 뒤에 main에 합친다. 충돌은 그 코드를 쓴 팀원과 같이 푼다.
- 사람이 승인하기 전에는 어떤 조치(일정·목록 변경, 메시지 발송)도 실행하지 않는다. 관리자도 승인을 건너뛰지 못한다.
- 읽기 실패는 "변화 없음"이 아니라 수집 오류로 기록한다. 같은 변화를 다시 읽어도 사건·조치가 두 번 생기지 않는다.
- 비교·저장·권한 검사는 코드로 한다. Claude API는 요약·대응안 초안·기록 찾기 답변에만 쓰고 출처를 함께 보여 준다.
- 위키(`wiki/`): 원본 문서는 사람이 PR로 고치고 Claude는 읽기만 한다. 문서가 바뀌면 위키에 넣을 계획부터 보여 주고 사람이 확인한 뒤 반영한다. 두 문서가 다르게 말하면 한쪽으로 정리하지 않고 충돌로 둘 다 적는다. 점검은 고치지 않고 표로만 보고한다.
- 인터뷰 기록(`interviews/`)은 사람인지 AI인지 표시한다. AI 인터뷰·가짜 데이터를 실제 조사처럼 쓰지 않는다. 인터뷰 대상의 신원은 어디에도 적지 않는다.

## 하지 않을 것
출처: docs/PRD.md 9절(승인 2026-11-17). 바꾸려면 PRD를 먼저 고친다.
- 민간 부동산 플랫폼 매물 크롤링
- 전세사기 여부 자동 확정, 실제 계약·금융 거래 실행
- 실제 전기설비·건축물 안전 인증
- 공고 자격 자동 판정 ("공고문 기준 확인 필요"로만 안내)
- 정책 예산 소진 감지, 정책 페이지 긁어 오기
- 전기요금 변경 사건
- 개인화 추천 점수, 에너지 시뮬레이션 고도화
- 누수·건물 하자 예측
- 보증금·월세 전환율 비교
- 이후 범위(1차에서 안 함): 앱 푸시·메신저(카카오톡 등) 알림, 출퇴근 정보, 건축물 정보

## 스택
- 언어·프레임워크: Next.js(App Router) + TypeScript(strict). 스타일은 Tailwind 없이 CSS 변수만 쓴다
- 계산: 결로·비용 같은 계산은 TypeScript 순수 함수로 쓴다. Python은 데이터 탐색용으로만 쓴다
- 저장소: Supabase(PostgreSQL, 로그인, 행 단위 권한, pgvector로 RAG). 고른 이유는 PRD에 적는다
- AI: Claude API(실습 키는 강사가 준다. 키는 서버 환경변수 `.env`에만 둔다)
- 정기 수집: Vercel의 정기 실행 또는 Supabase 예약 함수 중 하나. 무료 플랜의 간격 제한을 설명서에서 확인하고 첫 수집 기능 plan에서 정한다. n8n은 쓰지 않는다
- 외부 데이터: 공공데이터포털 API 등(키 승인에 시간이 걸리니 일찍 신청, 호출 한도·약관 확인)
- 배포: Vercel(서비스와 `slides/index.html` 두 주소). 안내서상 필수지만 실제 배포는 팀이 "배포해줘"라고 할 때 비용·공개 범위를 보여 주고 한다

## 폴더
- 바깥은 안내서 이름을 쓴다: `app/`(웹앱, Next.js 라우트), `watch/`(수집), `incident/`(사건·알림·승인), `knowledge/`(기록·찾기), `sim/`, `eval/`, `flow/`(flow.json, 흐름 화면), `chat/`(위키 챗봇), `wiki/`, `interviews/`, `slides/`
- 각 폴더 안에서 계산·판단(순수 함수)과 DB·API를 부르는 코드를 다른 파일로 나눈다. 순수 함수는 DB·네트워크·현재 시각을 직접 쓰지 않는다

## 문서 이름
하네스 이름을 쓰고, 안내서 이름과의 연결은 README에 둔다(`docs/프로젝트3-평가항목.md` E절).
- 하네스: `docs/문제정의.md`, `docs/IA.md`, `docs/journeys/`(=uj), `docs/PRD.md`(=prd), `docs/ERD.md`(=데이터설계·erd), `docs/Intent.md`(=intent), `docs/specs/NNN-기능/`(spec·plan·qa)
- 안내서에만 있는 것: `docs/plan.md`(조각 표), `docs/qa.md`(전체 QA 모음), `docs/data-sources.md`, `docs/connectors.md`, `docs/agents.md`, `docs/flow.md`, `docs/wiki-chat.md`, `docs/debug-note.md`

## 명령
- 시험: `npm test` (Vitest)
- 화면 확인: `.claude/launch.json`의 `web` 서버 (`npm run dev`, 포트 3000)
- (Next.js 프로젝트를 만드는 첫 plan 단계에서 실제로 돌려 보고 맞춘다)

## 디자인
기본선은 `.claude/rules/design.md`. 여기에는 이 프로젝트의 취향만 적는다.
- 스타일: 신뢰 파랑 미니멀(ui-ux-pro-max "Minimalism & Swiss Style") + 대시보드만 벤토 카드 배치(design-styles `bento`). 돈 계산과 위험 알림이 핵심이라 숫자가 또렷하고 신뢰감 있는 색을 골랐고, 홈 대시보드는 주거비·사건·승인 대기 요약을 크기가 다른 카드 격자로 보여 준다(사용자 선택, 2026-11-17)
- 기준 색: primary `#2563EB`(글자 `#FFFFFF`), secondary `#3B82F6`(글자 `#000000`), accent·CTA `#EA580C`(글자 `#000000`), 배경 `#F8FAFC`, 카드 `#FFFFFF`, 글자 `#1E293B`, 흐린 칸 `#E9EFF8`, 흐린 글자 `#475569`, 테두리 `#E2E8F0`, 위험 `#DC2626`(글자 `#FFFFFF`), 초점 링 `#2563EB`
- 흐름 화면 상태 색: 성공 초록 실선, 실패 빨강(`#DC2626`), 승인 대기 주황 점선(`#EA580C`), 아직 안 켜짐 회색. 색과 함께 글자 라벨도 붙인다
- 글꼴: Pretendard 하나로 한글·영문·숫자. 금액·건수는 `font-variant-numeric: tabular-nums`
- 간격: 16/24/32/48/64px 기본 단계, 벤토 카드 사이 16~24px, 마우스 올림 전환 200ms 안팎, 그림자는 쓰더라도 얕게
- 토큰 위치: `app/tokens.css` (CSS 변수 한곳)
- 참고: 아이콘은 이모지 대신 SVG(Lucide 등)

## 전역 규칙과 다른 점
형식: `- [전역 파일 §절] 전역 값 → 이 프로젝트 값 (이유)`
- [CLAUDE.md §8] 프로젝트 CLAUDE.md는 전역과 다른 점만 → 하네스 규칙·스킬을 `.claude/`에 복사해 불러온다 (팀원 컴퓨터에는 전역 하네스가 없고, 안내서가 "팀원 모두 같은 규칙과 스킬"을 평가한다)
- [rules/code.md §스택] 빌드 없는 HTML/CSS/JS + 브라우저 저장 → Next.js + TypeScript + Supabase (로그인·DB·정기 자동 수집·API 키 서버 보관이 필수 요구사항)
- [rules/code.md §스택] 계정·API 키가 필요한 외부 서비스는 피한다 → Supabase, Claude API, 공공데이터포털 API를 쓴다 (같은 이유. 비용이 드는 일은 하기 전에 알린다)
- [rules/code.md §스택] 빌드 없는 JS 시험은 `node:test` → Vitest (TypeScript·Next.js)
- [rules/code.md §구조] 폴더는 domain/application/infrastructure/ui 네 가지만 → 안내서 폴더 이름을 바깥에 쓰고 안에서 순수 함수와 바깥 호출을 나눈다 (채점자가 안내서 위치로 찾는다)
- [rules/git-security.md §Git] 브랜치는 `main` 하나 → 조각마다 브랜치와 PR, 리뷰 1명 이상 (팀 작업, 안내서 7절)
- [rules/git-security.md §배포] 직접 요청 없는 배포 금지 → 그대로 지키되, 서비스와 발표 슬라이드 배포가 제출 필수임을 일정에 넣는다

## 현재 코드
- (개발을 시작하면 파일별 역할을 한 줄씩 적는다)
