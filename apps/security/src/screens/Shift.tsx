import { useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { useStore } from '@dq/core';
import { Button, Card, Field, SectionTitle, TextArea } from '@dq/ui';
import { fmtTime } from '@dq/core';

export function ShiftScreen() {
  const store = useStore();
  const [note, setNote] = useState('');
  const shift = store.shifts[0];
  const guard = store.people.find((p) => p.id === shift?.guardId);
  const post = store.gates.find((g) => g.id === shift?.postId);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <SectionTitle>الوردية</SectionTitle>
      {shift && (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{guard?.nameAr}</p>
              <p className="text-caption text-ink-500">الموقع: {post?.nameAr} · {fmtTime(shift.startISO)} — {fmtTime(shift.endISO)}</p>
            </div>
            {shift.checkedOutISO ? (
              <span className="rounded-full bg-ink-100 px-3 py-1 text-caption">سُلّمت</span>
            ) : shift.checkedInISO ? (
              <span className="rounded-full bg-ok-600-50 px-3 py-1 text-caption text-ok-600">حاضر منذ {fmtTime(shift.checkedInISO)}</span>
            ) : (
              <span className="rounded-full bg-warn-600-50 px-3 py-1 text-caption text-warn-600-600">لم يسجّل حضور</span>
            )}
          </div>

          {!shift.checkedInISO && !shift.checkedOutISO && (
            <Button className="mt-4 w-full" size="lg" onClick={() => store.checkInShift(shift.id)}>
              <LogIn size={16} /> تسجيل الحضور
            </Button>
          )}

          {shift.checkedInISO && !shift.checkedOutISO && (
            <div className="mt-4 space-y-3">
              <div className="rounded-card bg-ink-0 p-3 text-sm">
                <p className="mb-1 text-caption font-semibold text-ink-500">تعليمات الوردية</p>
                <ul className="list-inside list-disc space-y-1 text-caption text-ink-800">
                  <li>تشديد التحقق على تصاريح مزوّدي الخدمة بعد الساعة 22:00</li>
                  <li>مركبة موقوفة بإنفاذ بوابي — راجع قائمة الإيقاف قبل فتح المسار اليدوي</li>
                  <li>الإبلاغ الفوري عن أي تجمهر قرب بوابة الأمم</li>
                </ul>
              </div>
              <div className="rounded-card bg-ink-0 p-3 text-sm">
                <p className="mb-1 text-caption font-semibold text-ink-500">العهدة</p>
                <p className="text-caption">جهاز مسح QR ×1 · جهاز اتصال ×1 · مفاتيح كشك البوابة</p>
              </div>
              <Field label="ملاحظة التسليم">
                <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="ما يحتاج الحارس التالي معرفته…" />
              </Field>
              <Button variant="outline" className="w-full border-ink-300 text-ink-800" onClick={() => store.checkOutShift(shift.id, note || 'لا ملاحظات')}>
                <LogOut size={16} /> تسليم الوردية
              </Button>
            </div>
          )}

          {shift.checkedOutISO && shift.handoverNoteAr && (
            <p className="mt-3 rounded-card bg-ink-0 p-3 text-caption text-ink-500">ملاحظة التسليم: {shift.handoverNoteAr}</p>
          )}
        </Card>
      )}

      <Card className="p-4">
        <p className="mb-2 text-caption font-semibold text-ink-500">ورديات اليوم</p>
        {store.shifts.map((s) => (
          <div key={s.id} className="flex items-center justify-between border-b border-ink-100/50 py-2 text-sm last:border-0">
            <span>{store.people.find((p) => p.id === s.guardId)?.nameAr}</span>
            <span className="text-caption text-ink-500">{store.gates.find((g) => g.id === s.postId)?.nameAr}</span>
            <span className={`text-caption ${s.checkedInISO ? 'text-ok-600' : 'text-warn-600-600'}`}>{s.checkedInISO ? 'حاضر' : 'غير مغطى'}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
