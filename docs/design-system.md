# 디자인 시스템 (한스푼 새 테마)

2026-11-24부터 「한스푼 새 테마」로 화면을 다시 만든다. 브랜드 규칙은 [BRAND_GUIDE.md](BRAND_GUIDE.md), 값의 원본은 디자인 시스템 산출물이다.

## 기준 자료 (우선순위 순)

1. 「한스푼 디자인 시스템」 — `tokens.json` · `README.md` · `judgment.md`(판정 화면) · `web.md`(CSS 변수 · 컴포넌트 이름) · 공통 컴포넌트 28종
2. 캔버스 「한스푼 새 테마」 — 흐름 1~7 · 홈 · 공통 상태 화면 62개(390 폭)와 보드 옆 규칙 메모(초록 = 규칙, 회색 = 그리지 않은 상태)
3. 한스푼 Project 문서 `design/redesign-flows.md` · `design/review-2026-11-24.md` · `design/flow4-data-audit.md`

자료끼리 다르면 위 순서를 따른다. 레이아웃은 기존 화면이 아니라 캔버스를 따르고, API 호출 · 데이터 처리 · 다국어 · 상태 처리는 기존 코드를 살린다. 화면에는 API(노션 「API 명세서_V2 (AWS)」)가 주는 값만 올린다.

## 토큰 (`src/styles/theme.css`)

| 층 | 이름 | 쓰는 법 |
| --- | --- | --- |
| 1. 새 원시 토큰 | `--hs-*` (색 · 간격 · 모서리 · 그림자 · 크기 · 글자) | 새 컴포넌트는 이것만 쓴다 |
| 2. 기존 의미 변수 | `--surface-base`, `--text-secondary`, `--status-safe-text`, `--rice-cream` 등 | 값만 새 토큰으로 바꿨다. 아직 다시 짜지 않은 화면을 위한 호환층이며, 화면을 옮기면서 사용처를 줄인다 |

Tailwind 클래스(`@theme inline`):

- 색: `bg-hs-mint-100`, `text-hs-ink-500`, `border-hs-caution-500` …
- 모서리: `rounded-hs-2xl`, `rounded-hs-pill`, 그릇 모양은 `rounded-t-hs-bowl-top rounded-b-hs-bowl-bottom`. 기존 `rounded-sm…xl`과 겹치지 않게 `hs-`를 붙였다.
- 그림자: `shadow-hs-card`, `shadow-hs-sticky`, `shadow-hs-float`, `shadow-hs-pin`
- 글자: `hs-title-xl`, `hs-title-md`, `hs-body`, `hs-label`, `hs-caption`, `hs-micro`, `hs-staff-lg` … (굵기 · 크기 · 줄 높이를 한 번에. 글꼴은 `fonts.css`의 언어별 `--font-sans`)
- 간격은 Tailwind 4px 눈금이 디자인 값과 같다(`px-5` = 20, `gap-2.5` = 10, `p-3.5` = 14).
- 크기는 `h-[var(--hs-size-btn-cta)]`처럼 변수로 쓴다.

다크 테마는 새 디자인에 없어 `.dark` 블록과 `dark` 변형을 지웠다.

## 판정 표현 (흐름 4)

판정 상태는 한 함수로 정한다(디자인 시스템 `web.md` 4절).

| 화면 | API |
| --- | --- |
| 안전 | `riskLevel` safe |
| 주의 | `riskLevel` caution + `evidenceBasis` estimated |
| 위험 | `riskLevel` danger |
| 확인 필요 | `riskLevel` null, caution + `evidenceBasis` unknown, 모르는 값 |

