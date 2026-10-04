import { DurableObject } from 'cloudflare:workers';
import { createCloudBackend, response } from './cloud-core.mjs';
export class GwangjuBackend extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.handle = createCloudBackend(ctx.storage, env);
  }
  fetch(request) { return this.handle(request); }
}
export default {
  async fetch(request, env) {
    try {
      const id = env.GWANGJU_BACKEND.idFromName('gwangju-v1');
      return await env.GWANGJU_BACKEND.get(id).fetch(request);
    } catch { return response({ error: 'backend-unavailable' }, 503); }
  },
};
