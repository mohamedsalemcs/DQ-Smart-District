import { Link } from 'react-router-dom';
import { Plus, QrCode } from 'lucide-react';
import { useStore } from '@dq/core';
import { Button, Card, EmptyState, SectionTitle } from '@dq/ui';
import { permitPill } from '../components/StatusPill';
import { PlateBadge } from '@dq/ui';
import { fmtDateTime } from '@dq/core';
import { permitKindAr } from '@dq/core';

export function ResidentPermits() {
  const store = useStore();
  const me = store.currentUsers.resident;
  const mine = store.permits.filter((p) => p.requestedBy === me);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <SectionTitle
        action={
          <Link to="/r/permits/new">
            <Button><Plus size={15} /> تصريح جديد</Button>
          </Link>
        }
      >
        التصاريح
      </SectionTitle>

      {mine.length === 0 && <Card className="p-6"><EmptyState title="لا تصاريح بعد" hint="أنشئ تصريح زائر خلال دقيقة" /></Card>}

      <div className="space-y-3">
        {mine.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{p.subject.nameAr}</p>
                <p className="text-caption text-ink-500">{permitKindAr[p.kind]} · مرافقون: {p.companions}</p>
                {p.plate && <div className="mt-1.5"><PlateBadge plate={p.plate} size="sm" /></div>}
                <p className="mt-1.5 text-caption tabular-nums text-ink-500">
                  {fmtDateTime(p.validFromISO)} ← {fmtDateTime(p.validToISO)}
                </p>
                {p.approvals.some((a) => a.decision === 'info_requested') && p.status === 'pending' && (
                  <p className="mt-1.5 rounded bg-warn-600-50 px-2 py-1 text-caption">الإدارة طلبت معلومات إضافية</p>
                )}
              </div>
              <div className="flex flex-col items-center gap-2">
                {permitPill(p.status)}
                {p.status === 'approved' && (
                  <div className="rounded-card border border-ink-100 p-2 text-center">
                    <QrCode size={44} className="mx-auto text-ink-900" />
                    <bdi dir="ltr" className="plate mt-0.5 block text-micro text-ink-500">{p.qrToken}</bdi>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
