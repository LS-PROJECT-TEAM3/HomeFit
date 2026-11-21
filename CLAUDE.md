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
- 스킬: `.claude/skills/` (harness-ia, harness-journeys, harness-prd, harness-erd, harness-intent, harness-spec-plan, harness-qa, grill-with-docs, grilling, domain-modeling, wiki-ingest, wiki-query, wiki-lint, ui-ux-pro-max, frontend-design). 외부에서 가져온 스킬(ui-ux-pro-max: MIT, nextlevelbuilder/ui-ux-pro-max-skill `2de1134`. frontend-design: Apache-2.0, Anthropic)은 각 폴더에 라이선스가 있다. 두 스킬이 권하는 색·글꼴·라이브러리보다 이 파일의 "디자인"·"스택" 절이 우선한다
- 위 파일과 이 파일이 다르면 이 파일이 우선한다. 규칙을 바꾸면 PR로 바꾸고 이유를 적는다.
- `harness.md` 6절의 "사용자"는 이 저장소에서 작업하는 팀원 누구나다.

## 팀 작업 규칙 (안내서)
- 작업 전에 관련 기획 문서를 읽고, 요구마다 어느 문서에서 왔는지 출처 ID를 적는다. PR 설명에도 "어느 문서의 어느 요구를 만들었는지" 한 줄을 적는다.
- 사람마다 이름 브랜치 하나를 계속 쓰고, 조각 하나가 끝날 때마다 그 브랜치에서 PR 하나를 올린다. 리뷰 1명 이상 뒤에 main에 "Create a merge commit"으로 합친다(squash 금지). PR이 합쳐지면 다음 조각 전에 main을 내 브랜치에 받는다. 충돌은 그 코드를 쓴 팀원과 같이 푼다. 순서는 docs/plan.md 2절 (팀 결정 2026-11-18)
- 사람이 승인하기 전에는 어떤 조치(일정·목록 변경, 메시지 발송)도 실행하지 않는다. 관리자도 승인을 건너뛰지 못한다.
- 사건 알림(슬랙·웹 푸시)은 사용자가 "내 정보 → 계정·알림"에서 직접 켠 경우에만 본인에게 보낸다(웹 푸시는 기기마다). 켜는 것이 알림 승인이고, 대응은 여전히 하나씩 승인한다. 출처: PRD v1.2 FR-37, PRD v1.20 FR-35
- 읽기 실패는 "변화 없음"이 아니라 수집 오류로 기록한다. 같은 변화를 다시 읽어도 사건·조치가 두 번 생기지 않는다.
- 비교·저장·권한 검사는 코드로 한다. LLM(개발 Gemini, 배포 Claude, 시험 mock. `AI_PROVIDER`로 고름)은 요약·대응안 초안·기록 찾기 답변에만 쓰고 출처를 함께 보여 준다. 시험과 Ralph Loop는 실제 API를 부르지 않는다.
- 위키(`wiki/`): 원본 문서는 사람이 PR로 고치고 Claude는 읽기만 한다. 문서가 바뀌면 위키에 넣을 계획부터 보여 주고 사람이 확인한 뒤 반영한다. 두 문서가 다르게 말하면 한쪽으로 정리하지 않고 충돌로 둘 다 적는다. 점검은 고치지 않고 표로만 보고한다. 위키 반영은 위키 담당(docs/plan.md 조각 A)만 하고, 다른 팀원은 원본만 고친다. 담당은 main을 받은 뒤 점검으로 바뀐 원본을 찾아 반영한다(spec 012 Q8, 2026-11-18)
- 인터뷰 기록(`interviews/`)은 사람인지 AI인지 표시한다. AI 인터뷰·가짜 데이터를 실제 조사처럼 쓰지 않는다. 인터뷰 대상의 신원은 어디에도 적지 않는다.

