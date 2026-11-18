# 전역 하네스

모든 프로젝트에 적용한다. 프로젝트 `CLAUDE.md`가 다르게 정하면 프로젝트 쪽을 따른다.
절차는 여기 풀어 쓰지 않고 스킬로 위임한다. 상세 규칙은 `.claude/rules/`(code, quality, design, git-security)에 있다.

## 1. 첫 규칙 (최우선)
새 프로젝트를 시작하면(작업 폴더에 `CLAUDE.md`도 `docs/` 기획 문서도 없으면) 다른 일보다 먼저 `harness-start` 스킬을 부른다.
그 스킬의 첫 질문은 **"이 프로젝트에 새 하네스를 만들까요?"** 이다.
- 예 → 프로젝트 템플릿을 `./CLAUDE.md`로 복사하고, 고치거나 더할 내용과 스택·디자인을 물어 채운다. 전역 규칙은 그대로 적용되고 다른 점만 프로젝트에 남긴다.
- 아니오 → 전역 규칙만 쓰고 바로 문제 정의로 간다. 스택·디자인은 처음 필요해질 때 물어 plan과 Intent 4절에 남긴다.

## 2. 프로젝트 시작 워크플로우
하네스 확인이 끝나면 아래 순서로 문서를 만든다. 문서 하나가 끝날 때마다 승인을 받고 다음으로 간다.

| 순서 | 산출물 | 부를 스킬 |
|---|---|---|
| 1 | docs/문제정의.md, GLOSSARY.md, docs/adr/ | `grill-with-docs` (grilling + domain-modeling) |
| 2 | docs/IA.md, docs/IA.xlsx | `harness-ia` |
| 3 | docs/journeys/ | `harness-journeys` |
| 4 | docs/PRD.md | `harness-prd` |
| 5 | docs/ERD.md | `harness-erd` |
| 6 | docs/Intent.md | `harness-intent` 절차 C |
| 7 | docs/specs/{NNN-기능}/spec.md, plan.md | `harness-spec-plan` |
| 8 | docs/specs/{NNN-기능}/qa.md | `harness-qa` 절차 A |

## 3. 상황 → 스킬 → 산출물
| 상황 | 부를 스킬 | 산출물 |
|---|---|---|
| 작업 시작 | `harness-intent` 절차 A | 근거 출처 ID 보고 |
| 작업 끝 | `harness-intent` 절차 B | Intent 갱신, 7절 변경 기록 |
| 새 기능·큰 수정 | `harness-spec-plan` → `harness-qa` A | spec, plan, qa.md |
| plan 단계 하나 끝 | `harness-qa` B (+ `ponytail-review`) | qa.md 결과·증거 |
| 기능 끝 | `harness-qa` C, D | 사람 QA 목록, 결과 기록, README 갱신 |
| 계획·결정 검증 | `grilling` | |
| 용어·결정 기록 | `domain-modeling` | GLOSSARY.md, docs/adr/ |
| 큰 변경 검토 | `code-review`, 정리는 `simplify` | |
| 앱 실행해 확인 | `run` | |
| 디자인 방향 정하기 | `design-styles`, `ui-ux-pro-max` | CLAUDE.md "디자인" 절 또는 plan |
| 긴 한국어 문구 다듬기 | `humanize-scan` → `humanize-korean` | |
| hook·권한·설정 | `update-config` | |
| 위 표에 맞는 스킬이 없음 | **없음** — 사용자에게 알리고, 스킬을 만들지는 사용자가 정한다 | |

## 4. 모든 작업의 순서
1. 시작: `harness-intent` A. 관련 원문을 직접 읽고 근거 출처 ID(수용 기준, 화면 ID, 요구사항 ID, 여정 단계, 엔터티)를 먼저 보고한다.
2. 새 기능·큰 수정은 코드보다 spec → plan → qa.md가 먼저다. 승인된 plan의 단계 순서와 경계를 따른다.
3. plan 단계 하나씩 개발하고, 단계 끝마다 QA 후 승인을 받는다. 사람 QA가 모두 통과해야 기능이 끝난다.
4. 끝: `harness-intent` B. 결정이 바뀌었으면 원문 문서를 먼저 고친다.
- 문서에 없는 동작은 지어내지 않고 묻는다. 답 없이 가야 하면 임시 처리를 정해 코드 주석(`// Q6 임시 처리: …`)과 Intent 5절에 남긴다.
- 문서끼리 어긋나면 하나를 골라 구현하지 말고 묻는다. "하지 않을 것"은 구현하지 않는다.

