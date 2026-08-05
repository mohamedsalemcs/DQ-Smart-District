import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, CalendarDays, CheckCircle2, MapPin, Megaphone, Plus, Send, Ticket, Users, XCircle } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '@dq/core';
import { Button, Card, EmptyState, Field, Input, Modal, SectionTitle, Select, TextArea } from '@dq/ui';
import { KpiCard, axisTick, chartTooltip } from '../components/charts';
import { permitPill } from '../components/StatusPill';
import { fmtDateTime } from '@dq/core';
import { eventApprovalStatusAr, eventMinistryAr, eventPartyAr, eventRequestStatusAr, eventRequesterAr, permitKindAr } from '@dq/core';
import type { EventPartyKind, EventRequesterKind } from '@dq/core';

const statusAr = { confirmed: 'مؤكد', cancelled: 'ملغى', used: 'منفّذ' } as const;
const STATUS_COLORS = { confirmed: 'var(--color-viz-3)', used: 'var(--color-viz-5)', cancelled: 'var(--color-viz-4)' } as const;

const eventStatusCls = {
  pending: 'bg-warn-600-50 text-warn-600',
  approved: 'bg-ok-600-50 text-ok-600',
  rejected: 'bg-danger-50 text-danger-600',
} as const;

const PARTY_KINDS = Object.keys(eventPartyAr) as EventPartyKind[];

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

  /* event request form */
  const facilities = useMemo(
    () => store.assets.filter((a) => a.kind === 'garden' || a.kind === 'court'),
    [store.assets],
  );
  const embassyProps = useMemo(() => store.properties.filter((p) => p.type === 'embassy'), [store.properties]);
  const commercialProps = useMemo(() => store.properties.filter((p) => p.type === 'commercial'), [store.properties]);

  const [formOpen, setFormOpen] = useState(false);
  const [reqKind, setReqKind] = useState<EventRequesterKind>('embassy');
  const [reqPropId, setReqPropId] = useState(() => embassyProps[0]?.id ?? '');
  const [reqName, setReqName] = useState(() => embassyProps[0]?.unitNo ?? '');
  const [title, setTitle] = useState('');
  const [facilityId, setFacilityId] = useState(() => facilities[0]?.id ?? '');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [attendees, setAttendees] = useState(50);
  const [notes, setNotes] = useState('');
  const [parties, setParties] = useState<EventPartyKind[]>([]);

  const changeReqKind = (k: EventRequesterKind) => {
    setReqKind(k);
    if (k === 'embassy') {
      setReqPropId(embassyProps[0]?.id ?? '');
      setReqName(embassyProps[0]?.unitNo ?? '');
    } else if (k === 'commercial') {
      setReqPropId(commercialProps[0]?.id ?? '');
      setReqName(commercialProps[0]?.subtypeAr ?? commercialProps[0]?.unitNo ?? '');
    } else {
      setReqPropId('');
      setReqName('');
    }
  };

  const toggleParty = (p: EventPartyKind) =>
    setParties((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const submitEventRequest = () => {
    const created = store.createEventRequest({
      titleAr: title,
      requesterKind: reqKind,
      requesterNameAr: reqName,
      requesterPropertyId: reqPropId || undefined,
      facilityId,
      fromISO: from,
      toISO: to,
      attendees,
      notesAr: notes,
      parties,
    });
    if (created) {
      setFormOpen(false);
      setTitle('');
      setFrom('');
      setTo('');
      setAttendees(50);
      setNotes('');
      setParties([]);
    }
  };

  /* filters — حالة الطلب أو حالة الاعتماد الوزاري */
  const [evFilter, setEvFilter] = useState('all');
  const eventRequests = useMemo(() => {
    const list = store.eventRequests;
    if (evFilter === 'all') return list;
    if (evFilter === 'awaiting_interior')
      return list.filter((r) => r.approvals.some((a) => a.ministry === 'interior' && a.status === 'pending'));
    if (evFilter === 'awaiting_foreign_affairs')
      return list.filter((r) => r.approvals.some((a) => a.ministry === 'foreign_affairs' && a.status === 'pending'));
    return list.filter((r) => r.status === evFilter);
  }, [store.eventRequests, evFilter]);

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

      {/* event requests — الجهات الخارجية والاعتمادات الوزارية */}
      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-bold">
            <Megaphone size={15} className="text-brand-600" /> طلبات الفعاليات — التنسيق والاعتمادات
          </p>
          <div className="flex items-center gap-2">
            <Select value={evFilter} onChange={(e) => setEvFilter(e.target.value)} className="!w-56">
              <option value="all">كل الطلبات</option>
              <option value="pending">قيد المراجعة</option>
              <option value="approved">معتمدة</option>
              <option value="rejected">مرفوضة</option>
              <option value="awaiting_interior">بانتظار وزارة الداخلية</option>
              <option value="awaiting_foreign_affairs">بانتظار وزارة الخارجية</option>
            </Select>
            <Button size="sm" onClick={() => setFormOpen(true)}><Plus size={14} /> طلب فعالية جديد</Button>
          </div>
        </div>

        {eventRequests.length === 0 && <EmptyState title="لا طلبات ضمن هذا التصنيف" />}
        <div className="grid gap-3 lg:grid-cols-2">
          {eventRequests.map((r) => {
            const facility = store.assets.find((a) => a.id === r.facilityId);
            return (
              <div key={r.id} className="rounded-card bg-ink-50 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">{r.titleAr}</p>
                    <p className="mt-0.5 text-caption text-ink-500">
                      {eventRequesterAr[r.requesterKind]} · <b className="text-ink-800">{r.requesterNameAr}</b>
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-caption font-semibold ${eventStatusCls[r.status]}`}>
                    {eventRequestStatusAr[r.status]}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-caption text-ink-500">
                  <span className="flex items-center gap-1"><MapPin size={11} /> {facility?.nameAr ?? r.facilityId}</span>
                  <span className="flex items-center gap-1 tabular-nums"><CalendarDays size={11} /> {fmtDateTime(r.fromISO)}</span>
                  <span className="flex items-center gap-1 tabular-nums"><Users size={11} /> {r.attendees} شخص</span>
                </div>
                {r.notesAr && <p className="mt-1.5 text-caption text-ink-500">{r.notesAr}</p>}

                {r.parties.length > 0 && (
                  <div className="mt-2.5">
                    <p className="mb-1 text-micro font-semibold text-ink-500">
                      جهات التنسيق — أُرسلت فور التسجيل{r.partiesSentISO ? ` (${fmtDateTime(r.partiesSentISO)})` : ''}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {r.parties.map((p) => (
                        <span key={p} className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-caption font-medium text-brand-600">
                          <Send size={10} /> {eventPartyAr[p]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {r.approvals.length > 0 && (
                  <div className="mt-2.5 space-y-1.5">
                    <p className="text-micro font-semibold text-ink-500">الاعتمادات الوزارية</p>
                    {r.approvals.map((a) => (
                      <div key={a.ministry} className="flex items-center justify-between gap-2 rounded-card bg-ink-0 px-2.5 py-1.5">
                        <span className="text-caption font-medium">{eventMinistryAr[a.ministry]}</span>
                        {a.status === 'pending' && r.status === 'pending' ? (
                          <span className="flex items-center gap-1.5">
                            <span className={`rounded-full px-2 py-0.5 text-micro font-semibold ${eventStatusCls.pending}`}>
                              {eventApprovalStatusAr.pending}
                            </span>
                            <button
                              onClick={() => store.decideEventApproval(r.id, a.ministry, 'approved')}
                              title={`موافقة ${eventMinistryAr[a.ministry]} (محاكاة)`}
                              className="rounded p-1 text-ok-600 hover:bg-ok-600-50"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                            <button
                              onClick={() => store.decideEventApproval(r.id, a.ministry, 'rejected')}
                              title={`رفض ${eventMinistryAr[a.ministry]} (محاكاة)`}
                              className="rounded p-1 text-danger-600 hover:bg-danger-50"
                            >
                              <XCircle size={15} />
                            </button>
                          </span>
                        ) : (
                          <span className={`rounded-full px-2 py-0.5 text-micro font-semibold ${eventStatusCls[a.status]}`}>
                            {eventApprovalStatusAr[a.status]}
                            {a.decidedISO ? ` · ${fmtDateTime(a.decidedISO)}` : ''}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {r.approvals.length === 0 && r.status === 'pending' && (
                  <div className="mt-2.5 flex gap-2">
                    <Button size="sm" variant="success" onClick={() => store.decideEventRequest(r.id, 'approved')}>
                      <CheckCircle2 size={13} /> اعتماد
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => store.decideEventRequest(r.id, 'rejected')}>
                      <XCircle size={13} /> رفض
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

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
                          <Link to={`/properties/${property.id}`} className="hover:text-brand-600">{property.code}</Link>
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
          <Link to="/permits">
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
                    {property && <Link to={`/properties/${property.id}`} className="text-ink-500 hover:text-brand-600">({property.code})</Link>}
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

      {/* event request form */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="طلب فعالية جديد">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="الجهة الطالبة">
              <Select value={reqKind} onChange={(e) => changeReqKind(e.target.value as EventRequesterKind)}>
                {Object.entries(eventRequesterAr).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            {reqKind === 'embassy' ? (
              <Field label="السفارة / البعثة">
                <Select
                  value={reqPropId}
                  onChange={(e) => {
                    const p = embassyProps.find((x) => x.id === e.target.value);
                    setReqPropId(e.target.value);
                    setReqName(p?.unitNo ?? '');
                  }}
                >
                  {embassyProps.map((p) => <option key={p.id} value={p.id}>{p.unitNo}</option>)}
                </Select>
              </Field>
            ) : reqKind === 'commercial' ? (
              <Field label="المنشأة">
                <Select
                  value={reqPropId}
                  onChange={(e) => {
                    const p = commercialProps.find((x) => x.id === e.target.value);
                    setReqPropId(e.target.value);
                    setReqName(p?.subtypeAr ?? p?.unitNo ?? '');
                  }}
                >
                  {commercialProps.map((p) => <option key={p.id} value={p.id}>{p.subtypeAr ?? p.unitNo}</option>)}
                </Select>
              </Field>
            ) : (
              <Field label="اسم الجهة / الطالب">
                <Input value={reqName} onChange={(e) => setReqName(e.target.value)} placeholder="الاسم" />
              </Field>
            )}
          </div>

          <Field label="عنوان الفعالية">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: احتفال اليوم الوطني" />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="الموقع">
              <Select value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
                {facilities.map((f) => <option key={f.id} value={f.id}>{f.nameAr}</option>)}
              </Select>
            </Field>
            <Field label="الحضور المتوقع">
              <Input type="number" min={1} value={attendees} onChange={(e) => setAttendees(Math.max(1, +e.target.value))} />
            </Field>
            <Field label="من">
              <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="إلى">
              <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>

          <Field label="الجهات الخارجية المطلوبة — يُرسل الطلب لكل جهة محددة فور الحفظ">
            <div className="flex flex-wrap gap-2">
              {PARTY_KINDS.map((p) => (
                <label
                  key={p}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-caption font-medium ring-1 transition-colors ${
                    parties.includes(p) ? 'bg-brand-50 text-brand-600 ring-brand-500' : 'bg-ink-0 text-ink-500 ring-ink-100 hover:bg-ink-50'
                  }`}
                >
                  <input type="checkbox" className="sr-only" checked={parties.includes(p)} onChange={() => toggleParty(p)} />
                  {parties.includes(p) ? <CheckCircle2 size={13} /> : <Plus size={13} />}
                  {eventPartyAr[p]}
                </label>
              ))}
            </div>
          </Field>
          <p className="rounded-card bg-ink-50 p-2.5 text-caption text-ink-500">
            الاعتمادات: طلب جهة أمنية (الشرطة، المرور، الدفاع المدني) يُنشئ اعتمادًا معلقًا لدى <b>وزارة الداخلية</b>،
            وفعاليات السفارات تُنشئ اعتمادًا معلقًا لدى <b>وزارة الخارجية</b>.
          </p>

          <Field label="ملاحظات (اختياري)">
            <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="اشتراطات أو تفاصيل إضافية" />
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setFormOpen(false)}>إلغاء</Button>
          <Button onClick={submitEventRequest}><Send size={14} /> تسجيل وإرسال للجهات</Button>
        </div>
      </Modal>
    </div>
  );
}
