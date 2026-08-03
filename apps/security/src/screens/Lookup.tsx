import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QrCode, Search } from 'lucide-react';
import { useStore } from '@dq/core';
import { Button, Card, EmptyState, Input, SectionTitle } from '@dq/ui';
import { QrScanModal } from '../components/QrScanModal';
import { PlateBadge } from '@dq/ui';
import { permitPill } from '../components/StatusPill';
import { accessStateAr, permitKindAr, propertyTypeAr, roleAr } from '@dq/core';

/** §11 — search by ID, phone, name, plate, permit no, QR, unit, company. */
export function LookupScreen() {
  const store = useStore();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [qrOpen, setQrOpen] = useState(false);

  const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();
  const results = useMemo(() => {
    if (q.trim().length < 2) return null;
    const n = norm(q);
    return {
      people: store.people.filter(
        (p) => norm(p.nameAr).includes(n) || p.nationalId.includes(q.trim()) || p.phone.includes(q.trim()),
      ).slice(0, 6),
      vehicles: store.vehicles.filter((v) => norm(v.plate).includes(n)).slice(0, 6),
      properties: store.properties.filter(
        (p) => norm(p.code).includes(n) || norm(p.unitNo).includes(n) || norm(p.qrToken).includes(n),
      ).slice(0, 6),
      permits: store.permits.filter(
        (p) => norm(p.subject.nameAr).includes(n) || norm(p.qrToken).includes(n) || (p.plate && norm(p.plate).includes(n)),
      ).slice(0, 6),
    };
  }, [q, store]);

  const empty = results && Object.values(results).every((arr) => arr.length === 0);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <SectionTitle>التحقق</SectionTitle>
      <Card className="p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <Input
              className="!bg-ink-0 !text-ink-800 !border-ink-300 placeholder:!text-ink-500 ps-9"
              placeholder="هوية · جوال · اسم · لوحة · رقم تصريح · وحدة…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Button onClick={() => setQrOpen(true)}><QrCode size={16} /> QR</Button>
        </div>
      </Card>

      {empty && <Card className="p-4"><EmptyState title="لا نتائج مطابقة" hint="جرّب رقم لوحة أو اسمًا أو رمز QR" /></Card>}

      {results?.people.map((p) => {
        const prop = store.properties.find((x) => x.id === p.propertyId);
        return (
          <Card key={p.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{p.nameAr}</p>
                <p className="text-[--text-caption] text-ink-500">{roleAr[p.role]} · هوية {p.nationalId} · {p.phone}</p>
                {prop && <p className="mt-1 text-[--text-caption] text-ink-500">مرتبط بـ {prop.code} — {prop.unitNo}</p>}
              </div>
              <span className="rounded-full bg-ink-50 px-2.5 py-1 text-[--text-caption] text-ink-800">شخص</span>
            </div>
          </Card>
        );
      })}

      {results?.vehicles.map((v) => {
        const owner = store.people.find((x) => x.id === v.ownerPersonId);
        return (
          <Card key={v.id} className={`p-4 ${v.accessState === 'suspended' ? 'border border-danger-500' : ''}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <PlateBadge plate={v.plate} />
                <p className="mt-1 text-[--text-caption] text-ink-500">{v.make} · {v.color} · المالك: {owner?.nameAr}</p>
                {v.suspension && !v.suspension.liftedAtISO && (
                  <p className="mt-1 text-[--text-caption] font-semibold text-danger-600">موقوفة: {v.suspension.reason}</p>
                )}
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[--text-caption] font-semibold ${v.accessState === 'allowed' ? 'bg-ok-600-50 text-ok-600' : 'bg-danger-50 text-danger-600'}`}>
                {accessStateAr[v.accessState]}
              </span>
            </div>
          </Card>
        );
      })}

      {results?.properties.map((p) => (
        <Card key={p.id} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{p.code} — {p.unitNo}</p>
              <p className="text-[--text-caption] text-ink-500">{propertyTypeAr[p.type]} · {p.zone} · {p.residentIds.length} مقيم · {p.vehicleIds.length} مركبة</p>
            </div>
            <span className="rounded-full bg-ink-50 px-2.5 py-1 text-[--text-caption] text-ink-800">عقار</span>
          </div>
        </Card>
      ))}

      {results?.permits.map((p) => (
        <Card key={p.id} className="p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-semibold">{p.subject.nameAr}</p>
              <p className="text-[--text-caption] text-ink-500">{permitKindAr[p.kind]} {p.plate ? <>· <bdi className="plate">{p.plate}</bdi></> : null}</p>
            </div>
            {permitPill(p.status)}
          </div>
        </Card>
      ))}

      <QrScanModal open={qrOpen} onClose={() => setQrOpen(false)} onScan={(tok) => setQ(tok)} />
    </div>
  );
}
