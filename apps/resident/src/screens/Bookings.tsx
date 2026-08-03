import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarPlus, QrCode } from 'lucide-react';
import { useStore } from '@dq/core';
import { Button, Card, Field, Input, Modal, SectionTitle, Select } from '@dq/ui';
import { fmtDateTime } from '@dq/core';

export function ResidentBookings() {
  const store = useStore();
  const me = store.currentUsers.resident;
  const facilities = store.assets.filter((a) => a.kind === 'garden' || a.kind === 'court');
  const mine = store.bookings.filter((b) => b.byPersonId === me);
  const [open, setOpen] = useState(false);
  const [facilityId, setFacilityId] = useState('court-1');
  const [from, setFrom] = useState(format(new Date(Date.now() + 24 * 3600e3), "yyyy-MM-dd'T'17:00"));
  const [hours, setHours] = useState(2);
  const [attendees, setAttendees] = useState(4);

  const statusAr = { confirmed: 'مؤكد', cancelled: 'ملغى', used: 'مستخدم' } as const;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <SectionTitle action={<Button onClick={() => setOpen(true)}><CalendarPlus size={15} /> حجز جديد</Button>}>
        الحجوزات والفعاليات
      </SectionTitle>

      <div className="grid gap-3 sm:grid-cols-2">
        {facilities.slice(0, 6).map((f) => (
          <Card key={f.id} className="p-4">
            <p className="font-semibold">{f.nameAr}</p>
            <p className="text-[--text-caption] text-ink-500">{f.kind === 'court' ? 'ملعب — يتطلب حجزًا' : 'حديقة عامة — الفعاليات تتطلب حجزًا'}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => { setFacilityId(f.id); setOpen(true); }}>
              احجز
            </Button>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <p className="mb-2 text-sm font-bold">حجوزاتي</p>
        {mine.length === 0 && <p className="py-3 text-center text-[--text-caption] text-ink-500">لا حجوزات بعد</p>}
        <div className="space-y-2">
          {mine.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 rounded-[--radius-card] bg-ink-50 p-3">
              <div>
                <p className="text-sm font-medium">{store.assets.find((a) => a.id === b.facilityId)?.nameAr}</p>
                <p className="text-[--text-caption] tabular-nums text-ink-500">{fmtDateTime(b.fromISO)} · {b.attendees} أشخاص</p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[--text-micro] ${b.status === 'confirmed' ? 'bg-ok-600-50 text-ok-600' : b.status === 'used' ? 'bg-ink-50 text-ink-500' : 'bg-danger-50 text-danger-600'}`}>
                  {statusAr[b.status]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {b.status === 'confirmed' && (
                  <>
                    <div className="rounded-[--radius-card] border border-ink-100 p-1.5 text-center">
                      <QrCode size={36} className="text-ink-900" />
                      <bdi dir="ltr" className="plate block text-[8px] text-ink-500">{b.qrToken}</bdi>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => store.cancelBooking(b.id)}>إلغاء</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[--text-caption] text-ink-500">رمز الحجز يُقبل عند البوابة مباشرة — نفس الرمز الذي يمسحه الحارس.</p>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="حجز مرفق">
        <div className="space-y-3">
          <Field label="المرفق">
            <Select value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
              {facilities.map((f) => <option key={f.id} value={f.id}>{f.nameAr}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الموعد">
              <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="المدة (ساعات)">
              <Select value={hours} onChange={(e) => setHours(+e.target.value)}>
                {[1, 2, 3, 4].map((h) => <option key={h} value={h}>{h}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="عدد الحضور">
            <Input type="number" min={1} max={50} value={attendees} onChange={(e) => setAttendees(+e.target.value)} />
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button
            onClick={() => {
              const f = new Date(from);
              store.createBooking(facilityId, f.toISOString(), new Date(f.getTime() + hours * 3600e3).toISOString(), attendees);
              setOpen(false);
            }}
          >
            تأكيد الحجز
          </Button>
        </div>
      </Modal>
    </div>
  );
}
