import { createGwangjuProvider, TransitProviderError } from './gwangju.mjs';
const DAY = 24 * 60 * 60 * 1000;
/** Serialized and persisted rolling budget; restarting an isolate does not reset it. */
export function createRequestBudget(storage, limit, now = Date.now) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000000) throw new Error('invalid-request-budget');
  let queue = Promise.resolve();
  return () => {
    const work = queue.then(async () => {
      const minute = Math.floor(now() / 60000);
      const cutoff = now() - DAY;
      const buckets = (await storage.get('request-budget') ?? []).filter(([at]) => (at + 1) * 60000 > cutoff);
      if (buckets.reduce((sum, [, count]) => sum + count, 0) >= limit) throw new TransitProviderError('request-budget-exhausted');
      const current = buckets.find(([at]) => at === minute);
      if (current) current[1]++; else buckets.push([minute, 1]);
      await storage.put('request-budget', buckets);
    });
    queue = work.catch(() => {});
    return work;
  };
}
export function createCloudBackend(storage, env, fetcher = fetch, now = Date.now) {
  const reserve = createRequestBudget(storage, Number(env.GWANGJU_BUS_DAILY_LIMIT ?? 100), now);
  const provider = createGwangjuProvider({ key: env.GWANGJU_BUS_SERVICE_KEY, base: env.GWANGJU_BUS_SERVICE_URL,
    cacheStore: storage, now, fetcher: async (url, options) => { await reserve(); return fetcher(url, options); } });
  // Shared object limits abusive request bursts before accessing provider data.
  let window = 0; let requests = 0;
  return async request => {
    const minute = Math.floor(now() / 60000);
    if (window !== minute) { window = minute; requests = 0; }
    if (++requests > 300) return response({ error: 'rate-limited' }, 429);
    const url = new URL(request.url);
    if (request.method !== 'GET') return response({ error: 'method-not-allowed' }, 405);
    if (url.search) return response({ error: 'invalid-request' }, 400);
    if (url.pathname === '/health') return response({ ready: true }, 200);
    const match = /^\/routes\/(\d+)(\/vehicles)?$/.exec(url.pathname);
    try {
      let data;
      if (url.pathname === '/routes') data = await provider.lines();
      else if (match) data = match[2] ? (await provider.vehicles(match[1])).map(vehicle => ({ ...vehicle, ageMs: Math.max(0, now() - vehicle.observedAt) })) : await provider.route(match[1]);
      else return response({ error: 'not-found' }, 404);
      return response(data, 200);
    } catch (error) {
      const code = error instanceof TransitProviderError ? error.code : 'internal-error';
      return response({ error: code }, code === 'route-not-found' ? 404 : code === 'request-budget-exhausted' ? 429 : 502);
    }
  };
}
export function response(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
