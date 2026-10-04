import { createServer } from 'node:http';
import { createGwangjuProvider, TransitProviderError } from './gwangju.mjs';
const provider = createGwangjuProvider({ key: process.env.GWANGJU_BUS_SERVICE_KEY, base: process.env.GWANGJU_BUS_SERVICE_URL });
const server = createServer(async (request, response) => {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') { response.writeHead(405); response.end(JSON.stringify({ error: 'method-not-allowed' })); return; }
  const url = new URL(request.url ?? '/', 'http://localhost');
  const routeMatch = /^\/routes\/(\d+)(\/vehicles)?$/.exec(url.pathname);
  try {
    let data;
    if (url.pathname === '/routes') data = await provider.lines();
    else if (routeMatch) data = routeMatch[2] ? await provider.vehicles(routeMatch[1]) : await provider.route(routeMatch[1]);
    else { response.writeHead(404); response.end(JSON.stringify({ error: 'not-found' })); return; }
    response.writeHead(200); response.end(JSON.stringify(data));
  } catch (error) {
    const code = error instanceof TransitProviderError ? error.code : 'internal-error';
    response.writeHead(code === 'route-not-found' ? 404 : 502);
    response.end(JSON.stringify({ error: code }));
  }
});
server.listen(Number(process.env.TRANSIT_PORT ?? 8084), '127.0.0.1', () => console.log('Transit development server listening on port', server.address().port));
