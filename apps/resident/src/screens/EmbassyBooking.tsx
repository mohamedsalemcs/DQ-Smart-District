import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CalendarDays, CheckCircle2, Landmark, QrCode } from 'lucide-react';
import { useStore } from '@dq/core';
import { Button, Field, Input, Select } from '@dq/ui';
import { Txn } from '@dq/ui';
import { fmtDateTime } from '@dq/core';
import type { EmbassyAppointment } from '@dq/core';

const PURPOSES = ['تأشيرة زيارة', 'خدمات قنصلية', 'توثيق مستندات', 'مقابلة رسمية', 'استلام جواز'];
const HOURS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '13:00', '13:30', '14:00', '14:30'];

/** the embassy's PUBLIC booking link — no login, no shell; issues a gate-ready QR. */
export function EmbassyBooking() {
  const { embassyId = '' } = useParams();
  const store = useStore();
  const embassy = store.properties.find((p) => p.id === embassyId && p.type === 'embassy');

  const [dayOffset, setDayOffset] = useState(1);
  const [hour, setHour] = useState(HOURS[0]);
  const [name, setName] = useState('');
  const [natId, setNatId] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<EmbassyAppointment | null>(null);

  const limit = store.embassyConfigs[embassyId]?.dailyLimit ?? 20;
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = addDays(new Date(), i);
        const used = store.appointments.filter(
          (a) => a.embassyPropId === embassyId && a.status === 'booked' && new Date(a.dateISO).toDateString() === date.toDateString(),
        ).length;
        return { offset: i, date, left: Math.max(0, limit - used) };
      }),
    [store.appointments, embassyId, limit],
  );

  if (!embassy) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-25 p-4">
        <p className="text-sm text-ink-500">الرابط غير صحيح — تأكد من رابط السفارة</p>
      </div>
    );
  }

  const submit = () => {
    if (!name.trim() || !natId.trim() || !phone.trim()) {
      setErr('الاسم ورقم الهوية والجوال حقول إلزامية');
      return;
    }
    setErr('');
    const slot = addDays(new Date(), dayOffset);
    const [h, m] = hour.split(':').map(Number);
    slot.setHours(h, m, 0, 0);
    const appt = store.bookEmbassyAppointment({
      embassyPropId: embassy.id,
      visitorNameAr: name,
      nationalId: natId,
      phone,
      purposeAr: purpose,
      dateISO: slot.toISOString(),
    });
    if (appt) setDone(appt);
  };

  return (
    <div className="min-h-screen bg-ink-25 pb-10" dir="rtl">
      {/* public header */}
      <header className="bg-ink-0 px-4 py-5 text-ink-800">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-card bg-brand-600 font-bold text-ink-900">DQ</span>
          <div>
            <p className="text-sm font-bold">الحي الدبلوماسي الذكي</p>
            <p className="text-caption text-ink-500">بوابة مواعيد السفارات</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4">
        <div className="-mt-0 rounded-b-[6px] bg-ink-50 p-4 text-ink-800">
          <p className="flex items-center gap-2 text-base font-bold"><Landmark size={17} className="text-brand-600" /> {embassy.unitNo}</p>
          <p className="mt-1 text-caption text-ink-500">احجز موعد زيارتك — يصلك رمز QR يُبرز عند بوابة الحي مباشرة، دون أي إجراء إضافي</p>
        </div>

        {done ? (
          <div className="mt-4 rounded-card bg-ink-0 p-6 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok-600-50 text-ok-600"><CheckCircle2 size={28} /></span>
            <h2 className="mt-3 text-lg font-bold">تم تأكيد موعدك</h2>
            <p className="mt-1 text-sm text-ink-500">{embassy.unitNo} · {fmtDateTime(done.dateISO)}</p>
            <div className="mx-auto mt-4 w-fit rounded-card border-2 border-ink-900 p-4">
              <QrCode size={120} className="text-ink-900" />
              <bdi dir="ltr" className="plate mt-2 block text-caption font-bold text-ink-800"><Txn no={done.qrToken} /></bdi>
            </div>
            <div className="mt-4 space-y-1 rounded-card bg-warn-600-50 p-3 text-start text-caption text-ink-800">
              <p>• أبرز هذا الرمز عند <b>بوابة الحي</b> يوم الموعد — الدخول آلي.</p>
              <p>• الرمز صالح لمرة واحدة وليوم الموعد فقط.</p>
              <p>• أحضر هويتك الوطنية / الإقامة المطابقة للبيانات المسجلة.</p>
            </div>
            <Button variant="outline" className="mt-4" onClick={() => setDone(null)}>حجز موعد آخر</Button>
          </div>
        ) : (
          <div className="mt-4 space-y-4 rounded-card bg-ink-0 p-5">
            {/* day picker with live availability */}
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"><CalendarDays size={14} /> اليوم</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 thin-scroll">
                {days.map((d) => (
                  <button
                    key={d.offset}
                    disabled={d.left === 0}
                    onClick={() => setDayOffset(d.offset)}
                    className={`min-w-[76px] rounded-card border p-2 text-center text-caption transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      dayOffset === d.offset ? 'border-brand-500 bg-brand-50 font-bold' : 'border-ink-100 hover:border-brand-300'
                    }`}
                  >
                    <p className="font-semibold">{d.offset === 0 ? 'اليوم' : d.offset === 1 ? 'غدًا' : format(d.date, 'EEEE', { locale: ar })}</p>
                    <p className="text-micro text-ink-500">{format(d.date, 'd MMM', { locale: ar })}</p>
                    <p className={`mt-0.5 text-micro font-semibold ${d.left === 0 ? 'text-danger-600' : d.left <= 3 ? 'text-warn-600' : 'text-ok-600'}`}>
                      {d.left === 0 ? 'مكتمل' : `${d.left} متاح`}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="الوقت">
                <Select value={hour} onChange={(e) => setHour(e.target.value)}>
                  {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                </Select>
              </Field>
              <Field label="الغرض">
                <Select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                  {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
                </Select>
              </Field>
            </div>

            <Field label="الاسم الثلاثي *">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="هوية / إقامة *">
                <Input value={natId} onChange={(e) => setNatId(e.target.value)} inputMode="numeric" />
              </Field>
              <Field label="الجوال *">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="05xxxxxxxx" />
              </Field>
            </div>

            {err && <p className="rounded-card border border-danger-500 bg-danger-50 p-2.5 text-caption text-danger-600">{err}</p>}

            <Button size="lg" className="w-full" onClick={submit}>تأكيد الحجز واستلام رمز الدخول</Button>
            <p className="text-center text-micro text-ink-500">بيانات الزيارة تخضع لسياسات أمن الحي الدبلوماسي</p>
          </div>
        )}
      </main>
    </div>
  );
}
