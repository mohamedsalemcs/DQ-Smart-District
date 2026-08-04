import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { History, QrCode } from 'lucide-react';
import { useStore } from '@dq/core';
import { Button, Card, EmptyState, SectionTitle } from '@dq/ui';
import { PlateBadge } from '@dq/ui';
import { AuditDrawer } from '../components/AuditDrawer';
import { violationPill, requestPill } from '../components/StatusPill';
import { accessStateAr, propertyTypeAr, requestKindAr, roleAr } from '@dq/core';

export function AdminPropertyDetail() {
  const { id } = useParams();
  const store = useStore();
  const [auditOpen, setAuditOpen] = useState(false);
  const prop = store.properties.find((p) => p.id === id);
  if (!prop) return <EmptyState title="العقار غير موجود" />;

  const residents = store.people.filter((p) => prop.residentIds.includes(p.id));
  const vehicles = store.vehicles.filter((v) => prop.vehicleIds.includes(v.id));
  const violations = store.violations.filter((v) => v.subject === 'property' && v.subjectId === prop.id);
  const requests = store.requests.filter((r) => r.propertyId === prop.id);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <SectionTitle
        action={
          <Button size="sm" variant="ghost" onClick={() => setAuditOpen(true)}>
            <History size={13} /> سجل التدقيق
          </Button>
        }
      >
        ملف العقار {prop.code}
      </SectionTitle>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <dt className="text-ink-500">الوحدة</dt><dd>{prop.unitNo}</dd>
            <dt className="text-ink-500">النوع</dt><dd>{propertyTypeAr[prop.type]}</dd>
            <dt className="text-ink-500">القطاع</dt><dd>{prop.zone}</dd>
            <dt className="text-ink-500">المالك</dt><dd>{store.people.find((p) => p.id === prop.ownerId)?.nameAr}</dd>
          </dl>
          <div className="rounded-card border border-ink-100 p-3 text-center">
            <QrCode size={64} className="mx-auto text-ink-900" />
            <bdi dir="ltr" className="plate mt-1 block text-micro text-ink-500">{prop.qrToken}</bdi>
            <p className="text-micro text-ink-500">رمز التحقق عند البوابة</p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <p className="mb-2 text-sm font-bold">المقيمون ({residents.length})</p>
        {residents.map((r) => (
          <div key={r.id} className="flex items-center justify-between border-b border-ink-100 py-2 text-sm last:border-0">
            <span>{r.nameAr}</span>
            <span className="text-caption text-ink-500">{roleAr[r.role]} · {r.phone}</span>
          </div>
        ))}
      </Card>

      <Card className="p-5">
        <p className="mb-2 text-sm font-bold">المركبات ({vehicles.length})</p>
        {vehicles.length === 0 && <p className="text-caption text-ink-500">لا مركبات مسجلة</p>}
        {vehicles.map((v) => (
          <div key={v.id} className="flex items-center justify-between border-b border-ink-100 py-2 text-sm last:border-0">
            <span className="flex items-center gap-2"><PlateBadge plate={v.plate} size="sm" /> {v.make} · {v.color}</span>
            <span className={`text-caption font-semibold ${v.accessState === 'allowed' ? 'text-ok-600' : 'text-danger-600'}`}>{accessStateAr[v.accessState]}</span>
          </div>
        ))}
      </Card>

      {(violations.length > 0 || requests.length > 0) && (
        <Card className="p-5">
          <p className="mb-2 text-sm font-bold">السجل</p>
          {violations.map((v) => (
            <div key={v.id} className="flex items-center justify-between border-b border-ink-100 py-2 text-sm last:border-0">
              <span>{v.code} — {v.labelAr}</span>
              {violationPill(v.status)}
            </div>
          ))}
          {requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between border-b border-ink-100 py-2 text-sm last:border-0">
              <span>{requestKindAr[r.kind]} — {r.descriptionAr.slice(0, 50)}</span>
              {requestPill(r.status)}
            </div>
          ))}
        </Card>
      )}

      <AuditDrawer open={auditOpen} onClose={() => setAuditOpen(false)} entityId={prop.id} />
    </div>
  );
}