## 5. 자율성 경계
- **묻지 않고 한다**: 파일 읽기·검색, 시험 실행, 미리보기 확인, 승인된 plan 단계 안의 코드 작성·수정, 오타·서식 수정, qa.md·Intent 기록.
- **먼저 묻는다**: 새 라이브러리·외부 서비스, ERD 변경, 파일·폴더 삭제, 문서에 없는 동작·문서 충돌, spec 범위 확대·축소, git 커밋·push, 설정 파일(settings.json, CLAUDE.md) 변경, 비용이 드는 일, 승인된 문제정의 수정.
- **절대 하지 않는다**: 비밀 키·토큰을 코드·저장소에 넣기, 시험을 지우거나 건너뛰어 실패 숨기기, 직접 요청 없는 배포·공개, 증거 없이 "통과"·"완료" 보고.

## 6. 소통
- 사용자는 이 저장소에서 작업하는 팀원 누구나다. 코딩 경험이 서로 다를 수 있으니 쉬운 말로, 결과부터 말한다.
- 답변·문서·주석·커밋 메시지는 한국어, 코드 이름은 영어로 쓴다. 전문용어는 처음 나올 때 쉬운 말로 푼다.
- 선택지를 물을 때는 추천 답과 이유를 함께 준다.
- 승인을 받을 때는 이 순서로 보고한다: 한 일 → 확인한 증거 → 남은 것·막힌 것 → 다음 단계.

## 7. 외부 스킬을 부르는 시점
이 시점에만 부른다. 그 밖에서 자동으로 걸려도 쓰지 않는다. 사용자가 이름을 대면 언제든 쓴다.
| 시점 | 스킬 | 쓰는 법 |
|---|---|---|
| 디자인 인터뷰 | `ui-ux-pro-max`(`--design-system`), `design-styles` | 근거를 뽑고 후보 2~3개를 보여 준다. 고른 토큰을 CLAUDE.md "디자인" 절(하네스 없으면 plan)에 옮기면 이후에는 그것만 따른다 |
| plan 작성 | React/Next면 `react-best-practices`, `composition-patterns` | 구조·파일 결정의 근거로만 쓴다 |
| 화면 구현 | `ui-ux-pro-max`(보조 검색), React면 `react-best-practices`, 전환 애니메이션이 plan에 있을 때만 `react-view-transitions` | 정해진 디자인 규칙이 우선 |
| 구현 중 단순화 | `ponytail` (사용자가 켤 때만, lite 권장) | 출처·Q번호 주석은 지우지 않는다. 승인된 FR·SC를 줄이지 않고 제안만 한다 |
| 단계 끝 QA 직전 | `ponytail-review` | 고칠 것은 `harness-qa` B에서 처리 |
| 화면 QA | `web-design-guidelines`, `ui-ux-pro-max` 납품 전 체크리스트 | 디자인 기본선 C 항목의 증거 |
| 기능 끝 | `ponytail-debt` | `shortcut:` 목록을 Intent 5절과 대조 |
| 마일스톤 | `ponytail-audit` | 결과를 보여 주고 고칠지 묻는다 |
| 사용자에게 보이는 긴 한국어 | `humanize-scan` → `humanize-korean` | HTML은 보이는 문장만 뽑아 다듬고 다시 넣는다. 짧은 화면 라벨은 IA 용어를 따른다 |

## 8. 하네스 유지
- 이 파일은 트리거 중심으로 짧게(100줄 안팎) 유지한다. 상세 규칙은 `.claude/rules/`, 절차는 스킬로 뺀다.
- 예외 없이 지켜야 할 규칙은 문구 대신 hook으로 건다(`update-config`).
- 하네스 규칙을 바꾸자는 요청을 받으면 전역과 프로젝트 중 어디에 둘지 먼저 묻는다.
