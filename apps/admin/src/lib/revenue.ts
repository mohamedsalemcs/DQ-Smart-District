import type { LucideIcon } from 'lucide-react';
import { Building2, CalendarDays, Car, CreditCard, Megaphone, PartyPopper, Store, Trees, Users } from 'lucide-react';

/** مصدر فرعي داخل تدفق إيراد — الحصص تجمع إلى 1 */
export interface RevenueSource { nameAr: string; share: number }

export interface RevenueStreamDef {
  id: string;
  nameAr: string;
  descAr: string;
  basisAr: string;
  icon: LucideIcon;
  /** ر.س / يوم — أساس التوليد الحتمي */
  dailyBase: number;
  /** نمو شهري تقريبي (0.03 = ‎3%) */
  growth: number;
  /** مضاعف الجمعة والسبت — الترفيهي يرتفع والمكتبي يثبت */
  weekendBoost: number;
  sources: RevenueSource[];
}

/* ——— تدفقات الإيراد التسعة — أرقام بمقياس مدينة (المجموع ≈ 2.8 مليون ر.س/يوم) ——— */
export const REVENUE_STREAMS: RevenueStreamDef[] = [
  {
    id: 'renting', nameAr: 'التأجير العقاري', icon: Building2,
    descAr: 'إيجارات الوحدات السكنية والمكاتب والقاعات',
    basisAr: 'عقود سنوية وشهرية تُحصَّل عبر المنصة',
    dailyBase: 780_000, growth: 0.022, weekendBoost: 1,
    sources: [
      { nameAr: 'الوحدات السكنية', share: 0.46 },
      { nameAr: 'المكاتب الإدارية', share: 0.32 },
      { nameAr: 'القاعات والمستودعات', share: 0.22 },
    ],
  },
  {
    id: 'commercials', nameAr: 'المحلات التجارية', icon: Store,
    descAr: 'نسب المبيعات ورسوم تشغيل الوحدات التجارية',
    basisAr: 'نسبة من المبيعات + رسوم تشغيل وتراخيص',
    dailyBase: 520_000, growth: 0.028, weekendBoost: 1.25,
    sources: [
      { nameAr: 'نسبة المبيعات', share: 0.55 },
      { nameAr: 'رسوم التشغيل', share: 0.27 },
      { nameAr: 'التراخيص التجارية', share: 0.18 },
    ],
  },
  {
    id: 'subscriptions', nameAr: 'الاشتراكات', icon: CreditCard,
    descAr: 'اشتراكات السكان والباقات المميزة والنوادي',
    basisAr: 'اشتراكات شهرية وسنوية متجددة',
    dailyBase: 410_000, growth: 0.031, weekendBoost: 1,
    sources: [
      { nameAr: 'اشتراكات السكان', share: 0.5 },
      { nameAr: 'الباقات المميزة', share: 0.3 },
      { nameAr: 'النوادي الرياضية', share: 0.2 },
    ],
  },
  {
    id: 'events', nameAr: 'الفعاليات', icon: PartyPopper,
    descAr: 'تذاكر الفعاليات ورسوم التنظيم والرعايات',
    basisAr: 'تذاكر + رسوم تنظيم + عقود رعاية',
    dailyBase: 340_000, growth: 0.045, weekendBoost: 1.6,
    sources: [
      { nameAr: 'مبيعات التذاكر', share: 0.48 },
      { nameAr: 'رسوم التنظيم', share: 0.3 },
      { nameAr: 'الرعايات', share: 0.22 },
    ],
  },
  {
    id: 'visitors', nameAr: 'الزوار', icon: Users,
    descAr: 'تصاريح الدخول اليومية وباقات المجموعات',
    basisAr: 'تصريح مركبة يومي + باقات + خدمات كبار الزوار',
    dailyBase: 230_000, growth: 0.038, weekendBoost: 1.7,
    sources: [
      { nameAr: 'تصاريح الدخول اليومية', share: 0.62 },
      { nameAr: 'باقات المجموعات', share: 0.22 },
      { nameAr: 'خدمات كبار الزوار', share: 0.16 },
    ],
  },
  {
    id: 'parking', nameAr: 'المواقف', icon: Car,
    descAr: 'المواقف بالساعة والاشتراكات والحجز الذكي',
    basisAr: 'تسعير بالساعة + اشتراكات شهرية + حجز مسبق',
    dailyBase: 185_000, growth: 0.026, weekendBoost: 1.2,
    sources: [
      { nameAr: 'المواقف بالساعة', share: 0.44 },
      { nameAr: 'الاشتراكات الشهرية', share: 0.38 },
      { nameAr: 'الحجز الذكي', share: 0.18 },
    ],
  },
  {
    id: 'bookings', nameAr: 'الحجوزات', icon: CalendarDays,
    descAr: 'حجوزات الملاعب والصالات والمرافق الخاصة',
    basisAr: 'رسوم حجز بالساعة حسب المرفق',
    dailyBase: 150_000, growth: 0.033, weekendBoost: 1.5,
    sources: [
      { nameAr: 'الملاعب الرياضية', share: 0.47 },
      { nameAr: 'الصالات متعددة الأغراض', share: 0.33 },
      { nameAr: 'المرافق الخاصة', share: 0.2 },
    ],
  },
  {
    id: 'ads', nameAr: 'الإعلانات', icon: Megaphone,
    descAr: 'اللوحات الرقمية وإعلانات المنصة والرعايات',
    basisAr: 'باقات شهرية للوحات والشاشات والمنصة',
    dailyBase: 128_000, growth: 0.041, weekendBoost: 1,
    sources: [
      { nameAr: 'اللوحات الرقمية', share: 0.52 },
      { nameAr: 'إعلانات المنصة', share: 0.29 },
      { nameAr: 'رعاية الشاشات', share: 0.19 },
    ],
  },
  {
    id: 'gardens', nameAr: 'الحدائق', icon: Trees,
    descAr: 'دخول الحدائق المميزة والمقاهي والجولات',
    basisAr: 'تذاكر دخول + امتياز المقاهي + جولات',
    dailyBase: 95_000, growth: 0.024, weekendBoost: 1.8,
    sources: [
      { nameAr: 'تذاكر الدخول', share: 0.45 },
      { nameAr: 'امتياز المقاهي', share: 0.35 },
      { nameAr: 'الجولات الإرشادية', share: 0.2 },
    ],
  },
];

