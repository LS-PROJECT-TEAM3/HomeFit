# plan: LLM 공급자 바꿔 끼우기

- 기능 ID: 002
- 상태: 승인됨 (2026-11-17)
- 버전: v0.1
- 작성일 / 최종 갱신: 2026-11-17 / 2026-11-17
- 기준 spec: ./spec.md (v0.1, 승인됨)
- 근거 문서: docs/ERD.md v1.3(llm_calls), docs/PRD.md v1.4 8절, CLAUDE.md, docs/specs/001-공고정책-사건/plan.md v0.9, 현재 코드(`incident/plan-draft.ts`, `incident/plan-draft.server.ts`, `incident/plans.server.ts`, `watch/collect.server.ts`)
- 참고 조사(2026-11-17, 공식 문서. ai.google.dev가 aistudio.google.com 문서로 옮겨 감): [모델](https://aistudio.google.com/docs/models), [구조화 출력](https://aistudio.google.com/docs/structured-output), [한도](https://aistudio.google.com/docs/rate-limits), [generateContent](https://aistudio.google.com/api-reference/generate-content)

## 0. 요약
AI 호출을 "공통 요청 → 공급자 → 공통 답" 하나의 길로 모은다. 공급자는 `AI_PROVIDER`로 고르는 gemini(개발, 무료), claude(배포), mock(시험·Ralph Loop) 셋이다. 다시 시도·호출 상한·호출 기록은 공급자 밖 한곳에서 처리하고, 판단(다시 시도할지, 얼마나 기다릴지, 답을 어떻게 읽을지)은 순수 함수로 두어 시험을 먼저 쓴다. **새 라이브러리는 없다**: Gemini는 `fetch`로 REST를 부르고, Claude는 이미 있는 `@anthropic-ai/sdk`를 쓴다. 사건 감지·계산 모듈(`incident/notice-change.ts`, `match.ts`, `checklist.ts` 등)은 이미 AI와 떨어져 있어 그대로 두고, 서로 불러오지 않는지를 시험으로 지킨다.

## 1. 기술과 버전
| 영역 | 선택 | 정확한 버전 | 왜 | 버린 대안 |
|---|---|---|---|---|
| Gemini 호출 | REST `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`, 헤더 `x-goog-api-key`, `fetch` | (플랫폼) | 새 라이브러리 없음. 답의 토큰은 `usageMetadata.promptTokenCount`·`candidatesTokenCount`, 끝난 이유는 `candidates[].finishReason`(문서 확인) | `@google/genai` SDK(같은 일을 하는 SDK를 둘 들이지 않는다), Interactions API(`/v1beta/interactions`, 문서 예제는 이쪽이지만 헤더 `Api-Revision`이 붙는 새 API라 안정성을 키로 먼저 확인) |
| Gemini 모델 | `GEMINI_MODEL` 환경변수, 기본값 `gemini-3.5-flash-lite` | 2026-11-17 문서의 안정판 | 문서가 "가장 빠르고 싼 3.5 모델", 새 프로젝트에 권장. 무료 한도는 문서에 숫자가 없어 AI Studio에서 키로 확인(Q22) | `gemini-2.5-flash`(지원 종료 예정) |
| Gemini JSON | `generationConfig.responseMimeType: "application/json"` + `responseJsonSchema` | | spec FR-003. 이 칸 이름은 문서 요약으로만 확인해, 1단계에서 실제 키로 한 번 불러 확정하고 1절을 고친다 | |
| Claude 호출 | `@anthropic-ai/sdk` | 1.9.0 (설치됨) | 지금 코드 그대로(`output_config.format` JSON 스키마, effort low) | |
| 시험 | Vitest | 5.1.0 | 공급자는 `fetch`·SDK 호출 함수를 인자로 받아 가짜로 바꾼다. 실제 네트워크 0 | |

**환경변수(값은 `.env.local`·Vercel에만):** `AI_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_MODEL`(선택), `ANTHROPIC_API_KEY`. `.env.example`에 이름과 설명을 적었다.

## 2. 구조와 파일
`lib/llm/` 아래에 둔다(바깥 폴더 이름은 안내서 이름 규칙을 따르고, 여러 기능이 같이 쓰는 기반이라 `lib/`). 순수 함수(`*.ts`)와 바깥 호출(`*.server.ts`)을 나눈다.

```text
lib/llm/
├── types.ts                 순수: LlmRequest, LlmResult(성공/실패), LlmErrorKind, LlmProvider(이름, 모델, send)
├── retry.ts                 순수: 실패 종류 → 다시 시도할지, 기다릴 시간(서버가 준 값 / 1초·2초), 남은 대기 예산
├── budget.ts                순수: 한 수집 호출 상한(20건) 세기
├── gemini-response.ts       순수: Gemini 답·오류(상태 코드, RESOURCE_EXHAUSTED, retryDelay) → 공통 답
├── claude-response.ts       순수: Claude 답·오류(상태 코드, stop_reason) → 공통 답
├── mock.ts                  순수: 같은 요청에 같은 답, 시험이 정한 실패를 차례로 흉내
├── providers/gemini.server.ts   fetch로 generateContent
├── providers/claude.server.ts   SDK로 messages.create
├── select.ts                순수: AI_PROVIDER 값 → 공급자 이름 / 설정 없음 (1단계에서 뺌)
├── registry.server.ts       AI_PROVIDER → 공급자(새 공급자는 여기에 한 줄). 비었을 때·모르는 값 처리
├── call.server.ts           공통 길: 상한 확인 → 공급자 → 다시 시도 → JSON 모양 검사 → 호출 기록
└── call-log.server.ts       llm_calls 저장(실패해도 AI 결과는 그대로)
```

| 파일 | 하는 일 | 담당 FR | 주의 |
|---|---|---|---|
| `lib/llm/types.ts` | 공통 모양. 실패 종류 9개 | FR-002 | |
| `lib/llm/retry.ts` | `rate_limit`만 다시 시도, 최대 2번, 서버가 준 대기 > 남은 예산이면 바로 실패 | FR-005 | 현재 시각을 쓰지 않음(인자로 받음) |
| `lib/llm/budget.ts` | 상한 20 | FR-006 | 상한 값은 Q22 확인 뒤 조정 |
| `lib/llm/gemini-response.ts`, `claude-response.ts` | 답에서 글·토큰·끝난 이유를 꺼내고 오류를 실패 종류로 | FR-002, FR-003 | 키가 섞인 오류 글은 가림 |
| `lib/llm/mock.ts` | 결정된 답, 토큰은 글자 수 ÷ 4로 어림 | FR-007 | 네트워크 없음 |
| `lib/llm/registry.server.ts` | 공급자 고르기 | FR-001 | 운영 + 비어 있음 → `config` 실패 |
| `lib/llm/call.server.ts` | 다시 시도·검사·기록을 한곳에서 | FR-003~006 | JSON 모양 검사는 부르는 쪽이 넘긴 검사 함수로(예: `parsePlanDraft`) |
| `incident/plan-draft.server.ts` | Claude 직접 호출을 `callLlm`으로 바꿈 | FR-010 | 화면 동작은 그대로 |
| `incident/plans.server.ts`, `watch/collect.server.ts` | 실행 ID·상한을 넘겨 줌, 실행 기록에 "AI 상한으로 건너뜀" | FR-004, FR-006 | |
| `supabase/migrations/0007_llm_calls.sql` | `llm_calls` 표와 RLS(관리자 읽기만) | FR-004 | ERD v1.3 그대로 |
| `tests/llm-*.test.ts`, `tests/module-boundary.test.ts` | 순수 함수 시험, 감지·계산 모듈이 `lib/llm`을 불러오지 않는지 | FR-009 | |

### 자료 구조
| 대상 | 항목 | 저장/계산 | 출처 |
|---|---|---|---|
| llm_calls | ERD v1.3 칸 그대로 | 저장 | [ERD llm_calls] |
| response_plans.model | `공급자:모델` 문자열 | 저장 | [spec 002 FR-010] |
| 다시 시도 대기, 상한 남은 수 | | 계산 | [spec 002 FR-005, FR-006] |

## 3. 단계별 접근
| 단계 | 목표 | FR | 결과물 | 끝 조건 | 먼저 풀 질문 |
|---|---|---|---|---|---|
| 1 | 공통 모양과 판단 함수(시험 먼저) | FR-002, FR-003, FR-005, FR-006, FR-007, FR-009 | `types`, `retry`, `budget`, `gemini-response`, `claude-response`, `mock`, 시험 | 4절 함수 시험이 실패 확인 뒤 모두 통과, 인터넷 없이 `npm test` 통과 | |
| 2 | 공급자·고르기·공통 길·호출 기록 | FR-001, FR-004, FR-008 | 마이그레이션 0007, `providers/*`, `registry`, `call`, `call-log` | 가짜 fetch로 공급자 3개 시험, 0007 적용 뒤 관리자만 읽기 확인 | 0007 SQL 보여 주고 적용 |
| 3 | 신청 준비 계획을 새 길로 | FR-006, FR-009, FR-010 | `plan-draft.server.ts`, `plans.server.ts`, `collect.server.ts` 고침 | `AI_PROVIDER=mock`으로 가짜 변화 수집 → 계획·호출 기록 저장(SC-001), mock 한도 초과(SC-003), 키 없는 gemini(SC-004) | 가짜 변화를 받을 조건이 맞는 계정(spec 001 9단계와 같이 해결) |
| 4 | Gemini 실제 확인과 마무리 | FR-001, FR-003, FR-008 | 실제 키 호출, 1절 확정, README·CLAUDE.md "명령"·스택 | SC-002(AI 요약 저장·표시, spec 001 C-031), SC-005 키 0건, `harness-qa` B·C | 사용자가 `GEMINI_API_KEY`를 넣음 |

### 1단계 작업
- [x] 시험 먼저: 4절 함수 시험 표의 `llm.*`(1단계 몫: retry·budget·select·응답 읽기·mock·module-boundary, 44개)
- [x] 실패 확인 → 구현 → 통과. 공급자 고르기 판단은 시험하기 쉽게 순수 함수 `lib/llm/select.ts`로 뺐다(`registry.server.ts`는 이것을 부른다)

### 2단계 작업
- [x] 0007 SQL을 보여 주고 적용(사용자 승인), DB 타입 옮기기
- [x] 공급자 3개(가짜 fetch·SDK로 시험), 고르기, 공통 길, 호출 기록. 공통 길의 판단은 순수 `lib/llm/call.ts`(sleep·시계·기록을 인자로), DB·환경변수는 `call.server.ts`. 공급자 이름 목록은 `types.ts` PROVIDER_NAMES 한 곳
- [ ] `mask`에 `GEMINI_API_KEY`·`ANTHROPIC_API_KEY` 더하기

### 3단계 작업
- [ ] `draftPlan`을 `callLlm`으로, 모델 이름 `공급자:모델`
- [ ] 수집이 실행 ID와 상한을 넘김, 실행 기록 `draft_plan`에 공급자·건너뜀 수
- [ ] 가짜 수집으로 SC-001·003·004·008

### 4단계 작업
- [ ] 실제 Gemini 키로 한 번 불러 JSON 칸 이름·토큰·429 모양 확인, 1절 고침
- [ ] AI Studio에서 그 모델의 무료 한도를 보고 상한(20) 조정(Q22)
- [ ] README(환경변수, 공급자 바꾸는 법), CLAUDE.md 스택·"명령"(설정 파일이라 보여 주고 승인)

### 새 의존성 기록
| 이름 | 버전 | 이유 | 직접 만들 때 비용 | 버린 대안 | 승인 |
|---|---|---|---|---|---|
| Gemini API 무료 플랜(외부 서비스) | `gemini-3.5-flash-lite` 기본 | 개발 중 AI 요약. 비용 0원, 한도는 AI Studio에서 확인 | | 유료 Claude만 쓰기 | 승인 2026-11-17(사용자 요청, spec 002) |
| (라이브러리) | 없음 | | | `@google/genai` | |

## 4. 테스트 전략

### 요구사항 추적
| FR/SC | 확인 방법 | 시험 이름 / QA 번호 |
|---|---|---|
| FR-001 | 함수 시험 + 가짜 수집 | `llm.registry`, C-001, C-002 |
| FR-002 | 함수 시험 | `llm.geminiResponse`, `llm.claudeResponse`, `llm.mock`, C-003 |
| FR-003 | 함수 시험 | `llm.call.shape`, C-004 |
| FR-004 | 가짜 수집 + DB | `llm.call.log`, C-005, C-006 |
| FR-005 | 함수 시험 | `llm.retry`, `llm.call.retry`, C-007 |
| FR-006 | 함수 시험 + 가짜 수집 | `llm.budget`, C-008 |
| FR-007 | 함수 시험 + 인터넷 없이 시험 | `llm.mock`, C-009 |
| FR-008 | 명령(키 찾기) + 함수 시험 | `mask.secrets llm`, C-010 |
| FR-009 | 함수 시험(불러오기 검사) + 가짜 수집 | `module-boundary`, C-011 |
| FR-010 | 가짜 수집 + 화면 | C-012, H-001 |
| SC-001 | 가짜 수집 + DB | C-001, C-005 |
| SC-002 | 실제 Gemini 키 + 화면 | C-013, H-001 |
| SC-003 | 함수 시험 + 가짜 수집 | C-007 |
| SC-004 | 가짜 수집 | C-002 |
| SC-005 | 명령 | C-010 |
| SC-006 | 인터넷 없이 `npm test` | C-009, C-011 |
| SC-007 | 코드 리뷰(새 공급자 = 파일 1 + 등록 1줄) | C-014 |
| SC-008 | 가짜 수집 | C-008 |
| SC-009 | 호출 기록 | C-013 |
| SC-010 | 호출 기록 | C-009 |

### 함수 시험
- 도구 / 명령: Vitest 5.1.0 / `npm test`

| 시험 이름 | 입력 | 기대 결과 | FR |
|---|---|---|---|
| llm.retry 종류 | rate_limit / auth / timeout / refused | 다시 시도 / 안 함 / 안 함 / 안 함 | FR-005 |
| llm.retry 횟수 | 시도 1, 2, 3번째 rate_limit | 다시 / 다시 / 그만 | FR-005 |
| llm.retry 대기 | 서버 대기 7초·남은 예산 10초 / 서버 대기 60초 / 서버 대기 없음 | 7초 / 바로 실패 / 1초 뒤 2초 | FR-005 |
| llm.budget | 상한 20에서 21번째 | 건너뜀 | FR-006 |
| llm.geminiResponse 성공 | 글 + usageMetadata | JSON 글, 입력·출력 토큰 | FR-002 |
| llm.geminiResponse 오류 | 429 RESOURCE_EXHAUSTED(retryDelay 있음/없음), 400·403 키 오류, finishReason SAFETY, MAX_TOKENS, 500 | rate_limit(대기) / auth / refused / invalid_json / server | FR-002 |
| llm.claudeResponse | end_turn, refusal, max_tokens, 429(retry-after), 401, 529 | 성공 / refused / invalid_json / rate_limit / auth / server | FR-002 |
| llm.mock | 같은 요청 두 번, 실패 차례 [rate_limit, rate_limit] | 같은 답, 차례대로 실패 뒤 성공 | FR-007 |
| llm.registry | mock / gemini 키 없음 / 비었고 개발 / 비었고 운영 / "gpt" | mock / config 실패 / mock / config 실패 / config 실패 "모르는 AI 공급자: gpt" | FR-001 |
| llm.call.shape | JSON 아님 / 칸 빠짐 | invalid_json / invalid_shape | FR-003 |
| llm.call.retry | mock 한도 초과 2번 뒤 성공 / 3번 | 성공 시도 3 / 실패 시도 3 | FR-005 |
| llm.call.log | 성공·실패 한 번씩 | 기록 함수가 두 번 불림, 보낸 글 없음 | FR-004 |
| mask.secrets llm | Gemini·Claude 키가 든 오류 | 가려짐 | FR-008 |
| module-boundary | `incident/notice-change.ts`, `match.ts`, `checklist.ts`, `detect.ts`, `watch/myhome.ts`의 import | `lib/llm`·`@anthropic-ai/sdk` 없음 | FR-009 |

### 회귀 확인
- 매 단계 `npm test` 전체(지금 121개), 타입 검사, 린트
- spec 001: 사건 수·내용이 AI 성공·실패와 상관없이 같은지(C-011), 사건 상세 화면

## 5. 제약과 주의점

### 보안
- 키는 서버 환경변수에만. `lib/llm/*`는 서버 코드에서만 불러오고 `"use client"` 파일에서는 불러오지 않는다(지금 저장소 규칙: `*.server.ts`는 서버 전용, 이름 규칙으로 지킴). 키 이름이 `NEXT_PUBLIC_`로 시작하지 않아 브라우저 코드에 들어가지 않는다.
- 호출 기록에 보낸 글·받은 글·키를 남기지 않는다. 오류 글은 가린 뒤 실행 기록에.
- Gemini 무료 플랜에는 공고 원문 값만 보낸다(Q23). 사용자 정보는 프롬프트에 넣지 않는다(지금 `buildPlanPrompt`도 공고 값만 씀).

### 성능
- 한 번 시도 시간 제한 15초, 한 번 수집의 다시 시도 대기 합계 10초, AI 호출 상한 20건.

### 지금 돌아가는 기능 깨지지 않기
- spec 001 FR-010 동작(실패하면 기본 체크리스트, 원문 값을 AI 글이 덮지 않음)은 그대로. 지금 Claude 키가 없어 늘 실패하는 것도, `AI_PROVIDER`가 비면 개발은 mock이라 시험 계정의 계획에 mock 요약이 붙는다는 점만 다르다. mock 요약에는 "시험용 요약" 표시를 붙인다(가정).

### 경계
- 항상 할 것: 시험 먼저, 출처 주석(`// FR-005 (spec 002)`), qa 기록
- 먼저 물을 것: 새 라이브러리, 0007 적용, CLAUDE.md, 상한·대기 값을 크게 바꾸는 것, 유료 플랜
- 절대 하지 말 것: Groq·OpenRouter 구현, 임베딩, 공급자 자동 넘기기, 프롬프트에 사용자 정보, 키를 코드·대화·기록에 쓰기, 시험에서 실제 API 부르기

### 위험과 대응
| 위험 | 영향 | 대응 |
|---|---|---|
| Gemini 무료 한도가 작거나 바뀜(문서: 보장 안 함) | 요약 실패 | 다시 시도·상한, 실패 시 기본 체크리스트. 호출 기록으로 하루 사용량을 봄 |
| generateContent의 JSON 칸 이름이 문서 요약과 다름 | 1단계 판단 함수가 틀림 | 4단계 실제 호출로 확정 전까지 응답 읽기 함수는 두 이름을 다 받음 |
| Interactions API로 바뀌며 generateContent가 낡음 | 나중에 고칠 일 | 공급자 파일 하나만 바꾸면 됨(SC-007) |
| mock 요약이 개발 DB 사건에 섞임 | 사람이 진짜 요약으로 착각 | "시험용 요약" 표시, 모델 이름 `mock:fixed` |

## 변경 기록
| 날짜 | 버전 | 바뀐 내용 |
|---|---|---|
| 2026-11-17 | v0.1 | 첫 작성 |
