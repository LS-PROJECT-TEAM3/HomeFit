# plan: 026 청년 주거지원 정책 팔로우와 내 일정 추가

- 근거: spec 026 v0.2(승인 2026-11-23), PRD v1.25 FR-07·FR-16, ERD v1.16 notice_follows·schedule_items, spec 007(공고에서 일정, 0016), spec 023(팔로우 풀기), 지금 코드(아래 2절)
- 상태: 승인됨 v0.1 (사용자 "승인" 2026-11-23: plan, 마이그레이션 0025)
- 작성일: 2026-11-23

> spec의 FR·SC 번호를 그대로 쓴다. 새 요구사항은 만들지 않는다.

## 1. 기술과 버전
2026-11-23 `package.json`으로 확인한 값.
- Next.js 16.4.6(App Router), React 19.3.0, TypeScript strict, Vitest 5.1.0, Supabase JS 2.119.0
- 새 라이브러리 없음. DB 변경: 마이그레이션 `0025_policy_schedule.sql`(DB 함수 하나, spec Q5 승인)

## 2. 구조와 파일
지금 코드(읽은 곳):
- 정책: `incident/policies.server.ts`(`listMyPolicies`, `getPolicy`: source_items `youth_policy`의 raw), `incident/policy-match.ts`, 화면 `app/(main)/policy/page.tsx`·`policy-list.tsx`(종류 거르기)·`[id]/page.tsx`(상세: 신청 기간 "상시 신청"/"원문 확인", 제출 서류 칸)
- 공유 DB의 정책 425건 중 끝 날짜 183건, 상시 150건(2026-11-23 확인). source_items에 제목·`apply_end`가 있다
- 공고 팔로우·일정: `app/(main)/notices/[id]/actions.ts`(followNotice·clearNoticeDecision·addNoticeToSchedule), `follow-panel.tsx`, DB 함수 `add_notice_to_schedule`(0016, `myhome_notice`만), `incident/checklist.ts buildDefaultChecklist`
- notice_follows는 출처 제한이 없어(FK sources만) 정책 줄을 그대로 넣을 수 있다. RLS 본인 넣기·바꾸기·지우기(0009, 0023)
- 일정: `incident/schedule.server.ts`(source_code를 읽지 않음), `incident/schedule-origin.ts`(공고면 `/notices/…`), 일정 상세 `app/(main)/schedule/[id]/page.tsx`

바꿀 것:
```text
supabase/migrations/0025_policy_schedule.sql  (새) add_policy_to_schedule(p_policy_id, p_checklist): 팔로우 확인, 제목·apply_end는 source_items(youth_policy)에서, 같은 사람·정책은 하나
lib/supabase/database.types.ts               함수 타입
incident/policy-schedule.ts                  (새, 순수) buildPolicyChecklist(정책) 3개, policyDueText(마감 없음 → "상시 신청, 공고문 확인"), filterFollowed
tests/policy-schedule.test.ts                (새) 시험 먼저
incident/schedule-origin.ts (+시험)          출처가 정책이면 "/policy/…", "출처 정책 보기"
incident/schedule.server.ts                  source_code도 읽음
app/(main)/policy/[id]/actions.ts            (새) followPolicy, unfollowPolicy, addPolicyToSchedule (로그인 확인, 본인 줄)
app/(main)/policy/[id]/policy-follow.tsx     (새) 팔로우·풀기 버튼(공고와 같은 모양) + 내 일정에 추가
app/(main)/policy/[id]/page.tsx              팔로우 상태·일정 id 읽어 부품 끼우기
app/(main)/policy/page.tsx, policy-list.tsx  "팔로우 중" 표시와 "팔로우 중" 거르기
app/(main)/schedule/[id]/page.tsx            정책 일정이면 원문 제출 서류와 "상시 신청, 공고문 확인"
```

## 3. 단계별 접근
| 단계 | 할 일 | 끝 조건 |
|---|---|---|
| 1 | 시험 먼저: 정책 체크리스트 3개(끝 날짜 있음·상시·모름), 마감 글자, 팔로우 거르기, 일정 출처 링크(정책) → 실패 확인 → 구현. `schedule.server.ts`가 source_code를 읽음(화면 변화 없음) | 시험·tsc·lint 통과 |
| 2 | 0025를 공유 DB에 적용(시작 때 한 번 알림), 타입 갱신. 되돌림 SQL: 팔로우 안 함 거절, 기간 정책 → 마감일 = apply_end, 상시 → 마감 없음, 두 번 → 하나, 남의 것·없는 정책 거절. advisors | SQL 검사 통과, 새 경고 없음 |
| 3 | 화면: 정책 상세 팔로우·풀기·내 일정에 추가, 목록 "팔로우 중" 표시·거르기, 일정 상세 정책 출처·서류·상시 문구 | 미리보기 PC·휴대폰(쓰기 버튼은 사용자 허락 뒤), 시험·tsc·lint·build 통과 |

- [x] 1단계  - [x] 2단계  - [x] 3단계

## 4. 테스트 전략
- 순수 함수 Vitest(실제 API·DB 부르지 않음)
- DB 함수는 공유 DB에서 되돌림(ROLLBACK) SQL
- 화면은 미리보기. 팔로우·일정 추가는 공유 DB에 쓰니 누르기 전에 묻는다
- 사람 QA: 정책 팔로우 → 목록에서 모아 보기 → 일정 추가 → 일정 상세 한 바퀴

| 요구사항 | 단계 | 시험 이름 / QA 번호 |
|---|---|---|
| FR-001 팔로우·풀기 | 3 | C-2607, H-2601 |
| FR-002 팔로우 중 표시·거르기 | 1·3 | C-2603, C-2608, H-2601 |
| FR-003 일정 추가 | 2·3 | C-2604, C-2605, C-2607, H-2601 |
| FR-004 마감일·상시 | 1·2 | C-2601, C-2602, C-2605, C-2609 |
| FR-005 체크리스트·서류 | 1·3 | C-2601, C-2609 |
| FR-006 풀어도 일정 유지, 알림 없음 | 2·3 | C-2605 |
| SC-001 | 3 | C-2608, H-2601 |
| SC-002 | 2·3 | C-2605, C-2609, H-2601 |
| SC-003 | 1·3 | C-2609, H-2601 |
| SC-004 (E1~E7) | 1~3 | C-2605~2607, C-2609, C-2610 |

## 5. 제약과 주의점
**항상:**
- 자격을 판정하지 않는다. 서류·자격은 원문 그대로, "공고문 확인"
- 같은 사람·같은 정책 일정은 하나(DB 유일 색인, 0016)
- PR #51이 합쳐질 때까지 커밋은 로컬에만(같은 Yelim 브랜치라 섞이지 않게)

**먼저 물을 것:**
- 0025를 공유 DB에 적용하기 직전
- 공유 DB에 팔로우·일정 추가를 눌러 보기 전
- 커밋·push·PR

**절대 하지 말 것 (spec 제외 범위):**
- 정책 변화 알림·사건, 슬랙·웹 푸시
- 정책 "관심 없음"
- 여러 정책 한꺼번에 팔로우
- 자격 자동 판정, 예산 소진 감지, 정책 페이지 긁어 오기
- 팔로우를 풀 때 일정 지우기

## 변경 기록
| 날짜 | 버전 | 바뀐 내용 |
|---|---|---|
| 2026-11-23 | v0.1 | 초안, 승인. 4절 QA 번호(qa.md 절차 A) |
