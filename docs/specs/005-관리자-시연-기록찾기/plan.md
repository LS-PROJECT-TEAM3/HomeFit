# plan: 005 관리자 시연과 기록 찾기

- 상태: 초안 v0.1 (승인 전, 사용자 지시로 바로 진행 2026-11-18 밤)
- 근거: spec 005 v0.1, CLAUDE.md(폴더·스택·명령), plan 003(수집 함수), knowledge/chat.ts(낱말 고르기)

## 1. 기술과 버전
지금 쓰는 것만: Next.js 16.4.6(App Router, 서버 동작), TypeScript strict, Supabase(RLS: 관리자 읽기), Vitest. **새 라이브러리 없음, 새 DB 표 없음.** 그래프는 SVG·CSS로 직접 그린다.

## 2. 구조와 파일
```
app/(main)/admin/actions.ts            (신규) 서버 동작: 지금 한 번 실행, 시뮬레이터 실행. 관리자 확인 먼저
app/(main)/admin/run-button.tsx        (신규) 실행 버튼 + 결과 요약(클라이언트)
app/(main)/admin/watch/page.tsx        연속 실패 수, 지금 한 번 실행
app/(main)/admin/sim/page.tsx          묶음 고르기 + 실행 버튼
watch/run-health.ts                    (신규, 순수) 출처별 연속 실패 수
flow/graph.ts                          (신규, 순수) runs·run_steps → 상자·화살표 모델, 상세 가리기
app/(main)/admin/flow/page.tsx         실행 고르기, 상자·화살표, 상자 상세
eval/cases.ts                          (신규) 정답 붙은 가짜 공고 변화 묶음
eval/score.ts                          (신규, 순수) 감지 규칙 실행 → 맞힌·놓친·잘못 울린
scripts/eval.mjs + package.json "eval" (신규) 결과 파일 eval/results.json
app/(main)/admin/eval/page.tsx         채점 표
app/(main)/admin/users/page.tsx, users/[id]/page.tsx   회원 목록·상세(읽기만)
knowledge/history.ts                   (신규, 순수) 끝난 알림 → 찾기 자료, 결과 고르기
knowledge/history.server.ts            (신규) 내 끝난 알림 읽기, 질문이면 AI 답(chat_answer 재사용)
app/(main)/knowledge/page.tsx          찾기 창, 결과·답·출처
```

## 3. 단계
| # | 단계 | FR | 끝 조건 |
|---|---|---|---|
| 1 | 지금 한 번 실행·연속 실패·시뮬레이터 버튼 | FR-001, FR-002 | run-health 시험, 관리자 아닌 사람 거절 코드, 시뮬레이터로 가짜 묶음 1회 실행 화면 확인 |
| 2 | 흐름 화면 | FR-003 | graph 시험(상자 순서·안 켜짐·키 가림), 화면 확인 |
| 3 | 감지 채점 | FR-004 | score 시험, 명령으로 파일, 화면 숫자 같음 |
| 4 | 회원 보기 | FR-005 | 목록·상세 화면, 이메일 가림 |
| 5 | 기록 찾기 | FR-006 | history 시험, 화면 찾기·답·출처 |

단계마다: 시험·tsc·lint·build, 화면 확인, qa.md 기록, `_workspace/checkpoint.sh`로 되돌리기 지점. **커밋 안 함.**

## 4. 테스트 전략
| FR/SC | 확인 | 시험 / QA |
|---|---|---|
| FR-001 | 함수 시험 + 화면 | run-health.test.ts / C-501 |
| FR-002, SC-001, SC-002 | 화면 + 코드 | C-502, C-503 |
| FR-003, SC-004 | 함수 시험 + 화면 | flow-graph.test.ts / C-504 |
| FR-004, SC-003 | 함수 시험 + 명령 + 화면 | eval-score.test.ts / C-505 |
| FR-005 | 화면 | C-506 |
| FR-006, SC-005 | 함수 시험 + 화면 | history.test.ts / C-507 |
| SC-006 | 375px | C-508 |

## 5. 제약
- 절대 하지 말 것: 새 표·마이그레이션 적용, 관리자 대신 승인, 실제 계정(관리자)에게 시뮬레이션 사건, 키 값 화면·로그 노출, 커밋·배포
- 먼저 물을 것(아침): spec Q1~Q3

## 변경 기록
| 날짜 | 버전 | 내용 |
|---|---|---|
| 2026-11-18 | v0.1 | 초안, 바로 진행(사용자 지시) |
