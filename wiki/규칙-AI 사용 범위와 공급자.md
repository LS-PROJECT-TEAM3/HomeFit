---
type: 규칙
sources:
  - docs/PRD.md
  - docs/Intent.md
  - docs/ERD.md
  - docs/specs/002-LLM-공급자/spec.md
updated: 2026-11-19
---
# 규칙-AI 사용 범위와 공급자

> AI(LLM)를 어디에만 쓰는지, 어느 공급자를 쓰는지, 무엇을 기록하는지.

## 내용
- 비교·저장·권한 검사는 코드로 한다. LLM은 요약·대응안 초안·기록 찾기 답변에만 쓰고 출처를 보인다. (근거: docs/PRD.md · ## 8. 결정·제약·가정) (근거: docs/Intent.md · ## 4. 제약)
- 공급자는 환경변수 `AI_PROVIDER`로 고른다: 개발은 Gemini 무료 플랜, 배포는 Claude, 시험·Ralph Loop는 mock(spec 002, 사용자 결정 2026-11-17, PRD v1.4). Gemini 무료 플랜에는 공고 원문 값(공개 자료)만 보낸다. (근거: docs/PRD.md · ## 8. 결정·제약·가정)
- 호출 수·응답 시간·토큰·실패는 llm_calls에 남기고, 보낸 글·받은 글·키는 저장하지 않는다. (근거: docs/PRD.md · ## 8. 결정·제약·가정) (근거: docs/ERD.md · #### llm_calls)
- AI가 실패해도 화면은 원문 값과 승인·거절 버튼을 보여 준다. 대응안 체크리스트는 AI 실패 때 코드가 만든 기본 목록을 쓴다. (근거: docs/PRD.md · ## 7. 기능 요구사항 FR-15) (근거: docs/ERD.md · #### response_plans)
- 공고 요약은 공고 상세를 처음 열 때 한 번 만들어 저장하고 모두가 같이 본다. 실패하면 "요약을 만들지 못했습니다". (근거: docs/PRD.md · ## 7. 기능 요구사항 FR-38)
- 구조(spec 002): `AI_PROVIDER`가 비면 개발·시험은 mock, 운영은 "AI 설정 없음"으로 기본 체크리스트만 만든다. Gemini 모델은 `gemini-3.5-flash-lite`(무료 분당 15회·하루 500회), 한 번 수집의 호출 상한 12, 한도 초과일 때만 최대 2번 다시 시도. 가정: Claude 키가 생기기 전 배포는 gemini(Q24). 자세한 것은 [[기능-002 AI 공급자 구조]]. (근거: docs/specs/002-LLM-공급자/spec.md · FR-001, FR-005, Q22, Q24)
- 기록 찾기의 임베딩은 Claude API가 만들지 않아 별도 방법이 필요하고 Q1로 남아 있다. 위키 챗봇은 임베딩을 쓰지 않는다(ERD v1.10). Intent v0.3 5절 Q1은 "기록 찾기·위키 챗봇의 임베딩" 질문에 "지금은 임베딩 없이 제목·질문 낱말 겹침으로 찾는다(spec 004·010·012)"를 더했다. (근거: docs/ERD.md · ## 확인 필요 Q1) (근거: docs/Intent.md · ## 5. 열린 질문 Q1)

## 충돌
- AI 공급자: Intent 4절과 스택 설명은 "Claude API는 요약·대응안 초안·기록 찾기 답변에만 쓰고"처럼 Claude API 하나로 적는다(근거: docs/Intent.md · ## 4. 제약), PRD 8절(v1.4)은 `AI_PROVIDER`로 개발 Gemini, 배포 Claude, 시험 mock을 고른다고 적는다(근거: docs/PRD.md · ## 8. 결정·제약·가정). 고르지 않는다. 팀이 Intent를 고칠지 정한다.

## 확인 필요
없음

## 연결
- [[화면-알림 상세]], [[데이터-사건·대응·기록 표]], [[팀-작업 의도와 열린 질문]], [[기능-002 AI 공급자 구조]]
- 목차: [[index]]
