# HomeFit AI

사회초년생이 공고 사이트를 직접 뒤지지 않아도, 내 조건에 맞는 청년 주거 지원 공고를 신청할 시간이 남아 있을 때 알려 주고, 내가 승인한 준비 계획만 내 일정에 넣어 주는 웹앱입니다.

## 여는 법
1. Node.js 24를 설치하고 이 저장소를 받습니다.
2. `npm install`
3. `.env.example`을 `.env.local`로 복사하고 값을 채웁니다. 값은 팀 비공개 채널로만 주고받고, 저장소에 올리지 않습니다.
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`: Supabase 프로젝트 "HomeFit"
   - `DATA_GO_KR_SERVICE_KEY`: 공공데이터포털 인증키(마이홈 공고·기상청·실거래가)
   - `YOUTH_POLICY_API_KEY`: 온통청년 청년정책 API 인증키(청년 주거 정책 수집, [spec 006](docs/specs/006-청년정책-수집/spec.md)). 서버에서만 읽습니다
   - `AI_PROVIDER`: AI 공급자. `gemini`(개발, 무료) / `claude`(배포) / `mock`(실제 API를 부르지 않음). 비우면 개발·시험은 mock, 운영 배포는 AI 없이 기본 체크리스트
   - `GEMINI_API_KEY`(Google AI Studio 무료 키), `GEMINI_MODEL`(비우면 `gemini-3.5-flash-lite`), `ANTHROPIC_API_KEY`(Claude 실습 키). 키가 없거나 AI가 실패해도 앱은 돌고, 신청 준비 계획만 기본 체크리스트로 나옵니다
   - `SLACK_BOT_TOKEN`: 팀 슬랙 봇 토큰(슬랙 알림, 개발 중)
   - `CRON_SECRET`: 정기 수집 입구를 지키는 아무 긴 문자열
4. `npm run dev` → http://localhost:3000
5. 수집을 손으로 한 번 돌리기(개발 중):
   - 실제 공고: `curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/myhome`
   - 청년 주거 정책(온통청년): `curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/youth-policy` (`YOUTH_POLICY_API_KEY`가 없으면 500으로 알려 줍니다)
   - 가짜 공고 묶음: 주소 끝에 `?fixture=sample` (그 밖에 `changed`, `extended`, `later`, `correction`, `relaxed`, `bulk`, `bulk-changed`, `malformed`, `failure`, `fresh`. 운영 배포에서는 막힘)

## 시험
- `npm test` (Vitest, 순수 함수 시험)
- `npx tsc --noEmit` (타입 검사), `npm run lint`, `npm run build`
- 저장소를 새로 받은 폴더에서는 `npm run build`를 먼저 돌려야 `npx tsc --noEmit`이 통과합니다. `PageProps`·`LayoutProps` 타입을 Next가 빌드할 때 만들기 때문입니다
- 시험은 실제 AI API를 부르지 않습니다(mock). 공급자를 바꾸려면 `.env.local`의 `AI_PROVIDER`만 바꿉니다. AI 호출 수·시간·토큰·실패는 DB `llm_calls`에 남습니다(관리자만 읽음). 구조는 `lib/llm/`, 설명은 [spec 002](docs/specs/002-LLM-공급자/spec.md)

## 지금 되는 기능 (기능 001 공고·정책 사건 v0.5, 기능 002 LLM 공급자)
- 회원가입·로그인·로그아웃, 첫 설정과 "내 정보"에서 공고 조건(시도·시군구, 공급 유형, 월 임대료 상한, 나이) 입력. 시군구 목록은 공공데이터포털 법정동코드
- 마이홈 공공임대 모집공고를 하루 한 번 수집(Vercel Cron, 매일 00:00 UTC = 오전 9시), 실패는 수집 오류로 기록
- **맞는 공고**: 내 조건에 맞는 공고를 마감 순으로. 누르면 공고 원문 값 → AI 공고 요약(처음 열 때 한 번) → 팔로우 승인·거절(관심 없음) → 이 공고로 생긴 내 사건. 홈에 "정할 공고 N"
- **사건**: **팔로우한** 맞는 공고의 변화(접수 기간·임대료·공급 유형이 바뀜, 정정공고, 같은 단지 완화·재공고). 같은 변화는 사람마다 한 번, 단지 여럿은 하나로. 사건 목록에 바뀐 내용 한 줄, 상세 맨 위에 "무엇이 바뀌었나"
- 신청 준비 계획 초안: AI 요약(개발 Gemini 무료 플랜, 배포 Claude, 시험 mock)과 체크리스트. AI가 실패해도 기본 체크리스트
- 승인하면 체크리스트와 마감일이 내 일정에 들어가고, 거절하면 사유만 남고 일정은 그대로
- **슬랙 알림**: 내 정보 → 알림에서 팀 슬랙 이메일을 저장하고 켜면, 사건이 생길 때 HomeFit 봇이 DM으로 알림(6건 이상이면 묶음, 실패하면 다음 수집에 한 번 더)
- 남의 사건·일정·알림 설정은 볼 수 없음(관리자도 남의 사건은 승인·거절 못 하고, 남의 슬랙 이메일은 못 봄)
- 기능 003~008(습도·결로, 화면 뼈대, 관리자 시연·기록 찾기, 청년 정책, 팔로우 공고 일정, 시세 변화)은 아래 "기능 목록" 표에서 상태와 확인 결과(qa)로 이어집니다

## 기능 목록
상태는 각 spec 머리글 기준(2026-11-18)입니다. 실제로 확인한 결과(Pass/Fail/No Run, 수행자, 날짜, 증거)는 같은 폴더의 qa.md에 있습니다.

| 번호 | 기능 | spec 상태 | spec | 확인 결과 |
|---|---|---|---|---|
| 001 | 공고·정책 사건 | 승인됨 v0.5 | [spec](docs/specs/001-공고정책-사건/spec.md) | [qa](docs/specs/001-공고정책-사건/qa.md) |
| 002 | LLM 공급자 | 승인됨 | [spec](docs/specs/002-LLM-공급자/spec.md) | [qa](docs/specs/002-LLM-공급자/qa.md) |
| 003 | 습도·결로 위험 사건 | 승인됨 v0.2 | [spec](docs/specs/003-습도결로-사건/spec.md) | [qa](docs/specs/003-습도결로-사건/qa.md) |
| 004 | 화면 뼈대 | 초안 v0.3 | [spec](docs/specs/004-화면-뼈대/spec.md) | [qa](docs/specs/004-화면-뼈대/qa.md) |
| 005 | 관리자 시연·기록 찾기 | 초안 v0.1 (승인 전) | [spec](docs/specs/005-관리자-시연-기록찾기/spec.md) | [qa](docs/specs/005-관리자-시연-기록찾기/qa.md) |
| 006 | 온통청년 정책 수집 | v0.3 | [spec](docs/specs/006-청년정책-수집/spec.md) | [qa](docs/specs/006-청년정책-수집/qa.md) |
| 007 | 팔로우 공고 일정 | v0.1 | [spec](docs/specs/007-팔로우공고-일정/spec.md) | [qa](docs/specs/007-팔로우공고-일정/qa.md) |
| 008 | 시세 변화 사건 | v0.1 | [spec](docs/specs/008-시세-변화-사건/spec.md) | [qa](docs/specs/008-시세-변화-사건/qa.md) |

## 배포
- `npm run deploy`: Vercel 운영 배포가 끝나면 배포된 주소(https://homefit-lac.vercel.app)로 수집을 한 번 바로 부릅니다. 팀이 "배포해줘"라고 할 때만 씁니다
- 새 환경변수(`AI_PROVIDER`, `GEMINI_API_KEY`, `SLACK_BOT_TOKEN` 등)는 Vercel 프로젝트에도 넣어야 합니다

## 기획 문서
`docs/Intent.md`부터 읽습니다. 무엇을, 왜, 어디까지 만드는지와 다른 문서로 가는 지도가 있습니다.

| 안내서 이름 | 이 저장소 |
|---|---|
| 문제 정의 | [docs/문제정의.md](docs/문제정의.md), [GLOSSARY.md](GLOSSARY.md), [docs/adr/](docs/adr/) |
| 인터뷰 | [interviews/](interviews/) (사람·AI 구분 표시) |
| IA | [docs/IA.md](docs/IA.md), [docs/IA.xlsx](docs/IA.xlsx) |
| uj.md | [docs/journeys/](docs/journeys/README.md) |
| prd.md | [docs/PRD.md](docs/PRD.md) |
| 데이터설계.md, erd.md | [docs/ERD.md](docs/ERD.md), DB 변경: [supabase/migrations/](supabase/migrations/) |
| intent.md | [docs/Intent.md](docs/Intent.md) |
| spec.md, plan.md | [docs/specs/001-공고정책-사건/](docs/specs/001-공고정책-사건/spec.md) |
| qa.md | [docs/specs/001-공고정책-사건/qa.md](docs/specs/001-공고정책-사건/qa.md) |
| 평가 항목 점검표 | [docs/프로젝트3-평가항목.md](docs/프로젝트3-평가항목.md) |
| 조각 표(분배·작업 순서) | [docs/plan.md](docs/plan.md) |
| 데이터 출처 | `docs/data-sources.md` (조각 C1 작업 중, main에 합쳐지면 링크 연결) |
| 커넥터, 서브에이전트 | `docs/connectors.md`, `docs/agents.md` (조각 C1 작업 중) |
| 디버그 기록, 전체 QA 모음 | `docs/debug-note.md`, `docs/qa.md` (조각 C1 작업 중) |
| 시연 순서 | [docs/demo-order.md](docs/demo-order.md) (초안, 팀 확인 전) |
| 발표 슬라이드 | `slides/index.html` (조각 C2 작업 중) |

## 팀과 작업 방식
- 팀 하네스(규칙·스킬): [CLAUDE.md](CLAUDE.md), [.claude/rules/](.claude/rules/), [.claude/skills/](.claude/skills/)
- 서비스 주소: https://homefit-lac.vercel.app (Vercel 무료 플랜, 로그인해야 화면이 보임). 발표 주소: (slides 배포 뒤 채움)
- QA: 기능별 확인 결과는 위 "기능 목록" 표의 qa 링크, 전체 모음은 `docs/qa.md`(조각 C1 작업 중)
- 조각 표와 브랜치·PR 순서: [docs/plan.md](docs/plan.md)

### 팀원
병합된 PR #1~#9 기준(2026-11-18)입니다. 열린 PR은 #10(선우, 커넥터·서브에이전트 문서)과 #11(예림, 조각 B)입니다. PR과 리뷰가 새로 생기면 이 표를 고칩니다.

| 이름 | GitHub | 맡은 조각 | 대표 PR | 리뷰 |
|---|---|---|---|---|
| 예림 | dbdpfla98 | B, E, 기획 문서와 기능 001~008 | [#1](https://github.com/LS-PROJECT-TEAM3/HomeFit/pull/1) 팀 하네스·문제정의, [#2](https://github.com/LS-PROJECT-TEAM3/HomeFit/pull/2) IA, [#4](https://github.com/LS-PROJECT-TEAM3/HomeFit/pull/4) 기능 001~008, [#8](https://github.com/LS-PROJECT-TEAM3/HomeFit/pull/8) 집 비교 실질 주거비(조각 E) | [#5](https://github.com/LS-PROJECT-TEAM3/HomeFit/pull/5), [#7](https://github.com/LS-PROJECT-TEAM3/HomeFit/pull/7), [#9](https://github.com/LS-PROJECT-TEAM3/HomeFit/pull/9) 승인 |
| 현경 | gaangstar | A, D | 아직 (조각 A·D PR 예정) | [#1](https://github.com/LS-PROJECT-TEAM3/HomeFit/pull/1), [#4](https://github.com/LS-PROJECT-TEAM3/HomeFit/pull/4), [#8](https://github.com/LS-PROJECT-TEAM3/HomeFit/pull/8) 승인 |
| 선우 | sunwood0803 | C1 | [#3](https://github.com/LS-PROJECT-TEAM3/HomeFit/pull/3) 하네스 규칙을 팀 스택에 맞춤, [#5](https://github.com/LS-PROJECT-TEAM3/HomeFit/pull/5) 제출 문서(data-sources·debug-note·qa) | [#6](https://github.com/LS-PROJECT-TEAM3/HomeFit/pull/6), [#7](https://github.com/LS-PROJECT-TEAM3/HomeFit/pull/7), [#9](https://github.com/LS-PROJECT-TEAM3/HomeFit/pull/9) 승인 |
| 서윤 | lilyoon333 | C2 | [#6](https://github.com/LS-PROJECT-TEAM3/HomeFit/pull/6) README·.env.example 보강, [#7](https://github.com/LS-PROJECT-TEAM3/HomeFit/pull/7) 시연 순서, [#9](https://github.com/LS-PROJECT-TEAM3/HomeFit/pull/9) 시연 순서 정정 | [#5](https://github.com/LS-PROJECT-TEAM3/HomeFit/pull/5) 승인과 코멘트 |
