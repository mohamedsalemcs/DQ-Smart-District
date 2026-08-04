import { useMemo, useState } from 'react';
import { Ban, BellRing, CheckCircle2, History, Timer, TrendingUp } from 'lucide-react';
import { useStore } from '@dq/core';
import { Button, Card, ConfirmDialog, EmptyState, Field, Input, Modal, SectionTitle } from '@dq/ui';
import { MapCanvas } from '../components/MapCanvas';
import { violationPill } from '../components/StatusPill';
import { EscalationLadder } from '../components/EscalationLadder';
import { Timeline } from '../components/Timeline';
import { AuditDrawer } from '../components/AuditDrawer';
import { PlateBadge } from '@dq/ui';
import { fmtDateTime, ago } from '@dq/core';
import type { Violation } from '@dq/core';

/** §10 — Path A lives here: grace period, escalation ladder, suspension. */
export function AdminViolations() {
  const store = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [graceOpen, setGraceOpen] = useState(false);
  const [graceDays, setGraceDays] = useState(store.settings.graceDays);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendDays, setSuspendDays] = useState(store.settings.suspensionDays);
  const [suspendReason, setSuspendReason] = useState('مخالفة متكررة — وقوف خاطئ أمام مسار المشاة');
  const [closeConfirm, setCloseConfirm] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  const open = useMemo(() => store.violations.filter((v) => v.status !== 'closed'), [store.violations]);
  const closed = useMemo(() => store.violations.filter((v) => v.status === 'closed'), [store.violations]);
  const selected = store.violations.find((v) => v.id === selectedId) ?? open[0];

  const subjectOf = (v: Violation) => {
    if (v.subject === 'vehicle') {
      const veh = store.vehicles.find((x) => x.id === v.subjectId);
      return veh ? <span className="inline-flex items-center gap-1.5">مركبة <PlateBadge plate={veh.plate} size="sm" /></span> : 'مركبة';
    }
    if (v.subject === 'property') {
      const p = store.properties.find((x) => x.id === v.subjectId);
      return `عقار ${p?.code ?? ''}`;
    }
    return store.people.find((x) => x.id === v.subjectId)?.nameAr ?? 'شخص';
  };

  const vehicle = selected?.subject === 'vehicle' ? store.vehicles.find((x) => x.id === selected.subjectId) : undefined;
  const canSuspend =
    selected &&
    vehicle &&
    vehicle.accessState === 'allowed' &&
    selected.escalationStep >= store.settings.suspendAtStep - 1 &&
    (selected.status === 'escalated' || selected.status === 'notified' || selected.status === 'grace');

  return (
    <div className="space-y-4">
      <SectionTitle>المخالفات</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-5">
        {/* queue */}
        <Card className="lg:col-span-2 p-3">
          <p className="mb-2 px-1 text-caption font-semibold text-ink-500">مواقع المخالفات — اضغط علامة لفتح المخالفة</p>
          <MapCanvas
            className="mb-3 aspect-[16/10]"
            markers={open.map((v) => ({
              id: v.id,
              lat: v.lat,
              lng: v.lng,
              color:
                selected?.id === v.id
                  ? 'var(--color-viz-2)'
                  : v.status === 'remediated'
                    ? 'var(--color-viz-3)'
                    : v.status === 'notified' || v.status === 'grace'
                      ? 'var(--color-viz-6)'
                      : 'var(--color-viz-4)',
              labelAr: `${v.code} — ${v.labelAr}`,
              pulse: selected?.id === v.id,
              glyph: 'م',
              onClick: () => setSelectedId(v.id),
            }))}
          />
          <p className="mb-2 px-1 text-caption font-semibold text-ink-500">قائمة الانتظار ({open.length})</p>
          <div className="space-y-1.5">
            {open.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                className={`block w-full rounded-card p-3 text-start transition-colors ${
                  selected?.id === v.id ? 'bg-brand-50 ring-1 ring-brand-500' : 'bg-ink-50 hover:bg-brand-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{v.code} · {subjectOf(v)}</span>
                  {violationPill(v.status)}
                </div>
                <p className="mt-1 truncate text-caption text-ink-500">{v.labelAr}</p>
                <div className="mt-1 flex items-center gap-2 text-caption text-ink-500">
                  <span>{ago(v.events[0]?.atISO ?? '')}</span>
                  {v.repeatCount > 1 && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-danger-50 px-1.5 py-0.5 font-semibold text-danger-600">
                      <History size={10} /> تكرار {v.repeatCount}
                    </span>
                  )}
                </div>
              </button>
            ))}
            {open.length === 0 && <EmptyState title="لا مخالفات مفتوحة" />}
          </div>
          {closed.length > 0 && (
            <p className="mt-3 px-1 text-caption text-ink-500">+ {closed.length} مخالفة مغلقة في الأرشيف</p>
          )}
        </Card>

        {/* detail */}
        {selected ? (
          <Card className="lg:col-span-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-bold">{selected.code} — {selected.labelAr}</h2>
                <p className="mt-0.5 text-sm text-ink-500">{subjectOf(selected)} · سُجلت {fmtDateTime(selected.events[0]?.atISO ?? '')}</p>
              </div>
              <div className="flex items-center gap-2">
                {violationPill(selected.status)}
                <Button size="sm" variant="ghost" onClick={() => setAuditOpen(true)}>
                  <History size={13} /> سجل التدقيق
                </Button>
              </div>
            </div>

            {/* ladder — driven by Settings, not hardcoded */}
            <div className="mt-5 rounded-card bg-ink-50 p-4">
              <p className="mb-3 text-caption font-semibold text-ink-500">سلّم التصعيد (قابل للتعديل من الإعدادات) — الدرجة الحالية: {selected.escalationStep}</p>
              <EscalationLadder currentStep={selected.escalationStep} />
            </div>

            {selected.graceUntilISO && selected.status === 'grace' && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-warn-600-50 px-3 py-1 text-caption font-medium text-warn-600">
                <Timer size={13} /> مهلة التصحيح حتى {fmtDateTime(selected.graceUntilISO)}
              </p>
            )}

            {vehicle?.accessState === 'suspended' && (
              <div className="mt-3 rounded-card border border-danger-500 bg-danger-50 p-3 text-sm">
                <p className="flex items-center gap-1.5 font-semibold text-danger-600"><Ban size={15} /> الإنفاذ البوابي مفعّل</p>
                <p className="mt-1 text-caption text-ink-500">
                  المركبة سترفض عند جميع البوابات حتى {fmtDateTime(vehicle.suspension!.untilISO)} — قرار{' '}
                  {store.people.find((p) => p.id === vehicle.suspension!.decidedBy)?.nameAr}
                </p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => store.liftVehicleSuspension(vehicle.id)}>
                  رفع الإيقاف
                </Button>
              </div>
            )}

            {/* actions by state */}
            <div className="mt-5 flex flex-wrap gap-2">
              {selected.status === 'open' && (
                <Button onClick={() => store.notifyViolation(selected.id)}>
                  <BellRing size={15} /> إشعار المخالف
                </Button>
              )}
              {(selected.status === 'notified' || selected.status === 'escalated') && (
                <Button variant="outline" onClick={() => { setGraceDays(store.settings.graceDays); setGraceOpen(true); }}>
                  <Timer size={15} /> تحديد مهلة تصحيح
                </Button>
              )}
              {selected.status !== 'open' && selected.status !== 'remediated' && (
                <Button variant="outline" onClick={() => store.escalateViolation(selected.id)}>
                  <TrendingUp size={15} /> تصعيد درجة
                </Button>
              )}
              {canSuspend && (
                <Button variant="danger" onClick={() => { setSuspendDays(store.settings.suspensionDays); setSuspendOpen(true); }}>
                  <Ban size={15} /> إيقاف المركبة (قرار مشرف)
                </Button>
              )}
              {(selected.status === 'grace' || selected.status === 'escalated') && (
                <Button variant="success" onClick={() => store.remediateViolation(selected.id)}>
                  <CheckCircle2 size={15} /> تم التصحيح
                </Button>
              )}
              {selected.status === 'remediated' && (
                <Button variant="success" onClick={() => setCloseConfirm(true)}>
                  <CheckCircle2 size={15} /> إغلاق المخالفة
                </Button>
              )}
            </div>

            <div className="mt-6">
              <p className="mb-2 text-caption font-semibold text-ink-500">الخط الزمني</p>
              <Timeline events={selected.events} />
            </div>
          </Card>
        ) : (
          <Card className="lg:col-span-3 p-5">
            <EmptyState title="اختر مخالفة من القائمة" />
          </Card>
        )}
      </div>

      {/* grace dialog */}
      <Modal open={graceOpen} onClose={() => setGraceOpen(false)} title="مهلة التصحيح">
        <Field label="عدد الأيام" hint={`الافتراضي من الإعدادات: ${store.settings.graceDays} أيام`}>
          <Input type="number" min={1} max={30} value={graceDays} onChange={(e) => setGraceDays(+e.target.value)} />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setGraceOpen(false)}>إلغاء</Button>
          <Button onClick={() => { store.setViolationGrace(selected!.id, graceDays); setGraceOpen(false); }}>تحديد المهلة</Button>
        </div>
      </Modal>

      {/* suspension dialog — the supervisor decision that flips the gate */}
      <Modal open={suspendOpen} onClose={() => setSuspendOpen(false)} title="إيقاف المركبة — قرار مشرف">
        <p className="mb-3 rounded-card bg-warn-600-50 p-3 text-caption text-ink-800">
          الإيقاف يكتب حالة <b>موقوف</b> على المركبة نفسها. شاشة البوابة تقرأ هذه الحالة فقط — ولا تعيد اشتقاق القاعدة.
        </p>
        <div className="space-y-3">
          <Field label="السبب">
            <Input value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} />
          </Field>
          <Field label="مدة الإيقاف (أيام)" hint={`الافتراضي من الإعدادات: ${store.settings.suspensionDays} يومًا`}>
            <Input type="number" min={1} max={90} value={suspendDays} onChange={(e) => setSuspendDays(+e.target.value)} />
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setSuspendOpen(false)}>إلغاء</Button>
          <Button
            variant="danger"
            onClick={() => {
              store.suspendVehicleFromViolation(selected!.id, suspendDays, suspendReason);
              setSuspendOpen(false);
            }}
          >
            اعتماد الإيقاف وتفعيل الإنفاذ البوابي
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={closeConfirm}
        onClose={() => setCloseConfirm(false)}
        onConfirm={() => store.closeViolation(selected!.id)}
        title="إغلاق المخالفة؟"
        body="سيُنقل السجل إلى الأرشيف مع كامل الخط الزمني."
        confirmLabel="إغلاق"
      />

      <AuditDrawer open={auditOpen} onClose={() => setAuditOpen(false)} entity="violation" entityId={selected?.id} />
    </div>
  );
}