- 필터 · 개수 · 배지 · 아이콘은 이 결과로 정한다. 주의 필터 · 개수에는 확률이 계산된 메뉴만 들어간다. 서버 `counts`와 다를 수 있다.
- **목록 순서(2026-11-24 결정)**: 안전 → 주의 → 위험 → 확인 필요로 묶고, 같은 묶음 안에서는 서버 `displayOrder` 순서를 그대로 둔다.
- 색은 위험도에만: 판정색은 상태 배지 · 판정 타일 · 펼친 카드 테두리 · 관련 재료 태그 테두리에만 쓴다. 카드 안 설명 상자는 연회색 + 검정 글자. 하트만 예외(코랄 · 주황).
- **근거 정보는 표시하지 않는다(2026-11-24 결정)**: 추정 기준 · 근거 충분도 · '근거가 적음' 표시('–', 점선 빈 막대, '가능성을 모르는 재료' 묶음) 모두 없다.
- 주의 카드의 재료 줄: 포함 확률(`posteriorMean`)이 있는 재료는 % 숫자(막대 왼쪽) + 막대. 확률이 없는 재료는 숫자 · 막대 없이 이름만 목록 맨 끝에 둔다(숨기지 않음). 관련 재료 전체 보기 시트도 '관련 재료 N개' 한 목록이다.
- 재료 확인 · 빼고 요청 카드는 내 알레르기 전부에 한 장씩 만든다. 서버의 flag 질문(소스 · 육수 등)은 카드로 만들지 않는다.
- 직원용 문장은 재료마다 한 장, 이름은 '직원 소통 카드', 음성 버튼은 '한국어 음성 듣기'(항상 ko-KR).

## 공통 컴포넌트

새 공통 컴포넌트는 `src/app/components/hs/`에 만든다. 각 모양 · 규칙은 디자인 시스템 `components/<이름>/README.md`를 따른다. 화면을 새 컴포넌트로 옮긴 뒤 옛 컴포넌트를 지운다.

| 디자인 시스템 | 새 컴포넌트 | 대체할 옛 코드 | 상태 |
| --- | --- | --- | --- |
| Button · IconButton · HeartButton | `HsButton` · `HsLinkButton` · `HsIconButton` · `HsTextIconButton` · `HsHeart` | 화면별 버튼 | 만듦 |
| RiskBadge · RiskTile | `RiskBadge` · `RiskCountBadge` · `EvidenceBadge` · `RiskTile` · `BowlTile`, 판정 매핑 `riskOf` · `orderByRisk` (`hs/risk.ts`) | `results/ResultEvidence.tsx` | 만듦 |
| IngredientTag · IngredientRow · MenuCard | `IngredientTag`, 결과 카드 `results/ResultMenuCard.tsx`(재료 줄 `IngredientList` · 전체 시트 `AllIngredientsSheet`) | `ResultsScreen` 안 카드, `AnalysisInsights` | 만듦 |
| InfoBox · StaffCard · AnswerButtons | `VerdictBox` · `NoticeBox` · `HsNote` · `StaffCard` · `AnswerButtons` | 직원 소통 시트들, `CardsScreen` 안 카드 | 만듦 |
| StoreCard · ScanHistoryCard · ReviewCard · CurationCard | 같은 이름(`hs/cards.tsx`), 지역명 `districtOf` | 지도 · 식당 선택 · 기록 · 후기 · 큐레이션 안 카드 | 만듦 |
| Chip · OptionRow · Stepper · SearchField | `ChoiceChip` · `AddChip` · `FilterChip` · `DietTag` · `PlainTag` · `CategoryTag` · `OptionRow` · `Stepper` · `SearchField` · `TextField` | 온보딩 · 필터 안 코드 | 만듦 |
| BottomSheet · Dialog · Toast | `HsSheet`(한 장: X / 여러 장: `pager`) · `HsDialog` · `ToastProvider` · `useToast` | `common/ModalSheet`, `discovery/BottomSheet`, `common/ConfirmDialog` | 만듦 |
| Tabs · BottomNav · BottomBar · TopArea | `PillTabs` · `UnderlineTabs` · `BottomNav` · `BottomBar` · `TopArea` · `TopBar` · `Logo` | `BottomNav.tsx`, 화면별 머리 | 만듦 |
| StateBlocks | `OfflineBanner` · `EmptyState` · `ErrorState` · `InlineError` · `SkeletonCard` · `SkeletonLine` | `OfflineBanner` · `HistoryLoadError` · `FeaturePreparing` | 만듦 |
| MapPin | 새로 만들지 않음 | `discovery/StoreMap.tsx` 스타일 그대로 | 유지 |

