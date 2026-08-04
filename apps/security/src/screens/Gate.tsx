import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, DoorOpen, PhoneCall, QrCode, ShieldQuestion, XCircle } from 'lucide-react';
import { useStore } from '@dq/core';
import { evaluateGate, type GateDecision } from '@dq/core';
import { Button, Card, Input, Modal } from '@dq/ui';
import { QrScanModal } from '../components/QrScanModal';
import { PlateBadge } from '@dq/ui';
import { Timeline } from '../components/Timeline';
import { fmtDateTime, fmtTime, fmtDate } from '@dq/core';
import { gateDecisionAr, permitKindAr } from '@dq/core';

/** §11 — the decision panel. One of three full-bleed states, unmistakable at 3 metres. */
export function GateScreen() {
  const { gateId = 'gate-1' } = useParams();
  const store = useStore();
  const gate = store.gates.find((g) => g.id === gateId);
  const [plateInput, setPlateInput] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const [result, setResult] = useState<GateDecision | null>(null);
  const [violationOpen, setViolationOpen] = useState(false);

  const log = useMemo(
    () => store.gateEvents.filter((e) => e.gateId === gateId).slice(0, 8),
    [store.gateEvents, gateId],
  );

  const scan = (method: 'qr' | 'plate' | 'manual', input: string) => {
    if (!input.trim()) return;
    store.recordGateScan(gateId, method, input);
    // recordGateScan wrote the event; recompute the rich panel data for display
    setResult(evaluateGate(input, store));
    setPlateInput('');
  };

  const demoVehicle = store.vehicles.find((v) => v.id === store.demoVehicleId);
  const sampleResident = store.vehicles.find((v) => v.propertyId && v.accessState === 'allowed');
  const sourceViolation = result?.vehicle?.suspension
    ? store.violations.find((v) => v.id === result.vehicle!.suspension!.sourceViolationId)
    : undefined;
  const decidedBy = result?.vehicle?.suspension
    ? store.people.find((p) => p.id === result.vehicle!.suspension!.decidedBy)
    : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-bold">
          <DoorOpen size={20} className="text-brand-600" />
          {gate?.nameAr ?? 'البوابة'}
        </h1>
        <div className="flex gap-1">
          {store.gates.map((g) => (
            <Link
              key={g.id}
              to={`/s/gate/${g.id}`}
              className={`rounded-full px-2.5 py-1 text-caption ${g.id === gateId ? 'bg-brand-600 text-ink-900 font-bold' : 'bg-ink-50 text-ink-500'}`}
            >
              {g.nameAr.replace('بوابة ', '').replace('البوابة ', '')}
            </Link>
          ))}
        </div>
      </div>

      {/* input row — tablet-first hit areas */}
      <Card className="p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button size="lg" onClick={() => setQrOpen(true)} className="sm:w-44">
            <QrCode size={20} /> مسح QR
          </Button>
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              scan('plate', plateInput);
            }}
          >
            <Input
              placeholder="أدخل رقم اللوحة… مثال: ن د ب 4821"
              value={plateInput}
              onChange={(e) => setPlateInput(e.target.value)}
              className="!bg-ink-0 !text-ink-800 !border-ink-300 placeholder:!text-ink-500 h-12 text-lg"
            />
            <Button size="lg" type="submit" variant="outline" className="border-ink-300 text-ink-800">
              تحقق
            </Button>
          </form>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-caption text-ink-500">
          <span>أمثلة سريعة:</span>
          {demoVehicle && (
            <button onClick={() => scan('plate', demoVehicle.plate)} className="rounded-full bg-ink-50 px-2 py-0.5 hover:bg-brand-600 hover:text-ink-900-900">
              حافلة المدرسة <bdi>{demoVehicle.plate}</bdi>
            </button>
          )}
          {sampleResident && (
            <button onClick={() => scan('plate', sampleResident.plate)} className="rounded-full bg-ink-50 px-2 py-0.5 hover:bg-brand-600 hover:text-ink-900-900">
              مركبة مقيم <bdi>{sampleResident.plate}</bdi>
            </button>
          )}
        </div>
      </Card>

      {/* THE decision panel */}
      {result && (
        <section
          role="status"
          className={`rounded-card p-8 text-center text-white ${
            result.decision === 'allowed' ? 'bg-ok-600' : result.decision === 'denied' ? 'bg-danger-600' : 'bg-warn-600'
          }`}
        >
          <div className="mx-auto mb-3 w-fit">
            {result.decision === 'allowed' ? <CheckCircle2 size={64} /> : result.decision === 'denied' ? <XCircle size={64} /> : <ShieldQuestion size={64} />}
          </div>
          <p className="text-4xl font-bold">{result.headlineAr}</p>
          <p className="mt-2 text-lg opacity-95">{result.reasonAr}</p>

          {result.vehicle && (
            <div className="mt-4">
              <PlateBadge plate={result.vehicle.plate} size="lg" />
              <p className="mt-1 text-sm opacity-90">
                {result.vehicle.make} · {result.vehicle.color}
              </p>
            </div>
          )}

          {/* ALLOWED: permit holder, host, window, companions */}
          {result.decision === 'allowed' && result.permit && (
            <div className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-x-6 gap-y-1 rounded-card bg-ink-0/15 p-4 text-start text-sm">
              <span className="opacity-80">حامل التصريح</span>
              <span className="font-semibold">{result.permit.subject.nameAr}</span>
              <span className="opacity-80">النوع</span>
              <span className="font-semibold">{permitKindAr[result.permit.kind]}</span>
              {result.property && (
                <>
                  <span className="opacity-80">المضيف</span>
                  <span className="font-semibold">{result.property.code} — {result.property.unitNo}</span>
                </>
              )}
              <span className="opacity-80">الصلاحية</span>
              <span className="font-semibold tabular-nums">حتى {fmtDateTime(result.permit.validToISO)}</span>
              <span className="opacity-80">المرافقون</span>
              <span className="font-semibold">{result.permit.companions}</span>
            </div>
          )}
          {result.decision === 'allowed' && !result.permit && result.property && (
            <p className="mt-3 text-sm opacity-90">
              {result.property.code} — {result.property.unitNo} · {result.property.zone}
            </p>
          )}

          {/* paid visitor day-pass details */}
          {result.decision === 'allowed' && result.visitorPass && (
            <div className="mx-auto mt-4 max-w-md space-y-1.5 rounded-card bg-ink-0/15 p-4 text-start text-sm">
              <div className="flex justify-between">
                <span className="opacity-80">الزائر</span>
                <span className="font-semibold">{result.visitorPass.visitorNameAr}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-80">المركبة</span>
                <bdi className="plate font-semibold">{result.visitorPass.plate}</bdi>
              </div>
              <div className="flex justify-between">
                <span className="opacity-80">المدفوع</span>
                <span className="font-semibold tabular-nums">{result.visitorPass.totalPaid} ر.س</span>
              </div>
              {result.visitorPass.orders.length > 0 && (
                <p className="mt-1 rounded bg-ink-0/20 px-2 py-1.5 text-center text-caption font-semibold">
                  {result.visitorPass.orders.length} طلب مطاعم مدفوع مسبقًا — الاستلام بنفس الرمز
                </p>
              )}
            </div>
          )}

          {/* DENIED: reason, window, decider, tappable source violation (§11) */}
          {result.decision === 'denied' && result.vehicle?.suspension && (
            <div className="mx-auto mt-4 max-w-md space-y-2 rounded-card bg-ink-0/15 p-4 text-start text-sm">
              <div className="flex justify-between">
                <span className="opacity-80">فترة الإيقاف</span>
                <span className="font-semibold tabular-nums">
                  {fmtDate(result.vehicle.suspension.fromISO)} ← {fmtDate(result.vehicle.suspension.untilISO)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-80">قرار</span>
                <span className="font-semibold">{decidedBy?.nameAr ?? '—'} (مشرف)</span>
              </div>
              <button
                onClick={() => setViolationOpen(true)}
                className="w-full rounded-ctl bg-ink-0/20 px-3 py-2 text-center font-semibold hover:bg-ink-0/30"
              >
                المخالفة المصدر: {sourceViolation?.code} — اضغط للتفاصيل
              </button>
            </div>
          )}

          {/* ESCALATE: call-host action */}
          {result.decision === 'escalated' && (
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" className="border-white/50 !text-white" onClick={() => store.pushToast('جارٍ الاتصال بالمضيف…', 'محاكاة اتصال', 'info')}>
                <PhoneCall size={16} /> الاتصال بالمضيف
              </Button>
              <Button variant="outline" className="border-white/50 !text-white" onClick={() => store.notify('security', 'طلب مشرف عند البوابة', `${gate?.nameAr} — حالة تصعيد`, `/s/gate/${gateId}`, 'warn')}>
                طلب مشرف
              </Button>
            </div>
          )}
        </section>
      )}

      {/* running log — proves the record exists */}
      <Card className="p-4">
        <h2 className="mb-2 text-sm font-semibold text-ink-500">سجل البوابة — كل مسح يُسجّل أيًا كانت النتيجة</h2>
        <div className="space-y-1.5">
          {log.map((e) => (
            <div key={e.id} className="flex items-center gap-2 rounded-ctl bg-ink-0 px-3 py-2 text-caption">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  e.decision === 'allowed' ? 'bg-ok-600' : e.decision === 'denied' ? 'bg-danger-600' : 'bg-warn-600'
                }`}
              />
              <span className={`w-14 font-bold ${e.decision === 'allowed' ? 'text-ok-600' : e.decision === 'denied' ? 'text-danger-600' : 'text-warn-600-600'}`}>
                {gateDecisionAr[e.decision]}
              </span>
              <bdi className="plate text-ink-800">{e.input}</bdi>
              <span className="text-ink-500">{e.reasonAr}</span>
              <span className="ms-auto tabular-nums text-ink-500">{fmtTime(e.atISO)}</span>
            </div>
          ))}
          {log.length === 0 && <p className="py-3 text-center text-caption text-ink-500">لا عمليات على هذه البوابة بعد</p>}
        </div>
      </Card>

      <QrScanModal open={qrOpen} onClose={() => setQrOpen(false)} onScan={(tok) => scan('qr', tok)} />

      {/* source violation drill-down */}
      <Modal open={violationOpen} onClose={() => setViolationOpen(false)} title={`المخالفة ${sourceViolation?.code ?? ''}`} wide>
        {sourceViolation && (
          <div className="space-y-3">
            <p className="font-semibold">{sourceViolation.labelAr}</p>
            <p className="text-sm text-ink-500">التكرار: {sourceViolation.repeatCount} · درجة التصعيد: {sourceViolation.escalationStep}</p>
            <Timeline events={sourceViolation.events} />
          </div>
        )}
      </Modal>
    </div>
  );
}
