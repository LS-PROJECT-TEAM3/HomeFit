# plan: 015 추천 결과

- 근거: spec 015 v0.1, PRD v1.13 FR-28, IA v1.11 CP_040400_TB, spec 009·011 계산(`incident/real-cost.ts`)
- 상태: 초안 v0.1 (사용자 지시 2026-11-19, 질문은 추천안으로. **승인 전**)
- 작성일: 2026-11-19

## 1. 기술과 버전
지금 쓰는 것만 쓴다: Next.js(App Router) + TypeScript strict, Vitest. 새 라이브러리·DB·ERD·외부 서비스 없음. 실질 비용 계산은 `compareRealCosts` 그대로 쓴다.

## 2. 구조와 파일
| 파일 | 할 일 | 단계 |
|---|---|---|
| `incident/recommend.ts` (새, 순수 함수) | 비교 줄 → 순위(칸이 다 찬 집)·덜 찬 집·근거 글 | 1 |
| `tests/recommend.test.ts` (새) | 시험 먼저: FR-001~003, E2~E5 | 1 |
| `app/(main)/compare/load-compare.ts` (새, 서버) | 실질 비용 비교와 추천 결과가 같이 쓰는 불러오기(내 집·관심 주택·한전 추정) | 2 |
| `app/(main)/compare/cost/page.tsx` | 위 불러오기로 바꿈(동작 그대로) | 2 |
| `app/(main)/compare/recommend/page.tsx`, `layout.tsx` | 순위 카드·덜 찬 집·정렬 기준 글, 탭의 "범위 밖" 표시 지우기 | 2 |

## 3. 단계
| 단계 | 할 일 | 끝 조건 |
|---|---|---|
| 1 | 순수 함수와 시험 | 실패 확인 뒤 구현, `npm test`·`tsc`·`lint` 통과 |
| 2 | 화면 | 미리보기(예림 계정은 읽기만), 375px, `npm run build` |

## 4. 요구사항 추적
| 요구 | 시험 이름 / QA 번호 |
|---|---|
| FR-001, SC-003, E3 | `tests/recommend.test.ts` / C-1501, C-1503 |
| FR-002, SC-002, E2 | `tests/recommend.test.ts` / C-1501, C-1502 |
| FR-003, SC-001, E4, E5 | `tests/recommend.test.ts` / C-1501, C-1502, H-1501 |
| E1, E6 | C-1502 |

## 5. 제약과 주의점
- 항상: 근거 글은 계산한 숫자만, 금액은 `tabular-nums`, 값 종류는 글자로(디자인 기본선 5)
- 먼저 물을 것: 점수·가중치를 넣자는 요구, 다른 자료를 순위에 섞기
- 절대 하지 말 것: 점수·별점, 계약 권유 문구, 실제 계정 자료 바꾸기
