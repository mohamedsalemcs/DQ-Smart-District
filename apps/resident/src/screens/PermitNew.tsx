import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useStore } from '@dq/core';
import { Button, Card, Field, Input, SectionTitle, Select } from '@dq/ui';
import { permitKindAr } from '@dq/core';
import type { PermitKind } from '@dq/core';

/** §9 — kind picker → dynamic form → pending (QR issued on approval). */
export function PermitNew() {
  const navigate = useNavigate();
  const store = useStore();
  const [kind, setKind] = useState<PermitKind>('visitor');
  const [name, setName] = useState('');
  const [natId, setNatId] = useState('');
  const [phone, setPhone] = useState('');
  const [plate, setPlate] = useState('');
  const [from, setFrom] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [to, setTo] = useState(format(new Date(Date.now() + 24 * 3600e3), "yyyy-MM-dd'T'HH:mm"));
  const [companions, setCompanions] = useState(0);
  const [gateIds, setGateIds] = useState<string[]>(['gate-1']);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const needsNatId = kind !== 'visitor';

  const submit = () => {
    const errs: string[] = [];
    if (!name.trim()) errs.push('اسم صاحب التصريح إلزامي');
    if (needsNatId && !natId.trim()) errs.push('رقم الهوية/الإقامة إلزامي لهذا النوع');
    if (new Date(to) <= new Date(from)) errs.push('نهاية الصلاحية يجب أن تكون بعد بدايتها');
    if (gateIds.length === 0) errs.push('اختر بوابة واحدة على الأقل');
    setErrors(errs);
    if (errs.length) return;
    setSubmitting(true);
    setTimeout(() => {
      store.createPermit({
        kind,
        subjectNameAr: name,
        subjectNationalId: natId || undefined,
        subjectPhone: phone || undefined,
        plate: plate || undefined,
        validFromISO: new Date(from).toISOString(),
        validToISO: new Date(to).toISOString(),
        companions,
        gateIds,
      });
      navigate('/r/permits');
    }, 400);
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <SectionTitle>تصريح جديد</SectionTitle>
      <Card className="space-y-4 p-5">
        <div>
          <p className="mb-1.5 text-sm font-medium">نوع التصريح</p>
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.entries(permitKindAr) as [PermitKind, string][]).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`rounded-[--radius-ctl] px-2 py-2 text-[--text-caption] ${kind === k ? 'bg-brand-600 font-semibold text-ink-900' : 'bg-ink-50 text-ink-500 hover:text-ink-900-800'}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <Field label="اسم صاحب التصريح *">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الثلاثي" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`هوية / إقامة ${needsNatId ? '*' : ''}`}>
            <Input value={natId} onChange={(e) => setNatId(e.target.value)} inputMode="numeric" />
          </Field>
          <Field label="الجوال">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="05xxxxxxxx" />
          </Field>
        </div>
        {(kind === 'service_provider' || kind === 'school_driver' || kind === 'event_vendor') && (
          <Field label="لوحة المركبة">
            <Input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="مثال: أ ب ج 1234" />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="بداية الصلاحية *">
            <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="نهاية الصلاحية *">
            <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="عدد المرافقين">
            <Select value={companions} onChange={(e) => setCompanions(+e.target.value)}>
              {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </Field>
          <div>
            <p className="mb-1 text-sm font-medium">البوابات المسموحة *</p>
            <div className="flex flex-wrap gap-1.5">
              {store.gates.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGateIds((ids) => (ids.includes(g.id) ? ids.filter((x) => x !== g.id) : [...ids, g.id]))}
                  className={`rounded-full px-2.5 py-1 text-[--text-caption] ${gateIds.includes(g.id) ? 'bg-brand-600 font-semibold text-ink-900' : 'bg-ink-50 text-ink-500'}`}
                >
                  {g.nameAr}
                </button>
              ))}
            </div>
          </div>
        </div>

        {errors.length > 0 && (
          <ul className="space-y-1 rounded-[--radius-card] border border-danger-500 bg-danger-50 p-3 text-[--text-caption] text-danger-600">
            {errors.map((e) => <li key={e}>• {e}</li>)}
          </ul>
        )}

        <Button size="lg" className="w-full" onClick={submit} disabled={submitting}>
          {submitting ? 'جارٍ الإرسال…' : 'إرسال الطلب للاعتماد'}
        </Button>
        <p className="text-center text-[--text-caption] text-ink-500">يصدر رمز QR فور اعتماد الإدارة — يصلك إشعار</p>
      </Card>
    </div>
  );
}
