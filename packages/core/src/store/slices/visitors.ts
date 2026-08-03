import { nanoid } from 'nanoid';
import type { VisitorPass } from '../../types';
import type { Get, Set, Store } from '../storeTypes';
import { nowISO } from '../../lib/time';

export const createVisitorsSlice = (set: Set, get: Get) => ({
  /** simulated payment: 50 SAR entry per vehicle + any restaurant pre-orders */
  purchaseVisitorPass: (input: Parameters<Store['purchaseVisitorPass']>[0]) => {
    const entryFee = 50;
    const ordersTotal = input.orders.reduce((a, o) => a + o.price * o.qty, 0);
    const pass: VisitorPass = {
      id: nanoid(8),
      visitorNameAr: input.visitorNameAr,
      phone: input.phone,
      plate: input.plate,
      dateISO: input.dateISO,
      entryFee,
      orders: input.orders,
      totalPaid: entryFee + ordersTotal,
      qrToken: `QR-VIS-${nanoid(6).toUpperCase()}`,
      status: 'paid',
      createdISO: nowISO(),
    };
    set((st) => ({ visitorPasses: [pass, ...st.visitorPasses] }));
    get().appendAudit('visitorPass', pass.id, 'create', undefined, {
      plate: pass.plate,
      totalPaid: pass.totalPaid,
      orders: pass.orders.length,
    });
    get().notify('admin', 'تصريح زائر مدفوع', `${pass.visitorNameAr} — ${pass.totalPaid} ر.س${pass.orders.length ? ` · ${pass.orders.length} طلب مطاعم` : ''}`, '/a/revenue');
    return pass;
  },
});
