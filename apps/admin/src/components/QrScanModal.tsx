import { useState } from 'react';
import { ScanLine } from 'lucide-react';
import { Modal, Button, Input } from '@dq/ui';
import { useStore } from '@dq/core';

/** Mock scanner (§1 "what we fake"): a camera frame + pickable list of live tokens. */
export function QrScanModal({
  open,
  onClose,
  onScan,
}: {
  open: boolean;
  onClose: () => void;
  onScan: (token: string) => void;
}) {
  const { permits, properties, bookings, checkpoints, appointments, visitorPasses } = useStore();
  const [q, setQ] = useState('');

  const groups: { title: string; items: { token: string; labelAr: string }[] }[] = [
    {
      title: 'تصاريح',
      items: permits.slice(0, 8).map((p) => ({ token: p.qrToken, labelAr: `${p.subject.nameAr} (${p.status === 'approved' ? 'معتمد' : p.status})` })),
    },
    {
      title: 'عقارات',
      items: properties.slice(0, 6).map((p) => ({ token: p.qrToken, labelAr: `${p.code} — ${p.unitNo}` })),
    },
    {
      title: 'حجوزات',
      items: bookings.map((b) => ({ token: b.qrToken, labelAr: `حجز ${b.attendees} أشخاص` })),
    },
    {
      title: 'زوار مدفوعون',
      items: visitorPasses
        .filter((v) => v.status !== 'expired' && new Date(v.dateISO).toDateString() === new Date().toDateString())
        .slice(0, 5)
        .map((v) => ({ token: v.qrToken, labelAr: `${v.visitorNameAr} — زائر يومي` })),
    },
    {
      title: 'مواعيد سفارات',
      items: appointments
        .filter((a) => a.status === 'booked')
        .slice(0, 6)
        .map((a) => ({
          token: a.qrToken,
          labelAr: `${a.visitorNameAr} — ${properties.find((p) => p.id === a.embassyPropId)?.unitNo ?? 'سفارة'}`,
        })),
    },
    {
      title: 'نقاط تفتيش',
      items: checkpoints.map((c) => ({ token: c.qrToken, labelAr: c.nameAr })),
    },
  ];

  const pick = (token: string) => {
    onScan(token);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="مسح رمز QR — محاكاة">
      <div className="mb-4 flex h-32 items-center justify-center rounded-[--radius-card] border-2 border-dashed border-brand-300 bg-ink-0/90">
        <ScanLine size={40} className="text-brand-600 pulse-dot" />
      </div>
      <Input placeholder="أو ألصق الرمز يدويًا…" value={q} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)} />
      {q && (
        <Button className="mt-2 w-full" onClick={() => pick(q)}>
          استخدام الرمز المدخل
        </Button>
      )}
      <div className="mt-4 max-h-64 space-y-3 overflow-y-auto thin-scroll">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="mb-1 text-[--text-caption] font-semibold text-ink-500">{g.title}</p>
            <div className="space-y-1">
              {g.items.map((it) => (
                <button
                  key={it.token}
                  onClick={() => pick(it.token)}
                  className="flex w-full items-center justify-between rounded-[--radius-ctl] bg-ink-50 px-3 py-2 text-sm hover:bg-brand-50"
                >
                  <span>{it.labelAr}</span>
                  <bdi dir="ltr" className="plate text-[--text-caption] text-ink-500">{it.token}</bdi>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
