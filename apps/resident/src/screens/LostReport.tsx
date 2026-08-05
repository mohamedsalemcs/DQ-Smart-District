import { useState } from 'react';
import { CheckCircle2, PackageSearch, Sparkles } from 'lucide-react';
import { useStore } from '@dq/core';
import { Button, Field, Input, Select, TextArea } from '@dq/ui';
import { lostFoundCategoryAr, lostFoundColorsAr } from '@dq/core';
import type { LostFoundCategory, LostFoundItem } from '@dq/core';

/** المفقودات — public page: report a lost item without login; auto-matches
 *  against found items logged by operations and opens a claim for review. */
export function LostReport() {
  const store = useStore();
  const [category, setCategory] = useState<LostFoundCategory>('electronics');
  const [color, setColor] = useState<string>(lostFoundColorsAr[0]);
  const [desc, setDesc] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState<LostFoundItem | null>(null);

  const submit = () => {
    if (!desc.trim() || !name.trim() || !phone.trim()) {
      setErr('الوصف والاسم ورقم الجوال حقول إلزامية');
      return;
    }
    setErr('');
    const item = store.reportLostItem({
      category,
      colorAr: color,
      descriptionAr: desc,
      locationAr: location,
      dateISO: new Date(date).toISOString(),
      reporterNameAr: name,
      reporterPhone: phone,
    });
    if (item) setDone(item);
  };

  const reset = () => {
    setDone(null);
    setDesc('');
    setLocation('');
    setName('');
    setPhone('');
  };

  return (
    <div className="min-h-screen bg-ink-25 pb-10" dir="rtl">
      <header className="bg-ink-0 px-4 py-5 text-ink-800">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-card bg-brand-600 font-bold text-ink-900">DQ</span>
          <div>
            <p className="text-sm font-bold">الحي الدبلوماسي الذكي</p>
            <p className="text-caption text-ink-500">المفقودات — بلاغ فقدان غرض</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4">
        <div className="rounded-b-[6px] bg-ink-50 p-4 text-ink-800">
          <p className="flex items-center gap-2 text-base font-bold"><PackageSearch size={17} className="text-brand-600" /> فقدت غرضًا داخل الحي؟</p>
          <p className="mt-1 text-caption leading-relaxed text-ink-500">
            سجّل بلاغك وسيُطابق آليًا مع الأغراض المعثور عليها لدى إدارة الحي — الآن ومستقبلًا. عند التطابق يتواصل معك الفريق للتحقق والاستلام.
          </p>
        </div>

        {done ? (
          <div className="mt-4 rounded-card bg-ink-0 p-6 text-center">
            <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${done.status === 'matched' ? 'bg-brand-50 text-brand-600' : 'bg-ok-600-50 text-ok-600'}`}>
              {done.status === 'matched' ? <Sparkles size={28} /> : <CheckCircle2 size={28} />}
            </span>
            <h2 className="mt-3 text-lg font-bold">
              {done.status === 'matched' ? 'يبدو أن غرضك لدينا!' : 'سُجّل بلاغك'}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-500">
              {done.status === 'matched'
                ? 'وُجد غرض معثور عليه يطابق وصفك، وفُتح طلب استلام باسمك. سيتواصل معك فريق إدارة الحي للتحقق من الملكية وتسليمك الغرض.'
                : 'لا يوجد غرض مطابق حاليًا — بلاغك محفوظ وسيُطابَق آليًا مع أي غرض يُعثر عليه لاحقًا، وسنتواصل معك فور التطابق.'}
            </p>
            <div className="mx-auto mt-4 w-fit rounded-card bg-ink-50 px-6 py-3">
              <p className="text-micro text-ink-500">مرجع البلاغ — احتفظ به للمتابعة</p>
              <bdi dir="ltr" className="plate text-lg font-bold text-ink-900">{done.refNo}</bdi>
            </div>
            <Button variant="outline" className="mt-5" onClick={reset}>تسجيل بلاغ آخر</Button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-card bg-ink-0 p-5">
              <p className="mb-3 text-sm font-bold">١ — وصف الغرض المفقود</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="التصنيف *">
                    <Select value={category} onChange={(e) => setCategory(e.target.value as LostFoundCategory)}>
                      {Object.entries(lostFoundCategoryAr).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </Select>
                  </Field>
                  <Field label="اللون الغالب *">
                    <Select value={color} onChange={(e) => setColor(e.target.value)}>
                      {lostFoundColorsAr.map((c) => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  </Field>
                </div>
                <Field label="الوصف *">
                  <TextArea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="مثال: محفظة جلدية فيها بطاقات بنكية" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="مكان الفقد التقريبي">
                    <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="مثال: حديقة النفل" />
                  </Field>
                  <Field label="تاريخ الفقد التقريبي">
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </Field>
                </div>
              </div>
            </div>

            <div className="rounded-card bg-ink-0 p-5">
              <p className="mb-3 text-sm font-bold">٢ — بيانات التواصل</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="الاسم *"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
                <Field label="الجوال *"><Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="05xxxxxxxx" /></Field>
              </div>
            </div>

            {err && <p className="rounded-card bg-danger-50 p-3 text-caption font-semibold text-danger-600">{err}</p>}
            <Button className="w-full" onClick={submit}><PackageSearch size={15} /> تسجيل البلاغ والمطابقة الآلية</Button>
            <p className="text-center text-micro text-ink-500">بيانات البلاغ تخضع لسياسات خصوصية الحي الدبلوماسي</p>
          </div>
        )}
      </main>
    </div>
  );
}
