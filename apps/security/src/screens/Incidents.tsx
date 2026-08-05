import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useStore } from '@dq/core';
import { Button, Card, SectionTitle } from '@dq/ui';
import { incidentPill } from '../components/StatusPill';
import { Txn } from '@dq/ui';
import { fmtDateTime } from '@dq/core';
import { incidentKindAr, severityAr } from '@dq/core';

export function IncidentsList() {
  const incidents = useStore((s) => s.incidents);
  return (
    <div className="space-y-4">
      <SectionTitle
        action={
          <Link to="/incidents/new">
            <Button><Plus size={15} /> بلاغ جديد</Button>
          </Link>
        }
      >
        البلاغات الأمنية
      </SectionTitle>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-start text-caption text-ink-500">
              <th className="p-3 text-start">رقم المعاملة</th>
              <th className="p-3 text-start">النوع</th>
              <th className="p-3 text-start">الخطورة</th>
              <th className="p-3 text-start">وقت الواقعة</th>
              <th className="p-3 text-start">الحالة</th>
              <th className="p-3 text-start">الاستجابة</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((i) => (
              <tr key={i.id} className="border-b border-ink-100/50 hover:bg-ink-50/50">
                <td className="p-3"><Link className="text-brand-600 hover:underline" to={`/incidents/${i.id}`}><Txn no={i.txnNo} /></Link></td>
                <td className="p-3">{incidentKindAr[i.kind]}</td>
                <td className="p-3">{severityAr[i.severity]}</td>
                <td className="p-3 tabular-nums text-ink-500">{fmtDateTime(i.occurredISO)}</td>
                <td className="p-3">{incidentPill(i.status)}</td>
                <td className="p-3 tabular-nums text-ink-500">
                  {i.dispatch?.responseSeconds != null ? `${Math.floor(i.dispatch.responseSeconds / 60)} د ${i.dispatch.responseSeconds % 60} ث` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
