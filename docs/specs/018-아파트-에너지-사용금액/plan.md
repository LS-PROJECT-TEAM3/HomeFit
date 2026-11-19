# plan: 018 아파트 에너지비를 시군구 평균 사용금액으로 추정

- 근거: spec 018 v0.1, spec 011·017 plan(`watch/kepco-household*.ts`, `incident/energy-estimate*.ts`, `incident/real-cost.ts`)
- 상태: 초안 v0.1 (사용자 지시 2026-11-19. **승인 전**)
- 작성일: 2026-11-19

## 1. 기술과 버전
지금 쓰는 것만 쓴다: Next.js + TypeScript strict, Vitest. 새 라이브러리·DB·ERD 없음. 키는 이미 있는 `DATA_GO_KR_SERVICE_KEY`(공공데이터포털, 2026-11-19 이 API 활용신청 자동승인, 개발계정 하루 5,000건). 주소 `https://apis.data.go.kr/1613000/ApHusEnergyUseInfoOfferServiceV2/getSignguAvrgEnergyUseAmountInfoSearchV2?serviceKey&sigunguCode&searchDate=YYYYMM&_type=json`. 한전처럼 `"use cache"`로 시군구·달마다 하루 기억.

## 2. 구조와 파일
| 파일 | 할 일 | 단계 |
|---|---|---|
| `watch/apt-energy.ts` (새, 순수) | 응답 해석(E2 모두 0 → 없음, E3 모양 다름 → 던짐), 조회 달(작년 같은 달, 그 전 해), 출처 | 1 |
| `watch/apt-energy.server.ts` (새) | 부르기, 하루 기억, 키 없으면 던짐 | 1 |
| `incident/real-cost.ts` | `estimatedEnergyCost`를 kWh 추정보다 먼저(FR-003) | 1 |
| `incident/energy-estimate.ts`, `.server.ts` | 아파트·면적 있는 집만 시군구를 모아 부르고(E5) 추정 금액을 붙임 | 1 |
| `tests/apt-energy.test.ts`, `tests/apt-energy-server.test.ts`, `tests/real-cost.test.ts`, `tests/energy-estimate.test.ts` | 시험 먼저(가짜 fetch, 실제 API 안 부름) | 1 |
| `app/(main)/compare/cost-view.tsx` | 근거 글(FR-004) | 2 |
| `docs/data-sources.md`, `.env.example` | 출처 줄 | 2 |

## 3. 단계
| 단계 | 할 일 | 끝 조건 |
|---|---|---|
| 1 | 해석·부르기·추정 순서와 시험 | 실패 확인 뒤 구현, `npm test`·`tsc`·`lint` 통과 |
| 2 | 근거 글, 문서 | 실제 키로 한 번 불러 값 확인, `npm run build` |

## 4. 요구사항 추적
| 요구 | 시험 이름 / QA 번호 |
|---|---|
| FR-001, FR-002, SC-001, SC-002, E2, E4, E6 | `tests/apt-energy.test.ts`, `tests/energy-estimate.test.ts` / C-1801 |
| FR-003, E1, E3, E5 | `tests/real-cost.test.ts`, `tests/apt-energy-server.test.ts` / C-1801 |
| FR-004, SC-003 | C-1802, H-1801 |

## 5. 제약과 주의점
- 항상: 시험은 실제 API를 부르지 않는다. 오류 문구에 키를 넣지 않는다
- 먼저 물을 것: 관리비 평균, 단지코드 입력
- 절대 하지 말 것: 0을 "추정값 0원"으로 쓰기, 키를 로그에 남기기
