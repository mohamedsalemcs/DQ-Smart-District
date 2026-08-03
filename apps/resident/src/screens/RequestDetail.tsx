import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { RotateCcw, Star } from 'lucide-react';
import { useStore } from '@dq/core';
import { Button, Card, EmptyState, Field, Input, Modal, SectionTitle } from '@dq/ui';
import { requestPill } from '../components/StatusPill';
import { SlaBadge } from '../components/SlaBadge';
import { Timeline } from '../components/Timeline';
import { MediaGrid } from '../components/MediaGrid';
import { requestKindAr } from '@dq/core';

/** §9 — timeline, before/after, rate, reopen. */
export function RequestDetail() {
  const { id } = useParams();
  const store = useStore();
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenNote, setReopenNote] = useState('');
  const [hover, setHover] = useState(0);
  const req = store.requests.find((r) => r.id === id);
  if (!req) return <EmptyState title="الطلب غير موجود" />;

  const canVerify = req.status === 'awaiting_verification';
  const canRate = req.status === 'closed' && !req.rating;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <SectionTitle>متابعة الطلب</SectionTitle>
      <Card className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold">{requestKindAr[req.kind]}</p>
            <p className="mt-1 text-sm text-ink-500">{req.descriptionAr}</p>
          </div>
          {requestPill(req.status)}
        </div>
        <div className="mt-2"><SlaBadge req={req} /></div>
        {req.assignedToOrgId && (
          <p className="mt-3 rounded-[--radius-card] bg-ink-50 p-2.5 text-[--text-caption]">
            الجهة المنفذة: <b>{store.organizations.find((o) => o.id === req.assignedToOrgId)?.nameAr}</b>
          </p>
        )}
        <div className="mt-4"><MediaGrid before={req.mediaBefore} after={req.mediaAfter} /></div>

        {canVerify && (
          <div className="mt-4 rounded-[--radius-card] bg-warn-600-50 p-3">
            <p className="text-sm font-semibold">اكتملت المعالجة — هل الملاحظة حُلّت فعلًا؟</p>
            <div className="mt-2 flex gap-2">
              <Button variant="success" onClick={() => store.approveRequestClosure(req.id)}>نعم، أُغلق الطلب</Button>
              <Button variant="outline" onClick={() => setReopenOpen(true)}><RotateCcw size={14} /> لا، أعد الفتح</Button>
            </div>
          </div>
        )}

        {canRate && (
          <div className="mt-4 rounded-[--radius-card] bg-ink-50 p-3 text-center">
            <p className="mb-2 text-sm font-semibold">قيّم الخدمة</p>
            <div className="flex justify-center gap-1" dir="ltr">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => store.rateRequest(req.id, n as 1 | 2 | 3 | 4 | 5)}
                  aria-label={`${n} من 5`}
                >
                  <Star size={26} className={n <= hover ? 'fill-gold text-brand-600' : 'text-ink-500/40'} />
                </button>
              ))}
            </div>
          </div>
        )}

        {req.rating && (
          <p className="mt-4 flex items-center justify-center gap-1 rounded-[--radius-card] bg-ink-50 p-3 text-sm">
            تقييمك: {Array.from({ length: req.rating }).map((_, i) => <Star key={i} size={15} className="fill-gold text-brand-600" />)}
          </p>
        )}
        {req.status === 'closed' && (
          <div className="mt-3 text-center">
            <Button variant="ghost" size="sm" onClick={() => setReopenOpen(true)}><RotateCcw size={13} /> إعادة فتح البلاغ</Button>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-sm font-bold">الخط الزمني</p>
        <Timeline events={req.events} />
      </Card>

      <Modal open={reopenOpen} onClose={() => setReopenOpen(false)} title="إعادة فتح البلاغ">
        <Field label="سبب إعادة الفتح">
          <Input value={reopenNote} onChange={(e) => setReopenNote(e.target.value)} placeholder="الملاحظة ما زالت قائمة لأن…" />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setReopenOpen(false)}>إلغاء</Button>
          <Button variant="danger" onClick={() => { store.reopenRequest(req.id, reopenNote || 'الملاحظة ما زالت قائمة'); setReopenOpen(false); }}>
            إعادة فتح
          </Button>
        </div>
      </Modal>
    </div>
  );
}
