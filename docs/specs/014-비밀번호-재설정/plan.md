# plan: 014 비밀번호 재설정

- 근거: spec 014 v0.1, PRD v1.12 FR-32, IA v1.10 MB_010300_PG·MB_010301_PG
- 상태: 초안 v0.1 (사용자 지시 2026-11-19, 질문은 추천안으로. **승인 전**)
- 작성일: 2026-11-19

## 1. 기술과 버전
지금 쓰는 것만 쓴다: Next.js(App Router) + TypeScript strict, `@supabase/ssr`(서버 클라이언트, PKCE 흐름), Vitest. 새 라이브러리·DB·ERD 변경 없음.
- 메일 요청: `supabase.auth.resetPasswordForEmail(email, { redirectTo })`. 돌아올 주소는 `/auth/confirm?next=/reset-password/new`
- 링크 확인: `/auth/confirm`에서 `exchangeCodeForSession(code)`(재설정을 요청한 브라우저의 쿠키에 있는 확인값을 씀)
- 새 비밀번호: `supabase.auth.updateUser({ password })`

## 2. 구조와 파일
| 파일 | 할 일 | 단계 |
|---|---|---|
| `lib/supabase/auth-rules.ts` (새, 순수 함수) | 주소별 로그인 규칙(공개·로그인 필요·둘 다), 이메일·새 비밀번호 검사, 안전한 `next` 주소 | 1 |
| `tests/auth-rules.test.ts` (새) | 시험 먼저: E1, E4, E5, E7, `next` 검사 | 1 |
| `proxy.ts` | 주소 규칙을 순수 함수로 바꿔 씀(`/reset-password` 공개, `/auth/confirm` 둘 다, `/reset-password/new` 로그인 필요) | 1 |
| `app/(auth)/actions.ts` | `requestPasswordReset`, `updatePassword` 서버 액션, 8자 규칙을 한곳에서 | 2 |
| `app/(auth)/reset-password/page.tsx`, `reset-request-form.tsx` | 메일 요청 화면(MB_010300_PG), 링크 오류 안내 | 2 |
| `app/(auth)/reset-password/new/page.tsx`, `new-password-form.tsx` | 새 비밀번호 화면(MB_010301_PG) | 2 |
| `app/auth/confirm/route.ts` | 메일 링크 코드 확인 → 새 비밀번호 화면, 실패면 재설정 화면에 오류 | 2 |
| `app/(auth)/login/page.tsx` | "비밀번호를 잊으셨나요?" 링크 | 2 |

## 3. 단계
| 단계 | 할 일 | 끝 조건 |
|---|---|---|
| 1 | 순수 함수와 시험, proxy 연결 | 실패 확인 뒤 구현, `npm test`·`tsc`·`lint` 통과, 로그인·가입 화면 동작 그대로 |
| 2 | 화면 3개·서버 액션·확인 주소 | 미리보기(입력 오류, 만료 링크, 로그인 안 한 새 비밀번호 화면), 375px, `npm run build`. 실제 메일은 Supabase 설정(Q2) 뒤 팀원 주소로 |

## 4. 요구사항 추적
| 요구 | 시험 이름 / QA 번호 |
|---|---|
| FR-001, SC-001, SC-004, E1, E2, E7 | `tests/auth-rules.test.ts` / C-1401, C-1402 |
| FR-002, SC-002, E4, E5 | `tests/auth-rules.test.ts` / C-1401, C-1403, H-1401 |
| FR-003, SC-003, E3, E6 | C-1403, C-1404 |

## 5. 제약과 주의점
- 항상: 오류 문구는 "무엇이 안 됐는지 + 할 일". 비밀번호 값은 로그·화면에 남기지 않는다
- 먼저 물을 것: Supabase 인증 설정(Redirect URLs) 바꾸기, 메일 서버(SMTP) 연결
- 절대 하지 말 것: 가입 여부를 드러내는 문구, 비밀번호를 대신 입력하기(실제 계정), `next`로 바깥 주소 이동 허용
