# plan: 010 관리자 수정 기록, 비슷한 지난 알림, 시세 채점 (조각 B)

- 상태: v0.1 승인됨 (2026-11-18 사용자 "plan 승인")
- 근거: spec 010 v0.2(승인 2026-11-18), docs/plan.md 1절 조각 B(DB 번호 0019), ERD v1.9(audit_logs, 권한 표), 현재 코드(`eval/`, `incident/rent-detect.ts`, `knowledge/history.ts`, `app/(main)/admin/users/[id]/page.tsx`)

## 1. 기술과 버전
지금 스택 그대로(Next.js App Router, TypeScript strict, Supabase, Vitest). 새 라이브러리 없음.
- DB: 마이그레이션 `0019_audit_logs.sql` 하나. ERD v1.9에 이미 있는 `audit_logs` 표를 그대로 만든다(ERD 변경 없음). 수정과 기록을 함께 하는 DB 함수 `admin_update_member_input`(security definer, `is_admin()` 검사, 한 거래 안에서 수정 + 기록). 적용은 단계 3에서 하고, 공용 DB(운영과 같음)라 적용 직전에 한 번 더 알린다.
- 찾기: 기록 찾기(spec 005의 기록 찾기)와 같은 낱말 겹침(`knowledge/chat.ts` `rankSources`). 임베딩·`knowledge_chunks` 표는 만들지 않는다(ERD Q1 그대로).

## 2. 구조와 파일
| 파일 | 할 일 |
|---|---|
| `eval/cases.ts` | `RentCase` 종류와 정답 묶음 R-01~ 추가(가짜 거래, 정답은 spec 008 규칙·spec 010 E1~E7) |
| `eval/score.ts` | `predictRent`: `planRentIncidents`에 넣어 알림이 생기면 울린 것. `byKind.rent` 추가 |
| `app/(main)/admin/eval/page.tsx` | 종류 줄에 "시세 변화" 추가 |
| `knowledge/similar.ts` (새, 순수) | `findSimilarIncidents({ current, closed })`: 같은 종류·자기 자신 빼기·낱말 겹침 상위 3건 |
| `knowledge/history.ts` | 종류 글자에 시세(`rent_price_change`) 추가(지금 빠져 있음) |
| `knowledge/history.server.ts` | 기록 찾기의 `loadClosedRows`(내 끝난 알림 읽기, RLS)를 내보내 함께 씀. 처음엔 `similar.server.ts`를 새로 만들려 했으나 같은 읽기라 합침(2026-11-18) |
| `app/(main)/incidents/[id]/similar.tsx` (새) | "비슷한 지난 알림" 칸 |
| `incident/admin-edit.ts` (새, 순수) | 사유·값 검사, 바뀐 칸만 고르기(E10, E13) |
| `supabase/migrations/0019_audit_logs.sql` (새) | 표, RLS(관리자 읽기만, 쓰기는 함수로만), DB 함수 |
| `app/(main)/admin/users/[id]/` | 수정 모달(IA AD_070102_MD), 수정 기록 목록, 서버 동작 |
| `lib/supabase/database.types.ts` | `audit_logs`, 함수 타입 |

## 3. 단계별 접근
| 단계 | 할 일 | 끝 조건 |
|---|---|---|
| 1 | 시세 채점: 정답 묶음(E1~E7 모두), 채점 함수, 화면 줄, `npm run eval`로 결과 파일 갱신 | 시험·채점 통과(놓침 0, 잘못 울림 0), 채점 화면에 시세 줄 |
| 2 | 비슷한 지난 알림: 순수 함수 시험(E8) → 읽기·화면 | 시험 통과, 가상 계정 알림 상세에서 확인, 375px |
| 3 | 관리자 수정: 순수 함수 시험(E10, E13) → 마이그레이션 0019(적용 전 알림) → 모달·기록 목록 | 시험 통과, 가상 계정 입력을 관리자로 고쳐 기록 한 줄, 관리자 아닌 계정 거절(E12), 375px |

- [x] 1단계
- [x] 2단계
- [x] 3단계

단계마다 `harness-qa` B와 `ponytail-review`. PR #8이 리뷰 중이라 그동안은 내 컴퓨터에서만 만들고, 합쳐진 뒤 main을 받고 커밋·PR(docs/plan.md 2절).

## 4. 테스트 전략
### 요구사항 추적
| FR/SC | 확인 방법 | 시험 이름 / QA 번호 |
|---|---|---|
| FR-001 | 함수 시험 + 채점 화면 | eval-score.test.ts "시세", C-1001, C-1002 |
| FR-002 | 함수 시험 + 미리보기 | similar.test.ts, C-1003, C-1004 |
| FR-003 | 함수 시험 + DB 함수 확인 + 미리보기 | admin-edit.test.ts, C-1005, C-1006, C-1007 |
| SC-001 | 채점 결과 파일·화면 | C-1001, C-1002 |
| SC-002 | 미리보기(가상 계정) | C-1003, C-1004, H-1001 |
| SC-003 | 미리보기 + DB 기록 확인 | C-1005, C-1006, C-1007, H-1002 |
| SC-004 | 375px 미리보기 | C-1008 |

### 함수 시험
| 시험 이름 | 입력 | 기대 결과 | FR |
|---|---|---|---|
| 시세 정답 묶음 | E1~E7 가짜 거래 | 정답과 같음(놓침 0, 잘못 울림 0) | FR-001 |
| findSimilarIncidents | 끝난 알림 여러 개, 다른 종류, 자기 자신 | 같은 종류만, 자기 자신 빼고, 최대 3건, 없으면 빈 목록(E8) | FR-002 |
| admin-edit 검사 | 사유 빈칸·1자·201자, 바뀐 것 없음 | 오류 문구(E10), "바뀐 내용이 없습니다"(E13) | FR-003 |

### 화면 눌러 보기
- 채점 화면에 시세 줄, 가상 계정 알림 상세의 비슷한 지난 알림, 관리자 회원 상세의 수정 모달과 기록 목록. 실제 회원 데이터는 고치지 않는다.

### QA
- C·H 번호는 qa.md. E11(기록 실패 시 되돌림)과 E12(관리자 아님 거절)는 DB 함수를 SQL로 불러 확인한다.

### 회귀 확인
- 단계마다 `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` 넷 다. 기존 채점 18건 숫자가 그대로인지.

## 5. 제약과 주의점
- 절대 하지 말 것: 관리자 승인·거절 버튼, 알림·일정 직접 수정, 수정 기록 지우기·고치기, 채점에서 실제 API 부르기, 실제 회원 데이터로 수정 시험(가상 계정만)
- 먼저 물을 것: 마이그레이션 0019 적용(공용 DB), 공고 조건·내 집 밖의 표를 고치게 하는 것, 커밋·push·배포
- 순수 함수(`eval/`, `knowledge/similar.ts`, `incident/admin-edit.ts`)는 DB·현재 시각을 직접 쓰지 않는다

## 변경 기록
| 날짜 | 버전 | 바뀐 내용 |
|---|---|---|
| 2026-11-18 | v0.1 | 작성, 승인 |
