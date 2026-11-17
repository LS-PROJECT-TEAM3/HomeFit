# plan: 공고·정책 사건 (마이홈 공고 → 신청 준비 계획 승인)

- 기능 ID: 001
- 상태: 승인됨 (2026-11-17, 새 의존성 포함)
- 버전: v0.3
- 작성일 / 최종 갱신: 2026-11-17 / 2026-11-17
- 기준 spec: ./spec.md (v0.1, 승인됨)
- 근거 문서: docs/ERD.md v1.0, docs/IA.md v1.0, docs/journeys/critical/CUJ-01-명세.md, docs/journeys/edge-cases/거절과-수집오류.md, docs/Intent.md v0.2, CLAUDE.md
- 참고 조사(2026-11-17, 처음 쓰는 스택이라 웹 확인): 아래 1·2절 출처 URL. 구조 판단에는 `react-best-practices`(server-auth-actions, server-serialization, bundle-barrel-imports), `composition-patterns`(boolean 플래그 대신 명시적 변형 컴포넌트)를 근거로만 썼다.

## 0. 요약
spec 001의 FR-001~015를 6단계로 만든다. Next.js(App Router) 한 프로젝트 안에서 화면과 서버(수집 Route Handler, 서버 액션)를 함께 두고, 저장과 로그인은 Supabase 클라우드 무료 프로젝트, 정기 실행은 Vercel Cron Jobs를 쓴다. 판단 로직(공고 정리, 조건 맞추기, 중복 키, 남은 날 수, 기본 체크리스트, 키 가리기)은 DB·네트워크·현재 시각을 쓰지 않는 순수 함수로 두고 시험을 먼저 쓴다. 이 프로젝트의 첫 코드라서 1단계가 프로젝트 뼈대다.

## 1. 기술과 버전
버전은 2026-11-17에 `node --version`, `npm view <패키지> version`으로 확인한 값이다. 설치 뒤 `package-lock.json` 값으로 다시 적는다.

