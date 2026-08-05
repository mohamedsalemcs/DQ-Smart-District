import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useStore } from '@dq/core';
import { Button, Card, Field, Input, Select, TextArea } from '@dq/ui';
import { incidentKindAr, severityAr } from '@dq/core';
import type { IncidentKind } from '@dq/core';

/** §11 — mandatory fields enforced; txnNo issued on submit. */
export function IncidentNew() {
  const navigate = useNavigate();
  const { createIncident, gates, properties } = useStore();
  const [kind, setKind] = useState<IncidentKind>('suspicious_vehicle');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [occurred, setOccurred] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [locationKind, setLocationKind] = useState<'gate' | 'property' | 'street'>('street');
  const [gateId, setGateId] = useState(gates[0].id);
  const [propertyId, setPropertyId] = useState(properties[0].id);
  const [plate, setPlate] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [driverName, setDriverName] = useState('');
  const [detail, setDetail] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    const errs: string[] = [];
    if (!occurred) errs.push('وقت الواقعة إلزامي (بدقة الدقيقة)');
    if (!detail.trim()) errs.push('وصف الواقعة إلزامي');
    if (kind === 'suspicious_vehicle' && !plate.trim()) errs.push('رقم اللوحة إلزامي لبلاغ مركبة');
    setErrors(errs);
    if (errs.length) return;

    setSubmitting(true);
    const loc =
      locationKind === 'gate'
        ? gates.find((g) => g.id === gateId)!
        : locationKind === 'property'
          ? properties.find((p) => p.id === propertyId)!
          : { lat: 24.6865, lng: 46.6345 };

    setTimeout(() => {
      const inc = createIncident({
        kind,
        severity,
        occurredISO: new Date(occurred).toISOString(),
        lat: loc.lat,
        lng: loc.lng,
        gateId: locationKind === 'gate' ? gateId : undefined,
        propertyId: locationKind === 'property' ? propertyId : undefined,
        vehicle: plate.trim() ? { plate, make: vehicleMake || '—', color: vehicleColor || '—', driverNameAr: driverName || undefined } : undefined,
        parties: driverName.trim() ? [{ nameAr: driverName, role: 'subject' }] : [],
        detailAr: detail,
      });
      navigate(`/incidents/${inc.id}`);
    }, 400);
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-lg font-bold">بلاغ جديد</h1>
      <Card className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="نوع البلاغ *">
            <Select value={kind} onChange={(e) => setKind(e.target.value as IncidentKind)}>
              {Object.entries(incidentKindAr).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>
          <Field label="الخطورة *">
            <Select value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)}>
              {Object.entries(severityAr).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="وقت الواقعة (بدقة الدقيقة) *" hint="وقت الواقعة يُسجَّل منفصلًا عن وقت الإبلاغ — النظام يسجّل وقت الإبلاغ تلقائيًا">
          <Input type="datetime-local" value={occurred} onChange={(e) => setOccurred(e.target.value)} />
        </Field>

        <div>
          <p className="mb-1.5 text-sm font-medium">الموقع *</p>
          <div className="mb-2 flex gap-1.5">
            {(
              [
                ['street', 'شارع / ساحة'],
                ['gate', 'بوابة'],
                ['property', 'عقار'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setLocationKind(k)}
                className={`rounded-full px-3 py-1 text-caption ${locationKind === k ? 'bg-brand-600 text-ink-900 font-semibold' : 'bg-ink-0 text-ink-500'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {locationKind === 'gate' && (
            <Select value={gateId} onChange={(e) => setGateId(e.target.value)}>
              {gates.map((g) => <option key={g.id} value={g.id}>{g.nameAr}</option>)}
            </Select>
          )}
          {locationKind === 'property' && (
            <Select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              {properties.filter((p) => !p.id.startsWith('bprop')).map((p) => <option key={p.id} value={p.id}>{p.code} — {p.unitNo}</option>)}
            </Select>
          )}
          {locationKind === 'street' && (
            <p className="rounded-ctl bg-ink-0 px-3 py-2 text-caption text-ink-500">شارع الأمم — قرب حديقة الطلح (يُلتقط من جهاز الحارس)</p>
          )}
        </div>

        <div className="rounded-card border border-ink-300 p-3">
          <p className="mb-2 text-sm font-medium">المركبة (إن وجدت)</p>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="رقم اللوحة" value={plate} onChange={(e) => setPlate(e.target.value)} />
            <Input placeholder="النوع" value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} />
            <Input placeholder="اللون" value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)} />
            <Input placeholder="اسم السائق" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
          </div>
        </div>

        <Field label="وصف الواقعة *">
          <TextArea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="ماذا حدث، ومن، وأين…" />
        </Field>

        {errors.length > 0 && (
          <ul className="space-y-1 rounded-card border border-danger-500 bg-danger-50 p-3 text-caption text-danger-600">
            {errors.map((e) => <li key={e}>• {e}</li>)}
          </ul>
        )}

        <Button size="lg" className="w-full" onClick={submit} disabled={submitting}>
          {submitting ? 'جارٍ إصدار رقم المعاملة…' : 'تسجيل البلاغ وإصدار رقم معاملة'}
        </Button>
      </Card>
    </div>
  );
}
