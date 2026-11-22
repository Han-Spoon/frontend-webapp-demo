import { authFetch } from './authFetch';
import { ApiError } from './user';
export interface ExchangeRates { base: 'KRW'; asOf: string; timezone: string; rates: Array<{ quote: string; rate: number }> }
export async function getExchangeRates(): Promise<ExchangeRates> {
  const response = await authFetch('/api/v1/exchange-rates?base=KRW');
  if (!response.ok) throw new ApiError(response.status, await response.text());
  const json = await response.json();
  const data = json.data ?? json;
  if (data.base !== 'KRW' || !Number.isFinite(Date.parse(data.asOf)) || !Array.isArray(data.rates) || !['USD', 'SAR', 'CNY', 'JPY', 'TWD', 'EUR'].every(code => data.rates.some((item: { quote: string; rate: number }) => item.quote === code && typeof item.rate === 'number' && Number.isFinite(item.rate) && item.rate > 0))) throw new Error('Invalid exchange-rate response');
  return data;
}
