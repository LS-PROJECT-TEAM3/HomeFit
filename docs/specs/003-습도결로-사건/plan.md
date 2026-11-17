# plan: 습도·결로 위험 사건

- 기능 ID: 003
- 상태: 승인됨 v0.1 (2026-11-17)
- 버전: v0.1
- 작성일 / 최종 갱신: 2026-11-17 / 2026-11-17
- 기준 spec: ./spec.md (v0.1 승인)
- 근거 문서: docs/ERD.md v1.4(homes, indoor_measurements, observations, incidents, response_plans), docs/IA.md v1.3, docs/journeys/critical/CUJ-02-습도결로-대응계획.md, docs/specs/001-공고정책-사건/plan.md v0.9(사건 흐름), docs/specs/002-LLM-공급자/plan.md(AI 호출)

## 0. 요약
spec 003의 FR-001~011을 6단계로 만든다. 기능 001의 사건 표·승인 DB 함수·사건 화면·슬랙 알림·AI 호출 길(`lib/llm`)을 그대로 쓰고, 새로 만드는 것은 ① 내 집·측정값 표와 화면 ② 기상청 단기예보 수집 ③ 결로 계산(순수 함수) ④ 사건 화면의 종류별 표시 네 가지다. 계산은 TypeScript 순수 함수로 쓰고 시험부터 쓴다. 새 라이브러리는 없다.

