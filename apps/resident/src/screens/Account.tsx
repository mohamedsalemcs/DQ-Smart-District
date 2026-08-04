import { useStore } from '@dq/core';
import { Card, SectionTitle } from '@dq/ui';
import { PlateBadge } from '@dq/ui';
import { fmtDate } from '@dq/core';
import { accessStateAr, roleAr } from '@dq/core';

/** §9 — family, domestic workers, delegates, vehicles. Suspension state shows here (Path A step 5). */
export function Account() {
  const store = useStore();
  const me = store.people.find((p) => p.id === store.currentUsers.resident)!;
  const prop = store.properties.find((p) => p.id === me.propertyId);
  const family = store.people.filter((p) => p.propertyId === prop?.id && p.id !== me.id);
  const vehicles = store.vehicles.filter((v) => v.propertyId === prop?.id);
  const suspendedLinked = store.vehicles.filter((v) => v.accessState === 'suspended' && !v.suspension?.liftedAtISO);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <SectionTitle>حسابي</SectionTitle>

      <Card className="p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-base font-bold text-brand-600">
            {me.nameAr.slice(0, 2)}
          </span>
          <div>
            <p className="font-bold">{me.nameAr}</p>
            <p className="text-caption text-ink-500">{roleAr[me.role]} · {prop?.code} · {me.phone}</p>
          </div>
        </div>
      </Card>

      {suspendedLinked.length > 0 && (
        <Card className="border border-danger-500 p-4">
          <p className="text-sm font-bold text-danger-600">تنبيهات إيقاف مرتبطة بملفك</p>
          {suspendedLinked.map((v) => (
            <div key={v.id} className="mt-2 rounded-card bg-danger-50 p-3 text-sm">
              <div className="flex items-center gap-2"><PlateBadge plate={v.plate} size="sm" /> <span className="text-caption">{v.make}</span></div>
              <p className="mt-1 text-caption text-ink-500">{v.suspension?.reason}</p>
              <p className="text-caption text-ink-500">الإيقاف حتى {v.suspension ? fmtDate(v.suspension.untilISO) : ''} — الدخول مرفوض آليًا عند البوابات</p>
            </div>
          ))}
        </Card>
      )}

      <Card className="p-5">
        <p className="mb-2 text-sm font-bold">العائلة والمفوّضون</p>
        {family.length === 0 && <p className="text-caption text-ink-500">لا أفراد مسجلين</p>}
        {family.map((f) => (
          <div key={f.id} className="flex items-center justify-between border-b border-ink-100 py-2 text-sm last:border-0">
            <span>{f.nameAr}</span>
            <span className="text-caption text-ink-500">{roleAr[f.role]}</span>
          </div>
        ))}
      </Card>

      <Card className="p-5">
        <p className="mb-2 text-sm font-bold">مركباتي</p>
        {vehicles.map((v) => (
          <div key={v.id} className="flex items-center justify-between border-b border-ink-100 py-2 text-sm last:border-0">
            <span className="flex items-center gap-2"><PlateBadge plate={v.plate} size="sm" /> {v.make} · {v.color}</span>
            <span className={`text-caption font-semibold ${v.accessState === 'allowed' ? 'text-ok-600' : 'text-danger-600'}`}>{accessStateAr[v.accessState]}</span>
          </div>
        ))}
        {vehicles.length === 0 && <p className="text-caption text-ink-500">لا مركبات مسجلة</p>}
      </Card>
    </div>
  );
}
