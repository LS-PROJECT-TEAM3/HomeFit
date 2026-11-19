# plan: 017 주택 종류·면적에 맞춘 에너지 사용량 추정

- 근거: spec 017 v0.1, spec 011 plan(`incident/energy-estimate.ts`, `watch/kepco-household*.ts`)
- 상태: 초안 v0.1 (사용자 지시 2026-11-19. **승인 전**)
- 작성일: 2026-11-19

## 1. 기술과 버전
지금 쓰는 것만 쓴다: Next.js + TypeScript strict, Vitest. 새 라이브러리·DB·ERD·키 없음. 패널조사 결과표(zip 828KB, 2026-11-19 받음)의 전국 일반전기 값 9개를 `watch/energy-panel.json`에 옮긴다.

## 2. 구조와 파일
| 파일 | 할 일 | 단계 |
|---|---|---|
| `watch/energy-panel.json` (새) | 주택 종류 3칸·면적 5구간·전국 평균, 출처 | 1 |
| `incident/energy-panel.ts` (새, 순수 함수) | 종류·면적 보정 비율, 전국 평균 한 달 kWh | 1 |
| `incident/energy-estimate.ts` | `withEstimate`가 종류·면적을 받아 한전 × 비율, 없으면 패널 전국 × 비율(FR-002, E4) | 1 |
| `tests/energy-panel.test.ts`, `tests/energy-estimate.test.ts` | 시험 먼저 | 1 |
| `app/(main)/compare/cost-view.tsx` `EstimateNote`, `app/(main)/energy/load.ts` | 근거 글(FR-003), 에너지 분석도 같은 추정 | 2 |
| `docs/data-sources.md`, spec 011 | 출처 줄, spec 011 E2가 바뀐 것 표시 | 2 |

## 3. 단계
| 단계 | 할 일 | 끝 조건 |
|---|---|---|
| 1 | 자료 파일, 순수 함수와 시험 | 실패 확인 뒤 구현, `npm test`·`tsc`·`lint` 통과 |
| 2 | 화면 근거 글, 에너지 분석 연결, 문서 | 미리보기(에너지 분석·집 비교), `npm run build` |

## 4. 요구사항 추적
| 요구 | 시험 이름 / QA 번호 |
|---|---|
| FR-001, SC-001, E2, E3 | `tests/energy-panel.test.ts` / C-1701 |
| FR-002, SC-002, E1, E4, E5 | `tests/energy-estimate.test.ts` / C-1701 |
| FR-003, SC-003 | C-1702, H-1701 |

## 5. 제약과 주의점
- 항상: 추정은 "추정값"으로 글자 표시, 근거 통계 이름·기준 연도
- 먼저 물을 것: 관리비 평균(자료 필요), 시도별 패널 값
- 절대 하지 말 것: 출처 없는 숫자, 실제 계정 값 바꾸기
