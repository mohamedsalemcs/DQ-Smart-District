import { QrCode } from 'lucide-react';
import { useStore } from '@dq/core';
import { Card, SectionTitle } from '@dq/ui';
import { PlateBadge } from '@dq/ui';
import { accessStateAr, propertyTypeAr, roleAr } from '@dq/core';

export function PropertyFile() {
  const store = useStore();
  const me = store.people.find((p) => p.id === store.currentUsers.resident)!;
  const prop = store.properties.find((p) => p.id === me.propertyId);
  if (!prop) return null;
  const residents = store.people.filter((p) => prop.residentIds.includes(p.id));
  const vehicles = store.vehicles.filter((v) => prop.vehicleIds.includes(v.id));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <SectionTitle>عقاري</SectionTitle>
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-lg font-bold">{prop.code}</p>
            <p className="text-sm text-ink-500">{prop.unitNo} · {propertyTypeAr[prop.type]} · {prop.zone}</p>
          </div>
          <div className="rounded-card border border-ink-100 p-3 text-center">
            <QrCode size={72} className="mx-auto text-ink-900" />
            <bdi dir="ltr" className="plate mt-1 block text-micro text-ink-500">{prop.qrToken}</bdi>
            <p className="text-micro text-ink-500">يبرزه الزائر أو الحارس للتحقق</p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <p className="mb-2 text-sm font-bold">الأشخاص المرتبطون</p>
        {residents.map((r) => (
          <div key={r.id} className="flex items-center justify-between border-b border-ink-100 py-2 text-sm last:border-0">
            <span>{r.nameAr}{r.id === me.id ? ' (أنت)' : ''}</span>
            <span className="text-caption text-ink-500">{roleAr[r.role]}</span>
          </div>
        ))}
      </Card>

      <Card className="p-5">
        <p className="mb-2 text-sm font-bold">المركبات المسجلة</p>
        {vehicles.length === 0 && <p className="text-caption text-ink-500">لا مركبات</p>}
        {vehicles.map((v) => (
          <div key={v.id} className="flex items-center justify-between border-b border-ink-100 py-2 text-sm last:border-0">
            <span className="flex items-center gap-2"><PlateBadge plate={v.plate} size="sm" /> {v.make}</span>
            <span className={`text-caption font-semibold ${v.accessState === 'allowed' ? 'text-ok-600' : 'text-danger-600'}`}>{accessStateAr[v.accessState]}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
