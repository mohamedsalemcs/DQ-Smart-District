import { useState } from 'react';
import { CheckCircle2, QrCode, XCircle } from 'lucide-react';
import { useStore } from '@dq/core';
import { Button, Card, SectionTitle } from '@dq/ui';
import { QrScanModal } from '../components/QrScanModal';
import { Map3D } from '../components/three/DQTwin';
import { ago } from '@dq/core';

/** §11 — checkpoint list, scan to prove presence, missed points. */
export function TourScreen() {
  const store = useStore();
  const [qrOpen, setQrOpen] = useState(false);

  const lastScan = (cpId: string) => store.checkpointScans.find((s) => s.checkpointId === cpId);
  const missed = store.checkpoints.filter((c) => !lastScan(c.id));

  return (
    <div className="space-y-4">
      <SectionTitle
        action={
          <Button onClick={() => setQrOpen(true)}>
            <QrCode size={15} /> مسح نقطة تفتيش
          </Button>
        }
      >
        الجولات الأمنية
      </SectionTitle>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-3">
          <Map3D layers={{ checkpoints: true, patrols: true, gates: true }} className="aspect-[4/3]" />
        </Card>
        <Card className="p-4">
          <p className="mb-2 text-[--text-caption] font-semibold text-ink-500">
            نقاط الجولة — {store.checkpoints.length - missed.length}/{store.checkpoints.length} مغطاة
          </p>
          <div className="space-y-1.5">
            {store.checkpoints.map((c) => {
              const scan = lastScan(c.id);
              return (
                <div key={c.id} className="flex items-center justify-between rounded-[--radius-ctl] bg-ink-0 px-3 py-2.5 text-sm">
                  <span className="flex items-center gap-2">
                    {scan ? <CheckCircle2 size={15} className="text-ok-600" /> : <XCircle size={15} className="text-danger-600" />}
                    {c.nameAr}
                  </span>
                  <span className="text-[--text-caption] text-ink-500">{scan ? `آخر مرور ${ago(scan.atISO)}` : 'لم تُغطَّ بعد'}</span>
                </div>
              );
            })}
          </div>
          {missed.length > 0 && (
            <p className="mt-3 rounded-[--radius-card] bg-danger-50 p-2.5 text-[--text-caption] text-danger-600">
              {missed.length} نقاط لم تُغطَّ في هذه الجولة — امسح رمز النقطة عند المرور لإثبات التواجد
            </p>
          )}
        </Card>
      </div>

      <QrScanModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        onScan={(tok) => {
          const cp = store.checkpoints.find((c) => c.qrToken === tok);
          if (cp) store.scanCheckpoint(cp.id);
          else store.pushToast('الرمز ليس نقطة تفتيش', undefined, 'warn');
        }}
      />
    </div>
  );
}