## 하지 않을 것
출처: docs/PRD.md 9절(승인 2026-11-17). 바꾸려면 PRD를 먼저 고친다.
- 민간 부동산 플랫폼 매물 크롤링
- 전세사기 여부 자동 확정, 실제 계약·금융 거래 실행
- 실제 전기설비·건축물 안전 인증
- 공고 자격 자동 판정 ("공고문 기준 확인 필요"로만 안내)
- 정책 예산 소진 감지, 정책 페이지 긁어 오기
- 전기요금 변경 사건
- 개인화 추천 점수 (에너지비 입력·요금표 계산·근거 있는 추정은 범위로 옮김, 사용자 결정 2026-11-18, PRD v1.10)
- 누수·건물 하자 예측
- 보증금·월세 전환율 비교
- 이후 범위(1차에서 안 함): 카카오톡 알림(슬랙은 1차 PRD FR-37, 웹 푸시는 1차 PRD v1.20 FR-35, 사용자 결정 2026-11-20), 출퇴근 정보. 건축물 정보는 조회만 1차로 옮김(PRD v1.8 FR-34, 사용자 결정 2026-11-18)

## 스택
- 언어·프레임워크: Next.js(App Router) + TypeScript(strict). 스타일은 Tailwind 없이 CSS 변수만 쓴다
- 계산: 결로·비용 같은 계산은 TypeScript 순수 함수로 쓴다. Python은 데이터 탐색용으로만 쓴다
- 저장소: Supabase(PostgreSQL, 로그인, 행 단위 권한, pgvector로 RAG). 고른 이유는 PRD에 적는다
- AI: `lib/llm/`의 공급자 구조(spec 002). 개발은 Gemini API 무료 플랜, 배포는 Claude API(실습 키는 강사가 준다). 키는 서버 환경변수에만 둔다
- 정기 수집: Vercel의 정기 실행 또는 Supabase 예약 함수 중 하나. 무료 플랜의 간격 제한을 설명서에서 확인하고 첫 수집 기능 plan에서 정한다. n8n은 쓰지 않는다
- 외부 데이터: 공공데이터포털 API 등(키 승인에 시간이 걸리니 일찍 신청, 호출 한도·약관 확인)
- 배포: Vercel(서비스와 `slides/index.html` 두 주소). 안내서상 필수지만 실제 배포는 팀이 "배포해줘"라고 할 때 비용·공개 범위를 보여 주고 한다

## 폴더
- 바깥은 안내서 이름을 쓴다: `app/`(웹앱, Next.js 라우트), `watch/`(수집), `incident/`(사건·알림·승인), `knowledge/`(기록·찾기), `eval/`, `flow/`(흐름 화면이 읽는 실행 기록 해석 `graph.ts`), `interviews/`
- 아직 없는 폴더(만들 때 이 이름을 쓴다): `sim/`(지금 시뮬레이션은 `watch/simulation.ts`·`watch/sim-fixtures.ts`), `chat/`(위키 챗봇), `wiki/`, `slides/`. 안내서는 이름을 바꿔도 된다고 하니 실제 위치는 README에서 연결한다
- 각 폴더 안에서 계산·판단(순수 함수)과 DB·API를 부르는 코드를 다른 파일로 나눈다. 순수 함수는 DB·네트워크·현재 시각을 직접 쓰지 않는다

## 문서 이름
하네스 이름을 쓰고, 안내서 이름과의 연결은 README에 둔다(`docs/프로젝트3-평가항목.md` E절).
- 하네스: `docs/문제정의.md`, `docs/IA.md`, `docs/journeys/`(=uj), `docs/PRD.md`(=prd), `docs/ERD.md`(=데이터설계·erd), `docs/Intent.md`(=intent), `docs/specs/NNN-기능/`(spec·plan·qa)
- 안내서에만 있는 것: `docs/plan.md`(조각 표), `docs/qa.md`(전체 QA 모음), `docs/data-sources.md`, `docs/connectors.md`, `docs/agents.md`, `docs/flow.md`, `docs/wiki-chat.md`, `docs/debug-note.md`

