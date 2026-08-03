import { useMemo, useState } from 'react';
import { CheckCircle2, PlayCircle, Wrench } from 'lucide-react';
import { useStore } from '@dq/core';
import { Button, Card, EmptyState, Field, Modal, SectionTitle, Select } from '@dq/ui';
import { MapCanvas } from '../components/MapCanvas';
import { requestPill } from '../components/StatusPill';
import { SlaBadge } from '../components/SlaBadge';
import { Timeline } from '../components/Timeline';
import { MediaGrid } from '../components/MediaGrid';
import { hoursFromNow } from '@dq/core';
import { priorityAr, requestKindAr, requestStatusAr } from '@dq/core';
import type { ServiceRequest } from '@dq/core';

/** §10 — queue: triage, assign, set due, escalate, approve closure. */
export function AdminRequests() {
  const store = useStore();
  const [filter, setFilter] = useState<string>('active');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [triageOpen, setTriageOpen] = useState(false);
  const [orgId, setOrgId] = useState(store.organizations[0].id);
  const [dueHours, setDueHours] = useState(24);
  const [priority, setPriority] = useState<ServiceRequest['priority']>('normal');

  const list = useMemo(() => {
    if (filter === 'active') return store.requests.filter((r) => r.status !== 'closed');
    if (filter === 'all') return store.requests;
    return store.requests.filter((r) => r.status === filter);
  }, [store.requests, filter]);

  const selected = store.requests.find((r) => r.id === selectedId) ?? list[0];

  return (
    <div className="space-y-4">
      <SectionTitle
        action={
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="!w-44">
            <option value="active">النشطة</option>
            <option value="all">الكل</option>
            {Object.entries(requestStatusAr).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        }
      >
        الطلبات والبلاغات
      </SectionTitle>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2 p-3">
          <p className="mb-2 px-1 text-[--text-caption] font-semibold text-ink-500">مواقع البلاغات — اضغط علامة لفتح البلاغ</p>
          <MapCanvas
            className="mb-3 aspect-[16/10]"
            markers={list.map((r) => ({
              id: r.id,
              lat: r.lat,
              lng: r.lng,
              color:
                selected?.id === r.id
                  ? 'var(--color-viz-2)'
                  : r.status === 'closed'
                    ? 'var(--color-viz-5)'
                    : r.status === 'new' || r.status === 'reopened'
                      ? 'var(--color-viz-4)'
                      : 'var(--color-viz-6)',
              labelAr: `${requestKindAr[r.kind]} — ${r.descriptionAr.slice(0, 40)}`,
              pulse: selected?.id === r.id,
              glyph: 'ط',
              onClick: () => setSelectedId(r.id),
            }))}
          />
          <div className="space-y-1.5">
            {list.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={`block w-full rounded-[--radius-card] p-3 text-start ${selected?.id === r.id ? 'bg-brand-50 ring-1 ring-brand-500' : 'bg-ink-50 hover:bg-brand-50'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{requestKindAr[r.kind]}</span>
                  {requestPill(r.status)}
                </div>
                <p className="mt-1 truncate text-[--text-caption] text-ink-500">{r.descriptionAr}</p>
                <div className="mt-1.5"><SlaBadge req={r} /></div>
              </button>
            ))}
            {list.length === 0 && <EmptyState title="لا طلبات ضمن هذا التصنيف" />}
          </div>
        </Card>

        {selected ? (
          <Card className="lg:col-span-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-bold">{requestKindAr[selected.kind]}</h2>
                <p className="mt-0.5 text-sm text-ink-500">{selected.descriptionAr}</p>
                <p className="mt-1 text-[--text-caption] text-ink-500">
                  الأولوية: {priorityAr[selected.priority]} · المبلّغ: {store.people.find((p) => p.id === selected.raisedBy)?.nameAr ?? 'النظام (مستشعر)'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {requestPill(selected.status)}
                <SlaBadge req={selected} />
              </div>
            </div>

            {selected.assignedToOrgId && (
              <p className="mt-3 rounded-[--radius-card] bg-ink-50 p-2.5 text-[--text-caption]">
                مُسند إلى: <b>{store.organizations.find((o) => o.id === selected.assignedToOrgId)?.nameAr}</b>
              </p>
            )}

            <div className="mt-4"><MediaGrid before={selected.mediaBefore} after={selected.mediaAfter} /></div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(selected.status === 'new' || selected.status === 'reopened') && (
                <Button onClick={() => setTriageOpen(true)}><Wrench size={15} /> تصنيف وإسناد</Button>
              )}
              {selected.status === 'assigned' && (
                <Button onClick={() => store.startRequestWork(selected.id)}><PlayCircle size={15} /> بدء التنفيذ (محاكاة المقاول)</Button>
              )}
              {selected.status === 'in_progress' && (
                <Button onClick={() => store.completeRequestWork(selected.id)}><CheckCircle2 size={15} /> اكتمال التنفيذ + صور بعد</Button>
              )}
              {selected.status === 'awaiting_verification' && (
                <Button variant="success" onClick={() => store.approveRequestClosure(selected.id)}><CheckCircle2 size={15} /> اعتماد الإغلاق</Button>
              )}
            </div>

            <div className="mt-6">
              <p className="mb-2 text-[--text-caption] font-semibold text-ink-500">الخط الزمني</p>
              <Timeline events={selected.events} />
            </div>
          </Card>
        ) : (
          <Card className="lg:col-span-3 p-5"><EmptyState title="اختر طلبًا" /></Card>
        )}
      </div>

      <Modal open={triageOpen} onClose={() => setTriageOpen(false)} title="تصنيف وإسناد">
        <div className="space-y-3">
          <Field label="الجهة المنفذة">
            <Select value={orgId} onChange={(e) => setOrgId(e.target.value)}>
              {store.organizations.filter((o) => ['cleaning', 'landscape', 'maintenance'].includes(o.kind)).map((o) => (
                <option key={o.id} value={o.id}>{o.nameAr}</option>
              ))}
            </Select>
          </Field>
          <Field label="مهلة الإنجاز">
            <Select value={dueHours} onChange={(e) => setDueHours(+e.target.value)}>
              <option value={4}>4 ساعات (عاجل)</option>
              <option value={24}>24 ساعة</option>
              <option value={48}>48 ساعة</option>
              <option value={72}>3 أيام</option>
            </Select>
          </Field>
          <Field label="الأولوية">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as ServiceRequest['priority'])}>
              {Object.entries(priorityAr).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setTriageOpen(false)}>إلغاء</Button>
          <Button onClick={() => { store.triageRequest(selected!.id, orgId, hoursFromNow(dueHours), priority); setTriageOpen(false); }}>
            إسناد
          </Button>
        </div>
      </Modal>
    </div>
  );
}
