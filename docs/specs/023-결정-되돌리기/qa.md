# QA: 023 결정 되돌리기

- 근거: spec v0.2, plan v0.1, docs/journeys/(CUJ-01 2·4단계, 예외 경로 E1)
- 상태: Claude QA 진행 중
- 요약: C 10/12, H 0/2
- 최종 갱신: 2026-11-23

## 1. Claude QA
| ID | 근거 | 단계 | 방법 | 할 일 | 기대 결과 | 결과 | 증거 | 확인일 |
|---|---|---|---|---|---|---|---|---|
| C-2301 | FR-005, FR-008, E7 | 1 | 함수 시험 | `latestRejectReason`: 이력 없음 / 거절 하나 / 거절→거절 취소→거절 / 거절 취소만 | 없음 / 그 사유 / 마지막 사유 / 없음 | 통과 | `tests/actions-history.test.ts` 6개 통과(실패 먼저 확인: 모듈 없음). 거절→취소 뒤 null 사례 추가 | 2026-11-23 |
| C-2302 | FR-005 | 1 | 코드 점검 + 미리보기 | 알림 상세·처리 기록·기록 찾기 자료가 이력을 시각 순으로 읽고 `latestRejectReason`을 쓴다. 거절한 알림 상세가 전과 같다 | 세 곳 모두 같은 함수, 화면 변화 없음 | 부분 통과 → 통과 (재확인 2026-11-23) | 코드 점검(위와 같음) + 미리보기: 거절한 알림 c126145b 상세에 "거절했어요… 이유: 이미 제습기를 켜 둠", DB 이력 reject 한 줄의 사유와 같음 | 2026-11-23 |
| C-2303 | FR-004, FR-005, SC-002 | 2 | SQL(되돌림) | 승인한 시험 사건에 `cancel_approval` | 이력에 approve·cancel_approve 두 줄, 일정 0개, 상태 pending, closed_at 비어 있음 | 통과 | 공유 DB에서 DO 블록 끝에 예외로 되돌림(ROLLBACK), 시뮬레이터 사건(사용자 A)으로 authenticated 역할·JWT sub 설정. cancel_approval 뒤 일정 1→0, 상태 pending, closed_at 비어 있음, 이력 [approve, cancel_approve] | 2026-11-23 |
| C-2304 | FR-006, SC-003 | 2 | SQL(되돌림) | 취소 뒤 `approve_incident` 두 번 | 일정 정확히 1개, 상태 approved | 통과 | 공유 DB에서 DO 블록 끝에 예외로 되돌림(ROLLBACK), 시뮬레이터 사건(사용자 A)으로 authenticated 역할·JWT sub 설정. 취소 뒤 approve_incident 두 번 → 상태 approved, 일정 1개 | 2026-11-23 |
| C-2305 | FR-008 | 2 | SQL(되돌림) | 거절한 사건에 `cancel_rejection` 뒤 승인 | cancel_reject 한 줄, pending → approved, 일정 1개 | 통과 | 공유 DB에서 DO 블록 끝에 예외로 되돌림(ROLLBACK), 시뮬레이터 사건(사용자 A)으로 authenticated 역할·JWT sub 설정. cancel_rejection 뒤 pending, 승인 뒤 approved·일정 1개, 이력 [reject, cancel_reject, approve] | 2026-11-23 |
| C-2306 | E2, E3 | 2 | SQL(되돌림) | 승인 대기 사건에 `cancel_approval`, 새 사건에 `cancel_rejection` | `incident_not_approved` / `incident_not_rejected` 오류, 아무것도 바뀌지 않음 | 통과 | 공유 DB에서 DO 블록 끝에 예외로 되돌림(ROLLBACK), 시뮬레이터 사건(사용자 A)으로 authenticated 역할·JWT sub 설정. 승인 대기에 cancel_approval → incident_not_approved, 새 사건에 cancel_rejection → incident_not_rejected, 연달아 두 번 취소 → 두 번째 incident_not_approved(E2) | 2026-11-23 |
| C-2307 | FR-007, SC-004 | 2 | SQL(되돌림) | 다른 사람 사건에 두 함수, 다른 사람 notice_follows 줄 지우기, 로그인 없이(anon) 실행 | 사건 함수는 오류, 지우기는 0줄, anon은 권한 없음 | 통과 | 공유 DB에서 DO 블록 끝에 예외로 되돌림(ROLLBACK), 시뮬레이터 사건(사용자 A)으로 authenticated 역할·JWT sub 설정. 사용자 B가 A의 사건 취소 → incident_not_approved / incident_not_rejected, A의 notice_follows 지우기 0줄. anon: 함수 permission denied, 지우기 0줄. 되돌린 뒤 사건 상태·취소 줄 수·notice_follows 12줄 그대로 확인 | 2026-11-23 |
| C-2308 | FR-007 | 2 | 보안 점검 | 마이그레이션 뒤 Supabase advisors | 0023 때문에 새로 생긴 경고 없음 | 통과 | advisors(security): 새 종류 경고 없음. cancel_approval·cancel_rejection이 기존 approve_incident·reject_incident와 같은 'authenticated가 SECURITY DEFINER 함수 실행' WARN에 들어감(의도: 사용자가 부르고 함수 안에서 auth.uid()로 본인 사건만). anon은 실행 권한 없음 | 2026-11-23 |
| C-2309 | FR-001, FR-002, FR-003, E1, E6, SC-001 | 3 | SQL(되돌림) + 코드 점검 | 본인 notice_follows 줄 지우기, 없는 줄 지우기 | 지우면 "새 공고"(결정 없음), 없는 줄은 오류 없이 0줄. 다시 팔로우하면 decided_at 새로 | 통과 | 2단계 SQL(되돌림): 본인 지우기 1줄, 없는 줄 0줄(오류 없음), 다시 팔로우하면 decided_at 새로. 코드: clearNoticeDecision이 본인·공고 조건으로 delete, 실패면 오류만 돌려줌. 실제 화면에서도 사용자가 21566 팔로우를 풀어 DB 줄이 사라짐 확인 | 2026-11-23 |
| C-2310 | FR-001, FR-002, E5 | 3 | 미리보기 | 공고 상세 버튼 모양·이름·키보드(Tab·Enter), 저장 실패 때 문구 | 팔로우 중엔 "팔로우 풀기", 관심 없음엔 "관심 없음 취소", 실패하면 상태 그대로 + 안내 | 통과(실패 문구는 코드 점검) | 미리보기(폭 414px, 예림 계정, 쓰기 버튼은 Claude가 누르지 않음): 관심 없음 공고 21530 안내 줄에 "관심 없음 취소"·"팔로우로 바꾸기", 팔로우 공고 21584 안내 줄에 "팔로우 풀기"(44px, 초점 링 보임), 아이콘 버튼은 이름 고정 + aria-pressed, 눌린 쪽 설명 "팔로우 풀기"/"관심 없음 취소", 가로 넘침 없음. 실패 때 결정 상태를 바꾸지 않고 머리 카드에 role=alert 문구(E5, 코드) | 2026-11-23 |
| C-2311 | FR-004, FR-008, E2 | 4 | 미리보기 | 승인한·거절한 알림 상세의 취소 버튼, 승인 취소 확인 창 문구, 키보드·Esc | 승인함엔 "승인 취소"(확인 창에 일정·체크 지워짐 안내), 거절함엔 "거절 취소" | | | |
| C-2312 | SC-005, E4 | 4 | 전체 회귀 + 코드 점검 | 시험·tsc·lint·build, 공고 상세 버튼으로 넣은 일정은 팔로우 풀기와 무관한지 | 모두 통과, 공고 일정은 지우지 않음 | | | |

