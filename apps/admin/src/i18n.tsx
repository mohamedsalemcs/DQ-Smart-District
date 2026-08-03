import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/* ═══════════════════════════════════════════════════════════════════════
   ثنائية اللغة — مركز القيادة فقط · الافتراضي العربية
   ───────────────────────────────────────────────────────────────────────
   يعالج CFL-03: التقييم سجّل «Multilingual ✅ — Arabic confirmed»،
   وواجهة عربية واحدة ليست دعمًا متعدد اللغات — إيجابية كاذبة.

   الاتجاه ينقلب مع اللغة، والتخطيط لا ينكسر لأن كل الأدوات منطقية
   (start/end) لا فيزيائية. الأرقام تبقى غربية في اللغتين (ADR-005).
   ═══════════════════════════════════════════════════════════════════════ */

export type Lang = 'ar' | 'en';

const DICT = {
  /* الغلاف */
  appName: ['الحي الدبلوماسي الذكي', 'DQ Smart District'],
  portal: ['مركز القيادة', 'Command Center'],
  language: ['اللغة', 'Language'],
  notifications: ['الإشعارات', 'Notifications'],
  markAllRead: ['تعليم الكل كمقروء', 'Mark all read'],
  noNotifications: ['لا توجد إشعارات', 'No notifications'],
  demoSpeed: ['سرعة العرض', 'Demo speed'],
  search: ['بحث', 'Search'],
  menu: ['القائمة', 'Menu'],

  /* التنقل */
  navDashboard: ['لوحة القيادة', 'Dashboard'],
  navTwin: ['الخريطة الذكية', 'Digital Twin'],
  navPeople: ['السكان والعقارات', 'People & Property'],
  navRequests: ['الطلبات والبلاغات', 'Requests'],
  navPermits: ['التصاريح', 'Permits'],
  navViolations: ['المخالفات', 'Violations'],
  navAppeals: ['التظلّمات', 'Appeals'],
  navEmbassies: ['دخول السفارات', 'Embassy Access'],
  navOperations: ['التشغيل والمرافق', 'Facilities'],
  navSustainability: ['الاستدامة', 'Sustainability'],
  navMobility: ['التنقّل الذكي', 'Smart Mobility'],
  navContracts: ['الشركات والعقود', 'Contractors'],
  navEvents: ['الفعاليات والحجوزات', 'Events'],
  navRevenue: ['الإيرادات', 'Revenue'],
  navReports: ['التقارير', 'Reports'],
  navSettings: ['الإعدادات', 'Settings'],

  /* عام */
  all: ['الكل', 'All'],
  save: ['حفظ', 'Save'],
  cancel: ['إلغاء', 'Cancel'],
  confirm: ['تأكيد', 'Confirm'],
  close: ['إغلاق', 'Close'],
  approve: ['اعتماد', 'Approve'],
  reject: ['رفض', 'Reject'],
  details: ['التفاصيل', 'Details'],
  actions: ['إجراءات', 'Actions'],
  status: ['الحالة', 'Status'],
  auditTrail: ['سجل التدقيق', 'Audit trail'],
  timeline: ['الخط الزمني', 'Timeline'],
  loading: ['جارٍ التحميل…', 'Loading…'],
  noResults: ['لا نتائج', 'No results'],

  /* لوحة القيادة */
  openRequests: ['بلاغات مفتوحة', 'Open requests'],
  slaBreaches: ['تجاوزات SLA', 'SLA breaches'],
  activeViolations: ['مخالفات نشطة', 'Active violations'],
  gateTraffic: ['حركة البوابات', 'Gate traffic'],
  avgResponse: ['متوسط الاستجابة', 'Avg. response'],
  satisfaction: ['رضا السكان', 'Satisfaction'],
  vsPrevious: ['مقابل الفترة السابقة', 'vs previous period'],
  week: ['أسبوع', 'Week'],
  month: ['30 يوم', '30 days'],
  quarter: ['ربع سنة', 'Quarter'],
} as const;

export type Key = keyof typeof DICT;

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key) => string;
  dir: 'rtl' | 'ltr';
}

const I18nCtx = createContext<Ctx>({ lang: 'ar', setLang: () => {}, t: (k) => DICT[k][0], dir: 'rtl' });

const STORAGE_KEY = 'dq.lang';

export function I18nProvider({ children }: { children: ReactNode }) {
  /* العربية هي الافتراضي دائمًا */
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return saved === 'en' ? 'en' : 'ar';
  });

  const dir: 'rtl' | 'ltr' = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* التخزين غير متاح — اللغة تبقى للجلسة */
    }
  }, []);

  const t = useCallback((k: Key): string => DICT[k][lang === 'ar' ? 0 : 1], [lang]);

  const value = useMemo(() => ({ lang, setLang, t, dir }), [lang, setLang, t, dir]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx);
