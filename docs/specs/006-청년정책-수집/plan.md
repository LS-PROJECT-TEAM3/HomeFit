# plan: 006 온통청년 주거 정책 수집과 정책 화면

- 상태: v0.1 (spec 006 v0.1과 함께 사용자 지시로 바로 진행)
- 근거: spec 006 v0.1, 실제 응답 확인(2026-11-18, `https://www.youthcenter.go.kr/go/ythip/getPlcy`, `lclsfNm=주거`, `rtnType=json`, 응답 `resultCode` 200, `result.pagging.totCount`, `result.youthPolicyList`)

## 1. 기술과 버전
지금 스택 그대로(Next.js 16.4.6, TypeScript strict, Vitest, Supabase). 새 라이브러리 없음. 새 표 없음. `sources`에 `youth_policy` 한 줄을 넣는 마이그레이션 0015만 있다(ERD에 이미 있는 값).

## 2. 구조와 파일
- `watch/youth-policy.ts` (순수): 응답 → `Policy`(=`Notice` + 나이·지역 목록·기관·지원 내용), 신청 기간 읽기
- `incident/policy-match.ts` (순수): 조건에 맞는 정책 목록과 정렬
- `watch/youth-policy.server.ts`: 쪽 받기(키는 `YOUTH_POLICY_API_KEY`, 서버만)
- `watch/collect-youth.server.ts`: 수집 한 번(collect → compare, 사건 단계는 건너뜀으로 기록)
- `app/api/cron/youth-policy/route.ts`, `vercel.json` 정기 실행 `10 0 * * *`(마이홈 뒤)
- `incident/policies.server.ts`: 내 조건 + 정책 읽기
- `app/(main)/policy/page.tsx`: 정책 화면
- 관리자: `actions.ts`·`watch/page.tsx`·`flow/graph.ts`에 출처 추가

## 3. 단계
| 단계 | 할 일 | 끝 조건 |
|---|---|---|
| 1 | 순수 함수와 시험(E1~E4, E7, 응답 오류) | 시험 통과 |
| 2 | 수집·정기 실행·마이그레이션·관리자 출처 | 로컬 수집 성공, 실패 기록 확인 |
| 3 | 정책 화면 | 미리보기 확인, 375px |
| 4 | 운영 배포(키 등록) 후 수집 한 번 | 운영 실행 성공 |

- [x] 1단계
- [x] 2단계
- [x] 3단계
- [x] 4단계 (사용자 승인 2026-11-18, 배포 eea5cdb)

spec Q4 추가(2026-11-18): 신청 기간 코드 0057003은 날짜가 없어 숨기지 않고 "신청 기간: 공고문 확인"으로 맨 아래에 둔다.

## 4. 요구사항 추적
| 요구 | 시험 이름 / QA 번호 |
|---|---|
| FR-001 | youth-policy.test.ts, C-601, C-605 |
| FR-002 | youth-policy.test.ts "오류 코드", C-602 |
| FR-003 | policy-match.test.ts, C-603, C-606 |
| FR-004 | C-604 |
| SC-001 | C-605 |
| SC-002 | C-601, C-602 |
| SC-003 | C-603 |
| SC-004 | C-604 |
| SC-005 | C-606 |

## 5. 제약과 주의
- 절대 하지 말 것: 자격 판정, 예산 소진 감지, 정책 페이지 긁어 오기, 개인화 추천 점수, 키를 코드·문서·화면에 쓰기
- 먼저 물을 것: 정책 사건·팔로우(ERD 변경, spec Q1)
- 키가 URL 쿼리(`apiKeyNm`)에 들어가므로 오류 문구는 `maskSecrets`로 가린다
