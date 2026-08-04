import { useState } from 'react';
import { Ambulance, Flame, ShieldAlert, Siren } from 'lucide-react';
import { Button, Modal } from '@dq/ui';
import { useStore } from '@dq/core';
import { nowISO } from '@dq/core';
import { Txn } from '@dq/ui';
import type { IncidentKind } from '@dq/core';

const types: { kind: IncidentKind; labelAr: string; icon: typeof Flame }[] = [
  { kind: 'medical', labelAr: 'حالة طبية', icon: Ambulance },
  { kind: 'fire', labelAr: 'حريق', icon: Flame },
  { kind: 'altercation', labelAr: 'اعتداء / مشاجرة', icon: ShieldAlert },
  { kind: 'suspicious_person', labelAr: 'شخص مشتبه به', icon: Siren },
];

/** Fixed emergency button — reachable from any resident screen (§9). */
export function EmergencyButton() {
  const [open, setOpen] = useState(false);
  const [sentTxn, setSentTxn] = useState<string | null>(null);
  const createIncident = useStore((s) => s.createIncident);
  const me = useStore((s) => s.people.find((p) => p.id === s.currentUsers.resident));
  const property = useStore((s) => s.properties.find((p) => p.id === me?.propertyId));

  const send = (kind: IncidentKind) => {
    const inc = createIncident({
      kind,
      severity: 'critical',
      occurredISO: nowISO(),
      lat: property?.lat ?? 24.68,
      lng: property?.lng ?? 46.63,
      propertyId: property?.id,
      parties: [{ personId: me?.id, nameAr: me?.nameAr ?? '', role: 'reporter' }],
      detailAr: `بلاغ طوارئ من ${me?.nameAr} — الموقع أُرسل تلقائيًا (${property?.code ?? 'داخل الحي'})`,
    });
    setSentTxn(inc.txnNo);
  };

  return (
    <>
      <button
        onClick={() => {
          setSentTxn(null);
          setOpen(true);
        }}
        className="fixed bottom-4 end-4 z-40 flex h-14 w-14 flex-col items-center justify-center rounded-full bg-danger-600 text-white shadow-e3 transition-transform hover:scale-105"
        aria-label="زر الطوارئ"
      >
        <Siren size={20} />
        <span className="text-micro font-bold">طوارئ</span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={sentTxn ? 'تم إرسال بلاغ الطوارئ' : 'بلاغ طوارئ'}>
        {sentTxn ? (
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-ok-600-50 text-ok-600">
              <Siren size={26} />
            </div>
            <p className="font-semibold">وصل بلاغك لغرفة العمليات</p>
            <p className="mt-1 text-sm text-ink-500">
              رقم المعاملة <Txn no={sentTxn} className="text-ink-800" /> · موقعك أُرسل تلقائيًا
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-warn-600-50 px-3 py-1 text-caption font-medium text-warn-600">
              <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-warn-600" />
              جارٍ إسناد أقرب دورية…
            </p>
            <div className="mt-4">
              <Button onClick={() => setOpen(false)} className="w-full">إغلاق</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {types.map((t) => (
              <button
                key={t.kind}
                onClick={() => send(t.kind)}
                className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-card border border-danger-500 bg-danger-50 p-3 text-danger-600 transition-colors hover:bg-danger-600 hover:text-white"
              >
                <t.icon size={24} />
                <span className="text-sm font-semibold">{t.labelAr}</span>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
