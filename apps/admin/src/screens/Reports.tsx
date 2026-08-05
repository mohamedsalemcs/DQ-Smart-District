import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Award,
  CalendarClock,
  Clock3,
  DoorOpen,
  Download,
  Flame,
  Lightbulb,
  Printer,
  Radar as RadarIcon,
  Star,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Area,
  Bar,
  Brush,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStore } from '@dq/core';
import { Button, Card, SectionTitle } from '@dq/ui';
import { ChartCard, KpiCard, RangePicker, Sparkline, type Range, axisTick, chartTooltip, windowStats } from '../components/charts';
import { fmtDate, requestKindAr } from '@dq/core';
import type { DayMetric } from '@dq/core';

/* لوحة الفئات — مرتبة ثابتًا ومُتحقق منها بمدقق تباين وعمى الألوان (ΔE≥8 لكل جوار):
 *   teal ↔ amber ↔ blue ↔ crimson فوق سطح أبيض. لا يُعاد تدوير الألوان أبدًا. */
const C = { teal: '#099384', amber: '#b45309', blue: '#1d4ed8', crimson: '#9f1239' } as const;
const GRID = '#f1f5f5';
/* الفترة السابقة تُرسم كمرجع رمادي باهت لا كفئة منافسة */
const PREV = '#94a3b8';

/* منحنى ساعي حتمي لتوزيع دخول اليوم على 24 ساعة (ذروتا الصباح والمساء) */
const HOURLY = [
  0.004, 0.003, 0.002, 0.002, 0.004, 0.012, 0.034, 0.072, 0.094, 0.072, 0.052, 0.05,
  0.058, 0.05, 0.04, 0.052, 0.072, 0.092, 0.082, 0.058, 0.04, 0.028, 0.018, 0.009,
];
const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/* عشوائية حتمية من (يوم، ساعة) — تعيد النتيجة نفسها في كل رسم */
const jitter = (dateISO: string, h: number) => {
  let n = h * 7;
  for (let i = 0; i < 10 && i < dateISO.length; i++) n = (n * 31 + dateISO.charCodeAt(i)) % 9973;
  return 0.82 + 0.36 * Math.abs(Math.sin(n));
};

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);
const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

/* ——— عدّاد متحرك: يصعد الرقم عند التحميل وعند تغيّر الفترة ——— */
function useCountUp(target: number, dur = 1100) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(target); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return v;
}

function HeroStat({ label, value, format: fmt, spark, delta, goodWhenDown = false }: {
  label: string;
  value: number;
  format: (v: number) => string;
  spark: number[];
  delta?: number;
  goodWhenDown?: boolean;
}) {
  const v = useCountUp(value);
  const improving = delta != null && (goodWhenDown ? delta < 0 : delta > 0);
  return (
    <div className="min-w-[150px]">
      <p className="text-caption font-semibold text-white/55">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-white">{fmt(v)}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <Sparkline data={spark} color="#6bc2b7" height={22} />
        {delta != null && (
          <span className={`flex items-center gap-0.5 text-micro font-bold ${improving ? 'text-[#4ade80]' : Math.abs(delta) < 0.5 ? 'text-white/50' : 'text-[#fca5a5]'}`}>
            {delta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            <bdi dir="ltr">{delta > 0 ? '+' : ''}{delta.toFixed(0)}%</bdi>
          </span>
        )}
      </div>
    </div>
  );
}

/* ——— عداد الصحة العامة: قوس 270° يمتلئ حتى الدرجة المركبة ——— */
function HealthGauge({ score }: { score: number }) {
  const R = 54;
  const CIRC = 2 * Math.PI * R;
  const ARC = CIRC * 0.75;
  const [off, setOff] = useState(ARC);
  const shown = useCountUp(score, 1400);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOff(ARC * (1 - score / 100)));
    return () => cancelAnimationFrame(id);
  }, [score, ARC]);
  const grade = score >= 85 ? 'ممتاز' : score >= 70 ? 'جيد جدًا' : score >= 55 ? 'جيد' : 'يحتاج تحسينًا';
  return (
    <div className="relative h-[150px] w-[150px] shrink-0" role="img" aria-label={`مؤشر صحة الحي ${Math.round(score)} من 100 — ${grade}`}>
      <svg width="150" height="150" viewBox="0 0 132 132" style={{ transform: 'rotate(135deg)' }}>
        <defs>
          <linearGradient id="gGauge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6bc2b7" />
            <stop offset="100%" stopColor="#0aa38f" />
          </linearGradient>
        </defs>
        <circle cx="66" cy="66" r={R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${ARC} ${CIRC}`} />
        <circle
          cx="66" cy="66" r={R} fill="none" stroke="url(#gGauge)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${ARC} ${CIRC}`} strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-4xl font-bold tabular-nums leading-none text-white">{Math.round(shown)}</p>
        <p className="mt-1 text-micro font-semibold text-white/60">من 100 · {grade}</p>
      </div>
    </div>
  );
}

