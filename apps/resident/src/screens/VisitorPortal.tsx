import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Car, CheckCircle2, CreditCard, QrCode } from 'lucide-react';
import { useStore } from '@dq/core';
import { Button, Field, Input } from '@dq/ui';
import { Txn } from '@dq/ui';
import { fmtDate } from '@dq/core';
import type { VisitorPass } from '@dq/core';

const ENTRY_FEE = 50;

/** بوابة الزوار — public page: pay the 50 SAR vehicle day-pass and get a
 *  gate-ready QR. Restaurant ordering lives with the restaurants themselves. */
export function VisitorPortal() {
  const store = useStore();
  const [dayOffset, setDayOffset] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [plate, setPlate] = useState('');
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<VisitorPass | null>(null);

  const total = ENTRY_FEE;

  const pay = () => {
    if (!name.trim() || !phone.trim() || !plate.trim()) {
      setErr('الاسم والجوال ورقم اللوحة حقول إلزامية');
      return;
    }
    setErr('');
    setPaying(true);
    const day = addDays(new Date(), dayOffset);
    day.setHours(10, 0, 0, 0);
    setTimeout(() => {
      const pass = store.purchaseVisitorPass({
        visitorNameAr: name,
        phone,
        plate,
        dateISO: day.toISOString(),
        orders: [],
      });
      setPaying(false);
      setDone(pass);
    }, 900);
  };

  return (
    <div className="min-h-screen bg-ink-25 pb-10" dir="rtl">
      <header className="bg-ink-0 px-4 py-5 text-ink-800">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[--radius-card] bg-brand-600 font-bold text-ink-900">DQ</span>
          <div>
            <p className="text-sm font-bold">الحي الدبلوماسي الذكي</p>
            <p className="text-[--text-caption] text-ink-500">بوابة الزوار — تصريح دخول يومي</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4">
        <div className="rounded-b-[6px] bg-ink-50 p-4 text-ink-800">
          <p className="flex items-center gap-2 text-base font-bold"><Car size={17} className="text-brand-600" /> زيارة الحي الدبلوماسي</p>
          <p className="mt-1 text-[--text-caption] leading-relaxed text-ink-500">
            {ENTRY_FEE} ر.س لكل مركبة — رمز QR واحد يفتح لك البوابة طوال يوم الزيارة بدخول متكرر.
          </p>
        </div>

        {done ? (
          <div className="mt-4 rounded-[--radius-card] bg-ink-0 p-6 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok-600-50 text-ok-600"><CheckCircle2 size={28} /></span>
            <h2 className="mt-3 text-lg font-bold">تم الدفع وإصدار تصريحك</h2>
            <p className="mt-1 text-sm text-ink-500">{fmtDate(done.dateISO)} · مركبة <bdi className="plate">{done.plate}</bdi></p>
            <div className="mx-auto mt-4 w-fit rounded-[--radius-card] border-2 border-ink-900 p-4">
              <QrCode size={120} className="text-ink-900" />
              <bdi dir="ltr" className="plate mt-2 block text-[--text-caption] font-bold text-ink-800"><Txn no={done.qrToken} /></bdi>
            </div>

            <div className="mt-4 rounded-[--radius-card] bg-ink-50 p-3 text-start text-[--text-caption]">
              <div className="flex justify-between py-0.5"><span>تصريح دخول المركبة</span><b className="tabular-nums">{done.entryFee} ر.س</b></div>
              {done.orders.map((o, i) => (
                <div key={i} className="flex justify-between py-0.5 text-ink-500">
                  <span>{o.itemAr} × {o.qty} — {store.restaurants.find((r) => r.id === o.restaurantId)?.nameAr}</span>
                  <span className="tabular-nums">{o.price * o.qty} ر.س</span>
                </div>
              ))}
              <div className="mt-1 flex justify-between border-t border-ink-100 pt-1.5 font-bold">
                <span>الإجمالي المدفوع</span><span className="tabular-nums">{done.totalPaid} ر.س</span>
              </div>
            </div>

            <div className="mt-4 space-y-1 rounded-[--radius-card] bg-warn-600-50 p-3 text-start text-[--text-caption] text-ink-800">
              <p>• أبرز الرمز عند <b>بوابة الحي</b> — الدخول آلي، ويصلح للدخول المتكرر طوال اليوم.</p>
              {done.orders.length > 0 && <p>• نفس الرمز يُبرز في المطعم لاستلام طلباتك المدفوعة.</p>}
              <p>• التصريح صالح ليوم الزيارة فقط ولمركبة واحدة.</p>
            </div>
            <Button variant="outline" className="mt-4" onClick={() => setDone(null)}>شراء تصريح آخر</Button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* visit details */}
            <div className="rounded-[--radius-card] bg-ink-0 p-5">
              <p className="mb-3 text-sm font-bold">١ — بيانات الزيارة</p>
              <div className="mb-3 flex gap-1.5">
                {[0, 1, 2].map((o) => (
                  <button
                    key={o}
                    onClick={() => setDayOffset(o)}
                    className={`flex-1 rounded-[--radius-card] border p-2 text-center text-[--text-caption] ${dayOffset === o ? 'border-brand-500 bg-brand-50 font-bold' : 'border-ink-100'}`}
                  >
                    <p className="font-semibold">{o === 0 ? 'اليوم' : o === 1 ? 'غدًا' : format(addDays(new Date(), 2), 'EEEE', { locale: ar })}</p>
                    <p className="text-[--text-micro] text-ink-500">{format(addDays(new Date(), o), 'd MMM', { locale: ar })}</p>
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                <Field label="الاسم *"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="الجوال *"><Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="05xxxxxxxx" /></Field>
                  <Field label="لوحة المركبة *"><Input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="مثال: أ ب ج 1234" /></Field>
                </div>
              </div>
            </div>

            {/* payment */}
            <div className="rounded-[--radius-card] bg-ink-0 p-5">
              <p className="mb-3 flex items-center gap-1.5 text-sm font-bold"><CreditCard size={14} className="text-brand-600" /> ٢ — الدفع</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>تصريح دخول المركبة</span><b className="tabular-nums">{ENTRY_FEE} ر.س</b></div>
                <div className="flex justify-between border-t border-ink-100 pt-2 text-base font-bold">
                  <span>الإجمالي</span><span className="tabular-nums text-brand-600">{total} ر.س</span>
                </div>
              </div>
              {err && <p className="mt-3 rounded-[--radius-card] border border-danger-500 bg-danger-50 p-2.5 text-[--text-caption] text-danger-600">{err}</p>}
              <Button size="lg" className="mt-4 w-full" onClick={pay} disabled={paying}>
                {paying ? 'جارٍ معالجة الدفع…' : `ادفع ${total} ر.س واستلم رمز الدخول`}
              </Button>
              <p className="mt-2 text-center text-[--text-micro] text-ink-500">دفع تجريبي — محاكاة بوابة سداد داخل النموذج</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
