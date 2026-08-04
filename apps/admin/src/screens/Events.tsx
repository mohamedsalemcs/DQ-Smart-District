import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, CalendarDays, Ticket, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '@dq/core';
import { Button, Card, EmptyState, SectionTitle } from '@dq/ui';
import { KpiCard, axisTick, chartTooltip } from '../components/charts';
import { permitPill } from '../components/StatusPill';
import { fmtDateTime } from '@dq/core';
import { permitKindAr } from '@dq/core';

const statusAr = { confirmed: 'مؤكد', cancelled: 'ملغى', used: 'منفّذ' } as const;
const STATUS_COLORS = { confirmed: 'var(--color-viz-3)', used: 'var(--color-viz-5)', cancelled: 'var(--color-viz-4)' } as const;

export function AdminEvents() {
  const store = useStore();
  const now = Date.now();

  const bookings = store.bookings;
  const upcoming = bookings.filter((b) => b.status === 'confirmed' && new Date(b.fromISO).getTime() > now);
  const expectedAttendees = upcoming.reduce((a, b) => a + b.attendees, 0);
  const eventPermits = useMemo(
    () => store.permits.filter((p) => p.kind === 'event' || p.kind === 'event_vendor'),
    [store.permits],
  );
  const pendingPermits = eventPermits.filter((p) => p.status === 'pending');

  const donut = (['confirmed', 'used', 'cancelled'] as const).map((s) => ({
    name: statusAr[s],
    value: bookings.filter((b) => b.status === s).length,
    color: STATUS_COLORS[s],
  }));

  const byFacility = useMemo(() => {
    const ids = [...new Set(bookings.map((b) => b.facilityId))];
    return ids.map((id) => {
      const f = store.assets.find((a) => a.id === id);
      return {
        name: (f?.nameAr ?? id).replace('حديقة ', '').replace('منتزه ', '').replace('ملعب ', ''),
        حجوزات: bookings.filter((b) => b.facilityId === id).length,
        حضور: bookings.filter((b) => b.facilityId === id && b.status !== 'cancelled').reduce((a, b) => a + b.attendees, 0),
      };
    });
  }, [bookings, store.assets]);

  const requesterOf = (personId: string) => {
    const person = store.people.find((p) => p.id === personId);
    const property = store.properties.find((p) => p.id === person?.propertyId);
    return { person, property };
  };

  return (
    <div className="space-y-4">
      <SectionTitle sub="الحجوزات وتصاريح الفعاليات المرتبطة بها — رمز الحجز نفسه يُقبل عند البوابة">
        الفعاليات والحجوزات
      </SectionTitle>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="إجمالي الحجوزات" value={bookings.length} spark={undefined} />
        <KpiCard label="فعاليات قادمة" value={upcoming.length} suffix="خلال ٣٠ يومًا" />
        <KpiCard label="حضور متوقع" value={expectedAttendees.toLocaleString('en')} suffix="شخص" />
        <KpiCard
          label="تصاريح فعاليات"
          value={eventPermits.length}
          suffix={pendingPermits.length ? `${pendingPermits.length} بانتظار الاعتماد` : 'لا معلّق'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* bookings table with requester identity */}
        <Card className="lg:col-span-2 overflow-x-auto p-0">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-caption text-ink-500">
                <th className="p-3 text-start">المرفق</th>
                <th className="p-3 text-start">الحاجز</th>
                <th className="p-3 text-start">الموعد</th>
                <th className="p-3 text-start">الحضور</th>
                <th className="p-3 text-start">رمز الدخول</th>
                <th className="p-3 text-start">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const { person, property } = requesterOf(b.byPersonId);
                return (
                  <tr key={b.id} className="border-b border-ink-100 hover:bg-ink-50">
                    <td className="p-3 font-medium">{store.assets.find((a) => a.id === b.facilityId)?.nameAr}</td>
                    <td className="p-3">
                      <p className="font-medium">{person?.nameAr}</p>
                      <p className="text-caption text-ink-500">
                        {property ? (
                          <Link to={`/a/properties/${property.id}`} className="hover:text-brand-600">{property.code}</Link>
                        ) : 'غير مرتبط بعقار'}
                        {person?.phone ? ` · ${person.phone}` : ''}
                      </p>
                    </td>
                    <td className="p-3 tabular-nums text-ink-500">{fmtDateTime(b.fromISO)}</td>
                    <td className="p-3 tabular-nums">{b.attendees}</td>
                    <td className="p-3"><bdi dir="ltr" className="plate text-caption">{b.qrToken}</bdi></td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-caption font-semibold ${b.status === 'confirmed' ? 'bg-ok-600-50 text-ok-600' : b.status === 'used' ? 'bg-ink-50 text-ink-500' : 'bg-danger-50 text-danger-600'}`}>
                        {statusAr[b.status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {bookings.length === 0 && <EmptyState title="لا حجوزات" />}
        </Card>

        {/* charts */}
        <div className="space-y-4">
          <Card className="p-4">
            <p className="mb-2 text-caption font-semibold text-ink-500">حالة الحجوزات</p>
            <div className="h-32" dir="ltr">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={donut} dataKey="value" innerRadius={34} outerRadius={52} paddingAngle={3} strokeWidth={0}>
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
                  <b className="tabular-nums">{d.value}</b>
                </span>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <p className="mb-2 text-caption font-semibold text-ink-500">الطلب حسب المرفق — حجوزات وحضور</p>
            <div className="h-44" dir="ltr">
              <ResponsiveContainer>
                <BarChart data={byFacility} layout="vertical" margin={{ right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f5" horizontal={false} />
                  <XAxis type="number" tick={axisTick(false)} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={64} tick={{ ...axisTick(false), fontSize: 10 }} orientation="right" />
                  <Tooltip {...chartTooltip(false)} />
                  <Bar dataKey="حضور" fill="#0e6a60" radius={[0, 2, 2, 0]} maxBarSize={12} />
                  <Bar dataKey="حجوزات" fill="#6bc2b7" radius={[0, 2, 2, 0]} maxBarSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* event permits */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-bold">
            <Ticket size={15} className="text-brand-600" /> تصاريح الفعاليات والعارضين
          </p>
          <Link to="/a/permits">
            <Button size="sm" variant="outline"><BadgeCheck size={13} /> إدارة الاعتماد في التصاريح</Button>
          </Link>
        </div>
        {eventPermits.length === 0 && <EmptyState title="لا تصاريح فعاليات" />}
        <div className="grid gap-3 md:grid-cols-3">
          {eventPermits.map((p) => {
            const { person, property } = requesterOf(p.requestedBy);
            return (
              <div key={p.id} className="rounded-card bg-ink-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{p.subject.nameAr}</p>
                  {permitPill(p.status)}
                </div>
                <p className="mt-1 text-caption text-ink-500">{permitKindAr[p.kind]}</p>
                <div className="mt-2 space-y-1 text-caption">
                  <p className="flex items-center gap-1.5">
                    <Users size={11} className="text-ink-500" />
                    مقدّم الطلب: <b>{person?.nameAr}</b>
                    {property && <Link to={`/a/properties/${property.id}`} className="text-ink-500 hover:text-brand-600">({property.code})</Link>}
                  </p>
                  <p className="flex items-center gap-1.5 tabular-nums text-ink-500">
                    <CalendarDays size={11} /> {fmtDateTime(p.validFromISO)} · {p.companions} مشارك
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