export const streamById = (id: string) => REVENUE_STREAMS.find((s) => s.id === id);

/* ضوضاء حتمية من (المعرف، اليوم) — الرقم نفسه في كل رسم */
const noise = (id: string, i: number) => {
  let n = i + 7;
  for (let k = 0; k < id.length; k++) n = (n * 31 + id.charCodeAt(k)) % 104729;
  return 0.9 + 0.2 * Math.abs(Math.sin(n));
};

export interface RevenueDay { dateISO: string; value: number }

/** سلسلة يومية حتمية لآخر `days` يومًا: أساس × نمو × موسمية أسبوعية × ضوضاء */
export function streamSeries(def: RevenueStreamDef, days = 180): RevenueDay[] {
  const out: RevenueDay[] = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    const growth = Math.pow(1 + def.growth, (i - days + 1) / 30);
    const wd = d.getDay();
    const weekend = wd === 5 || wd === 6 ? def.weekendBoost : 1;
    out.push({ dateISO: d.toISOString(), value: Math.round(def.dailyBase * growth * weekend * noise(def.id, i)) });
  }
  return out;
}

export const sumWindow = (s: RevenueDay[], from: number, to?: number) =>
  s.slice(from, to).reduce((a, d) => a + d.value, 0);

/** تنسيق المبالغ الكبيرة: 23.4 مليون ر.س / 1.02 مليار ر.س */
export function sarParts(v: number): { n: string; u: string } {
  if (v >= 1e9) return { n: (v / 1e9).toFixed(2), u: 'مليار ر.س' };
  if (v >= 1e6) return { n: (v / 1e6).toFixed(1), u: 'مليون ر.س' };
  if (v >= 1e3) return { n: Math.round(v / 1e3).toLocaleString('en'), u: 'ألف ر.س' };
  return { n: Math.round(v).toLocaleString('en'), u: 'ر.س' };
}
export const sarStr = (v: number) => { const p = sarParts(v); return `${p.n} ${p.u}`; };
export const mTick = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1e3)}k`);
