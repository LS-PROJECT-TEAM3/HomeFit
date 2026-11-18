# plan: 007 팔로우한 공고를 내 일정에 넣기

- 상태: v0.1 (사용자 결정 2026-11-18 "표 고치기"로 바로 진행)
- 근거: spec 007 v0.1, ERD v1.7, PRD v1.9 FR-16

## 1. 기술과 버전
지금 스택 그대로. 새 라이브러리 없음. 마이그레이션 0016(schedule_items 칸 2개 추가·2개 비울 수 있게, 공고 일정 유일 색인, DB 함수 `add_notice_to_schedule`).

## 2. 구조와 파일
- `supabase/migrations/0016_schedule_from_notice.sql`: 표 변경 + 누른 사람 권한으로 팔로우 확인·중복 막기
- `incident/schedule-origin.ts` (순수): 출처 링크, 거절 문구
- `app/(main)/notices/[id]/actions.ts` `addNoticeToSchedule`: 기본 체크리스트(`buildDefaultChecklist`)를 만들어 DB 함수 호출
- `app/(main)/notices/[id]/follow-panel.tsx` `ScheduleButton`, `incident/notices.server.ts`(이미 넣었나), `incident/schedule.server.ts`·`schedule/[id]/page.tsx`(출처 링크)

## 3. 단계
| 단계 | 할 일 | 끝 조건 |
|---|---|---|
| 1 | 문서(spec·ERD·PRD)·마이그레이션·DB 함수 | 되돌리는 거래 안에서 E1·E2 확인 |
| 2 | 화면·서버 동작·시험 | 시험·타입·린트 통과, 미리보기 |
| 3 | 운영 배포 | 사용자 승인 뒤 |

- [x] 1단계
- [x] 2단계
- [x] 3단계 (사용자 승인 2026-11-18, 배포 f5e1341)

## 4. 요구사항 추적
| 요구 | 시험 이름 / QA 번호 |
|---|---|
| FR-001 | C-702, C-703, H-701 |
| FR-002 | C-701 |
| FR-003 | C-701 |
| FR-004 | schedule-origin.test.ts, C-704 |
| SC-001 | C-701, H-701 |
| SC-002 | C-701 |
| SC-003 | C-701 |
| SC-004 | C-704, H-701 |
| SC-005 | C-705 |

## 5. 제약과 주의
- 절대 하지 말 것: 팔로우만으로 자동 일정, 가짜 사건 만들기, 다른 사람 일정 쓰기
- 먼저 물을 것: spec Q1(알림 일정과 합치기), Q2(관심 없음으로 바꾸면 지우기)
