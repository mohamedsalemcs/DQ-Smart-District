import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Car, Copy, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStore } from '@dq/core';
import { Button, Card, SectionTitle, Stat } from '@dq/ui';
import { ChartCard, KpiCard, RangePicker, type Range, axisTick, chartTooltip, windowStats } from '../components/charts';
import { Map3D } from '../components/three/DQTwin';
import { portalUrl } from '../lib/portal';
import { requestPill, violationPill } from '../components/StatusPill';
import { ago, isPast, secondsToClock } from '@dq/core';
import { requestKindAr } from '@dq/core';

export function AdminDashboard() {
  /* PERF · DEF-035 — محدِّدات ذرّية لا `useStore()` عاريًا.
   * نبضة المستشعرات تغيّر `sensorValues` و`patrols` كل ثلاث ثوانٍ (0.3 في وضع 10×)؛
   * الاشتراك العاري كان يعيد رسم ست خرائط Recharts وقماشَ الـ3D مع كل نبضة.
   * الشرائح أدناه لا تتغيّر إلا بتغيّر بياناتها فعلًا، وعدّ الحاويات رقمٌ تكفيه Object.is. */
  const metrics = useStore((s) => s.metrics);
  const requests = useStore((s) => s.requests);
  const violations = useStore((s) => s.violations);
  const permits = useStore((s) => s.permits);
  const fullBinsCount = useStore(
    (s) => s.assets.filter((a) => a.kind === 'bin' && (s.sensorValues[a.id]?.fill ?? 0) >= 80).length,
  );
  const pushToast = useStore((s) => s.pushToast);
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>(30);

  const { cur, prev, sum, avg, deltaPct } = useMemo(
    () => windowStats(metrics, range),
    [metrics, range],
  );

  const series = useMemo(
    () =>
      cur.map((m) => ({
        day: format(new Date(m.dateISO), range === 7 ? 'EEEE' : 'd/M'),
        دخول: m.gateAllowed,
        رفض: m.gateDenied,
        جديدة: m.requestsOpened,
        مغلقة: m.requestsClosed,
        استجابة: Math.round(m.avgResponseSec / 60 * 10) / 10,
        مخالفات: m.violations,
      })),
    [cur, range],
  );

  const avgResp = avg(cur, 'avgResponseSec');
  const kpis = [
    {
      label: 'حركة البوابات (دخول)',
      value: sum(cur, 'gateAllowed').toLocaleString('en'),
      delta: deltaPct(sum(cur, 'gateAllowed'), sum(prev, 'gateAllowed')),
      spark: cur.map((m) => m.gateAllowed),
      onClick: () => navigate('/reports'),
    },
    {
      label: 'بلاغات السكان',
      value: sum(cur, 'requestsOpened'),
      delta: deltaPct(sum(cur, 'requestsOpened'), sum(prev, 'requestsOpened')),
      goodWhenDown: true,
      spark: cur.map((m) => m.requestsOpened),
      onClick: () => navigate('/requests'),
    },
    {
      label: 'المخالفات',
      value: sum(cur, 'violations'),
      delta: deltaPct(sum(cur, 'violations'), sum(prev, 'violations')),
      goodWhenDown: true,
      spark: cur.map((m) => m.violations),
      sparkColor: 'var(--color-viz-4)',
      onClick: () => navigate('/violations'),
    },
    {
      label: 'متوسط الاستجابة الأمنية',
      value: secondsToClock(Math.round(avgResp)),
      suffix: 'دقيقة',
      delta: deltaPct(avgResp, avg(prev, 'avgResponseSec')),
      goodWhenDown: true,
      spark: cur.map((m) => m.avgResponseSec),
      sparkColor: 'var(--color-viz-3)',
    },
    {
      label: 'حالات رفض عند البوابات',
      value: sum(cur, 'gateDenied'),
      delta: deltaPct(sum(cur, 'gateDenied'), sum(prev, 'gateDenied')),
      goodWhenDown: true,
      spark: cur.map((m) => m.gateDenied),
      sparkColor: 'var(--color-viz-4)',
    },
    {
      label: 'رضا السكان',
      value: avg(cur, 'satisfaction').toFixed(2),
      suffix: '/ 5',
      delta: deltaPct(avg(cur, 'satisfaction'), avg(prev, 'satisfaction')),
      spark: cur.map((m) => m.satisfaction),
      sparkColor: 'var(--color-viz-3)',
    },
  ];

  const donut = useMemo(
    () => [
      { name: 'مغلقة', value: requests.filter((r) => r.status === 'closed').length, color: 'var(--color-viz-3)' },
      { name: 'قيد المعالجة', value: requests.filter((r) => ['triaged', 'assigned', 'in_progress', 'awaiting_verification'].includes(r.status)).length, color: 'var(--color-viz-6)' },
      { name: 'جديدة / معاد فتحها', value: requests.filter((r) => r.status === 'new' || r.status === 'reopened').length, color: 'var(--color-viz-4)' },
    ],
    [requests],
  );

  /* live layer */
  const openRequests = useMemo(() => requests.filter((r) => r.status !== 'closed'), [requests]);
  const slaBreaches = openRequests.filter((r) => r.slaBreached || isPast(r.dueISO));
  const openViolations = useMemo(() => violations.filter((v) => v.status !== 'closed'), [violations]);
  const pendingPermits = permits.filter((p) => p.status === 'pending');
  const tickInterval = range === 7 ? 0 : range === 30 ? 4 : 14;

  return (
    <div className="space-y-5">
      <SectionTitle
        sub="المؤشرات تُحسب من بيانات النشاط اليومي — الفترة المحددة مقابل الفترة التي قبلها"
        action={<RangePicker value={range} onChange={setRange} />}
      >
        لوحة القيادة
      </SectionTitle>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      {/* trends */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="حركة البوابات" sub="عمليات الدخول اليومية عبر البوابات الأربع" className="lg:col-span-2">
          <div className="h-56" dir="ltr">
            <ResponsiveContainer>
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0e6a60" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#0e6a60" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f5" vertical={false} />
                <XAxis dataKey="day" tick={axisTick(false)} interval={tickInterval} tickMargin={6} reversed />
                <YAxis tick={axisTick(false)} width={40} orientation="right" />
                <Tooltip {...chartTooltip(false)} />
                <Area type="monotone" dataKey="دخول" stroke="#0e6a60" strokeWidth={2} fill="url(#goldFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="حالة البلاغات الآن" sub="التوزيع اللحظي من قائمة الطلبات">
          <div className="h-44" dir="ltr">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={donut} dataKey="value" innerRadius={48} outerRadius={70} paddingAngle={3} strokeWidth={0}>
                  {donut.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip {...chartTooltip(false)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 space-y-1">
            {donut.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-caption">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: d.color }} />{d.name}</span>
                <b className="tabular-nums">{d.value}</b>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="بلاغات السكان" sub="الجديدة مقابل المغلقة يوميًا">
          <div className="h-48" dir="ltr">
            <ResponsiveContainer>
              <BarChart data={series} barGap={1}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f5" vertical={false} />
                <XAxis dataKey="day" tick={axisTick(false)} interval={tickInterval} tickMargin={6} reversed />
                <YAxis tick={axisTick(false)} width={28} allowDecimals={false} orientation="right" />
                <Tooltip {...chartTooltip(false)} />
                <Bar dataKey="جديدة" fill="#0e6a60" radius={[2, 2, 0, 0]} maxBarSize={14} />
                <Bar dataKey="مغلقة" fill="#0e7c4a" radius={[2, 2, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="زمن الاستجابة الأمنية" sub="متوسط الدقائق من الإسناد حتى الوصول">
          <div className="h-48" dir="ltr">
            <ResponsiveContainer>
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f5" vertical={false} />
                <XAxis dataKey="day" tick={axisTick(false)} interval={tickInterval} tickMargin={6} reversed />
                <YAxis tick={axisTick(false)} width={28} orientation="right" domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip {...chartTooltip(false)} />
                <Line type="monotone" dataKey="استجابة" stroke="#0e7c4a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="المخالفات" sub="المخالفات المسجلة يوميًا">
          <div className="h-48" dir="ltr">
            <ResponsiveContainer>
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f5" vertical={false} />
                <XAxis dataKey="day" tick={axisTick(false)} interval={tickInterval} tickMargin={6} reversed />
                <YAxis tick={axisTick(false)} width={28} allowDecimals={false} orientation="right" />
                <Tooltip {...chartTooltip(false)} />
                <Bar dataKey="مخالفات" fill="#a82a22" radius={[2, 2, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* visitor portal public link */}
      <div className="flex flex-wrap items-center gap-3 rounded-card bg-ink-0 p-4 text-ink-800 ring-1 ring-brand-500/30">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-brand-50 text-brand-600"><Car size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">بوابة الزوار — تصريح دخول يومي</p>
          <p className="text-caption text-ink-500">رابط عام يُشارك مع الزوار: 50 ر.س لكل مركبة، دفع إلكتروني ورمز QR يُقبل عند البوابة مباشرة</p>
        </div>
        <bdi dir="ltr" className="plate hidden rounded bg-ink-0/10 px-2.5 py-1 text-micro text-ink-500 sm:block">/visit</bdi>
        <Button
          size="sm"
          variant="outline"
          className="border-ink-300 !text-ink-800"
          onClick={() => {
            navigator.clipboard?.writeText(portalUrl('/visit')).catch(() => {});
            pushToast('نُسخ رابط بوابة الزوار', 'شاركه في قنوات الحي ومداخل الخرائط', 'ok');
          }}
        >
          <Copy size={13} /> نسخ الرابط
        </Button>
        <a href={portalUrl('/visit')} target="_blank" rel="noreferrer">
          <Button size="sm"><ExternalLink size={13} /> فتح البوابة</Button>
        </a>
      </div>

      {/* live operations layer */}
      <SectionTitle sub="مؤشرات لحظية — تتغير أمامك مع نشاط بقية الشخصيات">العمليات الآن</SectionTitle>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="بلاغات مفتوحة" value={openRequests.length} onClick={() => navigate('/requests')} />
        <Stat label="تجاوزات SLA" value={slaBreaches.length} onClick={() => navigate('/requests')} />
        <Stat label="مخالفات قائمة" value={openViolations.length} onClick={() => navigate('/violations')} />
        <Stat label="تصاريح بانتظار الاعتماد" value={pendingPermits.length} onClick={() => navigate('/permits')} />
        <Stat label="حاويات فوق 80%" value={fullBinsCount} onClick={() => navigate('/operations')} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-3">
          <p className="mb-2 px-1 text-caption font-semibold text-ink-500">
            خريطة الحي الحية — بلاغات ومخالفات وأصول IoT على النموذج ثلاثي الأبعاد · حرّك وقرّب
          </p>
          <Map3D
            layers={{ requests: true, violations: true, bins: true, lamps: true, tanks: true, gates: true }}
            className="aspect-[16/9]"
            onOpen={(link) => {
              if (link === 'violations') navigate('/violations');
              else if (link === 'operations') navigate('/operations');
              else if (link.startsWith('gate:')) navigate('/twin');
              else navigate('/requests');
            }}
          />
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <p className="mb-2 text-caption font-semibold text-ink-500">أحدث المخالفات</p>
            <div className="space-y-2">
              {openViolations.slice(0, 4).map((v) => (
                <Link key={v.id} to="/violations" className="block rounded-card bg-ink-50 p-2.5 transition-colors hover:bg-brand-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-caption font-semibold">{v.code} · {v.labelAr}</span>
                    {violationPill(v.status)}
                  </div>
                  <p className="mt-0.5 text-micro text-ink-500">{ago(v.events[0]?.atISO ?? '')} {v.repeatCount > 1 ? `· تكرار ${v.repeatCount}` : ''}</p>
                </Link>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <p className="mb-2 text-caption font-semibold text-ink-500">أحدث الطلبات</p>
            <div className="space-y-2">
              {openRequests.slice(0, 4).map((r) => (
                <Link key={r.id} to="/requests" className="block rounded-card bg-ink-50 p-2.5 transition-colors hover:bg-brand-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-caption font-semibold">{requestKindAr[r.kind]}</span>
                    {requestPill(r.status)}
                  </div>
                  <p className="mt-0.5 truncate text-micro text-ink-500">{r.descriptionAr}</p>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
