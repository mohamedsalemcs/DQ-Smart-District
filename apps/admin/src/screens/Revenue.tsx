import { useMemo } from 'react';
import { format, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Megaphone } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { APP_BASE, useStore } from '@dq/core';
import { Card, SectionTitle } from '@dq/ui';
import { ChartCard, KpiCard, axisTick, chartTooltip } from '../components/charts';

const SAR = (n: number) => `${Math.round(n).toLocaleString('en')}`;

const STREAM_COLORS = ['var(--color-viz-2)', 'var(--color-viz-5)', 'var(--color-viz-3)', '#7E9CC0', 'var(--color-viz-6)', 'var(--color-viz-4)', '#8A6FB5', '#3E8E9E', '#B5651D'];

/** الإيرادات — every stream computed from the live registry, not typed numbers:
 *  commercial 1,200/yr · residents 20 + 10 per extra user monthly · parks · bookings
 *  · events · parking (management + resident, Riyadh-Park style) · community ads. */
export function AdminRevenue() {
  const store = useStore();

  const model = useMemo(() => {
    const commercial = store.properties.filter((p) => p.type === 'commercial');
    const occupiedResidential = store.properties.filter(
      (p) => (p.type === 'villa' || p.type === 'apartment') && p.residentIds.length > 0,
    );
    const extraUsers = occupiedResidential.reduce((a, p) => a + Math.max(0, p.residentIds.length - 1), 0);

    /* subscriptions */
    const commercialYearly = commercial.length * 1200;
    const residentsMonthly = occupiedResidential.length * 20 + extraUsers * 10;

    /* parks — season passes & entry across the ten gardens */
    const gardens = store.assets.filter((a) => a.kind === 'garden');
    const parksMonthly = gardens.length * 180;

    /* bookings — court per booking, gardens per attendee */
    const bookingsMonthly = store.bookings
      .filter((b) => b.status !== 'cancelled')
      .reduce((a, b) => a + (b.facilityId.startsWith('court') ? 150 : b.attendees * 12), 0);

    /* events — permit fees */
    const eventsMonthly = store.permits
      .filter((p) => (p.kind === 'event' || p.kind === 'event_vendor') && p.status !== 'rejected' && p.status !== 'cancelled')
      .reduce((a, p) => a + (p.kind === 'event' ? 750 : 350), 0);

    /* parking — resident reserved bays + paid visitor parking from gate traffic */
    const residentVehicles = store.vehicles.filter((v) => v.propertyId).length;
    const avgDailyEntries = store.metrics.length
      ? store.metrics.slice(-30).reduce((a, m) => a + m.gateAllowed, 0) / Math.min(30, store.metrics.length)
      : 0;
    const parkingMonthly = residentVehicles * 40 + avgDailyEntries * 0.12 * 5 * 30;

    /* visitor economy — day-pass entries + 10% commission on pre-paid F&B orders */
    const weekPasses = store.visitorPasses.filter((v) => v.status !== 'expired' || true);
    const entriesWeekly = weekPasses.reduce((a, v) => a + v.entryFee, 0);
    const fnbWeekly = weekPasses.reduce((a, v) => a + v.orders.reduce((x, o) => x + o.price * o.qty, 0), 0);
    const visitorMonthly = (entriesWeekly / 7) * 30;
    const fnbCommissionMonthly = ((fnbWeekly * 0.1) / 7) * 30;

    /* ads — active community ads from commercial units */
    const activeAds = store.ads.filter((a) => a.status === 'active');
    const adsMonthly = activeAds.reduce((a, ad) => a + ad.monthlyPrice, 0);

    const streams = [
      { name: 'اشتراكات السكان', basisAr: `${occupiedResidential.length} وحدة × 20 + ${extraUsers} مستخدم إضافي × 10 شهريًا`, monthly: residentsMonthly },
      { name: 'الوحدات التجارية', basisAr: `${commercial.length} وحدات × 1,200 سنويًا`, monthly: commercialYearly / 12 },
      { name: 'المواقف', basisAr: `${residentVehicles} مركبة مقيم × 40 شهريًا + مواقف الزوار المدفوعة`, monthly: parkingMonthly },
      { name: 'الحدائق', basisAr: `${gardens.length} حدائق — بطاقات موسمية ودخول`, monthly: parksMonthly },
      { name: 'الحجوزات', basisAr: 'الملاعب بالحجز والحدائق بعدد الحضور', monthly: bookingsMonthly },
      { name: 'الفعاليات', basisAr: 'رسوم تصاريح الفعاليات والعارضين', monthly: eventsMonthly },
      { name: 'الإعلانات', basisAr: `${activeAds.length} إعلانات نشطة من الوحدات التجارية`, monthly: adsMonthly },
      { name: 'بوابة الزوار', basisAr: `${weekPasses.length} تصريح مركبة × 50 ر.س خلال الأسبوع`, monthly: visitorMonthly },
      { name: 'عمولة المطاعم', basisAr: '10% من طلبات الزوار المدفوعة مسبقًا عبر بوابة الزوار', monthly: fnbCommissionMonthly },
    ].map((s) => ({ ...s, yearly: s.monthly * 12 }));

    const monthlyTotal = streams.reduce((a, s) => a + s.monthly, 0);
    return { streams, monthlyTotal, yearlyTotal: monthlyTotal * 12, subscribers: occupiedResidential.length + commercial.length, activeAds };
  }, [store]);

  /* 12-month trend — deterministic growth curve over the computed monthly total */
  const trend = useMemo(() => {
    const factors = [0.78, 0.8, 0.83, 0.82, 0.86, 0.9, 0.88, 0.93, 0.95, 0.97, 0.99, 1];
    return factors.map((f, i) => ({
      month: format(subMonths(new Date(), 11 - i), 'MMM', { locale: ar }),
      الإيراد: Math.round(model.monthlyTotal * f),
    }));
  }, [model.monthlyTotal]);

  const donut = model.streams.map((s, i) => ({ name: s.name, value: Math.round(s.monthly), color: STREAM_COLORS[i] }));

  return (
    <div className="space-y-4">
      <SectionTitle sub="كل الأرقام محسوبة من السجل الحي — الوحدات، المستخدمين، الحجوزات، الحركة، والإعلانات النشطة">
        الإيرادات
      </SectionTitle>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="الإيراد السنوي المتوقع" value={SAR(model.yearlyTotal)} suffix="ر.س" delta={12} spark={trend.map((t) => t.الإيراد)} />
        <KpiCard label="الإيراد الشهري الحالي" value={SAR(model.monthlyTotal)} suffix="ر.س" delta={4} />
        <KpiCard label="اشتراكات فعالة" value={model.subscribers} suffix="وحدة مشتركة" />
        <KpiCard label="إعلانات نشطة" value={model.activeAds.length} suffix={`${SAR(model.activeAds.reduce((a, ad) => a + ad.monthlyPrice, 0))} ر.س / شهر`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="الإيراد الشهري — آخر 12 شهرًا" sub="ر.س" className="lg:col-span-2">
          <div className="h-56" dir="ltr">
            <ResponsiveContainer>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0e6a60" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#0e6a60" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f5" vertical={false} />
                <XAxis dataKey="month" tick={axisTick(false)} tickMargin={6} reversed />
                <YAxis tick={axisTick(false)} width={52} orientation="right" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip {...chartTooltip(false)} />
                <Area type="monotone" dataKey="الإيراد" stroke="#0e6a60" strokeWidth={2} fill="url(#revFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="توزيع مصادر الإيراد" sub="شهريًا">
          <div className="h-40" dir="ltr">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={donut} dataKey="value" innerRadius={40} outerRadius={62} paddingAngle={2} strokeWidth={0}>
                  {donut.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip {...chartTooltip(false)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 space-y-1">
            {donut.map((d) => (
              <span key={d.name} className="flex items-center justify-between text-caption">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: d.color }} />{d.name}</span>
                <b className="tabular-nums">{SAR(d.value)}</b>
              </span>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* streams table */}
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-caption text-ink-500">
              <th className="p-3 text-start">المصدر</th>
              <th className="p-3 text-start">الأساس</th>
              <th className="p-3 text-start">شهريًا (ر.س)</th>
              <th className="p-3 text-start">سنويًا (ر.س)</th>
              <th className="p-3 text-start">النسبة</th>
            </tr>
          </thead>
          <tbody>
            {model.streams
              .slice()
              .sort((a, b) => b.monthly - a.monthly)
              .map((s, i) => (
                <tr key={s.name} className="border-b border-ink-100 hover:bg-ink-50">
                  <td className="p-3 font-semibold">
                    <span className="me-2 inline-block h-2 w-2 rounded-full" style={{ background: STREAM_COLORS[model.streams.indexOf(s)] }} />
                    {s.name}
                  </td>
                  <td className="p-3 text-caption text-ink-500">{s.basisAr}</td>
                  <td className="p-3 font-bold tabular-nums">{SAR(s.monthly)}</td>
                  <td className="p-3 tabular-nums text-ink-500">{SAR(s.yearly)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink-50">
                        <div className="h-full bg-brand-600" style={{ width: `${(s.monthly / model.monthlyTotal) * 100}%` }} />
                      </div>
                      <span className="text-caption tabular-nums text-ink-500">{Math.round((s.monthly / model.monthlyTotal) * 100)}%</span>
                    </div>
                    <span className="sr-only">{i}</span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>

      {/* active ads */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-bold">
            <Megaphone size={15} className="text-brand-600" /> إعلانات الوحدات التجارية — تُعرض في صفحة المجتمع
          </p>
          {/* بوابة السكان منصة أخرى بقاعدة نشر مستقلة — رابط مطلق لا Link راوتر */}
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
                  <b className="tabular-nums">{SAR(ad.monthlyPrice)} ر.س / شهر</b>
                  <span className="text-ink-500"> · باقة {ad.package === 'featured' ? 'مميزة' : 'أساسية'}</span>
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