| 영역 | 선택 | 정확한 버전 | 왜 | 버린 대안 |
|---|---|---|---|---|
| 실행 환경 | Node.js | v24.21.0 (설치됨), npm 11.19.0 | 이미 설치됨 | |
| 화면·서버 | Next.js (App Router) | 16.4.6 | CLAUDE.md 스택. 로그인·서버 키·정기 실행 엔드포인트를 한 프로젝트에 둔다 | 빌드 없는 HTML(서버 키 보관 불가) |
| 화면 | React / React DOM | 19.3.0 (create-next-app 16.4.6이 설치한 값, package.json 고정) | Next.js 16 기본 | |
| 언어 | TypeScript, `strict` | 5.9.3 (create-next-app 설치 값), @types/node 24.19.2 (Node 24에 맞춤. 20.x는 Vitest 5와 충돌) | CLAUDE.md 스택 | |
| 스타일 | CSS 변수 + CSS Modules | (Next.js 내장) | CLAUDE.md "Tailwind 없이 CSS 변수만". 토큰은 `app/tokens.css` | Tailwind(create-next-app 기본값, 끔) |
| 글꼴 | Pretendard (CDN) | v1.3.9 (jsdelivr 고정 주소, 2026-11-17 응답 200 확인) | CLAUDE.md 디자인 | npm 글꼴 패키지 |
| 저장·로그인 | Supabase 클라우드 무료 프로젝트 + `@supabase/supabase-js`, `@supabase/ssr` | 2.119.0 / 0.12.7 | Supabase 공식 Next.js 안내의 두 패키지 [https://supabase.com/docs/guides/auth/server-side/nextjs] | 로컬 Supabase(`supabase start`는 Docker 필요 [https://supabase.com/docs/guides/local-development/cli/getting-started]) |
| 표 만들기 | SQL 마이그레이션 파일(`supabase/migrations/`)을 Supabase 대시보드 SQL 편집기 또는 연결된 Supabase 도구로 적용 | (도구 설치 없음) | 팀원 누구나 같은 SQL로 같은 표를 만든다 | Supabase CLI 3.2.0(로그인·링크가 더 필요, 2차에 검토) |
| AI | `@anthropic-ai/sdk` | 1.9.0 | CLAUDE.md 스택. 요약·대응안 초안에만 | |
| AI 모델 | [확인 필요: 5단계 시작 때 `claude-api` 문서로 모델과 비용 확인 뒤 정함] | | | |
| 정기 실행 | Vercel Cron Jobs (`vercel.json`의 `crons`) | (Vercel 플랫폼) | Intent Q11 결정. Hobby는 작업당 하루 1번, 한 시간 안 아무 때나, 재시도 없음, 운영 배포에서만 실행 [https://vercel.com/docs/cron-jobs/manage-cron-jobs] | Supabase 예약 함수 |
| 함수 시험 | Vitest | 5.1.0 | CLAUDE.md 명령 `npm test`. 순수 함수만 시험해서 화면 시험 패키지(jsdom, testing-library)는 넣지 않는다 [https://nextjs.org/docs/app/guides/testing/vitest] | Next.js 가이드의 전체 목록(지금은 필요 없음) |
| 배포 | Vercel | | CLAUDE.md. 실제 배포는 "배포해줘" 뒤 | |

**실행 환경:** 데스크톱 Chrome·Edge 최신, 휴대폰 폭 375px(가로 스크롤 없음). 개발 PC Windows 11.
**환경변수 이름(값은 `.env.local`에만, 저장소에 올리지 않음):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`(공개 가능, RLS를 따름), `SUPABASE_SECRET_KEY`(서버 전용, RLS 우회), `DATA_GO_KR_SERVICE_KEY`(공공데이터포털 계정 인증키, 네 API 공통), `ANTHROPIC_API_KEY`, `CRON_SECRET`(16자 이상). [https://supabase.com/docs/guides/api/api-keys] [https://vercel.com/docs/cron-jobs/manage-cron-jobs]

## 2. 구조와 파일
Next.js가 구조를 강제하지 않아 "코드를 `app` 밖에 두고 `app`은 주소 연결에만" 전략을 쓴다 [https://nextjs.org/docs/app/getting-started/project-structure]. 바깥 폴더는 안내서 이름(CLAUDE.md 폴더)이고, 각 폴더 안에서 순수 함수(`*.ts`)와 DB·API를 부르는 코드(`*.server.ts`)를 나눈다.

### 폴더 트리
```text
homefit-ai/
├── app/                              (신규) 주소와 화면만
│   ├── tokens.css                    (신규) 디자인 토큰 한곳
│   ├── globals.css, layout.tsx       (신규)
│   ├── page.tsx                      (신규) 홈
│   ├── login/page.tsx, signup/page.tsx, onboarding/page.tsx   (신규)
│   ├── my/conditions/page.tsx, my/account/page.tsx            (신규)
│   ├── incidents/page.tsx, incidents/[id]/page.tsx            (신규)
│   ├── schedule/page.tsx, schedule/[id]/page.tsx              (신규)
│   ├── api/cron/myhome/route.ts      (신규) 정기 수집 입구
│   └── _components/                  (신규) 사건 카드, 상태 배지, 빈 화면·불러오는 중·조회 실패, 승인·거절 모달
├── watch/                            (신규) 수집
│   ├── myhome.ts                     순수: 응답 → 공고 한 건 정리, 바뀜 판단용 해시 입력
│   ├── myhome.server.ts              마이홈 API 호출
│   ├── collect.server.ts             실행 기록·저장·사건 만들기 호출
│   ├── mask.ts                       순수: 오류 메시지의 키 가리기
│   └── fixtures/                     가짜 공고 응답(정상, 마감일 바뀜, 형식 다름)
├── incident/                         (신규) 사건·대응
│   ├── match.ts                      순수: 공고와 조건 맞추기
│   ├── dedup.ts                      순수: 중복 키, 갱신 여부
│   ├── checklist.ts                  순수: 기본 체크리스트, 남은 날 수
│   ├── plan-draft.server.ts          Claude API로 요약·초안(실패 시 기본 체크리스트)
│   └── actions.server.ts             승인·거절 서버 액션(로그인 확인 포함)
├── lib/supabase/                     (신규) client.ts(브라우저), server.ts(서버), admin.server.ts(secret 키, 수집 전용)
├── proxy.ts                          (신규) 세션 새로 고침, 비로그인 차단 [https://nextjs.org/docs/app/api-reference/file-conventions/proxy]
├── supabase/migrations/0001_first_feature.sql   (신규) 표, RLS
├── scripts/collect-fixture.ts        (신규) 가짜 응답으로 수집 한 번 돌리기(개발·QA용)
├── vercel.json                       (신규) crons
├── vitest.config.mts, tests/*.test.ts (신규)
└── .claude/launch.json               (신규) 화면 확인 서버 `web`
```

### 파일별 역할
| 파일 | 하는 일 | 담당 FR | 주의 |
|---|---|---|---|
| `watch/myhome.ts` | 응답 한 건 → 공고(ID, 이름, 지역, 공급 유형, 임대료 목록, 공고일, 신청 기간, 링크) 정리. 칸이 없으면 건너뜀 표시 | FR-003 | 현재 시각을 쓰지 않는다 |
| `watch/mask.ts` | 문자열에서 키 값 가리기 | FR-004 | |
| `watch/collect.server.ts` | 실행 기록 → 공고 저장 → 조건 맞는 회원별 사건 만들기 → 단계 기록. 실패면 `runs.status='failed'` | FR-003~006 | secret 키는 여기와 cron 입구에서만 |
| `app/api/cron/myhome/route.ts` | `Authorization: Bearer ${CRON_SECRET}` 확인, `dynamic='force-dynamic'`, 수집 호출 | FR-003 | 두 번 불려도 결과가 같아야 함(Vercel이 중복 호출할 수 있음) |
| `incident/match.ts` | 조건 ↔ 공고 맞추기(Q15 가정) | FR-005 | |
| `incident/dedup.ts` | 중복 키 `(user_id, 공고 ID)`, 내용 해시 비교로 "바뀜" | FR-006 | |
| `incident/checklist.ts` | 남은 날 수(오늘을 인자로 받음), "오늘 마감"·"마감 지남", 기본 체크리스트 | FR-009, FR-010, FR-013 | |
| `incident/plan-draft.server.ts` | 요약·체크리스트 초안, 출처 붙이기. 실패하면 `generation_status='failed'` | FR-010 | 원문 값(마감일)을 AI 글로 덮지 않음 |
| `incident/actions.server.ts` | 승인(일정 생성, 중복 방지)·거절(사유 필수) | FR-011, FR-012 | 서버 액션마다 로그인·본인 확인(react-best-practices server-auth-actions) |
| `app/_components/*` | 상태 배지, 사건 카드, 빈/불러오는 중/실패, 모달 | FR-007~013 | 상태별로 boolean 대신 명시적 변형(composition-patterns) |
| `supabase/migrations/0001_first_feature.sql` | 아래 표 11개와 RLS | FR-014 | ERD 이름 그대로 |

### 자료 구조
ERD v1.0의 표 중 첫 기능에 필요한 11개만 만든다. 칸 이름과 뜻은 [ERD](../../ERD.md)를 그대로 따른다.

| 대상 | 항목 | 형식 | 필수 | 저장/계산 | 출처 |
|---|---|---|---|---|---|
| profiles | id, role, display_name, created_at | ERD | ✔ | 저장 | [ERD profiles] |
| policy_conditions | user_id, sido_code, sigungu_code, supply_types, max_monthly_rent, age, created_by, updated_at | ERD | | 저장 | [ERD policy_conditions] |
| sources | `myhome_notice` 한 행만 넣음 | ERD | ✔ | 저장 | [ERD sources] |
| runs, run_steps | ERD 전체 칸 | ERD | | 저장 | [ERD runs, run_steps] |
| source_items | ERD 전체 칸. 임대료는 목록 중 가장 낮은 값을 `monthly_rent`에(Q15 가정) | ERD | | 저장 | [ERD source_items] |
| observations | ERD 전체 칸, `metric='notice'` | ERD | | 저장 | [ERD observations] |
| incidents | ERD 전체 칸, `incident_type='housing_support'`, `target_kind='condition'` | ERD | | 저장 | [ERD incidents] |
| response_plans | ERD 전체 칸, `plan_type='application_prep'` | ERD | | 저장 | [ERD response_plans] |
| incident_actions | ERD 전체 칸 | ERD | | 저장 | [ERD incident_actions] |
| schedule_items | ERD 전체 칸 | ERD | | 저장 | [ERD schedule_items] |
| 남은 날 수, 마감 지남, 연속 실패 수 | | | | 계산 | [ERD 저장하지 않고 계산하는 값] |

(표 개수: profiles, policy_conditions, sources, runs, run_steps, source_items, observations, incidents, response_plans, incident_actions, schedule_items = 11개. ERD 접근 규칙 표대로 RLS를 켠다.)

### 화면 연결
| 화면 ID | 화면 | 파일·영역 |
|---|---|---|
| MB_010000_PG | 로그인 | `app/login/page.tsx` |
| MB_010100_PG | 회원가입 | `app/signup/page.tsx` |
| MB_010200_PG | 첫 설정 | `app/onboarding/page.tsx` |
| HM_000000_PG | 홈 | `app/page.tsx` |
| IC_020000_PG | 사건 | `app/incidents/page.tsx` |
| IC_020100_PG | 사건 상세 | `app/incidents/[id]/page.tsx` |
| IC_020101_MD, IC_020102_MD | 대응안 승인·거절 | `app/_components/` 모달 + `incident/actions.server.ts` |
| MY_030000_PG, MY_030100_TB | 내 정보, 공고·정책 조건 | `app/my/conditions/page.tsx` |
| MY_030400_TB | 계정 | `app/my/account/page.tsx` |
| SC_060000_PG, SC_060100_PG | 내 일정, 일정 상세 | `app/schedule/page.tsx`, `app/schedule/[id]/page.tsx` |

## 3. 단계별 접근
| 단계 | 목표 | FR | 결과물 | 끝 조건 | 먼저 풀 질문 |
|---|---|---|---|---|---|
| 1 | 프로젝트 뼈대: 지금 동작(문서 저장소)을 깨지 않고 Next.js와 시험 붙이기 | (기반) | Next.js 프로젝트, `tokens.css`, Vitest, `launch.json` | `npm test`가 시험 1개(샘플)로 통과, `web` 서버에서 빈 홈이 열림, `docs/`·`.claude/` 그대로 | 새 의존성 승인 |
| 2 | 판단 로직 시험 먼저 | FR-003, FR-004, FR-005, FR-006, FR-009, FR-010, FR-013 | `watch/myhome.ts`, `watch/mask.ts`, `incident/*.ts` 순수 함수와 시험 | 4절 함수 시험이 처음엔 실패를 확인한 뒤 모두 통과 | Q6(샘플 1건으로 칸 확인. 키가 없으면 가짜 응답으로 진행하고 Q6 유지) |
| 3 | 로그인·조건 입력·권한 | FR-001, FR-002, FR-014 | Supabase 프로젝트, 마이그레이션(표 11개·RLS), 로그인·가입·첫 설정·조건·계정 화면, `proxy.ts` | 가입 → 첫 설정 저장 → 새로고침 뒤 값 유지, 계정 A·B로 서로의 조건이 안 보임(화면·API·SQL) | Supabase 프로젝트 생성 승인 |
| 4 | 수집과 사건 만들기 | FR-003, FR-004, FR-005, FR-006 | `collect.server.ts`, cron 입구, `vercel.json`, `scripts/collect-fixture.ts` | 가짜 응답으로 수집 → 사건 1건, 같은 응답 재수집 → 1건 그대로, 마감일 바꾼 응답 → "바뀜", 실패 응답 → runs 실패·사건 0 | Q16(수집 시각) |
| 5 | 사건 화면과 승인·거절 | FR-007, FR-008, FR-009, FR-010, FR-011, FR-012, FR-013, FR-015 | 홈, 사건 목록·상세, 대응안 초안, 승인·거절 모달, 내 일정 | 브라우저 미리보기로 SC-001 한 바퀴 스크린샷, SC-004·006·007 확인 | AI 모델 선택(비용) |
| 6 | 마무리 점검 | 전체 | QA 결과, README 첫판, CLAUDE.md "현재 코드"·"명령" | `harness-qa` 절차 C의 사람 QA 목록 전달, 회귀 확인 통과 | |

### 1단계 작업
- [x] `create-next-app`으로 Tailwind 없이 만들기(`--ts --eslint --app --no-tailwind --no-src-dir --use-npm`). 이미 있는 `docs/`, `interviews/`, `.claude/`, `CLAUDE.md`, `GLOSSARY.md`, `.gitignore`는 덮어쓰지 않는다(임시 폴더에 만든 뒤 필요한 파일만 옮김)
- [x] `tsconfig.json`의 `strict: true` 확인
- [x] `app/tokens.css`에 CLAUDE.md 디자인 색·간격·글꼴 토큰, Pretendard 연결
- [x] Vitest 설치, `npm test` 스크립트, 샘플 시험 1개(디자인 토큰 확인, 11개 사례)
- [x] `.claude/launch.json`에 `homefit-web`(`npm run dev`, 3000). 이 세션의 미리보기 도구가 예전 폴더의 `web`을 잡아 이름을 바꿈
- [x] `.env.example`에 환경변수 이름만(값 없음)
- [x] 실제 설치 버전을 1절에 다시 적기

### 2단계 작업
- [x] 마이홈 API 샘플 받아 `watch/fixtures/myhome-sample.json`에 3건 저장. 칸 이름을 spec 6절 Q6에 기록
- [x] 시험 먼저: `myhome`, `mask`, `match`, `dedup`, `checklist` (4절 표). 지역 이름→코드(`watch/sido.ts`) 시험 추가
- [x] 실패 확인 → 구현 → 통과 (시험 66개)

### 3단계 작업
- [ ] (승인 뒤) Supabase 무료 프로젝트 만들기, 키를 `.env.local`에
- [ ] `0001_first_feature.sql`: 표 11개, 체크 제약(임대료 0 이상 등), RLS 정책, 가입 때 profiles 행 만들기
- [ ] `lib/supabase/client.ts`, `server.ts`, `proxy.ts`(보호는 `getClaims()`로)
- [ ] 로그인·가입·첫 설정·조건·계정 화면, 잘못된 값 안내 문구
- [ ] 계정 A·B 권한 확인

### 4단계 작업
- [ ] `collect.server.ts`(실행 기록·단계 기록·공고 저장·사건 만들기), 실패 처리와 키 가리기
- [ ] cron 입구(`CRON_SECRET` 확인, `force-dynamic`), `vercel.json` crons(하루 1번, Q16)
- [ ] `scripts/collect-fixture.ts`로 가짜 응답 수집
- [ ] 중복·바뀜·실패 확인

### 5단계 작업
- [ ] (시작 때) `claude-api` 문서로 모델·비용 확인 후 사용자에게 알림
- [ ] 공통 컴포넌트: 상태 배지, 사건 카드, 빈/불러오는 중/실패
- [ ] 홈, 사건 목록(거르기 주소 유지), 상세(처음 연 시각, 남은 날 수, 원문 링크, 자격 문구)
- [ ] 대응안 초안(출처, 실패 시 기본 체크리스트)
- [ ] 승인·거절 모달과 서버 액션, 내 일정·일정 상세
- [ ] 키보드만으로 승인·거절 가능, 초점 링 보임

### 6단계 작업
- [ ] `harness-qa` B로 단계별 결과 정리, `ponytail-review`, 화면 체크리스트
- [ ] README 첫판(무엇, 여는 법, 시험 명령, 되는 기능, 기획 문서 위치)
- [ ] CLAUDE.md "현재 코드"·"명령" 갱신(설정 파일이라 먼저 보여 주고 승인)

### 새 의존성 기록
| 이름 | 버전 | 이유 | 직접 만들 때 비용 | 버린 대안 | 승인 |
|---|---|---|---|---|---|
| next, react, react-dom, typescript, eslint 계열(create-next-app 기본) | 16.4.6 / 19.3.0 / 19.3.0 / 5.9.3 / eslint 9.39.5, eslint-config-next 16.4.6 | CLAUDE.md 스택 | 불가 | Vite+React(서버 키 보관·cron 입구 따로 필요) | 승인 2026-11-17 |
| @supabase/supabase-js | 2.119.0 | DB·로그인 | 불가 | | 승인 2026-11-17 |
| @supabase/ssr | 0.12.7 | App Router 세션(쿠키) 처리. 0.x 버전이지만 Supabase 공식 안내 패키지 | 쿠키 처리 직접 구현은 실수 위험 큼 | auth-helpers(지원 종료) | 승인 2026-11-17 |
| @anthropic-ai/sdk | 1.9.0 | 요약·대응안 초안 | fetch로 직접 호출 가능하나 재시도·타입을 다시 만들어야 함 | | 승인 2026-11-17 |
| vitest | 5.1.0 | `npm test` | 불가 | node:test(TypeScript 설정 필요) | 승인 2026-11-17 |
| Supabase 클라우드 무료 프로젝트 | | 저장·로그인. 무료: 활성 프로젝트 2개, DB 500MB, **7일 활동 없으면 일시 정지** [https://supabase.com/pricing] | | 로컬 Docker | 승인 2026-11-17 |
| Pretendard CDN | v1.3.9 | 한글 글꼴 | | | 승인 2026-11-17 |

## 4. 테스트 전략

### 요구사항 추적
| FR/SC | 확인 방법 | 시험 이름 / QA 번호 |
|---|---|---|
| FR-001 | 화면 눌러 보기 | C-009, C-010 |
| FR-002 | 화면 눌러 보기 + 저장 확인 | C-011, C-012, C-013, C-024 |
| FR-003 | 함수 시험 + 가짜 수집 | `myhome.normalize`, C-002, C-003, C-015, C-016, C-018 |
| FR-004 | 함수 시험 + 가짜 실패 수집 | `mask.secrets`, C-004, C-017, C-025 |
| FR-005 | 함수 시험 + 가짜 수집 | `match.condition`, C-005, C-019 |
| FR-006 | 함수 시험 + 재수집 | `dedup.key`, `dedup.changed`, C-006, C-020 |
| FR-007 | 화면 눌러 보기 | C-022, C-023, C-039, H-003 |
| FR-008 | 화면 눌러 보기 | C-027, C-028 |
| FR-009 | 함수 시험 + 화면 | `checklist.daysLeft`, C-007, C-029, C-030, H-002 |
| FR-010 | 함수 시험 + AI 실패 시험 | `checklist.default`, C-008, C-031, C-032, C-033, H-004 |
| FR-011 | 화면 + DB 확인 | C-034, C-035, C-036 |
| FR-012 | 화면 + DB 확인 | C-037 |
| FR-013 | 함수 시험 + 화면 | `checklist.daysLeft`, C-007, C-038 |
| FR-014 | 계정 두 개로 화면·API·SQL | C-014 |
| FR-015 | 화면 | C-026 |
| SC-001 | 브라우저 미리보기 한 바퀴 | C-039, H-001 |
| SC-002 | 가짜 수집 두 번 | C-020 |
| SC-003 | 가짜 실패 수집 | C-017, C-025 |
| SC-004 | 화면 + DB | C-037 |
| SC-005 | 계정 두 개 | C-014 |
| SC-006 | AI 실패 시험 | C-032 |
| SC-007 | 화면 | C-027 |
| SC-008 | 시연 뒤 사건의 공고일·처음 연 시각 비교 | H-001 |
| SC-009 | 가짜 수집 두 번 | C-020 |

C·H 번호는 [qa.md](qa.md)에 있다.

### 함수 시험
- 도구 / 버전 / 실행 명령: Vitest 5.1.0 / `npm test` (CI 없이 로컬)

| 시험 이름 | 입력 | 기대 결과 | FR |
|---|---|---|---|
| myhome.normalize 정상 | 가짜 응답 1건 | 공고 ID·이름·지역·신청 기간·링크가 채워짐 | FR-003 |
| myhome.normalize 칸 없음 | 공고 ID 없는 응답 | 건너뜀 표시 | FR-003 |
| myhome.normalize 마감일 없음 | 마감일 빈 응답 | 마감일 비어 있음, 오류 아님 | FR-009 |
| myhome.normalize 임대료 여러 개 | 25만·32만 | 가장 낮은 25만 | FR-005 (Q15) |
| mask.secrets | 키가 든 오류 문자열 | 키가 `***`로 | FR-004 |
| match.condition 시군구 같음 | 강남구 조건, 강남구 공고 | 맞음 | FR-005 |
| match.condition 시도 다름 | 서울 조건, 부산 공고 | 안 맞음 | FR-005 |
| match.condition 시군구 빈 조건 | 서울 조건, 서울 아무 구 | 맞음 | FR-005 (Q15) |
| match.condition 상한 경계 | 상한 30만, 공고 30만 / 30만 1원 | 맞음 / 안 맞음 | FR-005 |
| match.condition 상한 0 | 상한 0, 공고 0원 / 1원 | 맞음 / 안 맞음 | FR-005 |
| match.condition 상한 빈 값 | 상한 없음 | 임대료로 거르지 않음 | FR-005 |
| match.condition 공급 유형 "모두" | 모두, 아무 유형 | 맞음 | FR-005 (Q15) |
| match.condition 조건 없음 | 조건 없음 | 안 맞음 | FR-005 |
| match.condition 이미 마감 | 오늘보다 앞선 마감일 | 안 맞음(사건 안 만듦) | FR-005 |
| dedup.key | 같은 사용자·같은 공고 | 같은 키 | FR-006 |
| dedup.changed | 마감일만 다른 두 공고 | 바뀜 | FR-006 |
| dedup.changed 같음 | 같은 두 공고 | 안 바뀜 | FR-006 |
| checklist.daysLeft | 오늘 11-17, 마감 11-22 / 11-17 / 11-16 | 5일 남음 / 오늘 마감 / 마감 지남 | FR-009, FR-013 |
| checklist.default | 마감일 있는 공고 | 자격 확인·서류·마감일 항목 3개 이상, 마감일은 원문 값 | FR-010 |

### 화면 눌러 보기
1. 가입 → 첫 설정에서 서울·상한 30만 저장 → 홈에 "아직 사건이 없습니다"
2. `scripts/collect-fixture.ts`로 가짜 공고 수집 → 홈 새로고침 → "새 사건 1"
3. 카드 → 사건 목록 → 상세: 마감일·"N일 남음"·원문 링크·자격 문구·신청 준비 계획·출처
4. 승인 → "내 일정에 넣었습니다" → 내 일정에 체크리스트, 체크 후 새로고침해도 유지
5. 두 번째 가짜 공고로 거절: 사유 없이 막힘 → 사유 넣고 거절 → 일정 개수 그대로
6. 다른 계정으로 첫 계정의 사건 주소 → "볼 수 없는 페이지입니다"
7. 휴대폰 폭(375px)으로 홈·상세: 가로 스크롤 없음

### QA
- `qa.md` 참고 (Claude QA C-번호, 사람 QA H-번호). plan 승인 직후 만든다.

### 회귀 확인
- 기획 문서(`docs/`, `interviews/`, `GLOSSARY.md`, `CLAUDE.md`, `.claude/`): 1단계 뒤 `git status`로 지워지거나 바뀐 문서가 없는지 확인
- 2단계부터: 매 단계 끝에 `npm test` 전체 통과, 앞 단계 화면 눌러 보기 다시

## 5. 제약과 주의점

### 보안
- 키 값은 `.env.local`(로컬)과 Vercel 환경변수(배포)에만 둔다. `.gitignore`에 `.env`·`.env.*`가 있고 `.env.example`만 올린다. [CLAUDE.md] [PRD FR-27]
- 브라우저에는 publishable 키만. secret 키는 `lib/supabase/admin.server.ts`, 수집 코드에서만 import한다.
- 권한 판단은 `getClaims()`로 하고, 서버 액션마다 로그인과 본인 사건인지 다시 확인한다. [https://supabase.com/docs/guides/auth/server-side/nextjs]
- cron 입구는 `CRON_SECRET`이 없거나 다르면 401. [https://vercel.com/docs/cron-jobs/manage-cron-jobs]
- 공고 이름 등 바깥 글자는 React 기본 이스케이프로만 그린다(`dangerouslySetInnerHTML` 쓰지 않음).

### 성능
- 사건 목록 한 번에 20개(IA 콘텐츠 증가 대응). 홈은 사건 100건에서도 2초 안에 그린다(가정, CUJ-01 명세 "페이지 2초").
- 수집 한 번은 Vercel 함수 시간 안에 끝나야 한다. 공고가 많아 넘으면 나눠 저장(위험 표 참고).

### 호환성
- Chrome·Edge 최신, 375px 폭.

### 지금 돌아가는 기능 깨지 않기
- 지금은 코드가 없고 기획 문서만 있다. 1단계에서 `create-next-app`이 `.gitignore`, `README` 등을 덮어쓰지 않게 임시 폴더에서 만든 뒤 옮긴다.

### 경계
- 항상 할 것: 승인된 단계 안의 코드 작성, 함수 시험 먼저, 시험 실행, 미리보기 확인, 코드에 출처 주석(`// FR-005 (spec 001)`, `// Q15 임시 처리: …`), qa.md 기록, 파일 300줄·함수 40줄 이하
- 먼저 물을 것: 새 라이브러리(위 표 밖), Supabase 프로젝트 만들기, ERD 칸 변경, 파일·폴더 삭제, spec에 없는 동작, AI 모델·비용, CLAUDE.md·설정 변경, 커밋·push, 배포
- 절대 하지 말 것: 온통청년 정책 수집, 예산 소진 안내, 자격 자동 판정, 앱 푸시·메신저 알림, 내 집·관심 지역 입력, 관리자 화면, 시뮬레이터 화면·채점·흐름 화면, 기록 찾기, 실질 주거비, 비밀번호 재설정(spec 5절), 키를 코드·저장소·대화에 쓰기, 시험을 지우거나 건너뛰어 실패 숨기기, Tailwind 넣기

### 위험과 대응
| 위험 | 영향 | 대응 |
|---|---|---|
| 마이홈 응답에 필요한 칸이 없음(Q6) | FR-003·005·009 일부 표시 불가 | 2단계에서 샘플 확인, 없는 칸은 "공고문 확인" 표시, spec 고칠지 묻기 |
| 마이홈 키 승인이 늦음 | 실제 수집 확인 지연 | 가짜 응답으로 2~5단계 진행, 키가 오면 샘플로 시험 사례 보강 |
| Supabase 무료 프로젝트가 7일 활동 없으면 정지 | 시연 날 DB가 멈춤 | 하루 1번 cron이 막아 주는지는 확인 못 함. 발표 전날 대시보드 확인을 QA에 넣음 |
| Vercel Hobby cron은 재시도 없고 두 번 올 수 있음 | 하루치 수집 누락, 중복 | 중복은 dedup 키로 막음. 누락은 실행 기록에 남아 다음 날 다시 받음(관리자 "지금 한 번 실행"은 다른 spec) |
| Cron Jobs가 나중에 Schedules로 옮겨짐 | 설정 변경 필요 | 옮김 공지 때 Intent에 올림 |
| `@supabase/ssr`가 0.x | 바뀔 수 있음 | 버전을 고정하고 올릴 때 시험 |
| 공고 수가 많아 함수 시간 초과 | 수집 실패 | 지역으로 먼저 거르거나 나눠 저장. 4단계에서 실제 건수 확인 |

## 변경 기록
| 날짜 | 버전 | 바뀐 내용 |
|---|---|---|
| 2026-11-17 | v0.1 | 첫 작성 |
| 2026-11-17 | v0.3 | 2단계 끝: 순수 함수 5묶음. 실제 응답 확인으로 `Notice.announcementId`(공고 ID) 추가, 사건 중복은 공고 ID로. 시도 이름→코드 표 `watch/sido.ts` 추가 |
| 2026-11-17 | v0.2 | 1단계 끝: 실제 설치 버전 반영(React 19.3.0, TypeScript 5.9.3, @types/node 24.19.2, Pretendard v1.3.9), 화면 확인 서버 이름 `homefit-web` |
