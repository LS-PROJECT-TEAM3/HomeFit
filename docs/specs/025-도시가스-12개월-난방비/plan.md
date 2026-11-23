# plan: 025 내 집 도시가스 사용량과 12개월 예상 난방비

- 근거: spec 025 v0.2(승인 2026-11-23), PRD v1.24 FR-28, ERD v1.15 homes(gas_usage_mj·gas_bill_month·gas_tariff_region), spec 016(계산기·요금표), 지금 코드(아래 2절), 한국가스공사 「월별 시도별 도시가스 판매현황」(공공데이터포털 15040819)
- 상태: 승인됨 v0.1 (사용자 "승인" 2026-11-23: plan, 마이그레이션 0024)
- 작성일: 2026-11-23

> spec의 FR·SC 번호를 그대로 쓴다. 새 요구사항은 만들지 않는다.

## 1. 기술과 버전
2026-11-23 `package.json`으로 확인한 값.
- Next.js 16.4.6(App Router), React 19.3.0, TypeScript strict, Vitest 5.1.0, Supabase JS 2.119.0
- 새 라이브러리 없음. 막대는 지금 전기 12개월 막대(`app/(main)/energy/bill-chart.tsx`)처럼 SVG/div
- DB 변경: 마이그레이션 `0024_home_gas_usage.sql` 하나(spec Q2 승인)

## 2. 구조와 파일
지금 코드(읽은 곳):
- 요금 계산 `incident/gas-bill.ts`(`GAS_TARIFF` 32곳, `gasBill(region, mj)`: 기본요금 + 516MJ까지 취사 + 넘는 만큼 난방, 부가세 포함 반올림, `checkGasUsage` 0~100,000MJ), 요금표 `watch/gas-tariff.json`
- 난방비 탭 `app/(main)/energy/heating/page.tsx` + `heating-calculator.tsx`(직접 입력 계산기, 저장 없음). 전기 탭은 `energy/load.ts`로 내 집을 읽는다
- 내 집 `app/(main)/my/home/`: `actions.ts saveHome`(upsert, `parseHomeForm`·`parseCostFields`), `home-form.tsx`(212줄, 접는 묶음 `Fold` 4개), `load.ts loadMyHome`
- 시군구 코드 앞 2자리가 시도(강원 42/51, 전북 45/52 둘 다 있음)

월별 비율 자료(새 파일 `watch/gas-monthly-share.json`, 약 3KB):
```json
{ "source": { "name": "한국가스공사 월별 시도별 도시가스 판매현황", "url": "https://www.data.go.kr/data/15040819/fileData.do",
              "years": [2022, 2023, 2024], "note": "전체 용도 판매량(산업용 등 포함), 판매월 = 검침·청구 기준" },
  "national": [0.149, 0.130, …12개], "sido": { "서울": [12개], "경기": […], … 17곳 } }
```
- 2026-11-23 받은 CSV에서 해마다 12개월 합으로 나눈 뒤 3년 평균(합이 1이 되게 맞춤). 원본 CSV는 저장소에 넣지 않고, 뽑은 방법을 `docs/data-sources.md`에 적는다

바꿀 것:
```text
watch/gas-monthly-share.json        (새) 위 자료
incident/gas-year.ts                (새, 순수) sidoOfSigungu, tariffRegionFor(시도 → 자동 지역 | 고를 목록), monthlyShares(시도, 자료),
                                    yearlyGas({ mj, month, shares, region }) → 12개월 MJ·요금·합계, parseGasFields(E1·E2, 지역 검사)
tests/gas-year.test.ts              (새) 시험 먼저
supabase/migrations/0024_home_gas_usage.sql  homes 칸 3개 + 검사(1~100,000, 1~12, 둘 다 있거나 둘 다 없음)
lib/supabase/database.types.ts      homes 칸 3개
app/(main)/my/home/gas-fold.tsx     (새) "도시가스" 접는 묶음: 사용량(MJ), 고지서 달, (도면) 요금 지역
app/(main)/my/home/actions.ts·load.ts·home-form.tsx  저장·읽기·묶음 끼우기
app/(main)/energy/heating/page.tsx  내 집을 읽어 12개월 막대 또는 빈 안내 + 지금 계산기
app/(main)/energy/heating/gas-year-chart.tsx  (새) 12개월 막대·합계·근거
docs/data-sources.md                자료 출처·뽑은 방법 한 줄
```

