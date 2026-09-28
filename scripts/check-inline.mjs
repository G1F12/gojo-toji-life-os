import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const inline = html.match(/<script>([\s\S]*?)<\/script>/);
if (!inline) throw new Error('Application script is missing');
new Script(inline[1], { filename: 'index.html' });
