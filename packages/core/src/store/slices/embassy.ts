import { nanoid } from 'nanoid';
import type { EmbassyAppointment } from '../../types';
import type { Get, Set, Store } from '../storeTypes';
import { nowISO } from '../../lib/time';
import { embassyDayCount } from '../../lib/rules';

export const createEmbassySlice = (set: Set, get: Get) => ({
  setEmbassyLimit: (propId: string, dailyLimit: number) => {
    const before = get().embassyConfigs[propId]?.dailyLimit;
    set((st) => ({ embassyConfigs: { ...st.embassyConfigs, [propId]: { dailyLimit } } }));
    get().appendAudit('embassyConfig', propId, 'update', { dailyLimit: before }, { dailyLimit });
    get().pushToast('حُفظ الحد اليومي', `${dailyLimit} موعدًا في اليوم`, 'ok');
  },

  /** public-link booking — refuses politely when the day is at capacity */
  bookEmbassyAppointment: (input: Parameters<Store['bookEmbassyAppointment']>[0]) => {
    const s = get();
    const limit = s.embassyConfigs[input.embassyPropId]?.dailyLimit ?? 20;
    // BR-136 · DEF-024 — كان يعدّ 'booked' فقط، فيتحرر المقعد بالحضور ويُخترق الحد
    const taken = embassyDayCount(s.appointments, input.embassyPropId, input.dateISO);
    if (taken >= limit) {
      get().pushToast('اليوم مكتمل', 'اختر يومًا آخر — اكتمل الحد اليومي للمواعيد', 'warn');
      return null;
    }
    const appt: EmbassyAppointment = {
      id: nanoid(8),
      ...input,
      qrToken: `QR-EMB-${nanoid(6).toUpperCase()}`,
      status: 'booked',
      createdISO: nowISO(),
    };
    set((st) => ({ appointments: [appt, ...st.appointments] }));
    get().appendAudit('appointment', appt.id, 'create', undefined, {
      embassy: input.embassyPropId,
      visitor: input.visitorNameAr,
      dateISO: input.dateISO,
    });
    const embassy = s.properties.find((p) => p.id === input.embassyPropId);
    get().notify('admin', 'موعد سفارة جديد', `${embassy?.unitNo ?? ''} — ${input.visitorNameAr} · ${input.purposeAr}`, '/a/embassies');
    return appt;
  },
});