## 2. 사람 QA
| ID | 종류 | 근거 | 준비 | 할 일 | 보고 판단할 것 | 결과 | 메모 | 확인일 |
|---|---|---|---|---|---|---|---|---|
| H-2301 | 핵심 여정 | SC-001, CUJ-01 2단계 | 시험용 계정으로 로그인, 맞춤 공고 | 1. 새 공고 하나 팔로우 2. 상세에서 팔로우 풀기 3. 홈 "정할 공고" 수 보기 4. 관심 없음으로 표시한 뒤 관심 없음 취소 | 두 번 모두 "새 공고"로 돌아오고, 버튼 이름이 헷갈리지 않는가? | | | |
| H-2302 | 핵심 여정 | SC-002, SC-003, CUJ-01 4단계 | 시뮬레이터로 공고 알림 하나 | 1. 알림 승인 2. 내 일정에서 체크 하나 3. 알림 상세에서 승인 취소(확인 창 읽기) 4. 내 일정 보기 5. 다시 승인 | 취소 전에 무엇이 지워지는지 알 수 있었고, 일정이 사라졌다가 다시 하나만 생기는가? | | | |

## 3. 실패와 조치
| # | QA ID | 무엇이 실패했나 | 조치 (파일·커밋) | 재확인 |
|---|---|---|---|---|
| 1 | C-2310 | 팔로우 풀기가 눌린 아이콘뿐이라 휴대폰에서는 설명(title)이 안 보여 찾기 어려움 | 팔로우 중일 때도 관심 없음과 같은 안내 줄 + "팔로우 풀기" 글자 버튼(`follow-panel.tsx`) | 2026-11-23 미리보기 21584 |

## 4. 변경 기록
| 날짜 | 바뀐 내용 |
|---|---|
| 2026-11-23 | 절차 A: C 12개, H 2개 등록 |
| 2026-11-23 | 1단계: C-2301 통과, C-2302 부분 통과 |
| 2026-11-23 | 2단계: 0023 공유 DB 적용, C-2303~2308 통과 |
| 2026-11-23 | 3단계: C-2302 재확인 통과, C-2309·2310 통과. 실패와 조치 1 |
