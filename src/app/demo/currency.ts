import { LANGUAGE_LOCALES, type Language } from '../locales';

// 시연용 고정 환율(1단위당 원). 실시간 환율 서비스 없음.
export const DEMO_CURRENCIES: Record<
  Language,
  { code: string; krwPerUnit: number }
> = {
  ko: { code: 'KRW', krwPerUnit: 1 },
  en: { code: 'USD', krwPerUnit: 1380 },
  ar: { code: 'SAR', krwPerUnit: 368 },
  'zh-CN': { code: 'CNY', krwPerUnit: 190 },
  ja: { code: 'JPY', krwPerUnit: 9.2 },
  'zh-TW': { code: 'TWD', krwPerUnit: 43 },
  es: { code: 'EUR', krwPerUnit: 1500 },
};
export function parseKrw(price?: string): number | null {
  if (!price) return null;
  const cleaned = price
    .trim()
    .replace(/^(?:₩|KRW)\s*/i, '')
    .replace(/\s*원$/, '')
    .replaceAll(',', '');
  if (!/^\d+(?:\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value >= 0 ? value : null;
}
export function menuPrice(price: string | undefined, language: Language) {
  const amount = parseKrw(price);
  if (amount === null) return null;
  const { code, krwPerUnit } = DEMO_CURRENCIES[language];
  return {
    original: new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(amount),
    converted:
      code === 'KRW'
        ? null
        : new Intl.NumberFormat(LANGUAGE_LOCALES[language], {
            style: 'currency',
            currency: code,
            maximumFractionDigits: code === 'JPY' ? 0 : 2,
          }).format(amount / krwPerUnit),
    code,
  };
}
