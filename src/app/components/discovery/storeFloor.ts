import { translateText, type Language } from '../../locales';

/**
 * 가게 후보 `floorInfo`(상가정보 층 원본 값) → 카드용 층 문구.
 * "1"·"2"… 지상 N층, "B1"… 지하 N층, "지" 지하, "반"·"반지층" 반지하.
 * 빈 값·없음(배포 전 서버)·"0"·그 밖의 값은 숨김(null).
 */
export function formatFloor(floorInfo: string | null | undefined, language: Language): string | null {
  const value = floorInfo?.trim() ?? '';
  if (/^[1-9]\d*$/.test(value)) {
    const n = value;
    return translateText(language, { ko: `${n}층`, en: `${n}F`, ar: `الطابق ${n}`, 'zh-CN': `${n}楼`, ja: `${n}階`, 'zh-TW': `${n}樓`, es: `Planta ${n}` });
  }
  const basement = value.match(/^B([1-9]\d*)$/);
  if (basement) {
    const n = basement[1];
    return translateText(language, { ko: `지하 ${n}층`, en: `B${n}`, ar: `الطابق السفلي ${n}`, 'zh-CN': `地下${n}楼`, ja: `地下${n}階`, 'zh-TW': `地下${n}樓`, es: `Sótano ${n}` });
  }
  if (value === '지') {
    return translateText(language, { ko: '지하', en: 'Basement', ar: 'الطابق السفلي', 'zh-CN': '地下', ja: '地下', 'zh-TW': '地下', es: 'Sótano' });
  }
  if (value === '반' || value === '반지층') {
    return translateText(language, { ko: '반지하', en: 'Semi-basement', ar: 'شبه سفلي', 'zh-CN': '半地下', ja: '半地下', 'zh-TW': '半地下', es: 'Semisótano' });
  }
  return null;
}
