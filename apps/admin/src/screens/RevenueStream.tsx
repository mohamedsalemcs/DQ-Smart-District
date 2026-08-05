import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ArrowRight, Megaphone, Target } from 'lucide-react';
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { APP_BASE, useStore } from '@dq/core';
import { Button, Card, SectionTitle } from '@dq/ui';
import { ChartCard, KpiCard, RangePicker, type Range, axisTick, chartTooltip } from '../components/charts';
import { REVENUE_STREAMS, mTick, sarParts, sarStr, streamById, streamSeries, sumWindow } from '../lib/revenue';

const C = { teal: '#099384', amber: '#b45309', blue: '#1d4ed8', crimson: '#9f1239' } as const;
/* ألوان المصادر بترتيب ثابت من اللوحة المتحقق منها */
const SOURCE_COLORS = [C.teal, C.amber, C.blue, C.crimson];
const GRID = '#f1f5f5';
const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const deltaPct = (c: number, p: number) => (p === 0 ? 0 : ((c - p) / p) * 100);

/** صفحة تدفق إيراد واحد — تُبنى من تعريف التدفق نفسه لكل المصادر التسعة */
export function RevenueStreamPage() {
  const { streamId = '' } = useParams();
  const def = streamById(streamId);
  const store = useStore();
  const [range, setRange] = useState<Range>(30);

  const all = useMemo(() => REVENUE_STREAMS.map((d) => ({ d, series: streamSeries(d, 180) })), []);
  const series = useMemo(() => (def ? streamSeries(def, 180) : []), [def]);

  const model = useMemo(() => {
    if (!def) return null;
    const cur = sumWindow(series, 180 - range);
    const prev = sumWindow(series, 180 - range * 2, 180 - range);
    const win = series.slice(-range);
    const daily = win.map((d) => ({
      day: format(new Date(d.dateISO), range === 7 ? 'EEEE' : 'd/M', { locale: ar }),
      dateISO: d.dateISO,
      الإيراد: d.value,
    }));
    const grandTotal = all.reduce((a, s) => a + sumWindow(s.series, 180 - range), 0);

    /* متوسط الإيراد حسب يوم الأسبوع — يُظهر أثر نهاية الأسبوع */
    const wdSum = Array(7).fill(0) as number[];
    const wdN = Array(7).fill(0) as number[];
    win.forEach((d) => { const wd = new Date(d.dateISO).getDay(); wdSum[wd] += d.value; wdN[wd]++; });
    const weekdays = WEEKDAYS.map((name, i) => ({ name, الإيراد: wdN[i] ? Math.round(wdSum[i] / wdN[i]) : 0 }));

    const topDays = [...win].sort((a, b) => b.value - a.value).slice(0, 5);
    const target = def.dailyBase * range * 1.03;
    return { cur, prev, delta: deltaPct(cur, prev), daily, share: (cur / grandTotal) * 100, weekdays, topDays, target };
  }, [def, series, all, range]);

  if (!def || !model) return <Navigate to="/revenue" replace />;

  const total = sarParts(model.cur);
  const dailyAvg = sarParts(model.cur / range);
  const sources = def.sources.map((s, i) => ({ name: s.nameAr, value: Math.round(model.cur * s.share), color: SOURCE_COLORS[i] }));
  const achieved = Math.min(100, (model.cur / model.target) * 100);

  return (
    <div className="space-y-4">
      <SectionTitle
        sub={`${def.descAr} · ${def.basisAr}`}
        action={
          <div className="flex items-center gap-2">
            <RangePicker value={range} onChange={setRange} />
            <Link to="/revenue">
              <Button size="sm" variant="outline"><ArrowRight size={13} /> كل الإيرادات</Button>
            </Link>
          </div>
        }
      >
        <span className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-card bg-brand-50 text-brand-600"><def.icon size={16} /></span>
          إيرادات {def.nameAr}
        </span>
      </SectionTitle>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          label={`إجمالي ${range === 7 ? 'الأسبوع' : range === 30 ? 'الشهر' : 'الربع'}`}
          value={total.n} suffix={total.u}
          delta={model.delta}
          spark={model.daily.map((d) => d.الإيراد)} sparkColor={C.teal}
        />
        <KpiCard label="متوسط الإيراد اليومي" value={dailyAvg.n} suffix={dailyAvg.u} />
        <KpiCard label="الحصة من إجمالي الإيرادات" value={`${model.share.toFixed(1)}%`} suffix="من 9 تدفقات" />
        <KpiCard label="أعلى يوم في الفترة" value={sarParts(model.topDays[0]?.value ?? 0).n} suffix={sarParts(model.topDays[0]?.value ?? 0).u} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title={`الإيراد اليومي — ${def.nameAr}`} sub="ر.س" className="lg:col-span-2">
          <div className="h-64" dir="ltr">
            <ResponsiveContainer>
              <ComposedChart data={model.daily} margin={{ top: 4 }}>
                <defs>
                  <linearGradient id="revStream" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.teal} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={C.teal} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="day" tick={axisTick(false)} reversed interval="preserveStartEnd" tickMargin={6} />
                <YAxis tick={axisTick(false)} width={44} orientation="right" tickFormatter={mTick} />
                <Tooltip {...chartTooltip(false)} formatter={(v: number) => [sarStr(v), 'الإيراد']} />
                <Area type="monotone" dataKey="الإيراد" stroke={C.teal} strokeWidth={2} fill="url(#revStream)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="مصادر الإيراد" sub={`داخل ${def.nameAr}`}>
          <div className="relative h-40" dir="ltr">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={sources} dataKey="value" innerRadius={46} outerRadius={66} paddingAngle={3} strokeWidth={2} stroke="#fff">
                  {sources.map((s) => <Cell key={s.name} fill={s.color} />)}
                </Pie>
                <Tooltip {...chartTooltip(false)} formatter={(v: number) => [sarStr(v), '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-lg font-bold tabular-nums leading-none">{total.n}</p>
              <p className="text-micro text-ink-500">{total.u}</p>
            </div>
          </div>
          <div className="mt-2 space-y-1.5">
            {sources.map((s) => (
              <span key={s.name} className="flex items-center justify-between text-caption">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name}</span>
                <b className="tabular-nums">{sarStr(s.value)}</b>
              </span>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="متوسط الإيراد حسب يوم الأسبوع" sub="يُظهر أثر نهاية الأسبوع على هذا التدفق">
          <div className="h-44" dir="ltr">
            <ResponsiveContainer>
              <ComposedChart data={model.weekdays} margin={{ top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="name" tick={{ ...axisTick(false), fontSize: 9 }} reversed tickMargin={6} />
                <YAxis tick={axisTick(false)} width={40} orientation="right" tickFormatter={mTick} />
                <Tooltip {...chartTooltip(false)} formatter={(v: number) => [sarStr(v), 'المتوسط']} />
                <Bar dataKey="الإيراد" fill={C.teal} radius={[3, 3, 0, 0]} maxBarSize={22} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <Card className="p-4">
          <p className="mb-3 text-sm font-bold">أعلى أيام الفترة</p>
          <div className="space-y-2">
            {model.topDays.map((d, i) => (
              <div key={d.dateISO} className="flex items-center gap-3">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-micro font-bold ${i === 0 ? 'bg-brand-600 text-ink-900' : 'bg-ink-50 text-ink-500'}`}>{i + 1}</span>
                <span className="flex-1 text-caption">{format(new Date(d.dateISO), 'EEEE d MMMM', { locale: ar })}</span>
                <b className="text-caption tabular-nums">{sarStr(d.value)}</b>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <p className="mb-1 flex items-center gap-1.5 text-sm font-bold"><Target size={15} className="text-brand-600" /> المستهدف مقابل المحقق</p>
          <p className="mb-4 text-caption text-ink-500">مستهدف الفترة: {sarStr(model.target)}</p>
          <p className="text-3xl font-bold tabular-nums tracking-tight">{achieved.toFixed(0)}%</p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-ink-50">
            <div className="h-full rounded-full transition-all" style={{ width: `${achieved}%`, background: achieved >= 95 ? 'var(--color-ok-600, #0e7c4a)' : C.amber }} />
          </div>
          <p className="mt-3 text-caption text-ink-500">
            {achieved >= 100 ? 'تجاوز التدفق مستهدفه — راجع رفع مستهدف الفترة القادمة.'
              : achieved >= 95 ? 'التدفق على المسار الصحيح لتحقيق المستهدف.'
              : `فجوة ${sarStr(model.target - model.cur)} عن المستهدف — راجع العروض والإشغال.`}
          </p>
        </Card>
      </div>

      {/* الإعلانات النشطة — خاص بصفحة تدفق الإعلانات */}
      {def.id === 'ads' && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <Megaphone size={15} className="text-brand-600" /> إعلانات الوحدات التجارية — تُعرض في صفحة المجتمع
            </p>
            <a href={`${APP_BASE.r}/community`} className="text-caption text-brand-600 hover:underline">
              معاينة صفحة المجتمع ←
            </a>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {store.ads.filter((a) => a.status !== 'ended').map((ad) => {
              const advertiser = store.properties.find((p) => p.id === ad.advertiserPropId);
              return (
                <div key={ad.id} className={`rounded-card p-3 ${ad.package === 'featured' ? 'bg-brand-50 ring-1 ring-brand-500/40' : 'bg-ink-50'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{ad.titleAr}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-micro font-bold ${ad.status === 'active' ? 'bg-ok-600-50 text-ok-600' : 'bg-warn-600-50 text-warn-600'}`}>
                      {ad.status === 'active' ? 'نشط' : 'بانتظار الاعتماد'}
                    </span>
                  </div>
                  <p className="mt-1 text-caption text-ink-500">{advertiser?.subtypeAr ?? advertiser?.unitNo} ({advertiser?.code})</p>
                  <p className="mt-2 text-caption">
                    <b className="tabular-nums">{ad.monthlyPrice.toLocaleString('en')} ر.س / شهر</b>
                    <span className="text-ink-500"> · باقة {ad.package === 'featured' ? 'مميزة' : 'أساسية'}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
