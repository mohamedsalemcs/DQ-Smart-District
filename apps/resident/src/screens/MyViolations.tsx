import { useMemo, useState } from 'react';
import { Gavel, ShieldAlert } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  PlateBadge,
  StatusPill,
  TextArea,
  type Tone,
} from '@dq/ui';
import { fmtDate, fmtDateTime, useStore, violationStatusAr, type Violation } from '@dq/core';
import { Timeline } from '../components/Timeline';

/**
 * SCR-62 · GAP-10 — «مخالفاتي».
 * كان المقيم يُشعَر بمخالفته ولا يملك أي طريقة للاطلاع عليها، فضلًا عن الاعتراض.
 * لا يجوز نظام عقوبات بلا مسار تظلّم (EP-20).
 */

const TONE: Record<Violation['status'], Tone> = {
  open: 'bad',
  notified: 'warn',
  grace: 'warn',
  escalated: 'bad',
  appealed: 'info',
  remediated: 'ok',
  closed: 'neutral',
  cancelled: 'ok',
};

export function MyViolations() {
  const me = useStore((s) => s.currentUsers.resident);
  const people = useStore((s) => s.people);
  const vehicles = useStore((s) => s.vehicles);
  const violations = useStore((s) => s.violations);
  const settings = useStore((s) => s.settings);
  const submitAppeal = useStore((s) => s.submitAppeal);

  const [appealFor, setAppealFor] = useState<Violation | null>(null);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');

  const myProp = useMemo(() => people.find((p) => p.id === me)?.propertyId, [people, me]);

  /* مخالفاتي = على مركباتي أو عقاري أو شخصي */
  const mine = useMemo(() => {
    const myVehicleIds = new Set(
      vehicles.filter((v) => v.ownerPersonId === me || (myProp && v.propertyId === myProp)).map((v) => v.id),
    );
    return violations.filter(
      (v) =>
        (v.subject === 'vehicle' && myVehicleIds.has(v.subjectId)) ||
        (v.subject === 'property' && v.subjectId === myProp) ||
        (v.subject === 'person' && v.subjectId === me),
    );
  }, [violations, vehicles, me, myProp]);

  const canAppeal = (v: Violation) =>
    ['notified', 'grace', 'escalated'].includes(v.status) && !v.appeal;

  const submit = () => {
    if (reason.trim().length < 10) {
      setErr('اكتب سبب التظلّم بوضوح — 10 أحرف على الأقل');
      return;
    }
    submitAppeal(appealFor!.id, reason.trim());
    setAppealFor(null);
    setReason('');
    setErr('');
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="مخالفاتي"
        subtitle="المخالفات المسجّلة على مركباتك أو عقارك — ولك حق التظلّم خلال مهلة التصحيح"
      />

      {mine.length === 0 && (
        <Card padding="none">
          <EmptyState
            icon={ShieldAlert}
            title="لا مخالفات على ملفك"
            hint="لم تُسجَّل أي مخالفة على مركباتك أو عقارك. ستظهر هنا فور تسجيلها مع مهلة التصحيح."
          />
        </Card>
      )}

      <div className="space-y-3">
        {mine.map((v) => {
          const veh = v.subject === 'vehicle' ? vehicles.find((x) => x.id === v.subjectId) : undefined;
          const step = settings.ladder[v.escalationStep];
          return (
            <Card key={v.id} padding="lg">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="plate text-caption font-bold text-ink-500">{v.code}</span>
                    <h3 className="text-h3 font-bold text-ink-900">{v.labelAr}</h3>
                    <StatusPill labelAr={violationStatusAr[v.status]} tone={TONE[v.status]} size="sm" />
                  </div>
                  {veh && (
                    <div className="mt-2">
                      <PlateBadge plate={veh.plate} size="sm" />
                    </div>
                  )}
                  <p className="mt-2 text-caption text-ink-500">
                    سُجّلت {fmtDateTime(v.events[0]?.atISO ?? '')}
                    {v.repeatCount > 1 && ` · التكرار ${v.repeatCount} خلال 12 شهرًا`}
                  </p>
                </div>

                {canAppeal(v) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAppealFor(v);
                      setReason('');
                      setErr('');
                    }}
                  >
                    <Gavel size={15} aria-hidden />
                    تقديم تظلّم
                  </Button>
                )}
              </div>

              {/* الأثر بلغة مفهومة لا بمصطلح داخلي */}
              <div className="mt-4 rounded-ctl bg-ink-50 p-3.5">
                <p className="text-caption font-semibold text-ink-700">
                  الدرجة الحالية: {step?.labelAr ?? '—'}
                </p>
                <p className="mt-1 text-caption leading-relaxed text-ink-500">
                  {step?.descriptionAr}
                </p>
                {v.graceUntilISO && v.status === 'grace' && (
                  <p className="mt-2 text-caption font-semibold text-warn-600">
                    مهلة التصحيح حتى {fmtDate(v.graceUntilISO)}
                  </p>
                )}
              </div>

              {v.appeal && (
                <div className="mt-3 rounded-ctl border border-info-500/20 bg-info-50 p-3.5">
                  <p className="text-caption font-bold text-info-600">
                    {v.appeal.decision === 'accepted'
                      ? 'قُبل تظلّمك — أُلغيت المخالفة'
                      : v.appeal.decision === 'rejected'
                        ? 'رُفض تظلّمك'
                        : 'تظلّمك قيد المراجعة — عدّاد المهلة متوقف'}
                  </p>
                  <p className="mt-1 text-caption text-ink-600">{v.appeal.reasonAr}</p>
                  {v.appeal.decisionNoteAr && (
                    <p className="mt-1.5 text-caption font-medium text-ink-700">
                      رد الإدارة: {v.appeal.decisionNoteAr}
                    </p>
                  )}
                </div>
              )}

              <details className="mt-4">
                <summary className="cursor-pointer text-caption font-semibold text-brand-600">
                  الخط الزمني
                </summary>
                <div className="mt-3">
                  <Timeline events={v.events} />
                </div>
              </details>
            </Card>
          );
        })}
      </div>

      <Modal open={!!appealFor} onClose={() => setAppealFor(null)} title="تقديم تظلّم">
        <p className="mb-4 rounded-ctl bg-brand-50 p-3 text-caption leading-relaxed text-brand-700">
          تقديم التظلّم <b>يوقف عدّاد مهلة التصحيح</b> حتى يبتّ فيه المشرف. إن قُبل تظلّمك تُلغى المخالفة
          وتُرفع كل آثارها — بما فيها إيقاف المركبة إن وُجد.
        </p>
        <Field label="سبب التظلّم" required error={err}>
          <TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="اشرح سبب اعتراضك على المخالفة…"
            autoFocus
          />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setAppealFor(null)}>
            إلغاء
          </Button>
          <Button onClick={submit}>إرسال التظلّم</Button>
        </div>
      </Modal>
    </div>
  );
}
