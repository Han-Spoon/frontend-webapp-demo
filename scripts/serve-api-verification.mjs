import { realpathSync } from 'node:fs';
import { createServer } from 'vite';
const server = await createServer({ server: { host: '127.0.0.1', port: 5182, fs: { allow: [process.cwd(), realpathSync('node_modules')] } } });
await server.listen();
console.log('Frontend fixtures: http://127.0.0.1:5182/scripts/fixtures/api-verification.html');
