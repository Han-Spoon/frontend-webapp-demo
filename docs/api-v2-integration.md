# API V2 프런트엔드 연동 체크리스트

기준: [API 명세서 V2 (AWS)](https://power-drip-e50.notion.site/API-_V2-AWS-40815244157c802683a6eca6b340f223), 2026-11-20 확인. 체크는 **프런트 화면에서 요청과 응답을 연결한 경우**에만 표시한다. 서버 배포와 실계정 검증은 별도다.

## 완료

- [x] POST `/api/v1/auth/google`, POST `/api/v1/auth/refresh`, POST `/api/v1/auth/logout` — 기존 로그인, 단일 갱신, 로그아웃 유지.
- [x] GET `/api/v1/users/me`, GET `/api/v1/users/me/profile` — 사용자·식단 조회 유지.
- [x] PATCH `/api/v1/users/me` — 앱 언어 7종을 서버에 그대로 저장.
- [x] POST/PATCH `/api/v1/users/me/profile` — 기존 온보딩·편집 흐름에서 7종 언어를 전달.
- [x] POST `/api/v1/uploads` — 정본 경로로 S3 업로드 URL 발급, 응답 `uploadHeaders`를 PUT에 사용.
- [x] POST `/api/v1/scans` — 운영 화면에서 고정 결과 우회를 제거하고 업로드 키로 분석 시작.
- [x] GET `/api/v1/scans/{scanId}` — 분석 폴링과 V2 결과의 메뉴 ID, 번역명, 판정, 재료를 기존 결과 화면에 매핑. V1 필드도 읽는다.
- [x] GET `/api/v1/scans` — 스캔 기록 목록 조회 유지, 위험 메뉴 수는 `dangerCount` 사용.
- [x] PATCH/DELETE `/api/v1/scans/{scanId}` — 제목 변경과 삭제·분석 취소 연결.
- [x] POST `/api/v1/stores/candidates` — 주변·이름 검색, 위치 거부 때 좌표 없는 이름 검색 허용.
- [x] GET/DELETE `/api/v1/cards/saved`, POST `/api/v1/cards/saved` — 기존 직원 카드 흐름 유지, `less_spicy`와 7종 언어 타입 반영.

## 진행 필요

- [ ] GET `/api/v1/consents/documents`, GET/POST `/api/v1/consents/me` — 약관 화면과 로그인 분기.
- [ ] GET `/api/v1/scans/{scanId}/image` — 기록 재열기 때 원본 사진 표시 및 410 안내.
- [ ] PUT `/api/v1/scans/{scanId}/record` — 운영 기록 저장·식당 연결/해제.
- [ ] POST/DELETE/GET `/api/v1/saved-menus` — 결과 하트와 저장 메뉴 목록을 `scanMenuId`로 연동.
- [ ] POST/GET `/api/v1/stores/{storeId}/reviews`, PATCH/DELETE `/api/v1/reviews/{reviewId}`, GET `/api/v1/reviews/me`, POST `/api/v1/reviews/{reviewId}/reports` — 후기 화면과 V2 값.
- [ ] PUT `/api/v1/scans/{scanId}/staff-questions/{questionId}/answer` — 직원 응답과 서버 판정 갱신.

명세에서 삭제된 가게 상세·동네·큐레이션·후기 필터·후기 번역·별도 기록 조회 API는 호출하지 않는다. AI 내부 API는 프런트 대상이 아니다. 환율 API는 명세에서 구현 시점을 ‘맨 나중’으로 지정했으므로 고정 환율을 유지한다.

## 검증 메모

- `pnpm build`는 이 환경에서 pnpm 실행 파일의 네트워크 fetch 오류로 실패했다. 설치된 `node_modules/.bin/vite build`는 통과했다.
- `node scripts/check-demo.mjs`, `git diff --check` 통과.
- 실서버 응답과 로그인 사용자 데이터는 이 작업 환경에서 아직 검증하지 못했다.
