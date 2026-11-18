# plan: 009 실질 주거비 비교 (알파)

- 상태: v0.1 (사용자 지시로 진행. ERD v1.9 승인 2026-11-18, 마이그레이션 0020 적용)
- 근거: spec 009 v0.1, ERD v1.9 초안, 한전 주택용 저압 요금표(spec 근거 문서)

## 1. 기술과 버전
지금 스택 그대로. 새 라이브러리 없음. 마이그레이션 0020(`interest_homes` 표·권한, `homes` 비용 칸 5개). 번호는 `docs/plan.md` 조각 표에서 E에 정한 0020.

## 2. 구조와 파일
- `incident/real-cost.ts` (순수): 요금표 계산, 실질 주거비, 비교표, 공고 차이
- `incident/interest-home-form.ts` (순수): 입력 검사
- `incident/interest-homes.server.ts`: 내 관심 주택·내 집 읽기
- `app/(main)/compare/`: 목록(CP_040000), 등록(CP_040100, 수정 겸용), 비교표(CP_040200), 상세(CP_040300)
- `app/(main)/my/home/*`: 비용 칸 / `app/(main)/notices/[id]/page.tsx`: 내 집 대비 한 줄

## 3. 단계
| 단계 | 할 일 | 끝 조건 |
|---|---|---|
| 1 | 순수 함수와 시험(E1~E8) | 시험 통과 |
| 2 | 마이그레이션 0020(승인 뒤), 관심 주택 등록·수정·지우기, 내 집 비용 칸 | 미리보기, 새로고침 뒤 남음 |
| 3 | 비교표·상세·공고 상세 한 줄 | 미리보기, 375px |
| 4 | 운영 배포 | PR #4 합친 뒤, 사용자 승인 |

- [x] 1단계
- [x] 2단계
- [x] 3단계
- [ ] 4단계

## 4. 요구사항 추적
| 요구 | 시험 이름 / QA 번호 |
|---|---|
| FR-001 | interest-home-form.test.ts, C-902 |
| FR-002 | interest-home-form.test.ts "parseCostFields", C-902 |
| FR-003 | real-cost.test.ts "realCost", C-901 |
| FR-004 | real-cost.test.ts "electricityBill", C-901 |
| FR-005 | real-cost.test.ts "compareRealCosts", C-903, H-901 |
| FR-006 | real-cost.test.ts "noticeRentDelta", C-904 |
| SC-001 | C-902, C-903 |
| SC-002 | C-901 |
| SC-003 | C-904 |
| SC-004 | C-905 |

## 5. 제약과 주의
- 절대 하지 말 것: 상세 주소 받기, 출처 없는 추정 공식, 전환율, 추천 점수
- 먼저 물을 것: ERD v1.9(interest_homes, homes 칸 5개) 승인 전에는 마이그레이션을 적용하지 않는다
- PR #4가 리뷰 중이라 Yelim에 올리지 않는다(docs/plan.md 2절 5번). 합쳐진 뒤 올린다
