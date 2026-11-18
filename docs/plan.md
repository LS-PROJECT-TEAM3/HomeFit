# 조각 표 (팀 분배)

- 최종 갱신: 2026-11-18 (팀 분배 결정: 예림)
- 규칙(팀 결정 2026-11-18, 예림): **사람마다 이름 브랜치 하나**를 계속 쓰고, **조각 하나가 끝날 때마다 그 브랜치에서 PR 하나**를 올린다. 리뷰 1명 이상 뒤 main에 합친다 [CLAUDE.md 팀 작업 규칙] [평가항목 P3-22]
- 이름 브랜치: `Yelim`(dbdpfla98), `gaangstar`, lilyoon333·sunwood0803은 각자 이름으로 하나(예: `lilyoon`, `sunwoo`)
- 기능별 자세한 계획은 `docs/specs/NNN-기능/plan.md`, 확인 결과는 같은 폴더 `qa.md`

## 0. 먼저: Yelim → main 합치기
지금 main에는 처음 뼈대만 있고 기능 001~008은 `Yelim` 브랜치에 있다. 이 PR이 합쳐진 **뒤에** 모두 main에서 브랜치를 딴다.

| 조각 | 담당 | 브랜치 | 리뷰 | 상태 |
|---|---|---|---|---|
| 기능 001~008 main 합치기 | 예림 (`dbdpfla98`) | `Yelim` → `main` | 아무나 1명 | 진행 |

## 1. 분배

| 조각 | 담당 | 브랜치 | 맡을 일 | 평가 항목 | 출처 문서 | DB 번호 | 리뷰 |
|---|---|---|---|---|---|---|---|
| A. 위키·위키 챗봇 | `gaangstar` | `gaangstar` | `wiki/` 한 쪽 한 주제(출처·링크, index·log·연결지도, 문서 충돌은 둘 다 적기), 관리자 탭 위키 챗봇(위키 쪽만 근거·출처, 없으면 "위키에 없습니다", 하루 질문 한도, `chat_logs` 저장) | P3-20, P3-21 | PRD FR-26, IA AD_070700_TB, ERD wiki_chunks·chat_logs | 0018 | 예림 |
| D. 디자인 전체 수정 | `gaangstar` | `gaangstar` | 화면 전체 디자인 점검·수정. **먼저 `app/tokens.css`와 공통 부품(`app/_components/`)만 고치는 PR**을 따로 올리고, 화면별 수정은 그다음 PR로 나눈다 | 디자인 기본선, P3-07 | CLAUDE.md "디자인", `.claude/rules/design.md` | 없음 | 예림 |
| B. 관리자 수정 기록·비슷한 지난 알림·시세 채점 | 예림 | `Yelim` | 관리자 수정(담당자·시각·사유 `audit_logs`), 알림 상세에 비슷한 지난 알림(RAG), 채점에 시세 묶음 추가 | P3-13, P3-05, P3-06 | PRD FR-18·20·25, IA AD_070102_MD, ERD audit_logs·knowledge_chunks | 0019 | gaangstar |
| E. 알파: 집 비교 실질 주거비 | 예림 | `Yelim` | 관심 주택 등록, 월세+관리비(+교통비) 비교 | P3-09 | PRD FR-28, IA CP_040000~ | 0020 (`interest_homes`, ERD에 먼저 올리고 승인) | lilyoon333 또는 sunwood0803 |
| C1. 제출 문서 | `lilyoon333` / `sunwood0803` 중 1명 | 맡은 사람 이름 브랜치 | `docs/data-sources.md`, `docs/connectors.md`, `docs/agents.md`, `docs/debug-note.md`, `docs/qa.md`(기능별 qa 모음: Pass/Fail/No Run·수행자·날짜·증거), ERD와 실제 DB 대조 한 줄 | P3-16, P3-19, P3-24~26, P3-32, P3-33 | 평가항목 각 행 | 없음 | 예림 |
| C2. 발표·README | `lilyoon333` / `sunwood0803` 중 1명 | 맡은 사람 이름 브랜치 | `slides/index.html`(문제·데이터·화면·사건·시연(실패 장면 포함)·채점·커넥터), `README.md`(실행 방법, 서비스·발표·QA 링크, 팀원·GitHub 아이디·대표 PR과 리뷰), 시연 순서 | P3-34~36 | 평가항목 E절 | 없음 | 예림 |

C1·C2 중 누가 어느 쪽을 맡을지는 두 사람이 정한다.

## 2. 충돌을 줄이는 약속
- **이름 브랜치 쓰는 순서** (이름 브랜치 하나라서 꼭 지킨다)
  1. 시작 전: main을 내 브랜치에 받는다 `git switch 내이름` → `git pull origin main`
  2. 조각 하나만 작업하고 커밋 → `git push origin 내이름`
  3. GitHub에서 `내이름` → `main` PR. 설명 첫 줄에 조각 이름과 출처(예: `조각 A: 위키 챗봇, spec 012 FR-001, P3-21`)
  4. PR이 합쳐지면 **다음 조각 전에** 1번을 다시 한다(안 하면 다음 PR에 지난 조각이 섞이거나 충돌이 난다)
  5. PR이 리뷰 중일 때는 그 브랜치에 다른 조각을 올리지 않는다(같은 PR에 섞인다). 기다리는 동안은 문서·조사만 한다
- PR을 합칠 때는 **"Create a merge commit"**(squash 하지 않기). squash하면 같은 이름 브랜치를 다시 쓸 때 충돌이 난다(2026-11-18 PR #1 사례)
- **DB 마이그레이션 번호를 위 표대로 쓴다**(0018 A, 0019 B, 0020 E). 다른 번호가 필요하면 이 표를 먼저 고친다.
- 여러 명이 고치는 파일: `lib/supabase/database.types.ts`, `docs/ERD.md`, `docs/Intent.md`, `app/tokens.css`. 늦게 합치는 사람이 충돌을 정리하고, 그 파일을 쓴 사람과 같이 본다.
- 디자인(D)은 화면 파일을 넓게 건드린다. 토큰·공통 부품 PR을 먼저 합치고, 화면별 수정은 다른 조각이 합쳐진 뒤에 하거나 화면 하나씩 작은 PR로 낸다.
- 커밋 전에 넷 다 통과: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` (2026-11-18 빌드를 빼먹어 운영 배포가 한 번 실패함, qa 006 실패와 조치 2).
- PR 설명 첫 줄: 어느 문서의 어느 요구를 만들었는지 (예: `spec 012 FR-001, P3-21`).
- 배포는 main에 합친 뒤 한 사람이 한다("배포해줘"를 받은 사람).

## 3. 아직 정할 것
| # | 질문 | 막는 조각 |
|---|---|---|
| 1 | 계약 만료 일정: PRD FR-31은 1차 Should, IA SC_060000_PG는 "2차". 어느 쪽? | 없음(B·E와 별개) |
| 2 | 알파 범위: 교통비 포함 여부, `interest_homes` 칸 | E |
