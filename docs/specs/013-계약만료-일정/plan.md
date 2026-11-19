# plan: 013 계약 만료 일정

- 근거: spec 013 v0.1, PRD v1.11 FR-31, IA v1.9 SC_060000_PG, ERD homes.contract_end_date
- 상태: 초안 v0.1 (사용자 지시 2026-11-19, 질문은 추천안으로. **승인 전**)
- 작성일: 2026-11-19

## 1. 기술과 버전
지금 쓰는 것만 쓴다: Next.js(App Router) + TypeScript strict, Vitest, Supabase. 새 라이브러리 없음. DB·ERD 변경 없음(만료일은 `homes.contract_end_date`에 이미 있음).

## 2. 구조와 파일
| 파일 | 할 일 | 단계 |
|---|---|---|
| `incident/contract-reminder.ts` (새, 순수 함수) | 2달 전 날짜 계산(달 끝 맞춤), 오늘 보일지·상태·남은 날 | 1 |
| `tests/contract-reminder.test.ts` (새) | 시험 먼저: E1~E5 | 1 |
| `app/(main)/schedule/page.tsx`, `contract-reminder-card.tsx`(새), `schedule.module.css` | 내 집 만료일을 읽어 맨 위에 "계약 만료 알림" 묶음, 불러오기 실패(E6), 빈 화면 문구(E7) | 2 |

## 3. 단계
| 단계 | 할 일 | 끝 조건 |
|---|---|---|
| 1 | 순수 함수와 시험(E1~E5) | 실패 확인 뒤 구현, `npm test`·`tsc`·`lint` 통과 |
| 2 | 내 일정 화면에 붙이기(E6·E7), 누르면 내 집 화면 | 미리보기(가상 계정), 375px, `npm run build` |

## 4. 요구사항 추적
| 요구 | 시험 이름 / QA 번호 |
|---|---|
| FR-001, SC-001, SC-003 | `tests/contract-reminder.test.ts` / C-1301, C-1302, C-1304 |
| FR-002, SC-002 | C-1304, H-1301 |
| FR-003 | `tests/contract-reminder.test.ts` "지남" / C-1301 |
| E1~E5 | `tests/contract-reminder.test.ts` / C-1301 |
| E6·E7 | C-1303 |

## 5. 제약과 주의점
- 항상: 날짜는 한국 날짜(`toKstDate`), 순수 함수는 현재 시각을 인자로 받는다. 출처 주석 `// FR-001 (spec 013)`
- 먼저 물을 것: DB 표 추가, 알림 보내기
- 절대 하지 말 것: 사건·일정 행 만들기, 슬랙·앱 알림, 체크리스트 자동 만들기, 계약 갱신·해지 처리(spec 3절 하지 않을 것)
- 시험 화면 확인은 가상 계정만 쓴다(실제 계정 값을 바꾸지 않음)