### 쓰는 법

- `import { HsButton, HsSheet, riskOf } from './hs'` 처럼 `src/app/components/hs/index.ts`에서 가져온다.
- 아이콘은 디자인 시스템 선 아이콘을 옮긴 `HsIcon`(`hs/icons.tsx`)을 먼저 쓰고, 없는 모양만 lucide-react를 `strokeWidth={2.2}`로 쓴다. 방향 아이콘은 `FLIP_RTL`로 아랍어에서 뒤집는다.
- 새 화면 문구는 7개 언어를 모두 적은 객체(`AllText`)를 `tx(language, …)`로 쓴다. 숫자가 들어가면 `CountText` + `txn`. 번역 사전(`src/app/i18n/`)에 키를 따로 추가하지 않아도 되고, `check-demo`의 번역 누락 수도 늘지 않는다.
- 개발 서버의 `/dev/hs-gallery?demo=1&lang=ko`(`&open=sheet|pager|dialog`)에서 모든 공통 컴포넌트를 미리 볼 수 있다.
- 하단 내비의 꺼진 글자는 대비를 위해 `ink-500`, 아이콘만 `ink-400`(디자인 시스템 접근성 규칙: ink-400은 글자 금지).

## 레이아웃 공통

- 모바일 최대 너비 430px, 시안 폭 390. 화면 좌우 여백 20, 카드 사이 10, 섹션 사이 24.
- 하단 내비: 홈 · 큐레이션 · 촬영(가운데 60px 원) · 지도 · 카드. 결과 · 마이페이지 · 온보딩에는 없다.
- 시트는 주 버튼을 맨 아래 고정. 여러 장 카드 시트는 오른쪽 위 ‹ › + 진행 막대, 한 장짜리는 X.
- 확인 창은 [취소](soft) + 행동 버튼. 되돌릴 수 없는 동작만 빨간 버튼, 그 밖(로그아웃 등)은 초록.
- 해당 없는 선택지는 흐리게 두지 않고 뺀다.
- RTL: `start/end` · `ms/me` · `ps/pe`, 뒤로 · › 아이콘은 `rtl:-scale-x-100`. 숫자 · 가격은 `dir="ltr"`.

## 옛 공용 모달 (새 컴포넌트로 바뀌는 중)

아래는 새 `HsSheet` · `HsDialog`로 옮기기 전까지 유지하는 규칙이다. 새 컴포넌트도 같은 접근성 규칙을 지킨다.

| 종류 | 컴포넌트 | 쓰는 곳 |
| --- | --- | --- |
| 하단 시트(머리 · 내용을 직접 그림) | `common/ModalSheet` | 재료 확인 · 빼고 요청, 내 식단 전달, 카드 팝업 |
| 하단 시트(제목 · 설명이 정해짐) | `discovery/BottomSheet` | 식당 선택, 기록 저장 |

- 모두 Radix Dialog 기반이라 Esc 닫기, 초점 가두기, 뒤 화면 스크린리더 숨김 · 스크롤 잠금이 기본이다. `role="dialog"` · `aria-modal`을 직접 쓰지 않는다.
- 열려 있는 동안만 렌더한다(`{open && <HsSheet />}`). 가운데 확인창은 모두 `HsDialog`(옛 `common/ConfirmDialog`는 2026-11-25 삭제). 닫을 때 초점 복귀는 `common/returnFocus`의 `useReturnFocus`를 `onCloseAutoFocus`에 건다.
- 확인창의 처음 초점은 취소 버튼이다. 처리 중에는 `busy`로 버튼과 Esc · 바깥 누르기를 막고, 실패는 `error`로 확인창 안에 보여 준다.

## 진행 기록

