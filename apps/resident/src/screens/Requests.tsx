import { Link } from 'react-router-dom';
import { ChevronLeft, Plus } from 'lucide-react';
import { useStore } from '@dq/core';
import { Button, Card, EmptyState, SectionTitle } from '@dq/ui';
import { requestPill } from '../components/StatusPill';
import { SlaBadge } from '../components/SlaBadge';
import { ago } from '@dq/core';
import { requestKindAr } from '@dq/core';

export function ResidentRequests() {
  const store = useStore();
  const mine = store.requests.filter((r) => r.raisedBy === store.currentUsers.resident);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <SectionTitle
        action={
          <Link to="/r/requests/new">
            <Button><Plus size={15} /> بلاغ جديد</Button>
          </Link>
        }
      >
        الطلبات والبلاغات
      </SectionTitle>

      {mine.length === 0 && <Card className="p-6"><EmptyState title="لا بلاغات" hint="أبلغ عن أي ملاحظة في الحي وسنتابعها معك" /></Card>}

      <div className="space-y-3">
        {mine.map((r) => (
          <Link key={r.id} to={`/r/requests/${r.id}`} className="block">
            <Card className="p-4 transition-colors hover:bg-brand-50">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{requestKindAr[r.kind]}</span>
                    {requestPill(r.status)}
                  </div>
                  <p className="mt-1 truncate text-caption text-ink-500">{r.descriptionAr}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <SlaBadge req={r} />
                    <span className="text-caption text-ink-500">{ago(r.events[0]?.atISO ?? '')}</span>
                  </div>
                </div>
                <ChevronLeft size={18} className="shrink-0 text-ink-500" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
