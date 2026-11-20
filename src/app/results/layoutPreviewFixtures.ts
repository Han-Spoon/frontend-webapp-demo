import type { MenuAnalysis } from '../App';

/**
 * 개발 전용 결과 위계 비교(/dev/results-preview?layout=a|b)에서만 시연 메뉴 뒤에 붙인다.
 * 시연 fixture에 없는 '확인 필요' 카드를 보여 주기 위한 예시다. 판정 근거가 없으므로 원인 재료도 없다.
 */
export const LAYOUT_PREVIEW_EXTRA_MENUS: MenuAnalysis[] = [
  {
    id: 'layout-preview-unknown',
    menuName: '오늘의 국밥',
    menuNameEn: "Today's gukbap",
    menuNameLocalized: { ko: '오늘의 국밥', en: "Today's gukbap", ar: 'غوكباب اليوم' },
    description: '메뉴판에 재료 설명이 없어 판정하지 못한 메뉴예요.',
    descriptionEn: 'The menu gives no ingredient details, so this dish could not be judged.',
    price: '9000',
    riskLevel: 'unknown',
    riskReasons: [],
    isSpicy: false,
  },
];

/** 개발 전용 결과 위계 비교에서 '가게 선택 후 스캔'(?store=1)을 흉내 내는 서버 가게 요약. 가상 가게다. */
export const LAYOUT_PREVIEW_STORE = { storeId: 0, name: '한스푼 분식 연남점' };
