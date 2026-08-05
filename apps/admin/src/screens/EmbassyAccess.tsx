import { useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Check, Copy, ExternalLink, Landmark, QrCode } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '@dq/core';
import { Button, Card, Input, SectionTitle } from '@dq/ui';
import { KpiCard, axisTick, chartTooltip } from '../components/charts';
import { portalUrl } from '../lib/portal';
import { fmtDateTime } from '@dq/core';

const statusAr = { booked: 'محجوز', attended: 'حضر', expired: 'لم يحضر', cancelled: 'ملغى' } as const;
const statusCls = {
  booked: 'bg-warn-600-50 text-warn-600',
  attended: 'bg-ok-600-50 text-ok-600',
  expired: 'bg-danger-50 text-danger-600',
  cancelled: 'bg-ink-50 text-ink-500',
} as const;

/** تنظيم دخول السفارات — public booking links, daily limits, per-embassy analytics.
 *  The QR issued on booking is the same token the gate accepts. */
export function EmbassyAccess() {
  const store = useStore();
  const embassies = useMemo(() => store.properties.filter((p) => p.type === 'embassy'), [store.properties]);
  const [selectedId, setSelectedId] = useState(embassies[0]?.id);
  const [copied, setCopied] = useState<string | null>(null);
  const [limitDraft, setLimitDraft] = useState<Record<string, number>>({});

  const selected = embassies.find((e) => e.id === selectedId) ?? embassies[0];
  const today = new Date().toDateString();

  const apptsOf = (propId: string) => store.appointments.filter((a) => a.embassyPropId === propId);
  const todayCount = (propId: string) =>
    apptsOf(propId).filter((a) => a.status === 'booked' && new Date(a.dateISO).toDateString() === today).length;
  const attendanceRate = (propId: string) => {
    const past = apptsOf(propId).filter((a) => a.status === 'attended' || a.status === 'expired');
    return past.length ? Math.round((past.filter((a) => a.status === 'attended').length / past.length) * 100) : 0;
  };

  const totals = {
    appointments: store.appointments.length,
    today: store.appointments.filter((a) => new Date(a.dateISO).toDateString() === today).length,
    attendance: Math.round(
      embassies.reduce((sum, e) => sum + attendanceRate(e.id), 0) / Math.max(1, embassies.length),
    ),
  };

  /* last-7-days bookings for the selected embassy */
  const weekSeries = useMemo(() => {
    if (!selected) return [];
    return Array.from({ length: 7 }, (_, i) => {
      const day = subDays(new Date(), 6 - i);
      const key = day.toDateString();
      return {
        day: format(day, 'EEEE', { locale: ar }).replace('يوم ', ''),
        مواعيد: apptsOf(selected.id).filter((a) => new Date(a.dateISO).toDateString() === key).length,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, store.appointments]);

  const upcoming = useMemo(
    () =>
      (selected ? apptsOf(selected.id) : [])
        .filter((a) => a.status === 'booked')
        .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
        .slice(0, 8),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, store.appointments],
  );

  const copyLink = (propId: string) => {
    const url = portalUrl(`/book/${propId}`);
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(propId);
    setTimeout(() => setCopied(null), 1600);
    store.pushToast('نُسخ الرابط العام', 'شاركه مع السفارة لتضعه على قنواتها', 'ok');
  };

  if (!selected) return null;

  return (
    <div className="space-y-4">
      <SectionTitle sub="رابط حجز عام لكل سفارة — الزائر يحجز موعدًا ويستلم رمز QR يُقبل مباشرة عند البوابة">
        تنظيم دخول السفارات
      </SectionTitle>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="إجمالي المواعيد" value={totals.appointments} suffix="آخر أسبوع + القادم" />
        <KpiCard label="مواعيد اليوم" value={totals.today} />
        <KpiCard label="نسبة الحضور" value={`${totals.attendance}%`} delta={5} />
        <KpiCard label="سفارات مفعّلة" value={embassies.length} />
      </div>

      {/* embassy cards: link + limit + usage */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {embassies.map((e) => {
          const limit = store.embassyConfigs[e.id]?.dailyLimit ?? 20;
          const used = todayCount(e.id);
          const draft = limitDraft[e.id] ?? limit;
          const activeCard = e.id === selected.id;
          return (
            <button
              key={e.id}
              onClick={() => setSelectedId(e.id)}
              className={`rounded-card bg-ink-0 p-4 text-start ring-1 transition-all ${activeCard ? 'ring-2 ring-brand-500' : 'ring-ink-100 hover:-translate-y-0.5'}`}
             
            >
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Landmark size={16} /></span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{e.unitNo}</p>
                  <p className="text-micro text-ink-500">{e.code} · نسبة حضور {attendanceRate(e.id)}%</p>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex justify-between text-micro text-ink-500">
                  <span>مواعيد اليوم</span>
                  <span className="tabular-nums">{used} / {limit}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-50">
                  <div className={`h-full ${used >= limit ? 'bg-danger-600' : 'bg-brand-600'}`} style={{ width: `${Math.min(100, (used / limit) * 100)}%` }} />
                </div>
              </div>

              {/* daily limit config */}
              <div className="mt-3 flex items-center gap-1.5" onClick={(ev) => ev.stopPropagation()}>
                <span className="text-micro text-ink-500">الحد اليومي</span>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={draft}
                  onChange={(ev) => setLimitDraft((d) => ({ ...d, [e.id]: +ev.target.value }))}
                  className="!w-16 !px-2 !py-1 text-center text-caption"
                />
                {draft !== limit && (
                  <Button size="sm" onClick={() => store.setEmbassyLimit(e.id, draft)}><Check size={12} /></Button>
                )}
              </div>

              {/* public link */}
              <div className="mt-3 flex items-center gap-1" onClick={(ev) => ev.stopPropagation()}>
                <bdi dir="ltr" className="plate flex-1 truncate rounded bg-ink-50 px-2 py-1 text-micro text-ink-500">/book/{e.id}</bdi>
                <button onClick={() => copyLink(e.id)} title="نسخ الرابط العام" className="rounded p-1.5 text-ink-500 hover:bg-ink-50 hover:text-ink-900-800">
                  {copied === e.id ? <Check size={13} className="text-ok-600" /> : <Copy size={13} />}
                </button>
                <a href={portalUrl(`/book/${e.id}`)} target="_blank" rel="noreferrer" title="فتح صفحة الحجز" className="rounded p-1.5 text-ink-500 hover:bg-ink-50 hover:text-ink-900-800">
                  <ExternalLink size={13} />
                </a>
              </div>
            </button>
          );
        })}
      </div>

      {/* selected embassy analytics */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <p className="mb-3 text-caption font-semibold text-ink-500">مواعيد {selected.unitNo} — آخر 7 أيام</p>
          <div className="h-48" dir="ltr">
            <ResponsiveContainer>
              <BarChart data={weekSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f5" vertical={false} />
                <XAxis dataKey="day" tick={axisTick(false)} tickMargin={5} reversed />
                <YAxis tick={axisTick(false)} width={22} allowDecimals={false} orientation="right" />
                <Tooltip {...chartTooltip(false)} />
                <Bar dataKey="مواعيد" fill="#0e6a60" radius={[3, 3, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-2 overflow-x-auto p-0">
          <div className="flex items-center justify-between p-3 pb-0">
            <p className="text-caption font-semibold text-ink-500">المواعيد القادمة — {selected.unitNo}</p>
            <span className="flex items-center gap-1 text-micro text-ink-500"><QrCode size={11} /> الرمز يُقبل عند البوابة ويُستهلك مرة واحدة</span>
          </div>
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-caption text-ink-500">
                <th className="p-3 text-start">الزائر</th>
                <th className="p-3 text-start">الغرض</th>
                <th className="p-3 text-start">الموعد</th>
                <th className="p-3 text-start">رمز الدخول</th>
                <th className="p-3 text-start">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((a) => (
                <tr key={a.id} className="border-b border-ink-100 hover:bg-ink-50">
                  <td className="p-3">
                    <p className="font-medium">{a.visitorNameAr}</p>
                    <p className="text-micro text-ink-500">{a.phone}</p>
                  </td>
                  <td className="p-3 text-caption">{a.purposeAr}</td>
                  <td className="p-3 tabular-nums text-caption text-ink-500">{fmtDateTime(a.dateISO)}</td>
                  <td className="p-3"><bdi dir="ltr" className="plate text-caption">{a.qrToken}</bdi></td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-caption font-semibold ${statusCls[a.status]}`}>{statusAr[a.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {upcoming.length === 0 && <p className="p-6 text-center text-caption text-ink-500">لا مواعيد قادمة لهذه السفارة</p>}
        </Card>
      </div>
    </div>
  );
}
