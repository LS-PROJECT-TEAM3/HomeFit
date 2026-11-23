# plan: 023 결정 되돌리기

- 근거: spec 023 v0.2(승인 2026-11-23), PRD v1.21 FR-16·FR-17·FR-38, ERD v1.13(notice_follows, incident_actions, incidents, schedule_items, 접근 규칙), 지금 코드(아래 2절)
- 상태: 승인됨 v0.1 (사용자 "승인" 2026-11-23: plan, 마이그레이션 0023)
- 작성일: 2026-11-23

> spec의 FR·SC 번호를 그대로 쓴다. 새 요구사항은 만들지 않는다.

## 1. 기술과 버전
2026-11-23 `package.json`·명령으로 확인한 값.
- Next.js 16.4.6(App Router), React 19.3.0, TypeScript strict, Vitest 5.1.0, Node 24, Supabase JS 2.119.0
- 새 라이브러리 없음. DB 변경은 마이그레이션 `0023` 하나(ERD v1.13, spec 023 Q3 승인)

## 2. 구조와 파일
지금 코드(읽은 곳):
- 승인·거절은 DB 함수 `approve_incident`(0010)·`reject_incident`(0002)가 이력·상태·일정을 한 번에 처리한다. 화면은 `app/(main)/incidents/[id]/actions.ts`·`decision-panel.tsx`·`page.tsx`
- 공고 결정은 `app/(main)/notices/[id]/actions.ts`(followNotice·ignoreNotice, upsert)와 `follow-panel.tsx`. notice_follows는 본인 넣기·바꾸기만 되고 지우기 권한이 없다(0009)
- 거절 사유를 읽는 곳이 세 군데다: 알림 상세(`actions.find(reject)` 첫 줄), 처리 기록(`knowledge/history.server.ts`), 기록 찾기 답변 자료(`knowledge/chat.server.ts`). 취소 뒤 다시 거절하면 거절 줄이 둘이 되므로 **마지막 줄**을 읽어야 한다

바꿀 것:
```text
supabase/migrations/0023_undo_decisions.sql   (새) notice_follows 본인 지우기, action 값 2개, cancel_approval·cancel_rejection 함수
lib/supabase/database.types.ts                함수 2개 타입
incident/actions-history.ts                   (새, 순수) latestRejectReason: 처리 이력에서 마지막 거절 사유 (세 번째 쓰임이라 뽑음)
knowledge/history.server.ts, chat.server.ts   처리 이력을 시각 순으로 읽고 latestRejectReason 사용
app/(main)/notices/[id]/actions.ts            clearNoticeDecision (FR-001·002)
app/(main)/notices/[id]/follow-panel.tsx      "팔로우 풀기"·"관심 없음 취소" 버튼
app/(main)/incidents/[id]/actions.ts          cancelApproval, cancelRejection + 오류 문구
app/(main)/incidents/[id]/undo-panel.tsx      (새) 승인 취소(확인 창)·거절 취소 버튼
app/(main)/incidents/[id]/page.tsx            끝난 줄(doneBar)에 undo-panel, 거절 사유는 latestRejectReason
tests/actions-history.test.ts                 (새)
```

DB 함수(0023)의 동작:
- `cancel_approval(id)`: 본인 사건을 잠그고(for update), 상태가 `approved`가 아니면 `incident_not_approved` 오류(E2·E3). 맞으면 ① 처리 이력에 `cancel_approve` 한 줄 ② 그 사건 대응안으로 만든 일정 한 줄 지움 ③ 상태 `pending`, closed_at 비움. 한 함수라 셋이 함께 되거나 함께 안 된다
- `cancel_rejection(id)`: 상태가 `rejected`가 아니면 `incident_not_rejected`. 맞으면 이력 `cancel_reject` 한 줄, 상태 `pending`, closed_at 비움(일정 없음)
- 다시 승인하면 기존 `approve_incident`가 그대로 일정 하나를 만든다(FR-006). 거절 상태에서 바로 승인은 지금처럼 막고, 거절 취소 뒤에 승인한다
- 두 함수 모두 `security definer`, `search_path = ''`, anon 실행 막고 authenticated만(0002와 같은 방식). 관리자도 본인 사건만(FR-007)

