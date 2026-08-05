/* ═══════════════════════════════════════════════════════════════════════
   حلّ الروابط بعد انقسام التطبيق إلى ثلاث منصات.

   المشروع كان تطبيقًا واحدًا يفرّق بين الشخصيات ببادئة في المسار:
   `/a` للإدارة و`/s` للأمن و`/r` للسكان. بعد الانقسام صار لكل منصة
   قاعدة نشر خاصة (`/dashboard` · `/ops` · `/portal`) ومساراتٌ بلا بادئة،
   فبقيت البادئة القديمة في كل رابط داخل الصفحات وفي كل رابط عميق
   محفوظ في الإشعارات — وهي روابط لا وجود لها في أي مسيّر الآن.

   البادئة تبقى في المخزن عمدًا: الإشعار يُنشأ في منطق مشترك لا يعرف
   أي منصة تقرؤه، فالبادئة هي ما يحمل «هذا الرابط يخصّ الأمن». الحلّ
   يقع لحظة التنقّل: إن كان الرابط لهذه المنصة صار مسارًا داخليًا،
   وإلا صار عنوانًا مطلقًا يعبر إلى قاعدة النشر الأخرى.
   ═══════════════════════════════════════════════════════════════════════ */

export type AppKey = 'a' | 's' | 'r';

/** قواعد النشر — تطابق `base` في vite.config.ts لكل منصة */
export const APP_BASE: Record<AppKey, string> = {
  a: '/dashboard',
  s: '/ops',
  r: '/portal',
};

export const PERSONA_APP = {
  admin: 'a',
  security: 's',
  resident: 'r',
} as const satisfies Record<string, AppKey>;

export type Resolved =
  /** مسار داخل هذه المنصة — يُمرَّر إلى navigate() */
  | { kind: 'internal'; to: string }
  /** عنوان مطلق لمنصة أخرى — يحتاج تحميل صفحة كامل */
  | { kind: 'external'; href: string };

const PREFIX = /^\/([asr])(\/|$)/;

/**
 * يحوّل رابطًا قد يحمل البادئة القديمة إلى وجهة صالحة.
 *
 * @param link  الرابط كما هو محفوظ — بالبادئة أو بدونها
 * @param self  مفتاح المنصة التي تقرأ الآن
 */
export function resolveLink(link: string, self: AppKey): Resolved {
  if (!link) return { kind: 'internal', to: '/' };

  // روابط خارجية كاملة تمرّ كما هي
  if (/^https?:\/\//.test(link)) return { kind: 'external', href: link };

  const m = PREFIX.exec(link);
  if (!m) {
    // بلا بادئة — مسار محلي بالفعل
    return { kind: 'internal', to: link.startsWith('/') ? link : `/${link}` };
  }

  const target = m[1] as AppKey;
  const rest = link.slice(m[0].length - (m[2] === '/' ? 1 : 0)) || '/';

  if (target === self) return { kind: 'internal', to: rest.startsWith('/') ? rest : `/${rest}` };
  return { kind: 'external', href: `${APP_BASE[target]}${rest === '/' ? '/' : rest}` };
}