## 명령
- 시험: `npm test` (Vitest). 함께: `npx tsc --noEmit`, `npm run lint`, `npm run build`
- 화면 확인: `.claude/launch.json`의 `homefit-web` 서버 (`npm run dev`, 포트 3000). 세션을 다른 폴더에서 열었으면 이름으로 켤 때 그 폴더의 서버가 켜질 수 있으니, 이미 켜 둔 http://localhost:3000 을 직접 연다
- 수집 손으로 돌리기(개발): `Authorization: Bearer <CRON_SECRET>`를 붙여 `/api/cron/myhome` 호출. 가짜 공고는 `?fixture=sample|changed|malformed|failure|bulk|fresh`
- AI 공급자: `.env.local`의 `AI_PROVIDER`(gemini/claude/mock). 시험은 mock만, 호출 기록은 DB `llm_calls`

## 디자인
기본선은 `.claude/rules/design.md`. 여기에는 이 프로젝트의 취향만 적는다. 기준 화면은 Claude Design 캔버스 "HomeFit 흐름 2"의 v2 보드, 부품·토큰 설명은 디자인 시스템 artifact(v1.8.1)다. 바꾼 까닭과 범위는 `docs/specs/022-디자인-전체-수정/` (팀 결정, 2026-11-21. 이전의 신뢰 파랑·벤토 카드를 대신한다)
- 스타일: 차분한 종이 느낌의 편집 디자인. 화면은 두 가지 틀로 나눈다. 포스터형(홈·에너지 분석처럼 큰 제목과 숫자 하나로 시작하는 화면)과 기본형(목록·설정·상세처럼 위쪽 메뉴 아래 바로 내용이 오는 화면)
- 기준 색(토큰 이름 = 값): `primary-normal` #4E5B4E(글자 흰색), `primary-strong` #2F3B2F, 바탕 `background-normal-normal` #F6F4F2, 카드 `background-elevated-normal` #FFFFFF, 흐린 칸 `background-normal-alternative` #ECE9E4, 글자 `label-normal` #55463D, 흐린 글자 `label-neutral` #554D47·`label-alternative` #675F59, 테두리 `line-normal-normal` #E9E6E1, 입력칸 경계 `line-solid-normal` #8A8E88(3:1 이상), 위험 `status-negative` #A12B2B, 주의 `status-cautionary` #8A5A12, 초점 링 `focus-ring` #55463D(3px + 흰 띠 2px)
- 흐름 화면 상태 색: 성공 `status-positive` 실선, 실패 `status-negative`, 승인 대기 `status-cautionary` 점선, 아직 안 켜짐 `label-alternative` 회색. 색과 함께 글자 라벨도 붙인다
- 글꼴 세 가지: 본문·숫자 Pretendard(`--font-sans`), 제목(h1~h3)과 큰 숫자 Noto Serif KR 500(`--font-serif`), 로고 글자만 Cormorant Garamond(`--font-logo`). 금액·건수는 `font-variant-numeric: tabular-nums`
- 모양: 모서리는 입력·버튼 4px(`--radius-control`), 카드 0px. 그림자는 쓰지 않고 선으로 나눈다(펼친 목록·대화 상자만 예외)
- 위쪽 메뉴: 맞춤 공고·알림·내 일정·더보기(홈은 왼쪽 로고, IA v1.19), 오른쪽 이름 메뉴(설정·관리자·로그아웃). PC 72px, 휴대폰 60px + 전체 화면 메뉴. `app/(main)/top-nav.tsx` (IA v1.17)
- 간격: 화면 좌우 여백 PC 56px·포스터 176px·휴대폰 16px(`--spacing-screen-padding-*`). 예전 화면의 16/24/32/48/64px 단계(`--space-1..5`)는 화면 PR에서 옮길 때까지 남겨 둔다
- 토큰 위치: `app/tokens.css` 한곳. 위쪽은 디자인 시스템 토큰, 아래쪽은 예전 이름(`--color-*`)을 새 토큰에 잇는 별칭이다. 새 코드는 디자인 시스템 이름을 쓴다
- 참고: 아이콘은 이모지 대신 SVG(Lucide 등)

