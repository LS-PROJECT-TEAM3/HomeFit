# plan: 011 에너지비 추정과 에너지 분석 화면

- 근거: spec 011 v0.2 (Q1 결정: 한국전력 시군구별 가구 평균 전력사용량), spec 009 plan(요금표 `incident/real-cost.ts`)
- 상태: 초안 v0.1 (사용자 지시 2026-11-18 "승인 받지 말고 진행". **승인 전**)
- 작성일: 2026-11-18

## 1. 기술과 버전
지금 쓰는 것만 쓴다: Next.js(App Router) + TypeScript strict, Vitest, Supabase. 새 라이브러리 없음.
한전 API는 전력데이터개방포털(bigdata.kepco.co.kr) 키가 있어야 부를 수 있다(spec Q3). 주소·요청 칸·응답 칸 이름은 로그인 뒤에만 보여 아직 확인하지 못했다. 그래서 2단계는 키와 설명서를 확인한 뒤 시작한다.

## 2. 구조와 파일
| 파일 | 할 일 | 단계 |
|---|---|---|
| `incident/real-cost.ts` | 에너지비 순서에 "추정" 더하기(`kind: "estimated"`), 추정 kWh를 입력으로 받기 | 1 |
| `incident/energy-estimate.ts` (새, 순수 함수) | 시군구 평균값 검사(E2), 12개월 예상 요금 표 | 1 |
| `tests/energy-estimate.test.ts`, `tests/real-cost.test.ts` | 시험 먼저 | 1 |
| `app/(main)/compare/cost-view.tsx` | 값 종류 글자에 "추정값" 더하기, 합계 옆 "추정 포함" | 1 |
| `watch/kepco-household.ts`, `watch/kepco-household.server.ts`, `watch/fixtures/kepco-house.ts` | 한전 응답 해석(순수: 지역 코드 나누기, 전전월·그 전 달, 응답 읽기)과 부르기(`"use cache"` 하루, spec Q4 (B)). 가짜 응답으로 시험 | 2 |
| `incident/energy-estimate.server.ts`(시군구 평균 불러오기), `app/(main)/compare/` 목록·비교표·상세, `app/(main)/energy/` page·cost·load·energy-states | 추정값 연결, 근거 문구, 에너지 분석 화면 두 탭 | 3 |

## 3. 단계
| 단계 | 할 일 | 끝 조건 |
|---|---|---|
| 1 | 순수 함수와 시험(E1~E4), 비교표의 값 종류 글자 | `npm test`·`tsc`·`lint` 통과 — **끝(2026-11-18, 491개 통과)** |
| 2 | 한전 API 해석·부르기, 가짜 응답 시험. 실패는 "수집 오류"로 남기고 화면은 미입력 | 시험 통과 + 실제 키로 불러 보기 — **끝(2026-11-18)** |
| 3 | 집 비교에 추정값, 에너지 분석 화면(사용량·12개월 요금), "범위 밖" 문구 제거, IA 반영(spec Q2) | 미리보기, 375px, 스크린샷 — **끝(2026-11-18, 시험 501개), IA 반영(Q2)은 대기** |

## 4. 요구사항 추적
| 요구 | 시험 이름 / QA 번호 |
|---|---|
| FR-001 | energy-estimate.test.ts "householdAverageKwh", C-1101, C-1104 |
| FR-002 | real-cost.test.ts "추정", C-1102 |
| FR-003 | energy-estimate.test.ts "yearlyBills", C-1103, H-1101 |
| SC-001 | C-1104, H-1101 |
| SC-002 | C-1102 |
| SC-003 | C-1103, C-1105 |

## 5. 제약과 주의
### 절대 하지 말 것
- 도시가스·난방비 계산, 부가세·기금·기후환경·연료비조정 요금
- 확인하지 못한 수치로 추정하기(키를 받기 전에 숫자를 지어 넣지 않는다), 개인 맞춤 추천 점수
- 실제 계량기·한전 계정 연동
- 시험에서 실제 한전 API 부르기
### 먼저 물을 것
- 한전 포털 가입·키 신청(사람이 함, spec Q3), 저장 방식을 표로 바꿀 때(ERD 변경, spec Q4)
- IA에 에너지 분석 화면 올리기(spec Q2)