## 3. 단계별 접근
| 단계 | 할 일 | 끝 조건 |
|---|---|---|
| 1 | 시험 먼저: 비율 자료 읽기(합 1, 17곳), 시도 찾기(42·51 강원 등), 요금 지역 자동/고르기, 12개월 어림(넣은 달 = 넣은 값, 비율 0·없음 → 전국 E3), 요금 반올림·합계(E4), 기본요금 없음(E5), 입력 검사(E1·E2, 도에서 지역 필수) → 실패 확인 → 구현. 자료 파일 만들기 | 시험·tsc·lint 통과 |
| 2 | 마이그레이션 0024를 공유 DB에 적용(시작 때 한 번 알림), 타입 갱신, 되돌림 SQL로 검사 칸 확인. 내 집 "도시가스" 묶음과 저장·읽기 | SQL 검사 통과, advisors 새 경고 없음, 미리보기(저장은 사용자 허락한 내 집에서) |
| 3 | 난방비 탭: 12개월 막대(넣은 달·가장 많은 달 글자 표시), 합계, "추정"·근거, 빈 안내와 링크, 도에서 지역 안 고름 안내. 지금 계산기는 그대로 | 미리보기 PC·휴대폰 폭, 넣은 달 막대 = 계산기 같은 값(SC-001), 시험·tsc·lint·build 통과 |

- [x] 1단계  - [x] 2단계  - [x] 3단계

## 4. 테스트 전략
- 계산은 모두 순수 함수 Vitest. 손 계산 사례 하나(예: 경기, 1월 2,800MJ)를 시험에 넣는다
- DB는 공유 DB에서 되돌림(ROLLBACK) SQL로 검사 칸만 확인
- 화면은 미리보기. 저장 버튼은 공유 DB에 쓰니 누르기 전에 묻는다
- 사람 QA: 고지서 값으로 한 바퀴(넣기 → 막대 → 근거 읽기)

| 요구사항 | 단계 | 시험 이름 / QA 번호 |
|---|---|---|
| FR-001 내 집 저장 | 1·2 | C-2505, C-2506, C-2507, H-2501 |
| FR-002 12개월 어림 | 1 | C-2501, C-2503 |
| FR-003 요금·막대 | 1·3 | C-2504, C-2508 |
| FR-004 추정·근거 | 3 | C-2508, H-2501 |
| FR-005 요금 지역 | 1·2·3 | C-2502, C-2505, C-2507, C-2509 |
| FR-006 빈 안내 | 3 | C-2509 |
| SC-001 | 1·3 | C-2504, C-2508, H-2501 |
| SC-002 | 3 | C-2508, H-2501 |
| SC-003 | 2·3 | C-2507, H-2501 |
| SC-004 (E1~E7) | 1~3 | C-2503~2507, C-2511 |

## 5. 제약과 주의점
**항상:**
- 화면 금액에 "추정"과 근거를 붙인다. 전체 판매량(가정용만이 아님)이라는 한계를 숨기지 않는다
- 계산은 순수 함수, 자료는 저장소 파일. 실행 중 외부 API를 부르지 않는다
- 요금 규칙은 `gasBill`을 그대로 쓴다(계산기와 같은 값)

**먼저 물을 것:**
- 마이그레이션 0024를 공유 DB에 적용하기 직전
- 공유 DB에 저장 버튼을 눌러 보기 전
- 커밋·push·PR

**절대 하지 말 것 (spec 제외 범위):**
- 관심 주택(집 비교)의 가스 칸, 실질 주거비 반영
- 고지서 여러 장
- 지역난방·중앙난방·LPG, ㎥ → MJ 바꾸기
- 가정용만 나눈 값이라고 표시하기
- 비율 자료 정기 수집
- 실제 고지서와 같다고 보장하기

## 변경 기록
| 날짜 | 버전 | 바뀐 내용 |
|---|---|---|
| 2026-11-23 | v0.1 | 초안, 승인. 4절 QA 번호(qa.md 절차 A) |
