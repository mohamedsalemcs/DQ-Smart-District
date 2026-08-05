import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ChevronLeft, Crown, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SectionTitle } from '@dq/ui';
import { ChartCard, KpiCard, RangePicker, Sparkline, type Range, axisTick, chartTooltip } from '../components/charts';
import { REVENUE_STREAMS, mTick, sarParts, sarStr, streamSeries, sumWindow } from '../lib/revenue';

const C = { teal: '#099384', amber: '#b45309', blue: '#1d4ed8', crimson: '#9f1239' } as const;
const GRID = '#f1f5f5';
const deltaPct = (c: number, p: number) => (p === 0 ? 0 : ((c - p) / p) * 100);

/** الإيرادات — الصفحة الأم: الإجمالي والرسوم ثم بطاقات التدفقات التسعة، وكل بطاقة تفتح صفحتها */
export function AdminRevenue() {
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>(30);

  /* سلاسل 180 يومًا لكل تدفق — تكفي لمقارنة نافذة 90 بنافذتها السابقة */
  const all = useMemo(() => REVENUE_STREAMS.map((def) => ({ def, series: streamSeries(def, 180) })), []);

  const model = useMemo(() => {
    const streams = all.map(({ def, series }) => {
      const cur = sumWindow(series, 180 - range);
      const prev = sumWindow(series, 180 - range * 2, 180 - range);
      return { def, series, cur, prev, delta: deltaPct(cur, prev), spark: series.slice(-range).map((d) => d.value) };
    });
    const totalCur = streams.reduce((a, s) => a + s.cur, 0);
    const totalPrev = streams.reduce((a, s) => a + s.prev, 0);
    const daily = all[0].series.slice(-range).map((_, i) => ({
      day: format(new Date(all[0].series[180 - range + i].dateISO), range === 7 ? 'EEEE' : 'd/M', { locale: ar }),
      الإيراد: all.reduce((a, s) => a + s.series[180 - range + i].value, 0),
    }));
    const top = [...streams].sort((a, b) => b.cur - a.cur)[0];
    /* التوقع السنوي: متوسط اليوم الحالي × 365 مع أثر النمو المرجّح */
    const yearly = (totalCur / range) * 365 * 1.06;
    return { streams, totalCur, totalPrev, totalDelta: deltaPct(totalCur, totalPrev), daily, top, yearly };
  }, [all, range]);

  const byStream = useMemo(
    () =>
      [...model.streams]
        .sort((a, b) => b.cur - a.cur)
        .map((s) => ({ name: s.def.nameAr, الإيراد: s.cur, label: sarStr(s.cur) })),
    [model.streams],
  );

  const total = sarParts(model.totalCur);
  const yearly = sarParts(model.yearly);
  const dailyAvg = sarParts(model.totalCur / range);

  return (
    <div className="space-y-4">
      <SectionTitle
        sub="تسعة تدفقات إيراد تُدار من منصة واحدة — افتح أي بطاقة لتقريرها التفصيلي"
        action={<RangePicker value={range} onChange={setRange} />}
      >
        الإيرادات
      </SectionTitle>

      {/* ——— الإجمالي ——— */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          label={`إجمالي إيرادات ${range === 7 ? 'الأسبوع' : range === 30 ? 'الشهر' : 'الربع'}`}
          value={total.n} suffix={total.u}
          delta={model.totalDelta}
          spark={model.daily.map((d) => d.الإيراد)} sparkColor={C.teal}
        />
        <KpiCard label="متوسط الإيراد اليومي" value={dailyAvg.n} suffix={dailyAvg.u} />
        <KpiCard label="التوقع السنوي" value={yearly.n} suffix={yearly.u} delta={6.2} />
        <KpiCard
          label="أعلى مصدر إيراد"
          value={model.top.def.nameAr}
          suffix={sarStr(model.top.cur)}
          spark={model.top.spark} sparkColor={C.amber}
        />
      </div>

      {/* ——— الرسوم ——— */}
      <div className="grid gap-4 lg:grid-cols-5">
        <ChartCard title="الإيراد اليومي الموحّد" sub="مجموع التدفقات التسعة — ر.س" className="lg:col-span-3">
          <div className="h-64" dir="ltr">
            <ResponsiveContainer>
              <ComposedChart data={model.daily} margin={{ top: 4 }}>
                <defs>
                  <linearGradient id="revAll" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.teal} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={C.teal} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="day" tick={axisTick(false)} reversed interval="preserveStartEnd" tickMargin={6} />
                <YAxis tick={axisTick(false)} width={44} orientation="right" tickFormatter={mTick} />
                <Tooltip {...chartTooltip(false)} formatter={(v: number) => [sarStr(v), 'الإيراد']} />
                <Area type="monotone" dataKey="الإيراد" stroke={C.teal} strokeWidth={2} fill="url(#revAll)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="الإيراد حسب المصدر" sub={`خلال ${range} يومًا — مرتبة تنازليًا`} className="lg:col-span-2">
          <div className="h-64" dir="ltr">
            <ResponsiveContainer>
              <ComposedChart data={byStream} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" tick={axisTick(false)} tickFormatter={mTick} reversed />
                <YAxis type="category" dataKey="name" width={88} tick={{ ...axisTick(false), fill: '#1f2a29', fontSize: 10 }} orientation="right" />
                <Tooltip {...chartTooltip(false)} formatter={(v: number) => [sarStr(v), 'الإيراد']} />
                <Bar dataKey="الإيراد" fill={C.teal} radius={[3, 0, 0, 3]} maxBarSize={13}>
                  <LabelList dataKey="label" position="left" style={{ fontSize: 9, fill: '#5c6d6d' }} />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* ——— بطاقات التدفقات ——— */}
      <div className="flex items-center gap-3 pt-2">
        <p className="flex items-center gap-1.5 text-sm font-bold"><Wallet size={15} className="text-brand-600" /> تدفقات الإيراد</p>
        <span className="h-px flex-1 bg-ink-100" />
        <p className="text-caption text-ink-500">اضغط أي بطاقة للتقرير التفصيلي</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {model.streams.map(({ def, cur, delta, spark }) => {
          const p = sarParts(cur);
          const isTop = def.id === model.top.def.id;
          const improving = delta >= 0;
          return (
            <button
              key={def.id}
              onClick={() => navigate(`/revenue/${def.id}`)}
              className="group relative rounded-card bg-ink-0 p-4 text-start ring-1 ring-ink-100 transition-all hover:-translate-y-0.5 hover:shadow-e3 hover:ring-brand-500/50"
            >
              {isTop && (
                <span className="absolute -top-2 end-3 flex items-center gap-1 rounded-full bg-brand-600 px-2 py-0.5 text-micro font-bold text-ink-900">
                  <Crown size={10} /> الأعلى
                </span>
              )}
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-brand-50 text-brand-600">
                  <def.icon size={19} />
                </span>
                <ChevronLeft size={16} className="mt-1 text-ink-300 transition-transform group-hover:-translate-x-0.5 group-hover:text-brand-600" />
              </div>
              <p className="mt-3 text-sm font-bold">{def.nameAr}</p>
              <p className="mt-0.5 line-clamp-1 text-caption text-ink-500">{def.descAr}</p>
              <div className="mt-3 flex items-end justify-between gap-2">
                <p className="text-2xl font-bold leading-none tabular-nums tracking-tight">
                  {p.n} <span className="text-caption font-semibold text-ink-500">{p.u}</span>
                </p>
                <Sparkline data={spark} color={C.teal} height={24} />
              </div>
              <p className={`mt-2 flex items-center gap-1 text-caption font-semibold ${Math.abs(delta) < 0.5 ? 'text-ink-500' : improving ? 'text-ok-600' : 'text-danger-600'}`}>
                {improving ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <bdi dir="ltr">{delta > 0 ? '+' : ''}{delta.toFixed(1)}%</bdi>
                <span className="font-normal text-ink-500">عن الفترة السابقة</span>
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
