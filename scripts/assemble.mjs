import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * يجمع مخرجات المنصات الأربع في مجلد نشر واحد.
 * نشرة Vercel واحدة تخدم:
 *   /            → صفحة اختيار المنصة
 *   /dashboard/  → مركز القيادة
 *   /ops/        → التشغيل الأمني
 *   /portal/     → بوابة المقيم
 */

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(ROOT, 'dist');

const MAP = [
  { app: 'landing', to: '.' },
  { app: 'admin', to: 'dashboard' },
  { app: 'security', to: 'ops' },
  { app: 'resident', to: 'portal' },
];

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

for (const { app, to } of MAP) {
  const from = path.join(ROOT, 'apps', app, 'dist');
  if (!fs.existsSync(from)) {
    console.error(`✗ ${app}: لا يوجد مخرج بناء — شغّل build أولًا`);
    process.exit(1);
  }
  const target = to === '.' ? DIST : path.join(DIST, to);
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(from, target, { recursive: true });
  console.log(`✓ ${app.padEnd(9)} → /${to === '.' ? '' : to + '/'}`);
}

const size = (dir) => {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    n += e.isDirectory() ? size(p) : fs.statSync(p).size;
  }
  return n;
};
console.log(`\nحجم النشر: ${(size(DIST) / 1024 / 1024).toFixed(1)} MB`);
