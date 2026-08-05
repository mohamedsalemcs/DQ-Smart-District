import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Camera, Car, UserRound } from 'lucide-react';
import { useStore } from '@dq/core';
import { Button, Card, Field, Select } from '@dq/ui';
import { PlateBadge } from '@dq/ui';
import type { ViolationSubject } from '@dq/core';

const codes: { code: string; labelAr: string }[] = [
  { code: 'TR-02', labelAr: 'تجاوز السرعة داخل النطاق السكني' },
  { code: 'TR-07', labelAr: 'وقوف خاطئ أمام مسار المشاة' },
  { code: 'VD-03', labelAr: 'تشوه بصري — مواد أو مخلفات مكشوفة' },
  { code: 'CM-01', labelAr: 'إشغال مساحة عامة دون تصريح' },
  { code: 'SF-04', labelAr: 'سلوك يعرّض سلامة المشاة للخطر' },
];

export function ViolationNew() {
  const navigate = useNavigate();
  const { vehicles, properties, people, logViolation, demoVehicleId } = useStore();
  const [subject, setSubject] = useState<ViolationSubject>('vehicle');
  const [subjectId, setSubjectId] = useState(demoVehicleId);
  const [code, setCode] = useState(codes[1].code);
  const [photo, setPhoto] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const demoVehicle = vehicles.find((v) => v.id === demoVehicleId);

  const submit = () => {
    setSubmitting(true);
    const label = codes.find((c) => c.code === code)!.labelAr;
    const pos =
      subject === 'property'
        ? properties.find((p) => p.id === subjectId)
        : { lat: 24.6832, lng: 46.6312 };
    setTimeout(() => {
      logViolation({
        subject,
        subjectId,
        code,
        labelAr: label,
        lat: pos?.lat ?? 24.68,
        lng: pos?.lng ?? 46.63,
        withPhoto: photo,
      });
      navigate('/incidents'); // back to security home area; admin picks it up in /a/violations
    }, 350);
  };

  const subjectTabs: { key: ViolationSubject; labelAr: string; icon: typeof Car }[] = [
    { key: 'vehicle', labelAr: 'مركبة', icon: Car },
    { key: 'property', labelAr: 'عقار', icon: Building2 },
    { key: 'person', labelAr: 'شخص', icon: UserRound },
  ];

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-lg font-bold">تسجيل مخالفة</h1>
      <Card className="space-y-4 p-5">
        {/* subject picker */}
        <div>
          <p className="mb-1.5 text-sm font-medium">موضوع المخالفة</p>
          <div className="grid grid-cols-3 gap-2">
            {subjectTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setSubject(tab.key);
                  setSubjectId(
                    tab.key === 'vehicle' ? demoVehicleId : tab.key === 'property' ? properties[0].id : people.find((p) => p.role === 'resident')!.id,
                  );
                }}
                className={`flex flex-col items-center gap-1.5 rounded-card p-3 text-sm ${
                  subject === tab.key ? 'bg-brand-600 text-ink-900 font-semibold' : 'bg-ink-0 text-ink-500 hover:text-ink-900-800'
                }`}
              >
                <tab.icon size={20} />
                {tab.labelAr}
              </button>
            ))}
          </div>
        </div>

        <Field label={subject === 'vehicle' ? 'المركبة' : subject === 'property' ? 'العقار' : 'الشخص'}>
          <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {/* السجل توسّع لآلاف القيود — القوائم تقتصر على السجل التفصيلي، والبحث الكامل في شاشة التحقق */}
            {subject === 'vehicle' &&
              vehicles.filter((v) => !v.id.startsWith('bveh')).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate} — {v.make} ({v.color})
                </option>
              ))}
            {subject === 'property' &&
              properties.filter((p) => !p.id.startsWith('bprop')).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.unitNo}
                </option>
              ))}
            {subject === 'person' &&
              people
                .filter((p) => ['resident', 'owner', 'tenant', 'driver'].includes(p.role))
                .slice(0, 30)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nameAr}
                  </option>
                ))}
          </Select>
        </Field>

        {subject === 'vehicle' && subjectId === demoVehicleId && demoVehicle && (
          <div className="rounded-card bg-warn-600-50 p-3 text-sm text-warn-600-600">
            <p className="font-semibold">⚠ هذه المركبة عليها مخالفة سابقة</p>
            <p className="mt-1 flex items-center gap-2">
              <PlateBadge plate={demoVehicle.plate} size="sm" /> حافلة مدرسة — التسجيل الجديد سيرفع عدّاد التكرار إلى 2
            </p>
          </div>
        )}

        <Field label="نوع المخالفة">
          <Select value={code} onChange={(e) => setCode(e.target.value)}>
            {codes.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.labelAr}
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <p className="mb-1.5 text-sm font-medium">التوثيق</p>
          <button
            onClick={() => setPhoto((p) => !p)}
            className={`flex w-full items-center justify-center gap-2 rounded-card border-2 border-dashed p-4 text-sm ${
              photo ? 'border-ok-500 bg-ok-600-50 text-ok-600' : 'border-ink-300 text-ink-500'
            }`}
          >
            <Camera size={18} />
            {photo ? 'أُرفقت صورة الموقع (محاكاة) ✓' : 'إرفاق صورة'}
          </button>
        </div>

        <div className="rounded-card bg-ink-0 p-3 text-caption text-ink-500">
          الموقع: يُلتقط تلقائيًا من جهاز الحارس · شارع الأمم، قرب حديقة الطلح
        </div>

        <Button size="lg" className="w-full" onClick={submit} disabled={submitting}>
          {submitting ? 'جارٍ التسجيل…' : 'تسجيل المخالفة وإشعار الإدارة'}
        </Button>
      </Card>
    </div>
  );
}
