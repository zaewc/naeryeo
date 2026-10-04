import { loadEnvFile } from 'node:process';
import { spawn } from 'node:child_process';
loadEnvFile('.env');
const key = process.env.GWANGJU_BUS_SERVICE_KEY;
if (!key) { console.error('GWANGJU_BUS_SERVICE_KEY is missing in .env'); process.exit(1); }
const child = spawn('npx', ['wrangler@4.147.0', 'secret', 'put', 'GWANGJU_BUS_SERVICE_KEY', '--config', 'server/wrangler.jsonc'], { stdio: ['pipe', 'inherit', 'inherit'] });
child.stdin.end(`${key}\n`);
child.on('error', () => { console.error('Could not launch Wrangler'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
