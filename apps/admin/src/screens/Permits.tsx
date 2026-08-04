import { useMemo, useState } from 'react';
import { CheckCircle2, MessageCircleQuestion, PauseCircle, XCircle } from 'lucide-react';
import { useStore } from '@dq/core';
import { Button, Card, EmptyState, Field, Input, Modal, SectionTitle, Select } from '@dq/ui';
import { permitPill } from '../components/StatusPill';
import { PlateBadge } from '@dq/ui';
import { fmtDateTime } from '@dq/core';
import { permitKindAr, permitStatusAr } from '@dq/core';

/** §10 — approve / reject / request info / suspend. */
export function AdminPermits() {
  const store = useStore();
  const [filter, setFilter] = useState('pending');
  const [action, setAction] = useState<{ id: string; kind: 'reject' | 'info' | 'suspend' } | null>(null);
  const [note, setNote] = useState('');

  const list = useMemo(
    () => (filter === 'all' ? store.permits : store.permits.filter((p) => p.status === filter)),
    [store.permits, filter],
  );

  return (
    <div className="space-y-4">
      <SectionTitle
        action={
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="!w-44">
            <option value="pending">بانتظار الاعتماد</option>
            <option value="all">الكل</option>
            {Object.entries(permitStatusAr).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        }
      >
        التصاريح
      </SectionTitle>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((p) => {
          const host = store.properties.find((x) => x.id === p.hostPropertyId);
          return (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{p.subject.nameAr}</p>
                  <p className="text-caption text-ink-500">{permitKindAr[p.kind]}{host ? ` · مضيف: ${host.code}` : ''}</p>
                </div>
                {permitPill(p.status)}
              </div>
              {p.plate && <div className="mt-2"><PlateBadge plate={p.plate} size="sm" /></div>}
              <p className="mt-2 text-caption tabular-nums text-ink-500">
                {fmtDateTime(p.validFromISO)} ← {fmtDateTime(p.validToISO)} · مرافقون: {p.companions}
              </p>
              {p.approvals.length > 0 && (
                <p className="mt-1 text-caption text-ink-500">
                  آخر إجراء: {p.approvals[p.approvals.length - 1].decision === 'approved' ? 'اعتماد' : p.approvals[p.approvals.length - 1].decision === 'rejected' ? 'رفض' : 'طلب معلومات'}
                  {p.approvals[p.approvals.length - 1].noteAr ? ` — ${p.approvals[p.approvals.length - 1].noteAr}` : ''}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.status === 'pending' && (
                  <>
                    <Button size="sm" onClick={() => store.decidePermit(p.id, 'approved')}><CheckCircle2 size={13} /> اعتماد</Button>
                    <Button size="sm" variant="outline" onClick={() => { setNote(''); setAction({ id: p.id, kind: 'reject' }); }}><XCircle size={13} /> رفض</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setNote(''); setAction({ id: p.id, kind: 'info' }); }}><MessageCircleQuestion size={13} /> طلب معلومات</Button>
                  </>
                )}
                {p.status === 'approved' && (
                  <Button size="sm" variant="outline" onClick={() => { setNote(''); setAction({ id: p.id, kind: 'suspend' }); }}><PauseCircle size={13} /> إيقاف</Button>
                )}
                {p.status === 'suspended' && (
                  <Button size="sm" variant="success" onClick={() => store.liftPermitSuspension(p.id)}>رفع الإيقاف</Button>
                )}
              </div>
            </Card>
          );
        })}
        {list.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3">
            <Card className="p-6"><EmptyState title="لا تصاريح ضمن هذا التصنيف" /></Card>
          </div>
        )}
      </div>

      <Modal
        open={!!action}
        onClose={() => setAction(null)}
        title={action?.kind === 'reject' ? 'سبب الرفض' : action?.kind === 'info' ? 'المعلومات المطلوبة' : 'سبب الإيقاف'}
      >
        <Field label="ملاحظة (تظهر للمقيم)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="اكتب السبب…" />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setAction(null)}>إلغاء</Button>
          <Button
            variant={action?.kind === 'info' ? 'primary' : 'danger'}
            onClick={() => {
              if (!action) return;
              if (action.kind === 'suspend') store.suspendPermit(action.id, note || 'قرار إداري');
              else store.decidePermit(action.id, action.kind === 'reject' ? 'rejected' : 'info_requested', note || undefined);
              setAction(null);
            }}
          >
            تنفيذ
          </Button>
        </div>
      </Modal>
    </div>
  );
}
