# HomeFit AI

사회초년생이 공고 사이트를 직접 뒤지지 않아도, 내 조건에 맞는 청년 주거 지원 공고를 신청할 시간이 남아 있을 때 알려 주고, 내가 승인한 준비 계획만 내 일정에 넣어 주는 웹앱입니다.

## 여는 법
1. Node.js 24를 설치하고 이 저장소를 받습니다.
2. `npm install`
3. `.env.example`을 `.env.local`로 복사하고 값을 채웁니다. 값은 팀 비공개 채널로만 주고받고, 저장소에 올리지 않습니다.
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`: Supabase 프로젝트 "HomeFit"
   - `DATA_GO_KR_SERVICE_KEY`: 공공데이터포털 인증키(마이홈 공고)
   - `ANTHROPIC_API_KEY`: Claude 실습 키. 없어도 앱은 돌고, 신청 준비 계획만 AI 요약 없이 기본 체크리스트로 나옵니다
   - `CRON_SECRET`: 정기 수집 입구를 지키는 아무 긴 문자열
4. `npm run dev` → http://localhost:3000
5. 수집을 손으로 한 번 돌리기(개발 중):
   - 실제 공고: `curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/myhome`
   - 가짜 공고 묶음: 주소 끝에 `?fixture=sample` (그 밖에 `changed`, `malformed`, `failure`, `bulk`, `fresh`. 운영 배포에서는 막힘)

## 시험
- `npm test` (Vitest, 순수 함수 시험)
- `npx tsc --noEmit` (타입 검사), `npm run lint`, `npm run build`

## 지금 되는 기능 (기능 001 공고·정책 사건)
- 회원가입·로그인·로그아웃, 첫 설정과 "내 정보"에서 공고 조건(시도, 공급 유형, 월 임대료 상한, 나이) 입력
- 마이홈 공공임대 모집공고를 하루 한 번 수집(Vercel Cron, 매일 00:00 UTC = 오전 9시), 실패는 수집 오류로 기록
- 조건에 맞는 새 공고 → 사건 생성(같은 공고는 사람마다 한 번), 공고 내용이 바뀌면 "바뀜" 표시
- 홈 대시보드(새 사건·승인 대기·다가오는 일정), 사건 목록(상태·기간 거르기, 수집 상태 안내), 사건 상세(공고 원문 값, 남은 날, 신청 준비 계획)
- 승인하면 체크리스트와 마감일이 내 일정에 들어가고, 거절하면 사유만 남고 일정은 그대로
- 남의 사건·일정은 볼 수 없음(관리자도 남의 사건은 승인·거절 못 함)
- 아직 안 되는 것: 습도·결로 위험, 전월세 시세 변화, 기록 찾기 챗봇, 시군구 선택(Q18). Claude 키가 만료돼 AI 요약은 잠시 꺼져 있음(`docs/Intent.md` Q19)

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

## 팀과 작업 방식
- 팀 하네스(규칙·스킬): [CLAUDE.md](CLAUDE.md), [.claude/rules/](.claude/rules/), [.claude/skills/](.claude/skills/)
- 서비스 주소: https://homefit-lac.vercel.app (Vercel 무료 플랜, 로그인해야 화면이 보임). 발표 주소: (slides 만든 뒤 채움)
- 팀원 GitHub 아이디: dbdpfla98, gaangstar, sunwood0803, lilyoon333. 이름·대표 PR과 리뷰: (팀원 확인 뒤 채움)
