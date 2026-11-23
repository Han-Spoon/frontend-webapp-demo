import { authFetch } from './authFetch';
import { ApiError } from './user';

const QUOTES = ['USD', 'SAR', 'CNY', 'JPY', 'TWD', 'EUR'] as const;
export interface ExchangeRates { base: 'KRW'; asOf: string; timezone: string; rates: Array<{ quote: string; rate: number }> }

export async function getExchangeRates(): Promise<ExchangeRates> {
  const response = await authFetch('/api/v1/exchange-rates?base=KRW');
  if (!response.ok) throw new ApiError(response.status, await response.text());
  const json = await response.json();
  const data = json?.data ?? json;
  if (!data || data.base !== 'KRW' || typeof data.asOf !== 'string' || !Number.isFinite(Date.parse(data.asOf)) ||
      data.timezone !== 'Asia/Seoul' || !Array.isArray(data.rates) || data.rates.length !== QUOTES.length ||
      !QUOTES.every(code => data.rates.filter((item: unknown) => {
        if (!item || typeof item !== 'object') return false;
        const rate = item as { quote?: unknown; rate?: unknown };
        return rate.quote === code && typeof rate.rate === 'number' && Number.isFinite(rate.rate) && rate.rate > 0;
      }).length === 1)) {
    throw new Error('Invalid exchange-rate response');
  }
  return data;
}
