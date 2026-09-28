import { cpSync, mkdirSync, rmSync } from 'node:fs';

rmSync('public', { recursive: true, force: true });
mkdirSync('public/assets', { recursive: true });
for (const file of ['index.html', 'manifest.webmanifest', 'sw.js', 'icon-192.png', 'icon-512.png']) {
  cpSync(file, `public/${file}`);
}
cpSync('assets/life-data.js', 'public/assets/life-data.js');
cpSync('assets/muscle-reference.jpeg', 'public/assets/muscle-reference.jpeg');