- 2026-11-24 흐름 1: 랜딩 · 로그인 · 약관 · 온보딩을 새 컴포넌트로 다시 구현(`LanguageButton` 추가).
- 2026-11-25 흐름 7: 마이페이지(`MyPageScreen`, `mypage/`). `PillTabs` + `UnderlineTabs`, `ScanHistoryCard` ··· 메뉴 · 제자리 이름 수정, `HsDialog`(기록 미리보기 · 로그아웃 아이콘), `HsHeart`, `ReviewCard`. `EmptyState tone`(mint · coral · neutral), 아이콘 logout. 옛 `ScanHistoryScreen` · `ScanHistoryList` · `HistoryLoadError` · `SavedMenusScreen` · `reviews/MyReviewsScreen` · `reviews/ReviewCards` · `common/ConfirmDialog` · `results/ResultEvidence` 삭제.
- 2026-11-25 흐름 6: 직원 소통 카드(`CardsScreen`). 공통 문장 카드는 그릇 모양(22/30) surface-100 + 흰 아이콘 칸, 내 식단 카드는 mint-100 + mint-200 테두리, 저장 카드 종류 태그 4색. `HsSheet header`, 아이콘 5종.
- 2026-11-25 흐름 5: 큐레이션 목록 · 상세(`CurationScreen`, `CurationDetailScreen`, `curation/curationView`). `CategoryTag` · `FilterChip` · `StoreCard` · `SearchField` 사용, 글 사진은 그릇 모양 모서리(18/30 · 16/26), 사진을 못 불러오면 카테고리 색 + 그릇 아이콘. `SearchField` 초점 테두리는 알약 전체(`.hs-search`).
- 2026-11-25 흐름 2: 지도에서 가게 찾기(`RestaurantMapScreen`, `components/map/`). 공통 `StoreCard` · `PillTabs` · `SearchField` · `HsSheet` · 상태 블록을 쓰고, 지역 시트 · 후기 전체 화면 · 칩 메뉴(`map/ChipMenu`)를 추가. 아이콘 list · map · locate · sort · refresh.
- 2026-11-25 홈: 캔버스 '홈 디벨롭 ②'대로(하드코딩 가게 탐색 · 스포트라이트). `DietPromptCard` 새 모양, 아이콘 noodle · meat · skewer.
- 2026-11-25 흐름 3: 메뉴판 찍기(촬영 탭 · 카메라 · 사진 확인 · 분석 중 · 실패)와 식당 선택 시트(`discovery/RestaurantPicker`)를 새 컴포넌트로. `HsDialog keepIsPrimary`(분석 취소 확인), `ScanHistoryCard` › 표시, 아이콘 clock · file · spark · hand 추가.
- 2026-11-24 흐름 4: 판정 결과를 다시 구현. `results/` 아래 결과 카드 · 직원 소통 카드 시트(`StaffCardsSheet`) · 내 식단 보여주기(`ShowDietSheet`) · 기록 수정(`EditRecordSheet`) · 메뉴판 사진(`MenuPhotoViewer`), 직원 문장 7개 언어(`staffText.ts`). 식사 후기 시트(`reviews/MealReviewSheet`)도 새 컴포넌트로. 토스트는 body 포털(앱 틀이 `isolation: isolate`라 시트 위에 보이게). 옛 `OwnerCommunicationSheet` · `ProfileCommunicationSheet` · `SaveScanSheet` · `results/AnalysisInsights` · `CommunicationActions`는 이제 쓰지 않음(마지막 정리 단계에서 삭제). `ResultEvidence`는 저장한 메뉴 화면이 바뀔 때까지 남김.
- 2026-11-24 2단계: 공통 컴포넌트(`src/app/components/hs/`)와 개발 전용 확인 화면 `/dev/hs-gallery`.
- 2026-11-24 1단계: 새 테마 토큰(`--hs-*`), 기존 의미 변수 값 교체, `hs-` 클래스, 다크 테마 제거, 새 심볼 파비콘 · 앱 아이콘, `.eyebrow` 11 · 900.