## 전역 규칙과 다른 점
형식: `- [전역 파일 §절] 전역 값 → 이 프로젝트 값 (이유)`
- [CLAUDE.md §8] 프로젝트 CLAUDE.md는 전역과 다른 점만 → 하네스 규칙·스킬을 `.claude/`에 복사해 불러온다 (팀원 컴퓨터에는 전역 하네스가 없고, 안내서가 "팀원 모두 같은 규칙과 스킬"을 평가한다)
- [rules/code.md §스택] 빌드 없는 HTML/CSS/JS + 브라우저 저장 → Next.js + TypeScript + Supabase (로그인·DB·정기 자동 수집·API 키 서버 보관이 필수 요구사항)
- [rules/code.md §스택] 계정·API 키가 필요한 외부 서비스는 피한다 → Supabase, Gemini API(개발), Claude API, 공공데이터포털 API를 쓴다 (같은 이유. 비용이 드는 일은 하기 전에 알린다)
- [rules/code.md §스택] 빌드 없는 JS 시험은 `node:test` → Vitest (TypeScript·Next.js)
- [rules/code.md §구조] 폴더는 domain/application/infrastructure/ui 네 가지만 → 안내서 폴더 이름을 바깥에 쓰고 안에서 순수 함수와 바깥 호출을 나눈다 (채점자가 안내서 위치로 찾는다)
- [rules/git-security.md §Git] 브랜치는 `main` 하나 → 사람마다 이름 브랜치 하나, 조각마다 PR 하나, 리뷰 1명 이상 (팀 작업, 안내서 7절, 팀 결정 2026-11-18)
- [rules/git-security.md §배포] 직접 요청 없는 배포 금지 → 그대로 지키되, 서비스와 발표 슬라이드 배포가 제출 필수임을 일정에 넣는다

## 현재 코드
2026-11-18 기준. 기능이 끝날 때마다 `harness-intent` 절차 B에서 함께 고친다.
- `app/(auth)/`: 로그인·가입·로그아웃
- `app/(main)/`: 로그인 뒤 화면. 홈, `notices/`(맞는 공고), `incidents/`(사건 목록·상세·승인·거절), `schedule/`(내 일정), `onboarding/`(첫 설정), `my/`(내 집·공고 조건·슬랙 알림·계정), `policy/`(청년 주거지원 정책), `knowledge/`(기록 찾기·처리 기록·출처), `qc/`·`compare/`·`energy/`(일부는 화면 뼈대, spec 004), `admin/`(개요·회원·수집·사건·흐름 화면·시뮬레이터·채점·위키 챗봇 자리)
- `app/api/`: `cron/`(myhome, youth-policy, rent, weather. 일정은 `vercel.json`), `chat`(챗봇), `building`, `sigungu`, `umd`
- `watch/`: 수집(마이홈, 온통청년, 기상청, 실거래가, 건축HUB, 법정동 시군구). 순수 함수와 `*.server.ts`, 가짜 응답(`sim-fixtures.ts`, `fixtures/`), 시뮬레이션(`simulation.ts`)
- `incident/`: 공고·습도결로·시세 사건 판단과 문구(순수 함수), 사건·계획·일정·슬랙 알림 읽고 쓰기(`*.server.ts`)
- `knowledge/`: 처리 기록 찾기, 챗봇 답변
- `flow/graph.ts`: 흐름 화면용 실행 기록 해석. 화면은 `app/(main)/admin/flow/`
- `eval/`: 감지 채점(정답 붙은 가짜 묶음)과 결과
- `lib/llm/`: AI 공급자 구조(gemini·claude·mock, 다시 시도·상한·호출 기록), spec 002. `lib/supabase/`: 서버·관리자 클라이언트, DB 타입
- `supabase/migrations/`: DB 표·권한 규칙·DB 함수 (0001~0017)
- `proxy.ts`: 로그인 세션 새로 고침. `scripts/deploy.mjs`: `npm run deploy`. `tests/`: Vitest 시험
