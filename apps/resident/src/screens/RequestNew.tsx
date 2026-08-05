import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin } from 'lucide-react';
import { useStore } from '@dq/core';
import { Button, Card, Field, SectionTitle, Select, TextArea } from '@dq/ui';
import { priorityAr, requestKindAr } from '@dq/core';
import type { RequestKind, ServiceRequest } from '@dq/core';

export function RequestNew() {
  const navigate = useNavigate();
  const store = useStore();
  const me = store.people.find((p) => p.id === store.currentUsers.resident)!;
  const prop = store.properties.find((p) => p.id === me.propertyId);
  const [kind, setKind] = useState<RequestKind>('maintenance');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState<ServiceRequest['priority']>('normal');
  const [media, setMedia] = useState(true);
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    if (!desc.trim()) {
      setErr('الوصف إلزامي — ساعد الفريق على فهم الملاحظة');
      return;
    }
    setErr('');
    setSubmitting(true);
    setTimeout(() => {
      store.createRequest({
        kind,
        descriptionAr: desc,
        priority,
        lat: prop?.lat ?? 24.68,
        lng: prop?.lng ?? 46.63,
        media,
      });
      navigate('/requests');
    }, 400);
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <SectionTitle>بلاغ جديد</SectionTitle>
      <Card className="space-y-4 p-5">
        <div>
          <p className="mb-1.5 text-sm font-medium">نوع البلاغ</p>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {(Object.entries(requestKindAr) as [RequestKind, string][]).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`rounded-ctl px-2 py-2 text-caption ${kind === k ? 'bg-brand-600 font-semibold text-ink-900' : 'bg-ink-50 text-ink-500 hover:text-ink-900-800'}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <Field label="الوصف *">
          <TextArea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="صف الملاحظة ومكانها بدقة…" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="الأولوية">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as ServiceRequest['priority'])}>
              {Object.entries(priorityAr).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <div>
            <p className="mb-1 text-sm font-medium">الموقع</p>
            <p className="flex items-center gap-1.5 rounded-ctl bg-ink-50 px-3 py-2 text-caption text-ink-500">
              <MapPin size={13} /> قرب {prop?.code ?? 'موقعك الحالي'} (تلقائي)
            </p>
          </div>
        </div>

        <button
          onClick={() => setMedia((m) => !m)}
          className={`flex w-full items-center justify-center gap-2 rounded-card border-2 border-dashed p-4 text-sm ${media ? 'border-ok-500 bg-ok-600-50 text-ok-600' : 'border-ink-100 text-ink-500'}`}
        >
          <Camera size={18} />
          {media ? 'أُرفقت صورة (محاكاة) ✓' : 'إرفاق صورة'}
        </button>

        {err && <p className="rounded-card border border-danger-500 bg-danger-50 p-2.5 text-caption text-danger-600">{err}</p>}

        <Button size="lg" className="w-full" onClick={submit} disabled={submitting}>
          {submitting ? 'جارٍ الإرسال…' : 'إرسال البلاغ'}
        </Button>
      </Card>
    </div>
  );
}
