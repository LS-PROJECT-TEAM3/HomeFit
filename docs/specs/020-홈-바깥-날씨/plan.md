# plan: 020 홈 바깥 날씨

- 근거: spec 020 v0.1, spec 003 plan(`watch/kma*.ts`, `watch/kma-grid.ts`)
- 상태: 초안 v0.1 (사용자 요청 2026-11-19. **승인 전**)
- 작성일: 2026-11-19

## 1. 기술과 버전
지금 쓰는 것만 쓴다. 키는 이미 있는 `DATA_GO_KR_SERVICE_KEY`(기상청 단기예보 조회서비스, spec 003에서 신청함, 2026-11-19 초단기실황 호출 확인). 주소 `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst`·`getUltraSrtFcst`, `dataType=JSON`. `"use cache"`로 격자·기준 시각마다 10분 기억. DB·ERD 변경 없음.

## 2. 구조와 파일
| 파일 | 할 일 | 단계 |
|---|---|---|
| `watch/kma-now.ts` (새, 순수) | 기준 시각 고르기(E3), 실황·예보 응답 해석, 날씨 글(FR-002) | 1 |
| `watch/kma-now.server.ts` (새) | 두 API 부르기, 10분 기억, 예보 실패는 하늘 없음(E4) | 1 |
| `tests/kma-now.test.ts`, `tests/kma-now-server.test.ts` | 시험 먼저(가짜 fetch) | 1 |
| `app/(main)/weather-card.tsx` (새), `page.tsx`, `page.module.css` | 홈 날씨 카드, 따로 Suspense(E2), 실내 비교(FR-003) | 2 |
| `docs/data-sources.md` | 출처 줄 | 2 |

## 3. 단계
| 단계 | 할 일 | 끝 조건 |
|---|---|---|
| 1 | 해석·부르기와 시험 | 실패 확인 뒤 구현, `npm test`·`tsc`·`lint` |
| 2 | 홈 카드 | 미리보기(예림 계정 읽기만), 375px, `npm run build` |

## 4. 요구사항 추적
| 요구 | 시험 이름 / QA 번호 |
|---|---|
| FR-001, FR-002, E3, E4, E7 | `tests/kma-now.test.ts` / C-2001 |
| E2, E6 | `tests/kma-now-server.test.ts` / C-2001, C-2002 |
| SC-001~003, FR-003, E1, E5 | C-2002, H-2001 |

## 5. 제약과 주의점
- 항상: 시험은 실제 API를 안 부른다, 오류 문구에 키를 넣지 않는다, 날씨는 글로(아이콘만 쓰지 않음)
- 먼저 물을 것: 날씨 알림·사건, 현재 위치 사용
- 절대 하지 말 것: 결로 판단 바꾸기, 날씨 값 저장
