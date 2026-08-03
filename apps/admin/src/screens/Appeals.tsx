import { useMemo, useState } from 'react';
import { Gavel, ThumbsDown, ThumbsUp } from 'lucide-react';
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
} from '@dq/ui';
import { fmtDateTime, useStore, type Violation } from '@dq/core';

/**
 * EP-20 · MOD-22 — البت في التظلّمات.
 * القبول يُلغي المخالفة ويرفع كل آثارها بما فيها الإيقاف (BR-124)،
 * ولا تُحتسب في التكرار. الرفض يتطلب تسبيبًا يظهر للمخالف.
 */
export function AdminAppeals() {
  const violations = useStore((s) => s.violations);
  const vehicles = useStore((s) => s.vehicles);
  const people = useStore((s) => s.people);
  const properties = useStore((s) => s.properties);
  const decideAppeal = useStore((s) => s.decideAppeal);

  const [acting, setActing] = useState<{ v: Violation; decision: 'accepted' | 'rejected' } | null>(null);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const pending = useMemo(() => violations.filter((v) => v.status === 'appealed'), [violations]);
  const decided = useMemo(
    () => violations.filter((v) => v.appeal?.decision).slice(0, 20),
    [violations],
  );

  const subjectOf = (v: Violation) => {
    if (v.subject === 'vehicle') {
      const veh = vehicles.find((x) => x.id === v.subjectId);
      return veh ? <PlateBadge plate={veh.plate} size="sm" /> : <span>مركبة</span>;
    }
    if (v.subject === 'property')
      return <span>عقار {properties.find((x) => x.id === v.subjectId)?.code ?? ''}</span>;
    return <span>{people.find((x) => x.id === v.subjectId)?.nameAr ?? 'شخص'}</span>;
  };

  const submit = () => {
    if (!acting) return;
    if (acting.decision === 'rejected' && note.trim().length < 10) {
      setErr('رفض التظلّم يتطلب تسبيبًا واضحًا — يظهر للمخالف');
      return;
    }
    decideAppeal(acting.v.id, acting.decision, note.trim() || 'قُبل التظلّم');
    setActing(null);
    setNote('');
    setErr('');
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="التظلّمات"
        subtitle="اعتراضات السكان على المخالفات — القبول يُلغي المخالفة ويرفع كل آثارها"
      />

      {pending.length === 0 && (
        <Card padding="none">
          <EmptyState
            icon={Gavel}
            title="لا تظلّمات قيد المراجعة"
            hint="التظلّمات الجديدة تظهر هنا فور تقديمها، وعدّاد مهلة التصحيح يتوقف حتى البت فيها."
          />
        </Card>
      )}

      <div className="space-y-3">
        {pending.map((v) => (
          <Card key={v.id} padding="lg">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="plate text-[--text-caption] font-bold text-ink-500">{v.code}</span>
                  <h3 className="text-[--text-h3] font-bold text-ink-900">{v.labelAr}</h3>
                  <StatusPill labelAr="قيد التظلّم" tone="info" size="sm" />
                </div>
                <div className="mt-2 flex items-center gap-2 text-[--text-caption] text-ink-500">
                  {subjectOf(v)}
                  <span>· التكرار {v.repeatCount}</span>
                  <span>· الدرجة {v.escalationStep}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="success"
                  onClick={() => {
                    setActing({ v, decision: 'accepted' });
                    setNote('');
                    setErr('');
                  }}
                >
                  <ThumbsUp size={15} aria-hidden />
                  قبول
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setActing({ v, decision: 'rejected' });
                    setNote('');
                    setErr('');
                  }}
                >
                  <ThumbsDown size={15} aria-hidden />
                  رفض
                </Button>
              </div>
            </div>

            <blockquote className="mt-4 rounded-[--radius-ctl] border-s-4 border-s-info-500 bg-info-50 p-3.5">
              <p className="text-[--text-body] leading-relaxed text-ink-800">{v.appeal?.reasonAr}</p>
              <p className="mt-2 text-[--text-caption] text-ink-500">
                {people.find((p) => p.id === v.appeal?.submittedBy)?.nameAr ?? 'مقيم'} ·{' '}
                {v.appeal ? fmtDateTime(v.appeal.submittedISO) : ''}
              </p>
            </blockquote>
          </Card>
        ))}
      </div>

      {decided.length > 0 && (
        <Card padding="lg">
          <h2 className="mb-3 text-[--text-h3] font-semibold text-ink-900">تظلّمات سابقة</h2>
          <ul className="divide-y divide-ink-100">
            {decided.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="text-[--text-caption] text-ink-700">
                  <span className="plate font-bold">{v.code}</span> — {v.labelAr}
                </span>
                <StatusPill
                  labelAr={v.appeal?.decision === 'accepted' ? 'قُبل' : 'رُفض'}
                  tone={v.appeal?.decision === 'accepted' ? 'ok' : 'bad'}
                  size="sm"
                />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal
        open={!!acting}
        onClose={() => setActing(null)}
        title={acting?.decision === 'accepted' ? 'قبول التظلّم' : 'رفض التظلّم'}
      >
        <p
          className={`mb-4 rounded-[--radius-ctl] p-3 text-[--text-caption] leading-relaxed ${
            acting?.decision === 'accepted' ? 'bg-ok-50 text-ok-600' : 'bg-warn-50 text-warn-600'
          }`}
        >
          {acting?.decision === 'accepted'
            ? 'ستُلغى المخالفة، وتُرفع كل آثارها بما فيها إيقاف المركبة إن وُجد، ولن تُحتسب في التكرار.'
            : 'ستعود المخالفة إلى مسار التصعيد، ويستأنف عدّاد المهلة. التسبيب يظهر للمخالف.'}
        </p>
        <Field
          label={acting?.decision === 'accepted' ? 'ملاحظة (اختيارية)' : 'سبب الرفض'}
          required={acting?.decision === 'rejected'}
          error={err}
        >
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setActing(null)}>
            إلغاء
          </Button>
          <Button variant={acting?.decision === 'accepted' ? 'success' : 'danger'} onClick={submit}>
            تأكيد
          </Button>
        </div>
      </Modal>
    </div>
  );
}
