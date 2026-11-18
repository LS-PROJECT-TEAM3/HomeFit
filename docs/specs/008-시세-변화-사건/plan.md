# plan: 008 주변 전월세 시세 변화 알림

- 상태: v0.1 (사용자 지시로 바로 진행)
- 근거: spec 008 v0.1, 실제 응답 확인(2026-11-18, `apis.data.go.kr/1613000/RTMSDataSvc{Apt,Offi,RH,SH}Rent/getRTMSDataSvc{…}Rent`, `LAWD_CD` 5자리, `DEAL_YMD` YYYYMM, `_type=json`, resultCode "000", 금액 만원 단위·"13,500" 글자 또는 숫자, 면적 `excluUseAr`·단독은 `totalFloorAr`)

## 1. 기술과 버전
지금 스택 그대로. 새 라이브러리 없음. 마이그레이션 0017(interest_areas 표·권한, `rtms_trade` 출처). 키는 기존 `DATA_GO_KR_SERVICE_KEY`.

## 2. 구조와 파일
- `watch/rtms.ts` (순수): 응답 → 거래(Trade), 조회 달 목록
- `incident/rent-compare.ts` (순수): 거래 고르기·중간값, 내 집·관심 지역 판단, 임시 값 한곳(`RENT_RULES`)
- `incident/rent-plan.ts` (순수): 기본 할 일·AI 지시·만료 2달 전 날짜
- `watch/rtms.server.ts`: 쪽 받기 / `watch/collect-rent.server.ts`: 수집 한 번 / `incident/rent.server.ts`: 대상 읽기·알림·계획 저장
- `watch/rent-fixtures.ts`: 가짜 묶음(rise·few·failure)
- `app/api/cron/rent/route.ts`, `vercel.json` `0 1 2 * *`(매달 2일 10:00 KST)
- `app/(main)/my/areas/*`: 관심 지역 화면 / `app/(main)/incidents/[id]/rent-facts.tsx`: 비교표
- 관리자 actions·watch·sim, `incident/notify.ts` 문구

## 3. 단계
| 단계 | 할 일 | 끝 조건 |
|---|---|---|
| 1 | 순수 함수와 시험(E1~E3, E5, E8, E9) | 시험 통과 |
| 2 | 마이그레이션 0017, 관심 지역 화면 | 넣기·지우기 미리보기, 375px |
| 3 | 수집·알림·계획·슬랙·정기 실행·관리자·가짜 묶음 | 시뮬레이터 rise → 알림, 다시 돌려도 그대로, 실제 API 수집 성공 |
| 4 | 알림 상세 비교표·승인 → 일정 | 미리보기(가상 계정 알림) |
| 5 | 운영 배포 | 사용자 승인 뒤 |

- [x] 1단계
- [x] 2단계 (사용자 요청 2026-11-18: 시군구 여러 곳 한 번에, 한 번에 10곳까지)
- [x] 3단계 (시뮬레이터 live 묶음 추가: 실제 API 거래를 가상 계정에만)
- [x] 4단계
- [x] 5단계 (사용자 승인 2026-11-18, 배포 bf09fbc)

## 4. 요구사항 추적
| 요구 | 시험 이름 / QA 번호 |
|---|---|
| FR-001 | rent-plan.test.ts "parseAreaForm", C-802 |
| FR-002 | rtms.test.ts, C-803 |
| FR-003 | rent-compare.test.ts, C-801 |
| FR-004 | rent-compare.test.ts, C-801, C-804 |
| FR-005 | rent-compare.test.ts, C-801 |
| FR-006 | rent-plan.test.ts, C-805, H-801 |
| FR-007 | C-803, C-804 |
| SC-001 | C-804 |
| SC-002 | C-801 |
| SC-003 | C-803 |
| SC-004 | C-805, H-801 |
| SC-005 | C-802 |

## 5. 제약과 주의
- 절대 하지 말 것: 전환율, 매매가, 매물 크롤링, 상세 주소 저장, AI에 시군구·ID 넣기
- 먼저 물을 것: 임시 값 바꾸기(spec Q1), 관심 주택 반영
- 수집 대상 시군구 × 유형 × 3개월만 부른다(전국을 부르지 않는다). 쪽 크기 1000
