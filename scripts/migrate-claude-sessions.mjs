#!/usr/bin/env node
/**
 * ينقل سجلّ جلسات Claude Code من مسار مشروع قديم إلى جديد.
 *
 * Claude Code يخزّن كل جلسة تحت ~/.claude/projects/<مسار-المشروع-مُرمَّزًا>/
 * والترميز = استبدال كل محرف غير أبجدي-رقمي بشَرطة. فبمجرّد نقل المشروع أو
 * إعادة تسميته يصير المجلد القديم يتيمًا ولا تظهر أي جلسة في --resume.
 *
 *   node scripts/migrate-claude-sessions.mjs "<القديم>" "<الجديد>"          فحص فقط
 *   node scripts/migrate-claude-sessions.mjs "<القديم>" "<الجديد>" --apply  تنفيذ
 *
 * الافتراضي فحص جاف: لا يكتب شيئًا، يعرض ما سيحدث فقط.
 * لا يحذف المجلد القديم إطلاقًا — يُنسخ نسخًا، فالتراجع ممكن دائمًا.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const [, , OLD_RAW, NEW_RAW, ...flags] = process.argv;
const APPLY = flags.includes('--apply');
const REWRITE_CWD = !flags.includes('--no-rewrite-cwd');

if (!OLD_RAW || !NEW_RAW) {
  console.error('الاستعمال: node scripts/migrate-claude-sessions.mjs "<المسار القديم>" "<المسار الجديد>" [--apply]');
  process.exit(1);
}

const CLAUDE = path.join(os.homedir(), '.claude');
const PROJECTS = path.join(CLAUDE, 'projects');

/** نفس ترميز Claude Code: كل محرف غير [a-zA-Z0-9] يصير شَرطة. */
const encode = (p) => p.replace(/[^a-zA-Z0-9]/g, '-');

const oldPath = OLD_RAW.replace(/[\\/]+$/, '');
const newPath = NEW_RAW.replace(/[\\/]+$/, '');
const oldEnc = encode(oldPath);
const newEnc = encode(newPath);
const oldDir = path.join(PROJECTS, oldEnc);
const newDir = path.join(PROJECTS, newEnc);

console.log(`القديم : ${oldPath}\n         → ${oldEnc}`);
console.log(`الجديد : ${newPath}\n         → ${newEnc}\n`);

/* تحقّق ذاتي من قاعدة الترميز: إن لم يوجد المجلد المحسوب فالقاعدة أو المسار خطأ،
   فنبحث عن أقرب مجلد فعلي بدل أن ننشئ مجلدًا فارغًا في اسم مخترع. */
if (!fs.existsSync(oldDir)) {
  console.error(`✗ لا يوجد مجلد جلسات بهذا الاسم:\n  ${oldDir}\n`);
  const near = fs
    .readdirSync(PROJECTS)
    .filter((d) => d.toLowerCase() === oldEnc.toLowerCase() || d.toLowerCase().includes(encode(path.basename(oldPath)).toLowerCase()));
  if (near.length) console.error('  مرشّحون موجودون فعلًا:\n' + near.map((d) => '    ' + d).join('\n'));
  else console.error('  اسرد ~/.claude/projects/ يدويًا واختر الاسم الصحيح.');
  process.exit(1);
}
console.log(`✓ مجلد المصدر موجود — قاعدة الترميز صحيحة\n`);

/* حرف السواقة قد يُبلَّغ بحالة مختلفة (D:\ أو d:\) حسب المُشغِّل، وينتج عنه
   مجلدان مختلفان. فنكتب الحالتين ما لم تتطابقا. */
const variants = new Set([newEnc]);
if (/^[a-zA-Z]/.test(newEnc)) {
  variants.add(newEnc[0].toUpperCase() + newEnc.slice(1));
  variants.add(newEnc[0].toLowerCase() + newEnc.slice(1));
}

const entries = fs.readdirSync(oldDir, { withFileTypes: true });
const sessions = entries.filter((e) => e.isFile() && e.name.endsWith('.jsonl'));
console.log(`جلسات: ${sessions.length}`);
for (const s of sessions) {
  const kb = (fs.statSync(path.join(oldDir, s.name)).size / 1024).toFixed(0);
  console.log(`  · ${s.name}  (${kb} KB)`);
}
const hasMemory = entries.some((e) => e.isDirectory() && e.name === 'memory');
console.log(`ذاكرة المشروع: ${hasMemory ? 'موجودة — ستُنقل' : 'لا توجد'}`);
console.log(`أسماء الوجهة: ${[...variants].join('  |  ')}\n`);

/** يعيد كتابة المسار القديم داخل نصّ الجلسة بصيغه الثلاث. */
function rewrite(text) {
  const winOld = oldPath.replace(/\//g, '\\');
  const winNew = newPath.replace(/\//g, '\\');
  const nixOld = oldPath.replace(/\\/g, '/');
  const nixNew = newPath.replace(/\\/g, '/');
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text
    .replaceAll(winOld.replace(/\\/g, '\\\\'), winNew.replace(/\\/g, '\\\\')) // مهرَّب داخل JSON
    .replace(new RegExp(esc(winOld), 'gi'), winNew)
    .replace(new RegExp(esc(nixOld), 'gi'), nixNew);
}

if (!APPLY) {
  console.log('— فحص جاف. أضف --apply للتنفيذ. لن يُحذف المجلد القديم في الحالتين. —');
  process.exit(0);
}

for (const v of variants) {
  const dest = path.join(PROJECTS, v);
  fs.mkdirSync(dest, { recursive: true });
  for (const e of entries) {
    const from = path.join(oldDir, e.name);
    const to = path.join(dest, e.name);
    if (e.isDirectory()) {
      fs.cpSync(from, to, { recursive: true, force: true });
    } else if (e.name.endsWith('.jsonl') && REWRITE_CWD) {
      fs.writeFileSync(to, rewrite(fs.readFileSync(from, 'utf8')));
    } else {
      fs.copyFileSync(from, to);
    }
  }
  console.log(`✓ كُتب ${v}`);
}

/* history.jsonl مفتاحه حقل project بمسار مطلق — يخصّ سجلّ الأوامر في الطرفية. */
const hist = path.join(CLAUDE, 'history.jsonl');
if (fs.existsSync(hist)) {
  const src = fs.readFileSync(hist, 'utf8');
  const out = rewrite(src);
  if (out !== src) {
    fs.copyFileSync(hist, hist + '.bak');
    fs.writeFileSync(hist, out);
    console.log('✓ حُدِّث history.jsonl (نسخة احتياطية: history.jsonl.bak)');
  }
}

console.log(`\nتم. المجلد القديم باقٍ كما هو:\n  ${oldDir}\nاحذفه يدويًا بعد التأكد من ظهور الجلسات.`);
