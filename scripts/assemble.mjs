import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * يجمع مخرجات المنصات الثلاث في مجلد نشر واحد، ويولّد صفحة الاختيار.
 *
 * نشرة Vercel واحدة تخدم:
 *   /            → صفحة اختيار المنصة (HTML ساكن — لا تطبيق ولا بورت)
 *   /dashboard/  → مركز القيادة
 *   /ops/        → التشغيل الأمني
 *   /portal/     → بوابة المقيم
 */

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(ROOT, 'dist');

const APPS = [
  { app: 'admin', to: 'dashboard' },
  { app: 'security', to: 'ops' },
  { app: 'resident', to: 'portal' },
];

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

for (const { app, to } of APPS) {
  const from = path.join(ROOT, 'apps', app, 'dist');
  if (!fs.existsSync(from)) {
    console.error(`✗ ${app}: لا يوجد مخرج بناء — شغّل build أولًا`);
    process.exit(1);
  }
  fs.cpSync(from, path.join(DIST, to), { recursive: true });
  console.log(`✓ ${app.padEnd(9)} → /${to}/`);
}

/* ── الخطوط لصفحة الاختيار — محلية كبقية المنصات، صفر طلبات شبكة ── */
const FONTS = [
  ['@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', 'inter.woff2'],
  ['@fontsource/cairo/files/cairo-arabic-400-normal.woff2', 'cairo-400.woff2'],
  ['@fontsource/cairo/files/cairo-arabic-600-normal.woff2', 'cairo-600.woff2'],
  ['@fontsource/cairo/files/cairo-arabic-700-normal.woff2', 'cairo-700.woff2'],
];
const fontDir = path.join(DIST, 'fonts');
fs.mkdirSync(fontDir, { recursive: true });
for (const [src, name] of FONTS) {
  fs.copyFileSync(path.join(ROOT, 'node_modules', src), path.join(fontDir, name));
}
console.log(`✓ fonts     → /fonts/ (${FONTS.length} ملفات)`);

/* ── صفحة الاختيار ── */
const html = fs
  .readFileSync(path.join(ROOT, 'scripts', 'index-template.html'), 'utf8')
  .replace('__DASHBOARD__', '/dashboard/')
  .replace('__OPS__', '/ops/')
  .replace('__PORTAL__', '/portal/');
fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf8');
console.log('✓ index     → /');

const size = (dir) => {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    n += e.isDirectory() ? size(p) : fs.statSync(p).size;
  }
  return n;
};
console.log(`\nحجم النشر: ${(size(DIST) / 1024 / 1024).toFixed(1)} MB`);
