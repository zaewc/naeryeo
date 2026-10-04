const DEFAULT_BASE = 'https://apis.data.go.kr/6290000/gj_bis';
export class TransitProviderError extends Error {
  constructor(code) { super(code); this.name = 'TransitProviderError'; this.code = code; }
}
function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TransitProviderError('invalid-response');
  return value;
}
function id(value) {
  if ((typeof value !== 'string' && typeof value !== 'number') || !String(value).trim()) throw new TransitProviderError('invalid-response');
  return String(value);
}
function name(value) {
  if (typeof value !== 'string' || !value.trim()) throw new TransitProviderError('invalid-response');
  return value;
}
function integer(value) {
  if (!Number.isInteger(value) || value < 0) throw new TransitProviderError('invalid-response');
  return value;
}
export function parseItems(payload, list) {
  const response = object(object(payload).RESPONSE);
  if (object(response.RESULT).RESULT_CODE !== 'SUCCESS') throw new TransitProviderError('provider-rejected');
  const items = object(response[list]).ITEM;
  if (items === null && response.ROW_COUNT === 0) return [];
  if (!Array.isArray(items)) throw new TransitProviderError('invalid-response');
  return items.map(object);
}
export function mapLines(payload) {
  return parseItems(payload, 'LINE_LIST').map(item => ({ id: id(item.LINE_ID), name: name(item.LINE_NAME),
    direction: `${name(item.DIR_UP_NAME)} → ${name(item.DIR_DOWN_NAME)}` }));
}
export function mapRoute(payload, routeId, line) {
  const stops = parseItems(payload, 'BUSSTOP_LIST').map(item => {
    if (id(item.LINE_ID) !== routeId) throw new TransitProviderError('invalid-response');
    return { id: id(item.BUSSTOP_ID), name: name(item.BUSSTOP_NAME), sequence: integer(item.SEQ) };
  }).sort((a,b) => a.sequence - b.sequence);
  if (stops.some((stop,i) => i > 0 && stop.sequence === stops[i-1].sequence)) throw new TransitProviderError('invalid-response');
  return { ...line, stops };
}
export function mapVehicles(payload, routeId, observedAt) {
  return parseItems(payload, 'BUSLOCATION_LIST').map(item => {
    if (id(item.LINE_ID) !== routeId) throw new TransitProviderError('invalid-response');
    return { vehicleId: id(item.BUS_ID), routeId, reachedSequence: integer(item.SEQ), observedAt,
      registration: name(item.CARNO), currentStopId: id(item.CURR_STOP_ID) };
  });
}
export function createGwangjuProvider({ key, base = DEFAULT_BASE, fetcher = fetch, now = Date.now, cacheStore }) {
  if (!key) throw new TransitProviderError('missing-key');
  const baseUrl = new URL(base.endsWith('/') ? base : `${base}/`);
  if (baseUrl.protocol !== 'https:' || baseUrl.hostname !== 'apis.data.go.kr' || baseUrl.search || baseUrl.username || baseUrl.password) throw new TransitProviderError('invalid-base');
  const cache = new Map();
  const pending = new Map();
  async function request(operation, params, ttl) {
    const cacheKey = `${operation}:${JSON.stringify(params)}`;
    const cached = cache.get(cacheKey);
    if (cached && now() - cached.at < ttl) return cached;
    if (pending.has(cacheKey)) return pending.get(cacheKey);
    const work = (async () => {
      const persisted = await cacheStore?.get(`cache:${cacheKey}`);
      if (persisted && Number.isFinite(persisted.at) && now() >= persisted.at && now() - persisted.at < ttl) {
        cache.set(cacheKey, persisted);
        return persisted;
      }
      const url = new URL(operation, baseUrl);
      url.search = new URLSearchParams({ serviceKey: decodeURIComponent(key), resultType: 'json', ...params }).toString();
      let response;
      try { response = await fetcher(url, { signal: AbortSignal.timeout(10000) }); }
      catch (error) {
        if (error instanceof TransitProviderError && error.code === 'request-budget-exhausted') throw error;
        throw new TransitProviderError('upstream-unavailable');
      }
      if (!response.ok) throw new TransitProviderError('upstream-unavailable');
      let data;
      try { data = await response.json(); } catch { throw new TransitProviderError('invalid-response'); }
      const result = { data, at: now() };
      // Rejected responses are never retained as successful cache entries.
      if (object(object(data).RESPONSE).RESULT?.RESULT_CODE !== 'SUCCESS') throw new TransitProviderError('provider-rejected');
      cache.set(cacheKey, result);
      await cacheStore?.put(`cache:${cacheKey}`, result);
      if (cache.size > 1000) cache.delete(cache.keys().next().value);
      return result;
    })();
    pending.set(cacheKey, work);
    try { return await work; } finally { pending.delete(cacheKey); }
  }
  async function lines() { return mapLines((await request('lineInfo', {}, 3600000)).data); }
  async function route(routeId) {
    const line = (await lines()).find(line => line.id === routeId);
    if (!line) throw new TransitProviderError('route-not-found');
    return mapRoute((await request('lineStationInfo', { LINE_ID: routeId }, 3600000)).data, routeId, line);
  }
  async function vehicles(routeId) {
    if (!(await lines()).some(line => line.id === routeId)) throw new TransitProviderError('route-not-found');
    const result = await request('busLocationInfo', { LINE_ID: routeId }, 15000);
    return mapVehicles(result.data, routeId, result.at);
  }
  return { lines, route, vehicles };
}