## 1. 기술과 버전
| 영역 | 선택 | 정확한 버전 | 왜 | 버린 대안 |
|---|---|---|---|---|
| 화면·서버 | Next.js App Router, React | next 16.4.6, react 19.3.0 (package.json) | 기능 001과 같음 | — |
| 언어 | TypeScript strict | 5.9.3 | 같음 | — |
| 저장 | Supabase(PostgreSQL, RLS) | @supabase/supabase-js 2.119.0, @supabase/ssr 0.12.7 | 같음. 새 표 2개는 ERD에 이미 있음 | — |
| 예보 | 기상청 단기예보 조회서비스 `getVilageFcst` (공공데이터포털 15084084) | API 2.0 | 지금 `DATA_GO_KR_SERVICE_KEY`로 2026-11-17 실제 응답 확인(200, 1016행, TMP·REH·PTY·TMN 있음, 약 83시간). 출처: https://www.data.go.kr/data/15084084/openapi.do | 초단기예보(6시간뿐), 민간 날씨 API(키·비용) |
| 시군구 → 격자 | 기상청 격자 위경도 표를 시군구 하나에 격자 하나로 줄인 JSON 파일(저장소에 넣음) | 기상청 배포 파일 [확인 필요: 파일 날짜] | 런타임에 외부 호출이 없다 | 위경도를 따로 구해 람베르트 변환(위경도 자료가 또 필요) |
| 결로 계산 | 직접 쓴 순수 함수: Magnus 이슬점, 정상 상태 표면 온도 Tsi = Ti − U·Rsi·(Ti − Te), Rsi 0.13 m²K/W | — | 식이 짧다. 출처: [창 결로 계산](https://tradecalculator-3zc.pages.dev/glazing/window-condensation-calculator/), Rsi 0.13은 BS EN ISO 6946 값([axisdesign](https://axisdesign.vs.mythic-beasts.com/tools/buildup-calc.html)), 이중유리 2.8 W/m²K 중앙부 표면 약 12.9°C(20/0°C) 확인값([CWCT 자료](https://cdn.shopify.com/s/files/1/0192/5660/6786/files/tu03.pdf)) | 계산 라이브러리 |
| 습도 기준 | 70% | — | 건물 표면 곰팡이 임계 습도 70%가 널리 합의됨([Building Science Corp RR-0203](https://buildingscience.com/sites/default/files/migrate/pdf/RR-0203_Relative_Humidity.pdf)), 70% 이상이 오래가면 곰팡이가 거의 확실([NC 보건 안내](https://testyourwell.nc.gov/oee/mold/conditions.html)). 이 값은 표면 기준이라 실내 공기에 쓰면 보수적(일찍 알림)이다 | 60%(ASHRAE 권장 상한, 알림이 너무 잦음) |
| AI | `lib/llm` callLlm (spec 002) | — | 대응 계획 초안만. 시험은 mock | — |
| 시험 | Vitest | 5.1.0 | 같음 | — |
| 정기 실행 | Vercel Cron 2개(아침·저녁) | vercel.json | Intent Q14 결정 | Supabase 예약 함수 |

**실행 환경:** 휴대폰·PC 최신 브라우저(375px 폭에서 가로 넘침 없음), Node 24, Vercel Hobby(함수 최대 300초).

## 2. 구조와 파일

### 폴더 트리
```text
watch/
  kma.ts                  (신규) 기상청 응답 → 시간별 예보, 발표 시각 고르기 (순수)
  kma.server.ts           (신규) 기상청 호출(키는 서버만)
  kma-grid.json           (신규) 시군구 코드 → nx, ny
  kma-grid.ts             (신규) 격자 찾기, 없으면 시도 대표 격자 (순수)
  weather-fixtures.ts     (신규) 가짜 예보 묶음: cold, humid, safe, failure, malformed
  collect-weather.server.ts (신규) 예보 수집 한 번: 집 → 시군구 → 예보 → observations → 판단 → 사건 → 계획 → 알림
  run-log.server.ts       (수정 없음, 그대로 씀)
incident/
  condensation.ts         (신규) 이슬점, 표면 온도, 위험 판단, 같은 48시간 판단 (순수)
  humidity-plan.ts        (신규) 대응 계획 기본 할 일, AI 지시문, 날짜 붙이기 (순수)
  humidity.server.ts      (신규) 집·측정값·기존 습도 사건 읽기, 사건 넣기·갱신
  home-form.ts            (신규) 내 집·측정값 입력 검사 (순수)
  notify.ts               (수정) 사건 종류별 알림 문구
  plans.server.ts         (수정) 습도 사건 계획 저장(plan_type response_plan)
  queries.server.ts       (수정) 사건 종류를 함께 읽음
app/(main)/my/home/       (신규) 내 집 화면, 온습도 입력 모달, 서버 액션 (IA MY_030200_TB, MY_030201_MD)
app/(main)/incidents/     (수정) 목록 한 줄과 상세를 사건 종류에 따라 나눠 그림
app/(main)/page.tsx       (수정) 내 집 습도 카드
app/api/cron/weather/route.ts (신규) 예보 수집 입구(CRON_SECRET, ?fixture=개발만)
supabase/migrations/0010_homes_and_humidity.sql (신규)
vercel.json               (수정) 크론 2개 추가
tests/condensation.test.ts, kma.test.ts, kma-grid.test.ts, home-form.test.ts, humidity-plan.test.ts (신규)
```

### 파일별 역할
| 파일 | 하는 일 | 담당 FR | 주의 |
|---|---|---|---|
| incident/condensation.ts | Magnus 이슬점, 창 표면 온도, 48시간 위험 판단(조건 가·나), 가장 위험한 시각, 같은 48시간 창 판단 | FR-004, FR-005 | 현재 시각은 인자로 받는다. DB·네트워크 없음 |
| watch/kma.ts | 응답 JSON 검사 → `{forecastAt, temperature, humidity, precipitationType}[]`, 쓸 수 없는 시각은 건너뜀, 하나도 없으면 오류. 지금 시각에서 쓸 최신 발표 시각(02·05·08·11·14·17·20·23시 + 10분) 고르기 | FR-003 | 응답 값은 글자로 옴 |
| watch/kma-grid.ts | 시군구 코드 → 격자. 표에 없으면 시도 첫 격자, 그것도 없으면 null(그 집 건너뜀·기록) | FR-003 | Q15 가정 |
| watch/collect-weather.server.ts | 실행 기록(runs·run_steps) 단계: collect(시군구 수) → compare(예보 시각 수) → detect → draft_plan → notify → await_approval | FR-003, 005, 007, 009 | 기능 001 수집과 같은 모양, 실패는 수집 오류 |
| incident/humidity.server.ts | 내 집·최근 측정값 읽기, 같은 집의 열린 습도 사건 읽기, 새 사건 넣기, 더 위험하면 facts 갱신·is_updated | FR-004, FR-005 | 승인·거절된 사건은 바꾸지 않음 |
| incident/humidity-plan.ts | 기본 할 일(환기, 제습, 창 물기 닦기, 창호 틈 점검), AI 지시문(측정값·예보만 근거), 날짜는 가장 위험한 시각 전날 | FR-007 | AI는 날짜를 정하지 않는다 |
| app/(main)/my/home/* | 내 집 저장·수정, 측정값 입력·최근 목록 | FR-001, FR-002 | 본인 행만(RLS), 오류 문구는 할 일 포함 |
| app/(main)/incidents/[id]/page.tsx | 습도 사건이면 측정값·예보·추정값 칸, "누수·하자는 알 수 없음" | FR-006 | 공고 사건 화면은 그대로 |
| app/(main)/page.tsx | 내 집 습도 카드(없음/오래됨/있음) | FR-010 | 기존 카드 그대로 |

### 자료 구조
| 대상 | 항목 | 형식 | 필수 | 저장/계산 | 출처 |
|---|---|---|---|---|---|
| homes | user_id(유일), sigungu_code, housing_type, exclusive_area_m2(1~300), contract_type, deposit, monthly_rent, contract_end_date, window_type(single/double/unknown), created_by, updated_at | 표 | ERD대로 | 저장 | [ERD homes] |
| indoor_measurements | home_id, temperature_c(-10~45), humidity_pct(0~100), measured_at(≤ 지금), created_by, created_at | 표 | ERD대로 | 저장 | [ERD indoor_measurements] |
| 예보 | observations: source_code `kma_forecast`, observed_at=예보 시각, target=시군구 코드, metric `temperature`·`humidity`·`precipitation_type`, raw={baseDate, baseTime, nx, ny} | 기존 표 | | 저장 | [ERD observations "예보면 예보 대상 시각"] |
| sources | `kma_forecast`, "기상청 단기예보", "하루 2번" 행 추가 | 기존 표 | | 저장 | [ERD sources.code] |
| 습도 사건 | incidents: incident_type `humidity_condensation`, target_kind `home`, target_id=homes.id, dedup_key `humidity|{homeId}|{창 시작 시각}`, facts={title, dueDate, riskAt, windowStart, condition(가/나), measurement{t,h,at}, forecast{t,h,pty,baseAt}, surfaceTemp, dewPoint, margin, forecastHours} | 기존 표 | | 저장(판단 근거는 계산 결과를 그때 값으로 남김) | [ERD incidents] [spec 핵심 자료] |
| 대응 계획 | response_plans plan_type `response_plan` | 기존 표 | | 저장 | [ERD response_plans] |
| 이슬점·표면 온도 | — | | | 계산(사건 facts에 그때 값 저장) | [GLOSSARY 추정값] |

DB 변경(0010, ERD 변경 없음): 표 2개와 RLS(본인 행 읽기·쓰기, 관리자 읽기), sources 1행, 승인 DB 함수가 일정 마감일을 `coalesce(facts.dueDate, facts.applyEnd)`, 제목을 `facts.title`로 쓰게 고침(공고 사건은 dueDate가 없어 지금과 같음).

### 화면 연결
| 화면 ID | 화면 | 파일·영역 |
|---|---|---|
| MY_030200_TB | 내 집 | app/(main)/my/home/page.tsx, 내 정보 탭에 "내 집" 추가 |
| MY_030201_MD | 실내 온습도 입력 | app/(main)/my/home/measurement-dialog.tsx |
| IC_020000_PG | 사건 목록 | 종류 배지 "습도·결로 위험", 한 줄 "MM-DD HH시 창 결로 위험" |
| IC_020100_PG | 사건 상세 | 습도 사건 칸(측정값·예보·추정값), 대응 계획 |
| IC_020101_MD, IC_020102_MD | 승인·거절 | 기존 그대로 |
| HM_000000_PG | 홈 | 내 집 습도 카드 |
| SC_060000_PG | 내 일정 | 기존 그대로(마감일 = 가장 위험한 시각 전날) |

## 3. 단계별 접근
| 단계 | 목표 | FR | 결과물 | 끝 조건 | 먼저 풀 질문 |
|---|---|---|---|---|---|
| 1 | 계산·해석 순수 함수와 시험 | FR-003(해석), FR-004, FR-005(창 판단) | condensation.ts, kma.ts, kma-grid.ts(+json), home-form.ts, 시험 | spec 3절 경계 사례 전부 시험 통과, 실제 응답 한 건 해석 통과, tsc·lint | 격자 파일 받기 승인 |
| 2 | 내 집·측정값 저장과 화면 | FR-001, FR-002 | 0010 마이그레이션, /my/home, 입력 모달 | 시험 계정으로 저장·수정·범위 밖 거부 화면 확인, 다른 계정이 못 읽음(RLS) | 0010 적용 승인 |
| 3 | 예보 수집 → 사건 | FR-003, FR-004, FR-005, FR-011 | collect-weather.server.ts, /api/cron/weather, 가짜 예보 5종 | cold로 사건 1, 다시 돌려도 1, 더 추운 묶음으로 갱신됨, failure는 수집 오류·사건 0, 측정값 없는 계정 0 | — |
| 4 | 대응 계획과 사건 화면 | FR-006, FR-007, FR-008 | humidity-plan.ts, 사건 목록·상세 나눔 | 상세에 세 칸·가장 위험한 시각, 승인 → 일정 1개(두 번 눌러도 1), 사유 없는 거절 막힘, AI 실패 때 기본 계획 | — |
| 5 | 알림과 홈 카드 | FR-009, FR-010 | notify 문구, 홈 카드 | 알림 켠 계정 DM 1, 끈 계정 0, 홈 카드 세 가지 상태 375px 확인 | — |
| 6 | 정기 실행 등록과 운영 확인 | FR-003, SC-008 | vercel.json 크론 2개(05:30·17:30 KST = 20:30·08:30 UTC), 기능 끝 QA | 시험 전체 통과. 운영 확인은 "배포해줘" 뒤 실제 예보 수집 1번 성공·가짜 예보 거절 | 배포는 사용자가 말할 때만 |

### 1단계 작업
- [x] 기상청 격자 위경도 엑셀 받기(승인 뒤) → 시군구별 첫 행으로 줄인 kma-grid.json, 만든 방법을 파일 머리 주석 대신 plan 변경 기록에 남김
- [x] 시험 먼저: 이슬점(20°C·60% ≈ 12.0°C, 습도 100% = 온도), 표면 온도(홑유리·이중유리·모름=홑유리), 경계(표면 = 이슬점+1 → 위험), 조건 나(70%·12시간), 측정값 7일 초과·없음 → 판단 안 함, 실내 < 바깥, 예보 48시간 미만, 숫자 아닌 값 건너뜀, 같은 48시간 창 안/밖, 더 위험한지 비교
- [x] 시험 먼저: 기상청 응답 해석(실제 응답 저장본 1건, resultCode 오류, 빈 items), 발표 시각 고르기(05:09 → 02시, 05:10 → 05시, 00:30 → 전날 23시), 격자 찾기(있음/구가 있는 시의 첫 구/시도 대표/없음)
- [x] 시험 먼저: 내 집·측정값 입력 검사(면적 0·301·글자, 온도 -11·46, 습도 101, 미래 시각)
- [x] 구현해 통과

### 2단계 작업
- [x] 0010 작성 → 사용자 승인 → 적용, DB 타입 다시 만들기
- [x] /my/home: 내 집 폼(시군구는 기능 001의 시도·시군구 선택 재사용), 측정값 입력 모달, 최근 측정값 5개
- [x] RLS 확인: 시험 계정 권한으로 남의 행 0행

### 3~6단계 작업
- [ ] 3: 수집 단계와 가짜 예보, 실행 기록, 사건 넣기·갱신(DB unique로 중복 막음)
- [ ] 4: 대응 계획 초안(AI → 실패면 기본), 목록·상세 종류별 표시
- [ ] 5: 알림 문구, 홈 카드
- [ ] 6: vercel.json, 기능 끝 QA(harness-qa C)

### 새 의존성 기록
없음

## 4. 테스트 전략

### 요구사항 추적
| FR/SC | 확인 방법 | 시험 이름 / QA 번호 |
|---|---|---|
| FR-001 | 함수 시험 + 화면 | home-form.test.ts / C-201, C-202 |
| FR-002 | 함수 시험 + 화면 | home-form.test.ts / C-203 |
| FR-003 | 함수 시험 + 수집 실행 | kma.test.ts, kma-grid.test.ts / C-204, C-205 |
| FR-004 | 함수 시험 | condensation.test.ts / C-206 |
| FR-005 | 함수 시험 + 수집 실행 | condensation.test.ts / C-207, C-208 |
| FR-006 | 화면 | C-209 |
| FR-007 | 함수 시험 + 화면 | humidity-plan.test.ts / C-210 |
| FR-008 | 화면 + DB | C-211 |
| FR-009 | 수집 실행 + DB | C-212 |
| FR-010 | 화면 | C-213 |
| FR-011 | 수집 실행 | C-204, C-214 |
| SC-001 | 수집 실행 + 화면 | C-207, H-201 |
| SC-002 | 화면 | C-209, H-201 |
| SC-003 | 화면 + DB | C-211 |
| SC-004 | 수집 실행 | C-208 |
| SC-005 | 수집 실행 + 화면 | C-213 |
| SC-006 | 수집 실행 | C-205 |
| SC-007 | 함수 시험 + 화면 | C-202, C-203 |
| SC-008 | 운영 수집 | C-214 |
| SC-009 | 수집 실행 + DB | C-212 |
| SC-010 | 사람 판단 | H-202 |
| SC-011 | DB 셈 | C-215 |

### 함수 시험
- 도구 / 버전 / 실행 명령: Vitest 5.1.0 / `npm test`, 함께 `npx tsc --noEmit`, `npm run lint`, `npm run build`
| 시험 이름 | 입력 | 기대 결과 | FR |
|---|---|---|---|
| condensation 홑유리 한파 | 실내 20°C·60%, 홑유리, 최저 -5°C | 위험(가), 가장 위험한 시각 = 최저 시각 | FR-004 |
| condensation 이중유리 온화 | 같은 측정값, 이중유리, 최저 5°C | 위험 아님 | FR-004 |
| condensation 경계 | 표면 = 이슬점 + 1 | 위험 | FR-004 |
| condensation 모름 | 창 모름 | 홑유리와 같은 결과 | FR-004 |
| condensation 조건 나 | 실내 70%, 습한 시각 12 / 11 | 위험 / 아님 | FR-004 |
| condensation 측정값 | 없음, 7일 1분 지남 | 판단 안 함 | FR-004 |
| condensation 같은 창 | 기존 창 시작 +47시간 / +49시간 | 같은 사건 / 새 사건 | FR-005 |
| condensation 더 위험 | 여유(표면−이슬점) 더 작음 | 갱신 | FR-005 |
| kma 해석 | 실제 응답 저장본, 오류 코드, 빈 목록, 값 "강수없음"·빈칸 | 시간별 값 / 오류 / 오류 / 건너뜀 | FR-003 |
| kma 발표 시각 | 05:09, 05:10, 00:30 KST | 02시 / 05시 / 전날 23시 | FR-003 |
| kma-grid | 표에 있는 시군구, 없는 시군구(시도 있음), 이상한 코드 | 격자 / 시도 대표 / null | FR-003 |
| home-form | 면적·온도·습도·시각 경계 | 허용·거부와 한국어 문구 | FR-001, FR-002 |
| humidity-plan | AI 응답 정상·빈 값·날짜 포함 | 할 일 목록 / 기본 계획 / 날짜는 우리가 붙임 | FR-007 |

### 화면 눌러 보기
1. 시험 계정 로그인 → 내 정보 → 내 집 → 대전 유성구·원룸·20㎡·모름 저장 → 다시 열면 값 그대로
2. 온습도 입력 → 20°C·60% → 목록 맨 위
3. 개발 서버에서 `/api/cron/weather?fixture=cold` → 사건 목록에 "습도·결로 위험" 1건
4. 상세 → 측정값·예보·추정값 세 칸, 가장 위험한 시각·남은 시간 → 승인 → 내 일정 1개
5. 홈 → 내 집 습도 카드, 375px 가로 넘침 0

### QA
- `qa.md` 참고 (Claude QA C-201~, 사람 QA H-201~)

### 회귀 확인
- 마이홈 공고 수집(`/api/cron/myhome?fixture=sample|changed`)과 공고 사건 생성·승인: 매 단계 끝에 fixture 한 번
- 공고 사건 승인 시 일정 마감일 = 접수 마감일(0010의 승인 함수 수정 뒤 꼭 확인)
- 맞는 공고 목록·상세·팔로우, 슬랙 알림 설정 화면
- 시험 전체(지금 241개), tsc, lint, build

## 5. 제약과 주의점

### 보안
- 기상청 키는 기존 `DATA_GO_KR_SERVICE_KEY`(서버 환경변수)만 쓴다. 오류 메시지에서 가린다(maskSecrets).
- 시군구까지만 받고 상세 주소는 받지 않는다. 측정값·집은 본인만(RLS).
- 사용자가 넣은 값은 React가 이스케이프한다. AI 지시문에 사용자 이름·이메일을 넣지 않는다.

### 성능
- 기상청은 시군구 수만큼만 부른다(같은 시군구는 한 번). 시군구 30곳 이하에서 수집 한 번 60초 안(가정, 시험 계정 수 기준). 시군구 사이 호출은 순서대로, 실패한 시군구는 기록하고 나머지는 계속한다.
- 한 번 수집의 AI 호출 상한은 spec 002 그대로(12건).

### 호환성
- 375px 폭에서 가로 넘침 없음, 키보드로 모달 열고 닫기.

### 지금 돌아가는 기능 깨지 않기
- 마이홈 수집 입구·결과 모양 그대로. 공고 사건 facts 모양 그대로.
- 승인 DB 함수: 공고 사건의 일정 제목·마감일이 지금과 같아야 한다.
- 사건 목록·상세의 공고 사건 화면은 그대로.

### 경계
- 항상 할 것: 순수 함수 시험 먼저, 출처 주석(`// FR-004 (spec 003)`), 가짜 예보로 확인, qa.md 기록.
- 먼저 물을 것: 격자 엑셀 파일 받기, 0010 마이그레이션 적용, vercel.json 크론 추가가 무료 플랜에서 안 될 때(하루 1번으로 줄이기), 실제 회원 데이터 변경, 커밋·push, 배포.
- 절대 하지 말 것: 누수·건물 하자 예측, 하자 기록·사진, 습도계·기기 연동, 에너지 시뮬레이션 고도화, 상세 주소 입력, 내 집 여러 채, 시세 사건, 관리자 화면, 앱 푸시·카카오톡(spec 5절). 승인 없이 일정에 넣기. 시험에서 실제 AI·기상청 부르기. 키를 코드·문서·대화에 쓰기.

### 위험과 대응
| 위험 | 영향 | 대응 |
|---|---|---|
| 기상청 격자표의 시군구 코드(행정동 기준)가 법정동 시군구 코드와 다름 | 일부 집이 격자를 못 찾음 | 시도 대표 격자로 대신하고 실행 기록에 "대표 격자" 수를 남김. 시험에 없는 코드 사례 |
| 정상 상태 식이 실제보다 단순(창틀·모서리는 더 차가움) | 위험을 덜 알림 | "모름"을 홑유리로, +1°C 여유. 상세에 "추정값"이라고 밝힘 |
| 무료 플랜 크론 2개 불가 | 하루 1번 | Intent Q14대로 하루 1번으로 줄이고 문제정의 수정을 묻는다 |
| 기상청 응답 지연·오류 | 사건 누락 | 수집 오류로 기록, 다음 회차가 다시 판단(같은 창이면 중복 없음) |
| AI 초안에 날짜·없는 사실 | 잘못된 일정 | 날짜는 코드가 붙이고, AI 글은 요약·할 일만, 근거 표시 |

## 변경 기록
| 날짜 | 버전 | 바뀐 내용 |
|---|---|---|
| 2026-11-17 | v0.1 | 초안. 6단계, 새 의존성 없음. 승인(사용자 "승인, 파일 받기 허락") |
| 2026-11-17 | v0.1 | 1단계 끝. kma-grid.json 만든 방법: data.go.kr 15084084 참고문서 `기상청41_단기예보 조회서비스_오픈API활용가이드_2610.zip`(1,055,225바이트)의 격자 엑셀(2026-09-30, 3,840행)에서 3단계가 빈 행(시도 16·시군구 256)만, 옛 광주·전남 시도 29·46은 통합 12의 대표 격자. 구가 있는 시는 첫 구 격자. 리뷰 4건 고침(시도 목록 29·46 → 12 포함) |
