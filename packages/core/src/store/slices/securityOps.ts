import type { Get, Set } from '../storeTypes';
import { currentActor, updateById } from '../storeTypes';
import { nowISO } from '../../lib/time';

export const createSecurityOpsSlice = (set: Set, get: Get) => ({
  checkInShift: (shiftId: string) => {
    set((st) => ({ shifts: updateById(st.shifts, shiftId, { checkedInISO: nowISO() }) }));
    get().appendAudit('shift', shiftId, 'update', undefined, { checkedIn: true });
    get().pushToast('تم تسجيل الحضور', undefined, 'ok');
  },

  checkOutShift: (shiftId: string, handoverNoteAr: string) => {
    // BR-150 · DEF-022 — لم يكن هناك فحص: تسليم وردية لم تبدأ
    const sh = get().shifts.find((x) => x.id === shiftId);
    if (!sh?.checkedInISO) {
      get().pushToast('لا يمكن التسليم', 'لم يُسجَّل حضور هذه الوردية بعد', 'bad');
      return;
    }
    set((st) => ({ shifts: updateById(st.shifts, shiftId, { checkedOutISO: nowISO(), handoverNoteAr }) }));
    get().appendAudit('shift', shiftId, 'update', undefined, { checkedOut: true, handoverNoteAr });
    get().pushToast('تم تسليم الوردية', 'سُجّلت ملاحظة التسليم', 'ok');
  },

  scanCheckpoint: (checkpointId: string) => {
    const s = get();
    const scan = { checkpointId, guardId: currentActor(s), atISO: nowISO() };
    set((st) => ({ checkpointScans: [scan, ...st.checkpointScans] }));
    get().appendAudit('checkpoint', checkpointId, 'create', undefined, { scannedAt: scan.atISO });
    get().pushToast('سُجّل المرور بالنقطة', s.checkpoints.find((c) => c.id === checkpointId)?.nameAr, 'ok');
  },
});
