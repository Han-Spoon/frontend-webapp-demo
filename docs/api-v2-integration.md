# API V2 프런트엔드 연동 체크리스트

기준: [API 명세서 V2 (AWS)](https://power-drip-e50.notion.site/API-_V2-AWS-40815244157c802683a6eca6b340f223), 2026-11-20 확인. `[x]`는 **프런트의 해당 화면에서 V2 요청·응답을 연결함**을 뜻한다. 실서버 통합 검증 완료를 뜻하지 않는다.

## 화면 연동

- [x] 로그인·계정: `POST /auth/google`, `POST /auth/refresh`, `POST /auth/logout`, `GET/PATCH/DELETE /users/me`. 기존 토큰 갱신과 탈퇴 흐름 유지.
- [x] 약관·설정: `GET /consents/documents`, `GET/POST /consents/me`. 현재 버전의 필수 3종과 선택 1종을 표시하고, 로그인 후 필수 동의 여부로 이동한다.
- [x] 온보딩·프로필: `GET/POST/PATCH /users/me/profile`. 7개 앱 언어 코드를 그대로 전달하고 기존 프로필 편집 동선을 유지한다.
- [x] 사진 선택·분석: `POST /uploads`로 S3 업로드 URL을 발급받아 `uploadHeaders`로 업로드; `POST /scans`로 분석 시작. 운영 화면의 고정 결과 우회를 해제했다.
- [x] 분석 상태·결과: `GET /scans/{scanId}`. `processing`, `completed`, `failed`, `needs_retake`를 구분하고 V2 메뉴, 위험 재료, 직원 질문, 프로필 스냅샷을 매핑한다. 확률은 주의 판정, 적용 프로필의 회피 재료, 유한한 0–100 숫자일 때만 표시한다.
- [x] 기록: `GET /scans`, `PATCH/DELETE /scans/{scanId}`, `PUT /scans/{scanId}/record`, `GET /scans/{scanId}/image`. 제목 수정, 삭제·취소, 선택적 식당 연결/해제, 원본 사진의 410 안내를 연결했다.
- [x] 식당 탐색: `POST /stores/candidates`. 지도 좌표 주변 탐색과 좌표 없는 이름 검색, nullable 거리와 후기 수를 반영했다.
- [x] 메뉴 찜: `GET/POST /saved-menus`, `DELETE /saved-menus/{scanMenuId}`. 결과 하트와 마이페이지 저장 목록을 서버의 `scanMenuId`로 연결했다.
- [x] 식사 후기: `GET/POST /stores/{storeId}/reviews`, `PATCH/DELETE /reviews/{reviewId}`, `GET /reviews/me`, `POST /reviews/{reviewId}/reports`. 가게·결과·내 후기 화면에서 메뉴별 현재 프로필 답변, 수정·삭제·신고를 연결했다. 필터는 받은 목록에서 처리한다.
- [x] 직원 확인·주문 카드: `PUT /scans/{scanId}/staff-questions/{questionId}/answer`, `GET/POST /cards/saved`, `DELETE /cards/saved/{cardId}`. 직원 재료 답변 후 결과를 다시 읽으며, `less_spicy`와 7개 언어를 반영했다.

위 경로의 공통 접두사는 `/api/v1`이다.

## 명세상 보류·제외

- [ ] **실서버 통합 검증**: 노션 표의 약관·기록 저장·메뉴 찜·후기·직원 답변 등 다수 엔드포인트가 `시작 전` 상태다. 백엔드를 수정하지 않는 조건이므로 서버 배포 후 인증 계정으로 성공·오류 응답을 검증해야 한다.
- [ ] **환율**: 명세에서 구현 시점을 ‘맨 나중’으로 지정했다. 현재 고정 환율은 데모 값이다.
- 삭제된 가게 상세·동네·큐레이션·후기 필터·후기 번역·별도 기록 조회 API는 호출하지 않는다. 내부 AI API는 프런트 대상이 아니다.
- 입점 식당의 등록 메뉴 레시피, 가게 사진, 후기 기반 랭킹은 V2에 제공 API가 없어 기존 명시적 데모 데이터에만 둔다.

## 검증과 번역 상태

- 로컬 빌드: 설치된 `node_modules/.bin/vite build` 통과. `pnpm build`는 pnpm 실행 파일의 네트워크 fetch 오류로 실행되지 않았다.
- `node scripts/check-demo.mjs`, `git diff --check` 통과. 브라우저에서 결과 프리뷰와 마이페이지 탭 렌더링을 확인했다. 로컬 API 프록시는 현재 서버를 연결하지 않아 저장 메뉴·후기 탭에서 요청 오류가 표시된다.
- 한국어·영어·아랍어를 중심으로 새 UI 문구를 작성했다. 나머지 4개 언어는 기존 `createTranslator`의 영어 fallback을 사용한다. 아랍어 RTL 방향을 유지한다. 약관 본문은 명세대로 한국어만 제공된다.
