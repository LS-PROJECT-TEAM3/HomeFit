# plan: 024 입주 전 점검 내 항목 추가와 항목별 메모

- 근거: spec 024 v0.2(승인 2026-11-23), PRD v1.22 FR-29, ERD v1.14 interest_homes.move_in_checklist·move_in_note, spec 019 plan, 지금 코드(아래 2절)
- 상태: 승인됨 v0.1 (사용자 "승인" 2026-11-23)
- 작성일: 2026-11-23

> spec의 FR·SC 번호를 그대로 쓴다. 새 요구사항은 만들지 않는다.

## 1. 기술과 버전
2026-11-23 `package.json`으로 확인한 값.
- Next.js 16.4.6(App Router), React 19.3.0, TypeScript strict, Vitest 5.1.0, Supabase JS 2.119.0
- 새 라이브러리 없음. DB 변경(마이그레이션) 없음: `move_in_checklist`는 이미 jsonb 객체 칸이고 "객체여야 한다"는 검사만 있다(0021)

## 2. 구조와 파일
지금 코드(읽은 곳):
- 순수 함수 `incident/move-in-checklist.ts`: 기본 7개 `MOVE_IN_ITEMS`, `parseChecklist`(DB 값 → 키 → true만), `parseChecklistForm`(체크 키 + 집 메모), `checkedCount`. 시험 `tests/move-in-checklist.test.ts`
- 화면 `app/(main)/qc/move-in-checklist.tsx`(127줄, 집 고르기 + 점검 폼, 체크박스 `name="checked"`), 저장 `app/(main)/qc/checklist/actions.ts`, 읽기 `checklist/page.tsx`
- 같은 타입을 AI 도우미 자료가 쓴다: `knowledge/chat-sources.ts`(`checklistText`: 확인 수·항목 이름·집 메모), `knowledge/chat.server.ts`
- `qc.module.css`가 이미 881줄이라 새 모양은 새 CSS 파일에 둔다

저장 모양(같은 jsonb 객체, 예전 값과 같이 읽힘):
```json
{
  "light": true, "noise": true,
  "notes": { "noise": "도로 쪽 방은 차 소리" },
  "custom": [ { "id": "c1a2b3", "label": "주차 자리", "checked": true, "note": "지하 1대" } ]
}
```
- 기본 항목 체크는 지금처럼 맨 위 `키: true` (FR-005, 예전 값 그대로)
- `notes`: 기본 항목 키 → 메모(200자). `custom`: 내 항목 목록(id는 영문·숫자 6~12자, 이름 40자, 10개까지)
- 읽을 때 모르는 키·틀린 모양은 버린다(E5)

바꿀 것:
```text
incident/move-in-checklist.ts       타입을 { checked, notes, custom }로 넓힘. parseChecklist(예전·새 모양), toStored, checkedCount·totalCount,
                                    checkCustomLabel(E1~E3), parseChecklistForm(화면이 보낸 JSON 하나 + 집 메모, E1~E5)
tests/move-in-checklist.test.ts     위 함수 시험(시험 먼저)
app/(main)/qc/checklist/actions.ts  저장: 폼의 "checklist" JSON 한 칸을 parseChecklistForm으로 검사 → toStored 저장
app/(main)/qc/move-in-checklist.tsx 상태를 { checked, notes, custom }로, 확인 수에 내 항목 포함(FR-006)
app/(main)/qc/checklist-item.tsx    (새) 항목 한 줄: 체크 + 메모 펼치기(200자) + 내 항목이면 이름 고치기·지우기
app/(main)/qc/add-custom-item.tsx   (새) "+ 항목 추가": 이름 넣기, E1~E3 즉시 안내
app/(main)/qc/checklist.module.css  (새) 위 두 부품 모양
knowledge/chat-sources.ts           확인 수에 내 항목 포함, 확인한 내 항목 이름도 적음(새 타입에 맞춤)
```

## 3. 단계별 접근
| 단계 | 할 일 | 끝 조건 |
|---|---|---|
| 1 | 시험 먼저: 예전 값 읽기, 새 모양 읽기·저장, 틀린 값 버리기, 내 항목 이름 검사(E1~E3), 폼 검사(E4·E5, 10개 한도), 확인 수 → 실패 확인 → 구현. 저장 액션·화면·AI 도우미 자료를 새 타입에 맞춘다(화면 모양은 아직 그대로, 기존 동작 유지) | 시험·tsc·lint·build 통과, 점검 화면이 전처럼 저장·표시 |
| 2 | 화면: 항목마다 메모 펼치기, "+ 항목 추가", 내 항목 이름 고치기·지우기, 확인 수에 내 항목 포함. 저장 실패 때 입력 유지(E8) | 미리보기(PC·휴대폰 폭, 키보드), 저장 뒤 다시 열어 그대로(본인 관심 주택에서만, 사용자 확인 뒤), 시험·tsc·lint·build 통과 |

- [x] 1단계  - [ ] 2단계

## 4. 테스트 전략
- 순수 함수는 Vitest로 경계 상황을 모두 시험한다. DB·네트워크를 부르지 않는다
- 화면은 브라우저 미리보기. 저장 버튼은 공유 DB에 쓰므로 누르기 전에 사용자에게 어느 관심 주택에서 눌러도 되는지 묻는다
- 사람 QA: 집 두 곳을 오가며 내 항목·메모 쓰기 한 바퀴

| 요구사항 | 단계 | 시험 이름 / QA 번호 |
|---|---|---|
| FR-001 내 항목 더하기 | 1·2 | C-2402, C-2407, H-2401 |
| FR-002 고치기·지우기 | 1·2 | C-2404, C-2407, H-2401 |
| FR-003 항목 메모 | 1·2 | C-2403, C-2407 |
| FR-004 저장·다시 열기 | 1·2 | C-2403, C-2406, C-2408 |
| FR-005 예전 값 그대로 | 1 | C-2401, C-2406 |
| FR-006 확인 수 | 1·2 | C-2405 |
| SC-001 | 2 | C-2408, H-2401 |
| SC-002 | 2 | C-2408, H-2401 |
| SC-003 | 1 | C-2401 |
| SC-004 (E1~E8) | 1·2 | C-2401~2404, C-2407~2409 |

## 5. 제약과 주의점
**항상:**
- 예전에 저장한 값을 바꾸거나 잃지 않는다(읽을 때 그대로, 저장할 때만 새 모양)
- 검사는 화면과 서버 둘 다에서 한다(서버가 최종). 사용자 입력 글자는 React가 이스케이프한 채로 그린다
- 항목 메모·내 항목 이름도 다른 사람에게 보이지 않는다(기존 RLS 그대로)

**먼저 물을 것:**
- 공유 DB에 저장 버튼을 눌러 보기 전
- 커밋·push·PR

**절대 하지 말 것 (spec 제외 범위):**
- 모든 집에 같이 쓰는 내 기본 목록
- 기본 7개 항목 지우기·이름 바꾸기
- 항목 순서 바꾸기
- 점검 결과로 안전·적합 판정
- 점검 항목에 사진 붙이기

## 변경 기록
| 날짜 | 버전 | 바뀐 내용 |
|---|---|---|
| 2026-11-23 | v0.1 | 초안, 승인. 4절 QA 번호(qa.md 절차 A) |