## 3. 단계별 접근
| 단계 | 할 일 | 끝 조건 |
|---|---|---|
| 1 | 시험 먼저: `latestRejectReason`(이력 없음, 거절 하나, 거절→취소→거절, 취소만) 시험을 쓰고 실패 확인 → 구현 → 알림 상세·처리 기록·기록 찾기가 이 함수를 쓰고 이력을 시각 순으로 읽음. 동작 변화 없음 | 시험·tsc·lint·build 통과, 알림 상세 화면 그대로 |
| 2 | 마이그레이션 0023을 공유 Supabase에 적용, DB 타입 갱신. 시험용 계정 행으로 `BEGIN … ROLLBACK` 안에서 SQL 검사(승인→취소→재승인, 거절→취소, 남의 사건, 승인 안 한 사건) | SQL 검사 결과가 기대와 같음, 보안 점검(advisors) 새 경고 없음 |
| 3 | 공고 되돌리기: `clearNoticeDecision` + 상세의 "팔로우 풀기"·"관심 없음 취소". 실패하면 상태 그대로 + 오류 문구 | 미리보기에서 버튼 모양·키보드·오류 문구 확인, 시험·tsc·lint 통과 |
| 4 | 알림 되돌리기: `cancelApproval`·`cancelRejection` + `undo-panel`(승인 취소는 확인 창에 "일정과 체크한 내용이 지워져요") | 미리보기 확인, 전체 시험·tsc·lint·build 통과, 사람 QA 목록 |

- [x] 1단계  - [ ] 2단계  - [ ] 3단계  - [ ] 4단계

## 4. 테스트 전략
- 순수 함수(`latestRejectReason`)는 Vitest. 실제 API·DB를 부르지 않는다
- DB 함수는 공유 DB에서 트랜잭션 안에서 부르고 되돌린다(ROLLBACK). 실제 데이터를 남기지 않는다
- 화면은 브라우저 미리보기로 열어 확인한다. 공유 DB에 쓰는 버튼은 시험용 계정으로만 누른다. 로그인은 사람이 한다
- 사람 QA: 실제로 팔로우 풀기, 승인 취소 → 내 일정 확인 → 다시 승인 한 바퀴

| 요구사항 | 단계 | 시험 이름 / QA 번호 |
|---|---|---|
| FR-001 팔로우 풀기 | 3 | C-2309, C-2310, H-2301 |
| FR-002 관심 없음 취소 | 3 | C-2309, C-2310, H-2301 |
| FR-003 새 공고로 셈, 알림 안 만듦 | 2·3 | C-2309, H-2301 |
| FR-004 승인 취소, 일정 지움 | 2·4 | C-2303, C-2311, H-2302 |
| FR-005 이력 새 줄 | 1·2 | C-2301, C-2302, C-2303 |
| FR-006 다시 승인 | 2 | C-2304, H-2302 |
| FR-007 본인만 | 2 | C-2307, C-2308 |
| FR-008 거절 취소 | 1·2·4 | C-2301, C-2305, C-2311 |
| SC-001 | 3 | C-2309, H-2301 |
| SC-002 | 2·4 | C-2303, H-2302 |
| SC-003 | 2 | C-2304, H-2302 |
| SC-004 | 2 | C-2307 |
| SC-005 (E1~E7) | 1~4 | C-2301, C-2306, C-2309, C-2310, C-2311, C-2312 |

## 5. 제약과 주의점
**항상:**
- 처리 이력은 새 줄로만 쌓는다. 지우거나 고치지 않는다 [ERD incident_actions]
- 이력·일정·상태는 DB 함수 하나에서 함께 바꾼다(반쯤 된 상태를 남기지 않음)
- 화면 오류 문구는 "무엇이 안 됐는지 + 할 일"

**먼저 물을 것:**
- 마이그레이션 0023을 공유 Supabase에 적용하기 직전(2단계 시작 때 한 번 알림)
- spec에 없는 되돌리기(일정 직접 지우기 등)가 필요해 보일 때
- 커밋·push·PR

**절대 하지 말 것 (spec 제외 범위):**
- 목록에서 여러 공고를 한꺼번에 되돌리기
- 공고 상세 버튼으로 넣은 일정 지우기
- 되돌렸다는 슬랙·웹 푸시 알림
- 관리자가 다른 사람 것을 대신 되돌리기
- 처리 이력 줄 지우기·고치기

## 변경 기록
| 날짜 | 버전 | 바뀐 내용 |
|---|---|---|
| 2026-11-23 | v0.1 | 초안, 승인. 4절 QA 번호(qa.md 절차 A) |
