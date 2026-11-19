# plan: 019 입주 전 점검 저장과 하자 기록

- 근거: spec 019 v0.1, ERD v1.11, 마이그레이션 0021
- 상태: 초안 v0.1 (사용자 지시 2026-11-19. **승인 전**)
- 작성일: 2026-11-19

## 1. 기술과 버전
지금 쓰는 것만 쓴다: Next.js(App Router) + TypeScript strict, Supabase(PostgreSQL·RLS·Storage), Vitest. 새 라이브러리 없음. 사진은 Supabase Storage 비공개 버킷 `defect-photos`, 보기는 본인 세션으로 만든 짧은 서명 주소(signed URL).

## 2. 구조와 파일
| 파일 | 할 일 | 단계 |
|---|---|---|
| `supabase/migrations/0021_move_in_checks_and_defects.sql`, `lib/supabase/database.types.ts` | 칸·표·저장소·접근 규칙, 타입 | 1 |
| `incident/move-in-checklist.ts` (새, 순수) | 항목 목록, 저장 값 검사(E2) | 2 |
| `incident/defect-form.ts` (새, 순수) | 하자 입력 검사(E4), 사진 검사(E5), 저장소 경로 | 2 |
| `tests/move-in-checklist.test.ts`, `tests/defect-form.test.ts` | 시험 먼저 | 2 |
| `app/(main)/qc/checklist/` (page, actions, 화면 부품) | 관심 주택 고르기·점검 저장(FR-001, E1) | 3 |
| `app/(main)/qc/records/` (page, actions, 화면 부품) | 하자 넣기·목록·지우기·사진(FR-002·003, E3·E6) | 4 |
| `app/(main)/qc/layout.tsx`, `move-in-checklist.tsx` | "뼈대" 표시 지우기 | 3 |

## 3. 단계
| 단계 | 할 일 | 끝 조건 |
|---|---|---|
| 1 | 마이그레이션을 공용 DB에 적용, 타입 | 표·칸·버킷·정책이 DB에 있음(SQL로 확인) |
| 2 | 순수 함수와 시험 | 실패 확인 뒤 구현, `npm test` 통과 |
| 3 | 입주 전 점검 저장 | `tsc`·`lint`, 화면 확인 |
| 4 | 하자 기록·사진 | `tsc`·`lint`·`build`, RLS를 SQL로 확인(다른 회원 거절) |

## 4. 요구사항 추적
| 요구 | 시험 이름 / QA 번호 |
|---|---|
| FR-001, SC-001, E1, E2 | `tests/move-in-checklist.test.ts` / C-1901, C-1903 |
| FR-002, FR-003, SC-002, E3~E6 | `tests/defect-form.test.ts` / C-1902, C-1904 |
| SC-003, E7 | C-1905 |
| SC-004, E8 | C-1903, C-1904, H-1901 |

## 5. 제약과 주의점
- 항상: 서버 액션마다 로그인 확인, 내 행만. 사진 주소는 짧게(서명 주소 10분)
- 먼저 물을 것: 사진 여러 장, 관리자에게 사진 보이기
- 절대 하지 말 것: 실제 계정(예림 관리자)에 시험 자료 넣기, 하자 원인·안전 판정