function SectionHead({ n, title, sub }: { n: string; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 pt-3">
      <span className="plate select-none text-xl font-bold leading-none text-brand-600/50">{n}</span>
      <div className="shrink-0">
        <p className="text-sm font-bold">{title}</p>
        {sub && <p className="text-caption text-ink-500">{sub}</p>}
      </div>
      <span className="h-px flex-1 bg-ink-100" />
    </div>
  );
}

export function AdminReports() {
  const store = useStore();
  const [range, setRange] = useState<Range>(30);

  const { cur, prev, sum, avg, deltaPct } = useMemo(() => windowStats(store.metrics, range), [store.metrics, range]);

  /* ——— السلاسل اليومية ——— */
  const series = useMemo(() => {
    let backlog = 0;
    return cur.map((m) => {
      backlog += m.requestsOpened - m.requestsClosed;
      return {
        day: format(new Date(m.dateISO), range === 7 ? 'EEEE' : 'd/M', { locale: ar }),
        دخول: m.gateAllowed,
        رفض: m.gateDenied,
        جديدة: m.requestsOpened,
        مغلقة: m.requestsClosed,
        'رصيد مفتوح': Math.max(0, backlog),
        استجابة: Math.round((m.avgResponseSec / 60) * 10) / 10,
        رضا: m.satisfaction,
        مخالفات: m.violations,
      };
    });
  }, [cur, range]);

  /* ——— مؤشرات النافذة الحالية والسابقة ——— */
  const kpi = useMemo(() => {
    const gateCur = sum(cur, 'gateAllowed');
    const gatePrev = sum(prev, 'gateAllowed');
    const denialCur = pct(sum(cur, 'gateDenied'), sum(cur, 'gateDenied') + gateCur);
    const denialPrev = pct(sum(prev, 'gateDenied'), sum(prev, 'gateDenied') + gatePrev);
    const closureCur = pct(sum(cur, 'requestsClosed'), sum(cur, 'requestsOpened'));
    const closurePrev = pct(sum(prev, 'requestsClosed'), sum(prev, 'requestsOpened'));
    const respCur = avg(cur, 'avgResponseSec');
    const respPrev = avg(prev, 'avgResponseSec');
    const satCur = avg(cur, 'satisfaction');
    const satPrev = avg(prev, 'satisfaction');
    return {
      gateCur, gatePrev, denialCur, denialPrev, closureCur, closurePrev, respCur, respPrev, satCur, satPrev,
      gateDelta: deltaPct(gateCur, gatePrev),
      denialDelta: denialCur - denialPrev,
      openedCur: sum(cur, 'requestsOpened'),
      openedDelta: deltaPct(sum(cur, 'requestsOpened'), sum(prev, 'requestsOpened')),
      closureDelta: closureCur - closurePrev,
      respDelta: deltaPct(respCur, respPrev),
      satDelta: deltaPct(satCur, satPrev),
      violCur: sum(cur, 'violations'),
      violPrev: sum(prev, 'violations'),
      violDelta: deltaPct(sum(cur, 'violations'), sum(prev, 'violations')),
    };
  }, [cur, prev, sum, avg, deltaPct]);

  /* ——— الدرجة المركبة لصحة الحي (0–100) ——— */
  const health = useMemo(() => {
    const respScore = clamp((300 / Math.max(kpi.respCur, 1)) * 100);
    const violPerDay = kpi.violCur / Math.max(cur.length, 1);
    return clamp(
      kpi.closureCur * 0.3 +
      (kpi.satCur / 5) * 100 * 0.25 +
      respScore * 0.25 +
      clamp(100 - kpi.denialCur * 20) * 0.1 +
      clamp(100 - violPerDay * 30) * 0.1,
    );
  }, [kpi, cur.length]);

  /* ——— رادار الأداء: الفترة الحالية مقابل السابقة على 6 محاور (0–100) ——— */
  const radar = useMemo(() => {
    const gMax = Math.max(kpi.gateCur, kpi.gatePrev, 1);
    const respScore = (s: number) => clamp((300 / Math.max(s, 1)) * 100);
    const violScore = (v: number) => clamp(100 - (v / Math.max(cur.length, 1)) * 30);
    return [
      { axis: 'حركة البوابات', الحالية: Math.round((kpi.gateCur / gMax) * 100), السابقة: Math.round((kpi.gatePrev / gMax) * 100) },
      { axis: 'إغلاق البلاغات', الحالية: Math.round(kpi.closureCur), السابقة: Math.round(kpi.closurePrev) },
      { axis: 'سرعة الاستجابة', الحالية: Math.round(respScore(kpi.respCur)), السابقة: Math.round(respScore(kpi.respPrev)) },
      { axis: 'رضا السكان', الحالية: Math.round((kpi.satCur / 5) * 100), السابقة: Math.round((kpi.satPrev / 5) * 100) },
      { axis: 'سلامة الدخول', الحالية: Math.round(clamp(100 - kpi.denialCur * 20)), السابقة: Math.round(clamp(100 - kpi.denialPrev * 20)) },
      { axis: 'الانضباط', الحالية: Math.round(violScore(kpi.violCur)), السابقة: Math.round(violScore(kpi.violPrev)) },
    ];
  }, [kpi, cur.length]);

  /* ——— الخريطة الحرارية: يوم أسبوع × ساعة، مشتقة حتميًا من مقاييس النافذة ——— */
  const heat = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    const counts = Array(7).fill(0) as number[];
    cur.forEach((m) => {
      const wd = new Date(m.dateISO).getDay();
      counts[wd]++;
      HOURLY.forEach((f, h) => { grid[wd][h] += m.gateAllowed * f * jitter(m.dateISO, h); });
    });
    const rows = grid.map((row, wd) => row.map((v) => (counts[wd] ? v / counts[wd] : 0)));
    const max = Math.max(...rows.flat(), 1);
    return { rows, max };
  }, [cur]);

  /* ——— تحليلات من السجلات التشغيلية (كامل السجل) ——— */
  const byKind = useMemo(() => {
    const acc: Record<string, number> = {};
    store.requests.forEach((r) => { acc[requestKindAr[r.kind]] = (acc[requestKindAr[r.kind]] ?? 0) + 1; });
    return Object.entries(acc).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [store.requests]);

  const statusDonut = useMemo(() => ([
    { name: 'مغلقة', value: store.requests.filter((r) => r.status === 'closed').length, color: C.teal },
    { name: 'قيد المعالجة', value: store.requests.filter((r) => ['triaged', 'assigned', 'in_progress', 'awaiting_verification'].includes(r.status)).length, color: C.amber },
    { name: 'جديدة', value: store.requests.filter((r) => r.status === 'new' || r.status === 'reopened').length, color: C.blue },
  ]), [store.requests]);

  const topFacilities = useMemo(() => {
    const acc: Record<string, number> = {};
    store.bookings.filter((b) => b.status !== 'cancelled').forEach((b) => {
      const name = store.assets.find((a) => a.id === b.facilityId)?.nameAr ?? b.facilityId;
      acc[name] = (acc[name] ?? 0) + b.attendees;
    });
    return Object.entries(acc).map(([name, حضور]) => ({ name: name.replace('حديقة ', '').replace('منتزه ', ''), حضور }))
      .sort((a, b) => b.حضور - a.حضور).slice(0, 6);
  }, [store.bookings, store.assets]);

  const contractors = useMemo(
    () => [...store.organizations].filter((o) => ['cleaning', 'landscape', 'maintenance', 'security'].includes(o.kind)).sort((a, b) => b.kpiOnTime - a.kpiOnTime),
    [store.organizations],
  );

  const repeatViolators = useMemo(() => store.violations.filter((v) => v.repeatCount > 1), [store.violations]);

  /* ——— أبرز الملاحظات — مولّدة آليًا من النافذة الحالية ——— */
  const insights = useMemo(() => {
    const out: { icon: typeof Flame; text: string; tone: 'good' | 'bad' | 'info' }[] = [];
    const wdTotals = Array(7).fill(0) as number[];
    const wdCounts = Array(7).fill(0) as number[];
    cur.forEach((m) => { const wd = new Date(m.dateISO).getDay(); wdTotals[wd] += m.gateAllowed; wdCounts[wd]++; });
    const busiest = wdTotals.map((t, i) => (wdCounts[i] ? t / wdCounts[i] : 0)).reduce((bi, v, i, a) => (v > a[bi] ? i : bi), 0);
    const peakHour = HOURLY.indexOf(Math.max(...HOURLY));
    out.push({ icon: Flame, text: `أكثر أيام الدخول ازدحامًا ${WEEKDAYS[busiest]}، وذروة الحركة حوالي الساعة ${peakHour}:00 — وجّه التغطية الأمنية وفقها.`, tone: 'info' });
    if (prev.length) {
      out.push(kpi.respDelta <= 0
        ? { icon: Clock3, text: `تحسّن متوسط الاستجابة الأمنية ${Math.abs(kpi.respDelta).toFixed(0)}% عن الفترة السابقة.`, tone: 'good' }
        : { icon: Clock3, text: `ارتفع متوسط الاستجابة الأمنية ${kpi.respDelta.toFixed(0)}% عن الفترة السابقة — راجع توزيع الدوريات.`, tone: 'bad' });
      out.push(kpi.denialDelta <= 0
        ? { icon: DoorOpen, text: `انخفضت نسبة الرفض عند البوابات إلى ${kpi.denialCur.toFixed(1)}%.`, tone: 'good' }
        : { icon: DoorOpen, text: `ارتفعت نسبة الرفض عند البوابات إلى ${kpi.denialCur.toFixed(1)}% (+${kpi.denialDelta.toFixed(1)} نقطة) — دقق التصاريح المنتهية.`, tone: 'bad' });
    }
    out.push(kpi.closureCur >= 90
      ? { icon: Activity, text: `نسبة إغلاق البلاغات ${kpi.closureCur.toFixed(0)}% — الرصيد المفتوح تحت السيطرة.`, tone: 'good' }
      : { icon: Activity, text: `نسبة إغلاق البلاغات ${kpi.closureCur.toFixed(0)}% — يتراكم رصيد مفتوح؛ راجع مهل الإنجاز.`, tone: 'bad' });
    if (byKind[0]) out.push({ icon: AlertTriangle, text: `أكثر أنواع البلاغات: ${byKind[0].name} (${byKind[0].count} بلاغًا في كامل السجل).`, tone: 'info' });
    if (contractors[0]) out.push({ icon: Award, text: `أفضل جهة تشغيلية التزامًا: ${contractors[0].nameAr} بنسبة إنجاز ${contractors[0].kpiOnTime}% في الوقت.`, tone: 'good' });
    if (repeatViolators.length) out.push({ icon: AlertTriangle, text: `${repeatViolators.length} مخالفات متكررة مرشحة للتصعيد وفق اللائحة.`, tone: 'bad' });
    return out.slice(0, 6);
  }, [cur, prev.length, kpi, byKind, contractors, repeatViolators.length]);

  /* ——— تصدير ——— */
  const exportCsv = () => {
    const head = 'التاريخ,دخول,رفض,بلاغات جديدة,بلاغات مغلقة,حوادث,مخالفات,متوسط الاستجابة (ث),الرضا';
    const rows = cur.map((m: DayMetric) =>
      [fmtDate(m.dateISO), m.gateAllowed, m.gateDenied, m.requestsOpened, m.requestsClosed, m.incidents, m.violations, m.avgResponseSec, m.satisfaction].join(','),
    );
    const blob = new Blob([`﻿${head}\n${rows.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dq-report-${range}d.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    store.pushToast('صُدّر التقرير', `بيانات ${range} يومًا بصيغة CSV`, 'ok');
  };

  const periodLabel = cur.length ? `${fmtDate(cur[0].dateISO)} — ${fmtDate(cur[cur.length - 1].dateISO)}` : '';
  const toneCls = { good: 'text-ok-600', bad: 'text-danger-600', info: 'text-brand-600' } as const;
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`;

  return (
    <div className="space-y-4">
      <style>{`@media print { nav, aside, header, .no-print { display: none !important; } body { background: #fff; } }`}</style>

      <SectionTitle
        sub={`فترة التقرير: ${periodLabel} · تُقارن المؤشرات بالفترة المكافئة السابقة`}
        action={
          <div className="no-print flex items-center gap-2">
            <RangePicker value={range} onChange={setRange} />
            <Button size="sm" variant="outline" onClick={exportCsv}><Download size={13} /> CSV</Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}><Printer size={13} /> طباعة</Button>
          </div>
        }
      >
        التقارير والتحليلات
      </SectionTitle>

      {/* ——— الشريط التنفيذي — درجة الصحة المركبة وأرقام العناوين ——— */}
      <div className="rise-in relative overflow-hidden rounded-panel p-6" style={{ background: 'linear-gradient(130deg, #071f1c 0%, #0b332e 55%, #0d423a 100%)' }}>
        <div className="pointer-events-none absolute -start-24 -top-24 h-72 w-72 rounded-full opacity-35 blur-3xl" style={{ background: '#0e6a60' }} />
        <div className="pointer-events-none absolute -bottom-32 -end-20 h-80 w-80 rounded-full opacity-20 blur-3xl" style={{ background: '#1f5fa8' }} />
        <div className="relative flex flex-wrap items-center gap-x-10 gap-y-6">
          <div className="flex items-center gap-5">
            <HealthGauge score={health} />
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-white">
                مؤشر صحة الحي
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ade80] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#4ade80]" />
                </span>
              </p>
              <p className="mt-1 max-w-[24ch] text-caption leading-relaxed text-white/55">
                درجة مركبة من الإغلاق والرضا وسرعة الاستجابة وسلامة الدخول والانضباط — تُحدَّث لحظيًا
              </p>
            </div>
          </div>
          <span className="hidden h-16 w-px bg-white/10 sm:block" />
          <div className="flex flex-1 flex-wrap items-center gap-x-10 gap-y-4">
            <HeroStat label="دخول البوابات" value={kpi.gateCur} format={(v) => Math.round(v).toLocaleString('en')} spark={cur.map((m) => m.gateAllowed)} delta={prev.length ? kpi.gateDelta : undefined} />
            <HeroStat label="نسبة إغلاق البلاغات" value={kpi.closureCur} format={(v) => `${v.toFixed(0)}%`} spark={cur.map((m) => m.requestsClosed)} delta={prev.length ? kpi.closureDelta : undefined} />
            <HeroStat label="متوسط الاستجابة" value={kpi.respCur} format={(v) => mmss(v)} spark={cur.map((m) => m.avgResponseSec)} delta={prev.length ? kpi.respDelta : undefined} goodWhenDown />
            <HeroStat label="رضا السكان / 5" value={kpi.satCur} format={(v) => v.toFixed(2)} spark={cur.map((m) => m.satisfaction)} delta={prev.length ? kpi.satDelta : undefined} />
          </div>
        </div>
      </div>

      <SectionHead n="٠١" title="النظرة التنفيذية" sub="المؤشرات الرئيسية وقراءة آلية للفترة" />

      {/* ——— المؤشرات التفصيلية ——— */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="دخول البوابات" value={kpi.gateCur.toLocaleString('en')} delta={prev.length ? kpi.gateDelta : undefined} spark={cur.map((m) => m.gateAllowed)} sparkColor={C.teal} />
        <KpiCard label="نسبة الرفض" value={`${kpi.denialCur.toFixed(1)}%`} delta={prev.length ? kpi.denialDelta : undefined} goodWhenDown spark={cur.map((m) => m.gateDenied)} sparkColor={C.crimson} />
        <KpiCard label="بلاغات جديدة" value={kpi.openedCur} delta={prev.length ? kpi.openedDelta : undefined} goodWhenDown spark={cur.map((m) => m.requestsOpened)} sparkColor={C.blue} />
        <KpiCard label="نسبة الإغلاق" value={`${kpi.closureCur.toFixed(0)}%`} delta={prev.length ? kpi.closureDelta : undefined} spark={cur.map((m) => m.requestsClosed)} sparkColor={C.teal} />
        <KpiCard label="متوسط الاستجابة" value={mmss(kpi.respCur)} suffix="دقيقة" delta={prev.length ? kpi.respDelta : undefined} goodWhenDown spark={cur.map((m) => m.avgResponseSec)} sparkColor={C.amber} />
        <KpiCard label="رضا السكان" value={kpi.satCur.toFixed(2)} suffix="/ 5" delta={prev.length ? kpi.satDelta : undefined} spark={cur.map((m) => m.satisfaction)} sparkColor={C.teal} />
      </div>

      {/* ——— الرادار + الملاحظات ——— */}
      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="بصمة الأداء" sub="ست قدرات على مقياس 0–100 — الحالية مقابل السابقة" action={<RadarIcon size={15} className="text-brand-600" />}>
          <div className="h-64" dir="ltr">
            <ResponsiveContainer>
              <RadarChart data={radar} outerRadius="72%">
                <PolarGrid stroke="#e4eaea" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: '#5c6d6d', fontFamily: 'inherit' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                {prev.length > 0 && (
                  <Radar name="الفترة السابقة" dataKey="السابقة" stroke={PREV} strokeWidth={1.5} strokeDasharray="5 4" fill={PREV} fillOpacity={0.08} />
                )}
                <Radar name="الفترة الحالية" dataKey="الحالية" stroke={C.teal} strokeWidth={2} fill={C.teal} fillOpacity={0.22} />
                <Legend wrapperStyle={{ fontSize: 11, direction: 'rtl' }} />
                <Tooltip {...chartTooltip(false)} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <Card className="p-4 ring-1 ring-brand-500/25 xl:col-span-2">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-bold">
            <Lightbulb size={15} className="text-brand-600" /> أبرز الملاحظات — تُولَّد آليًا من بيانات الفترة
          </p>
          <div className="grid gap-x-6 gap-y-2.5 md:grid-cols-2">
            {insights.map((ins, i) => (
              <p key={i} className="flex items-start gap-2 text-caption leading-relaxed">
                <ins.icon size={14} className={`mt-0.5 shrink-0 ${toneCls[ins.tone]}`} />
                <span>{ins.text}</span>
              </p>
            ))}
          </div>
        </Card>
      </div>

      <SectionHead n="٠٢" title="الحركة والتدفق" sub="البوابات والبلاغات والاستجابة عبر الزمن" />

      {/* ——— حركة البوابات ——— */}
      <ChartCard title="حركة البوابات — دخول ورفض" sub="اسحب الشريط أسفل الرسم لتكبير فترة بعينها">
        <div className="h-72" dir="ltr">
          <ResponsiveContainer>
            <ComposedChart data={series} margin={{ top: 4, right: 4, left: 4 }}>
              <defs>
                <linearGradient id="gAllowed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.teal} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={C.teal} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="day" tick={axisTick(false)} reversed interval="preserveStartEnd" tickMargin={6} />
              <YAxis tick={axisTick(false)} width={34} orientation="right" allowDecimals={false} />
              <Tooltip {...chartTooltip(false)} />
              <Legend wrapperStyle={{ fontSize: 12, direction: 'rtl' }} />
              <Area type="monotone" dataKey="دخول" stroke={C.teal} strokeWidth={2} fill="url(#gAllowed)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
              <Bar dataKey="رفض" fill={C.crimson} radius={[3, 3, 0, 0]} maxBarSize={10} />
              {range !== 7 && <Brush dataKey="day" height={20} travellerWidth={8} stroke={C.teal} fill="#f7fafa" />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ——— تدفق الطلبات · الاستجابة · الرضا ——— */}
      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="تدفق البلاغات" sub="جديدة ومغلقة يوميًا، مع الرصيد المتراكم المفتوح">
          <div className="h-56" dir="ltr">
            <ResponsiveContainer>
              <ComposedChart data={series} margin={{ top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="day" tick={axisTick(false)} reversed interval="preserveStartEnd" tickMargin={6} />
                <YAxis tick={axisTick(false)} width={28} orientation="right" allowDecimals={false} />
                <Tooltip {...chartTooltip(false)} />
                <Legend wrapperStyle={{ fontSize: 11, direction: 'rtl' }} />
                <Bar dataKey="جديدة" fill={C.blue} radius={[3, 3, 0, 0]} maxBarSize={9} />
                <Bar dataKey="مغلقة" fill={C.teal} radius={[3, 3, 0, 0]} maxBarSize={9} />
                <Line type="monotone" dataKey="رصيد مفتوح" stroke={C.amber} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="زمن الاستجابة الأمنية" sub="بالدقائق — الخط المنقط هو المستهدف التشغيلي">
          <div className="h-56" dir="ltr">
            <ResponsiveContainer>
              <LineChart data={series} margin={{ top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="day" tick={axisTick(false)} reversed interval="preserveStartEnd" tickMargin={6} />
                <YAxis tick={axisTick(false)} width={28} orientation="right" />
                <Tooltip {...chartTooltip(false)} />
                <ReferenceLine y={5} stroke={C.crimson} strokeDasharray="5 4" label={{ value: 'المستهدف 5 د', position: 'insideTopLeft', fontSize: 10, fill: C.crimson }} />
                <Line type="monotone" dataKey="استجابة" name="الاستجابة (د)" stroke={C.amber} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="رضا السكان" sub="متوسط التقييم اليومي من 5">
          <div className="h-56" dir="ltr">
            <ResponsiveContainer>
              <LineChart data={series} margin={{ top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="day" tick={axisTick(false)} reversed interval="preserveStartEnd" tickMargin={6} />
                <YAxis tick={axisTick(false)} width={30} orientation="right" domain={[3, 5]} ticks={[3, 3.5, 4, 4.5, 5]} />
                <Tooltip {...chartTooltip(false)} />
                <Line type="monotone" dataKey="رضا" name="الرضا" stroke={C.teal} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* ——— الخريطة الحرارية ——— */}
      <ChartCard
        title="كثافة الدخول — يوم الأسبوع × ساعة اليوم"
        sub="متوسط الدخول المقدّر لكل ساعة خلال الفترة — مرر على أي خلية للتفاصيل"
        action={
          <span className="flex items-center gap-1.5 text-micro text-ink-500">
            منخفض
            <span className="h-2.5 w-24 rounded-full" style={{ background: 'linear-gradient(to left, #eef7f5, #066457)' }} />
            مرتفع
          </span>
        }
      >
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            {heat.rows.map((row, wd) => (
              <div key={wd} className="flex items-center gap-1 py-0.5">
                <span className="w-16 shrink-0 text-micro font-semibold text-ink-500">{WEEKDAYS[wd]}</span>
                <div className="flex flex-1 gap-[3px]" dir="ltr">
                  {row.map((v, h) => (
                    <span
                      key={h}
                      title={`${WEEKDAYS[wd]} ${h}:00 — ${Math.round(v)} دخول/ساعة`}
                      className="h-6 flex-1 rounded-[3px] transition-transform hover:scale-110 hover:ring-2 hover:ring-brand-500"
                      style={{ background: `color-mix(in srgb, #066457 ${Math.round((v / heat.max) * 100)}%, #eef7f5)` }}
                    />
                  ))}
                </div>
              </div>
            ))}
            <div className="mt-1 flex items-center gap-1">
              <span className="w-16 shrink-0" />
              <div className="flex flex-1 gap-[3px]" dir="ltr">
                {Array.from({ length: 24 }, (_, h) => (
                  <span key={h} className="flex-1 text-center text-micro tabular-nums text-ink-500">{h % 3 === 0 ? h : ''}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ChartCard>

      <SectionHead n="٠٣" title="التحليلات التفصيلية" sub="أنواع البلاغات والمرافق والمخالفات" />

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="البلاغات حسب النوع" sub="كامل السجل التشغيلي">
          <div className="h-56" dir="ltr">
            <ResponsiveContainer>
              <ComposedChart data={byKind} layout="vertical" margin={{ right: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" tick={axisTick(false)} allowDecimals={false} reversed />
                <YAxis type="category" dataKey="name" width={86} tick={{ ...axisTick(false), fill: '#1f2a29', fontSize: 10 }} orientation="right" />
                <Tooltip {...chartTooltip(false)} />
                <Bar dataKey="count" name="عدد" fill={C.teal} radius={[3, 0, 0, 3]} maxBarSize={13}>
                  <LabelList dataKey="count" position="left" style={{ fontSize: 10, fill: '#5c6d6d' }} />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="حالة البلاغات" sub="التوزيع اللحظي">
          <div className="relative h-44" dir="ltr">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusDonut} dataKey="value" innerRadius={52} outerRadius={74} paddingAngle={3} strokeWidth={2} stroke="#fff">
                  {statusDonut.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip {...chartTooltip(false)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-2xl font-bold tabular-nums leading-none">{store.requests.length}</p>
              <p className="text-micro text-ink-500">بلاغ</p>
            </div>
          </div>
          <div className="mt-2 space-y-1">
            {statusDonut.map((d) => (
              <span key={d.name} className="flex items-center justify-between text-caption">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: d.color }} />{d.name}</span>
                <b className="tabular-nums">{d.value}</b>
              </span>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="أعلى المرافق حضورًا" sub="من الحجوزات المؤكدة والمنفذة">
          <div className="h-56" dir="ltr">
            <ResponsiveContainer>
              <ComposedChart data={topFacilities} layout="vertical" margin={{ right: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" tick={axisTick(false)} allowDecimals={false} reversed />
                <YAxis type="category" dataKey="name" width={70} tick={{ ...axisTick(false), fill: '#1f2a29', fontSize: 10 }} orientation="right" />
                <Tooltip {...chartTooltip(false)} />
                <Bar dataKey="حضور" fill={C.blue} radius={[3, 0, 0, 3]} maxBarSize={13}>
                  <LabelList dataKey="حضور" position="left" style={{ fontSize: 10, fill: '#5c6d6d' }} />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="المخالفات المسجلة يوميًا" sub={`إجمالي الفترة: ${kpi.violCur} مخالفة${prev.length ? ` · ${kpi.violDelta > 0 ? '+' : ''}${kpi.violDelta.toFixed(0)}% عن الفترة السابقة` : ''}`}>
        <div className="h-40" dir="ltr">
          <ResponsiveContainer>
            <ComposedChart data={series} margin={{ top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="day" tick={axisTick(false)} reversed interval="preserveStartEnd" tickMargin={6} />
              <YAxis tick={axisTick(false)} width={26} orientation="right" allowDecimals={false} />
              <Tooltip {...chartTooltip(false)} />
              <Bar dataKey="مخالفات" fill={C.crimson} radius={[3, 3, 0, 0]} maxBarSize={12} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <SectionHead n="٠٤" title="الأداء والانضباط" sub="سجل المقاولين والمخالفات المتكررة" />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-4">
          <p className="mb-1 flex items-center gap-1.5 text-sm font-bold"><Award size={15} className="text-brand-600" /> سجل أداء الجهات التشغيلية</p>
          <p className="mb-3 text-caption text-ink-500">الإنجاز في الوقت مقابل تقييم الخدمة — مرتبة بالالتزام</p>
          <div className="space-y-2.5">
            {contractors.map((o, i) => (
              <div key={o.id} className="flex items-center gap-3">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-micro font-bold ${i === 0 ? 'bg-brand-600 text-ink-900' : 'bg-ink-50 text-ink-500'}`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-caption font-semibold">{o.nameAr}</p>
                    <span className="flex shrink-0 items-center gap-2 text-caption tabular-nums">
                      <b>{o.kpiOnTime}%</b>
                      <span className="flex items-center gap-0.5 text-ink-500"><Star size={11} className="fill-current text-brand-600" /> {o.kpiRating.toFixed(1)}</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-50">
                    <div className="h-full rounded-full" style={{ width: `${o.kpiOnTime}%`, background: C.teal }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <p className="mb-1 flex items-center gap-1.5 text-sm font-bold"><AlertTriangle size={15} className="text-danger-600" /> المخالفات المتكررة — مرشحة للتصعيد</p>
          <p className="mb-3 text-caption text-ink-500">وفق لائحة التصعيد: تكرار المخالفة يضاعف الغرامة ويستدعي المراجعة</p>
          {repeatViolators.length === 0 && <p className="py-4 text-center text-caption text-ink-500">لا مخالفات متكررة حاليًا</p>}
          <div className="space-y-1.5">
            {repeatViolators.map((v) => {
              const veh = v.subject === 'vehicle' ? store.vehicles.find((x) => x.id === v.subjectId) : undefined;
              return (
                <div key={v.id} className="flex items-center justify-between gap-2 rounded-card bg-ink-50 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate">
                    <b className="text-caption">{v.code}</b> — {v.labelAr}
                    {veh && <bdi className="plate ms-1.5 text-caption text-ink-500">{veh.plate}</bdi>}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-danger-50 px-2 py-0.5 text-caption font-semibold text-danger-600">
                    {v.repeatCount > 2 ? <TrendingUp size={11} /> : <TrendingDown size={11} className="rotate-180" />}
                    تكرار {v.repeatCount}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-center text-micro text-ink-500">
        <CalendarClock size={11} /> يُبنى هذا التقرير لحظيًا من سجلات التشغيل والتدقيق ({store.audit.length.toLocaleString('en')} قيد تدقيق) — الأرقام تعكس آخر مزامنة
      </p>
    </div>
  );
}
