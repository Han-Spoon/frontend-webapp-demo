import assert from 'node:assert/strict';
import { createServer } from 'vite';

// Frontend-only contract tests. Every HTTP request is intercepted; no production data is touched.
const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom' });
const originals = { fetch: globalThis.fetch, storage: globalThis.localStorage, error: console.error };
const storage = new Map();
const pending = [];
let assertions = 0;
const fixtureToken = 'contract-test-access-token';
const response = (body, status = 200) => status === 204 ? new Response(null, { status }) : Response.json(body, { status });
function expectRequest(path, method, body, reply, status = 200, check) {
  pending.push({ path, method, body, reply, status, check });
}
const restoreFetch = () => {
  globalThis.fetch = async (path, init = {}) => {
    const expected = pending.shift();
    assert.ok(expected, `Unexpected request: ${path}`);
    assert.equal(String(path), expected.path);
    assert.equal(init.method ?? 'GET', expected.method);
    assert.deepEqual(init.body === undefined ? undefined : JSON.parse(init.body), expected.body);
    if (path !== '/api/v1/consents/documents' && path !== '/api/v1/auth/google') {
      assert.equal(new Headers(init.headers).get('Authorization'), `Bearer ${storage.get('accessToken')}`);
      assert.equal(init.credentials, 'include');
    }
    expected.check?.(init);
    assertions++;
    return response(expected.reply, expected.status);
  };
};
try {
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  console.error = () => {}; // Expected error cases contain fixture data only.
  const api = {};
  for (const name of ['auth', 'authFetch', 'user', 'consent', 'upload', 'scan', 'staff', 'card', 'savedMenus', 'reviews', 'store', 'exchangeRates']) api[name] = await server.ssrLoadModule(`/src/api/${name}.ts`);
  storage.set('accessToken', fixtureToken);
  restoreFetch();

  // No 1 / 8 / 9 / 10 / 11 / 12 / 13: authentication and user/profile wire format.
  const me = { id: 'fixture-user', nickname: 'Contract test', languageCode: 'ko', hasProfile: true };
  expectRequest('/api/v1/auth/google', 'POST', { idToken: 'fixture-google-token' }, { accessToken: fixtureToken, refreshToken: 'fixture-refresh', user: me }, 201);
  await api.auth.googleLogin('fixture-google-token');
  expectRequest('/api/v1/users/me', 'GET', undefined, { data: me });
  assert.deepEqual(await api.user.getMe(), me);
  for (const languageCode of ['ko', 'en', 'ar', 'zh-CN', 'ja', 'zh-TW', 'es']) {
    expectRequest('/api/v1/users/me', 'PATCH', { languageCode }, { ...me, languageCode });
    assert.equal((await api.user.updateMe({ languageCode })).languageCode, languageCode);
  }
  expectRequest('/api/v1/users/me', 'PATCH', { nickname: 'Changed' }, { ...me, nickname: 'Changed' });
  assert.equal((await api.user.updateMe({ nickname: 'Changed' })).nickname, 'Changed');
  const profile = { nationality: 'KR', languageCode: 'ko', isFirstTime: false, isVegan: false, veganType: null, hasReligion: false, religionType: null, hasAllergies: false, allergies: [], noSpicy: false, noAlcohol: false };
  expectRequest('/api/v1/users/me/profile', 'POST', profile, profile, 201);
  assert.deepEqual(await api.user.createProfile(profile), profile);
  expectRequest('/api/v1/users/me/profile', 'GET', undefined, profile);
  assert.deepEqual(await api.user.getProfile(), profile);
  expectRequest('/api/v1/users/me/profile', 'PATCH', { nationality: 'US' }, { ...profile, nationality: 'US' });
  assert.equal((await api.user.updateProfile({ nationality: 'US' })).nationality, 'US');
  expectRequest('/api/v1/users/me', 'DELETE', undefined, null, 204);
  await api.user.deleteMe();
  for (const status of [403, 409]) {
    expectRequest('/api/v1/users/me/profile', 'POST', profile, { code: 'FIXTURE_ERROR' }, status);
    await assert.rejects(api.user.createProfile(profile), e => e.status === status);
  }

  // No 4 / 6 / 7: four explicit decisions; preserve rejected consent responses.
  const decisions = { service: true, privacy: true, sensitive: true, marketing: false };
  const consent = { version: 'fixture-v1', decisions, hasRequiredConsents: true };
  const documents = { version: consent.version, effectiveDate: '2026-11-14', documents: Object.keys(decisions).map(id => ({ id, title: id, required: id !== 'marketing', sections: [] })) };
  expectRequest('/api/v1/consents/documents', 'GET', undefined, documents);
  assert.equal((await api.consent.getLegalDocuments()).documents.length, 4);
  expectRequest('/api/v1/consents/me', 'POST', { version: consent.version, decisions }, consent);
  assert.deepEqual(await api.consent.saveConsent(consent.version, decisions), consent);
  expectRequest('/api/v1/consents/me', 'GET', undefined, { data: consent });
  assert.deepEqual(await api.consent.getConsentStatus(), consent);

  // No 14: presigned upload uses the ticket headers, never application credentials.
  const file = new File(['fixture-image'], 'contract.webp', { type: 'image/webp' });
  const uploadHeaders = { 'Content-Type': file.type, 'If-None-Match': '*', 'x-amz-meta-fixture': 'true' };
  let uploadCalls = 0;
  globalThis.fetch = async (path, init) => {
    uploadCalls++;
    if (uploadCalls === 1) {
      assert.equal(path, '/api/v1/uploads'); assert.equal(init.method, 'POST');
      assert.deepEqual(JSON.parse(init.body), { contentType: file.type });
      return response({ storageKey: 'fixture/key', uploadUrl: 'https://upload.invalid/fixture', expiresAt: '2026-11-23T00:10:00Z', uploadHeaders });
    }
    assert.equal(path, 'https://upload.invalid/fixture'); assert.equal(init.method, 'PUT');
    assert.equal(init.body, file); assert.deepEqual(init.headers, uploadHeaders);
    assert.equal(init.credentials, undefined); assert.equal(new Headers(init.headers).has('Authorization'), false);
    return response(null, 204);
  };
  assert.deepEqual(await api.upload.uploadImage(file), { key: 'fixture/key' });
  assert.equal(uploadCalls, 2); restoreFetch();

  // No 15–21: optional restaurant, pagination, title limits, image expiration, record unlink.
  expectRequest('/api/v1/scans', 'POST', { storageKey: 'fixture/key', source: 'upload' }, { scanId: 'fixture-scan' }, 202);
  await api.scan.startScan({ storageKey: 'fixture/key', source: 'upload' });
  const linked = { storageKey: 'fixture/key-2', source: 'camera', storeId: 123, storeMatchMethod: 'store_detail' };
  expectRequest('/api/v1/scans', 'POST', linked, { scanId: 'fixture-scan-2' }, 202);
  await api.scan.startScan(linked);
  for (const status of ['processing', 'completed', 'failed', 'needs_retake']) {
    expectRequest('/api/v1/scans/fixture-scan', 'GET', undefined, { scanId: 'fixture-scan', status, menus: [], retakeReasons: ['fixture reason'] });
    assert.equal((await api.scan.getScanResult('fixture-scan')).status, status);
  }
  expectRequest('/api/v1/scans?page=1&size=20', 'GET', undefined, { items: [], totalPages: 2, totalElements: 21 });
  assert.equal((await api.scan.getScanHistoryPage(1)).totalPages, 2);
  expectRequest('/api/v1/scans/fixture-scan', 'PATCH', { title: 'Changed' }, { scanId: 'fixture-scan', title: 'Changed' });
  await api.scan.updateScanTitle('fixture-scan', '  Changed  ');
  await assert.rejects(api.scan.updateScanTitle('fixture-scan', ' '));
  await assert.rejects(api.scan.updateScanTitle('fixture-scan', 'a'.repeat(31)));
  expectRequest('/api/v1/scans/fixture-scan', 'DELETE', undefined, null, 204); await api.scan.deleteScan('fixture-scan');
  expectRequest('/api/v1/scans/fixture-scan/image', 'GET', undefined, { imageUrl: 'https://image.invalid/fixture', contentType: 'image/webp' });
  assert.equal((await api.scan.getScanImage('fixture-scan')).contentType, 'image/webp');
  expectRequest('/api/v1/scans/fixture-scan/image', 'GET', undefined, { code: 'SCAN_IMAGE_EXPIRED' }, 410);
  await assert.rejects(api.scan.getScanImage('fixture-scan'), e => e.status === 410);
  for (const payload of [{ storeId: 123, storeMatchMethod: 'name_search' }, {}]) {
    expectRequest('/api/v1/scans/fixture-scan/record', 'PUT', payload, { scanId: 'fixture-scan', store: payload.storeId ? { storeId: 123, name: 'Fixture' } : null });
    await api.scan.saveScanRecord('fixture-scan', payload);
  }

  // No 23–26: answer semantics, card text for all seven languages, 204 deletes.
  for (const answer of ['present', 'absent', 'unknown']) {
    expectRequest('/api/v1/scans/fixture-scan/staff-questions/fixture-question/answer', 'PUT', { answer }, { question: { questionId: 'fixture-question', answer }, menu: { riskLevel: 'danger' }, counts: { dangerCount: 1 } });
    assert.equal((await api.staff.saveStaffAnswer('fixture-scan', 'fixture-question', answer)).question.answer, answer);
  }
  const text = Object.fromEntries(['ko', 'en', 'ar', 'zh-CN', 'ja', 'zh-TW', 'es'].map(language => [language, `fixture-${language}`]));
  const card = { cardId: 'fixture-card', type: 'less_spicy', menuNameKo: '테스트', text, createdAt: '2026-11-23T00:00:00Z' };
  expectRequest('/api/v1/cards/saved', 'POST', { type: card.type, menuNameKo: card.menuNameKo, text }, card, 201);
  await api.card.saveCard({ type: card.type, menuNameKo: card.menuNameKo, text });
  expectRequest('/api/v1/cards/saved', 'GET', undefined, { items: [card] });
  assert.deepEqual(await api.card.getSavedCards(), [card]);
  expectRequest('/api/v1/cards/saved/fixture-card', 'DELETE', undefined, null, 204); await api.card.deleteCard('fixture-card');

  // No 26.1–26.3: exact scanMenuId key and invalid bodies must not become empty lists.
  const saved = { scanMenuId: 'fixture-menu', scanId: 'fixture-scan', displayName: '테스트', riskLevel: 'caution', store: null, savedAt: '2026-11-23T00:00:00Z' };
  expectRequest('/api/v1/saved-menus', 'POST', { scanMenuId: saved.scanMenuId }, saved);
  assert.equal((await api.savedMenus.saveMenu(saved.scanMenuId)).id, saved.scanMenuId);
  for (const body of [[saved], { data: [saved] }, []]) {
    expectRequest('/api/v1/saved-menus', 'GET', undefined, body);
    const result = await api.savedMenus.getSavedMenus(); assert.equal(result.length, Array.isArray(body) ? body.length : 1);
  }
  for (const body of [null, {}, { items: [] }, [null], [{ id: 'legacy' }]]) {
    expectRequest('/api/v1/saved-menus', 'GET', undefined, body);
    await assert.rejects(api.savedMenus.getSavedMenus(), /Invalid saved-menu/);
  }
  expectRequest('/api/v1/saved-menus/fixture-menu', 'DELETE', undefined, null, 204); await api.savedMenus.deleteSavedMenu('fixture-menu');

  // No 21.1–21.3 / 31 / 33.1–33.2: V2 names, answer mapping, hidden reviews, report reasons.
  const menus = [{ name: '테스트', scanMenuId: 'fixture-menu', answers: { 'allergy:shrimp': 'yes', 'preference:no-alcohol': 'no', 'vegan:vegan': 'unknown' }, note: '  ' }];
  const wireMenus = [{ name: '테스트', scanMenuId: 'fixture-menu', answers: { 'allergy:shrimp': 'present', 'preference:no-alcohol': 'absent', 'vegan:vegan': 'unknown' }, comment: null }];
  const review = { reviewId: 'fixture-review', storeId: 123, storeName: 'Fixture', scanId: 'fixture-scan', menus: wireMenus, mine: true, hidden: true, createdAt: '2026-11-23T00:00:00Z', updatedAt: '2026-11-23T00:00:00Z' };
  expectRequest('/api/v1/stores/123/reviews', 'POST', { scanId: 'fixture-scan', menus: wireMenus }, review, 201);
  const created = await api.reviews.createReview(123, menus, 'fixture-scan');
  assert.equal(created.id, review.reviewId); assert.equal(created.hidden, true); assert.deepEqual(created.menus[0].answers, menus[0].answers);
  expectRequest('/api/v1/reviews/fixture-review', 'PATCH', { menus: wireMenus }, review); await api.reviews.updateReview('fixture-review', menus);
  for (const [path, call] of [['/api/v1/stores/123/reviews', () => api.reviews.getStoreReviews(123)], ['/api/v1/reviews/me', () => api.reviews.getMyReviews()]]) {
    expectRequest(path, 'GET', undefined, [review]); assert.equal((await call())[0].hidden, true);
    expectRequest(path, 'GET', undefined, []); assert.deepEqual(await call(), []);
    for (const body of [null, {}, { items: [] }, [null]]) { expectRequest(path, 'GET', undefined, body); await assert.rejects(call(), /Invalid review/); }
  }
  for (const [reason, wireReason] of Object.entries({ INAPPROPRIATE: 'inappropriate', FALSE_INFORMATION: 'false_info', AD_SPAM: 'spam', OTHER: 'other' })) {
    expectRequest('/api/v1/reviews/fixture-review/reports', 'POST', { reason: wireReason, detail: null }, null, 204);
    await api.reviews.reportReview('fixture-review', reason);
  }
  for (const [status, code] of [[400, 'CANNOT_REPORT_OWN_REVIEW'], [409, 'REVIEW_ALREADY_REPORTED']]) {
    expectRequest('/api/v1/reviews/fixture-review/reports', 'POST', { reason: 'other', detail: null }, { code }, status);
    await assert.rejects(api.reviews.reportReview('fixture-review', 'OTHER'), e => e.status === status && JSON.parse(e.body).code === code);
  }
  for (const [status, code] of [[409, 'REVIEW_ALREADY_EXISTS'], [409, 'REVIEW_STORE_MISMATCH'], [422, 'REVIEW_SCAN_STORE_REQUIRED']]) {
    expectRequest('/api/v1/stores/123/reviews', 'POST', { scanId: 'fixture-scan', menus: wireMenus }, { code }, status);
    await assert.rejects(api.reviews.createReview(123, menus, 'fixture-scan'), e => e.status === status);
  }
  expectRequest('/api/v1/reviews/fixture-review', 'DELETE', undefined, null, 204); await api.reviews.deleteReview('fixture-review');

  // No 27: name-only search leaves coordinates absent, preserves nullable distance.
  for (const payload of [{ query: '테스트', limit: 6 }, { latitude: 37.5, longitude: 127, radiusMeters: 1000 }]) {
    expectRequest('/api/v1/stores/candidates', 'POST', payload, { items: [{ storeId: 123, name: 'Fixture', distanceMeters: null, reviewCount: 2 }] });
    assert.equal((await api.store.findStoreCandidates(payload))[0].distanceMeters, null);
  }

  // No 41: KRW per foreign currency, six distinct quotes, explicit timestamp and timezone.
  const fx = { base: 'KRW', asOf: '2026-11-23T00:00:00Z', timezone: 'Asia/Seoul', rates: ['USD', 'SAR', 'CNY', 'JPY', 'TWD', 'EUR'].map(quote => ({ quote, rate: 1000 })) };
  expectRequest('/api/v1/exchange-rates?base=KRW', 'GET', undefined, fx); assert.deepEqual(await api.exchangeRates.getExchangeRates(), fx);
  for (const body of [null, {}, { ...fx, asOf: 'bad' }, { ...fx, timezone: 'UTC' }, { ...fx, rates: [...fx.rates, fx.rates[0]] }, { ...fx, rates: fx.rates.map(item => ({ ...item, rate: 0 })) }, { ...fx, rates: fx.rates.map(item => ({ ...item, rate: '1000' })) }]) {
    expectRequest('/api/v1/exchange-rates?base=KRW', 'GET', undefined, body);
    await assert.rejects(api.exchangeRates.getExchangeRates(), /Invalid exchange-rate/);
  }
  const missing = { status: 404, code: 'HTTP_404', detail: 'No static resource api/v1/saved-menus' };
  for (const [path, call] of [['/api/v1/saved-menus', api.savedMenus.getSavedMenus], ['/api/v1/reviews/me', api.reviews.getMyReviews], ['/api/v1/exchange-rates?base=KRW', api.exchangeRates.getExchangeRates]]) {
    expectRequest(path, 'GET', undefined, missing, 404);
    await assert.rejects(call(), e => api.user.isEndpointUnavailable(e));
  }
  assert.equal(api.user.isEndpointUnavailable(new api.user.ApiError(404, JSON.stringify({ code: 'SCAN_NOT_FOUND' }))), false);
  assert.equal(pending.length, 0);

  // No 2: concurrent 401s share a rotating refresh token; retry once with new token.
  storage.set('accessToken', 'expired-fixture'); storage.set('refreshToken', 'refresh-fixture');
  let refreshCalls = 0; let requests = 0;
  globalThis.fetch = async (path, init = {}) => {
    if (path === '/api/v1/auth/refresh') {
      refreshCalls++; assert.deepEqual(JSON.parse(init.body), { refreshToken: 'refresh-fixture' });
      await new Promise(resolve => setTimeout(resolve, 10));
      return response({ accessToken: 'renewed-fixture', refreshToken: 'rotated-fixture' });
    }
    requests++;
    return new Headers(init.headers).get('Authorization') === 'Bearer renewed-fixture' ? response({ ok: true }) : response({ code: 'TOKEN_EXPIRED' }, 401);
  };
  const responses = await Promise.all([api.authFetch.authFetch('/fixture/a'), api.authFetch.authFetch('/fixture/b')]);
  assert.ok(responses.every(item => item.ok)); assert.equal(refreshCalls, 1); assert.equal(requests, 4); assert.equal(storage.get('refreshToken'), 'rotated-fixture');
  globalThis.fetch = async () => response({ code: 'TEMPORARY' }, 503);
  await assert.rejects(api.auth.refreshAccessToken(), e => e.status === 503); assert.equal(storage.get('accessToken'), 'renewed-fixture');
  globalThis.fetch = async () => response({ code: 'INVALID_REFRESH' }, 401);
  await assert.rejects(api.auth.refreshAccessToken(), e => e.sessionExpired); assert.equal(storage.has('accessToken'), false);
  storage.set('accessToken', fixtureToken); restoreFetch();
  expectRequest('/api/v1/auth/logout', 'POST', undefined, null, 204);
  await api.auth.logout(); assert.equal(storage.has('accessToken'), false);
  assert.equal(pending.length, 0);
  console.log(`PASS: ${assertions} fixture HTTP contracts + isolated upload + rotating-token concurrency; no live API mutations`);
} finally {
  globalThis.fetch = originals.fetch; globalThis.localStorage = originals.storage; console.error = originals.error;
  await server.close();
}
