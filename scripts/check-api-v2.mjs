import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom' });
const originalFetch = globalThis.fetch;
const originalStorage = globalThis.localStorage;
try {
  globalThis.localStorage = { getItem: () => null };
  const { mapMenuResult, getScanHistoryPage } = await server.ssrLoadModule('/src/api/scan.ts');
  const { getCautionProbabilities } = await server.ssrLoadModule('/src/app/results/resultViewModel.ts');
  const base = { nationality: 'KR', languageCode: 'ko', isFirstTime: false, isVegan: false, hasReligion: false, hasAllergies: false, allergies: [], noSpicy: false, noAlcohol: false };
  const make = (tag, probability = 0.4, level = 'caution') => ({ displayName: 'test', riskLevel: level, matchedTags: [tag], riskIngredients: [{ name: {ko: 'test'}, status: 'unknown', posteriorMean: probability, matchedTags: [tag], confidence: 0.6, priorSource: 'store' }], evidenceBasis: 'estimated', informationStatus: 'partial', message: { verdict: 'verdict', reason: 'reason', notes: [{code: 'hard_to_remove', text: 'note'}] }, priceOptions: [{label:'2인', priceText:'18000', inferred:true}] });
  for (const [profile, tag, expected] of [
    [{hasAllergies:true, allergies:['shrimp']},'is_shrimp',true],
    [{hasAllergies:true, allergies:['milk']},'is_shrimp',false],
    [{noSpicy:true},'is_spicy',true], [{noAlcohol:true},'is_alcohol',true],
    [{isVegan:true,veganType:'vegan'},'is_egg',true],
    [{isVegan:true,veganType:'lacto'},'is_milk',false],
    [{isVegan:true,veganType:'ovo'},'is_egg',false],
    [{isVegan:true,veganType:'pesco'},'is_shrimp',false],
    [{isVegan:true,veganType:'pesco'},'is_beef',true],
    [{hasReligion:true,religionType:'halal'},'is_pork',true],
    [{hasReligion:true,religionType:'kosher'},'is_shrimp',true],
    [{hasReligion:true,religionType:'hindu'},'is_beef',true],
  ]) {
    const p = {...base,...profile};
    assert.equal(getCautionProbabilities(mapMenuResult(make(tag),0,'ko',p),p).length, expected ? 1 : 0);
    for (const invalid of [null, NaN, Infinity, -1, 1.01]) assert.equal(getCautionProbabilities(mapMenuResult(make(tag,invalid),0,'ko',p),p).length,0);
    for (const level of ['safe','danger']) assert.equal(getCautionProbabilities(mapMenuResult(make(tag,0.4,level),0,'ko',p),p).length,0);
  }
  const mapped = mapMenuResult(make('is_shrimp'),0,'ko',base);
  assert.equal(mapped.evidenceBasis,'estimated');
  assert.equal(mapped.informationStatus,'partial');
  assert.equal(mapped.notes[0].text,'note');
  assert.equal(mapped.explainability.ingredients[0].priorSource,'store');
  assert.equal(mapped.priceOptions[0].inferred,true);
  globalThis.fetch = async url => { assert.match(url,/page=2&size=20/); return Response.json({items:[],totalPages:3}); };
  assert.equal((await getScanHistoryPage(2)).totalPages,3);
  const { getExchangeRates } = await server.ssrLoadModule('/src/api/exchangeRates.ts');
  const rates = {base:'KRW', asOf:'2026-11-23T00:00:00Z',timezone:'Asia/Seoul',rates:['USD','SAR','CNY','JPY','TWD','EUR'].map(quote=>({quote,rate:1000}))};
  globalThis.fetch = async () => Response.json(rates);
  assert.equal((await getExchangeRates()).rates.length,6);
  globalThis.fetch = async () => Response.json({...rates,rates:[{quote:'USD',rate:0}]});
  await assert.rejects(getExchangeRates,/Invalid/);
  const { menuPrice } = await server.ssrLoadModule('/src/app/demo/currency.ts');
  assert.equal(menuPrice('10000','en',rates.rates).converted,'$10.00');
  assert.equal(menuPrice('13800','en',[{quote:'USD',rate:0}]).converted,'$10.00');
  console.log('PASS: V2 profile matching, probability gates, evidence/price preservation, pagination, exchange-rate validation and fallback');
} finally {
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalStorage;
  await server.close();
}
