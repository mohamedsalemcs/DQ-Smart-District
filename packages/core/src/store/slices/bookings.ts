import { nanoid } from 'nanoid';
import type { Booking } from '../../types';
import type { Get, Set } from '../storeTypes';
import { currentActor, updateById } from '../storeTypes';
import { findBookingConflict } from '../../lib/rules';
import { fmtDateTime } from '../../lib/time';

export const createBookingsSlice = (set: Set, get: Get) => ({
  createBooking: (facilityId: string, fromISO: string, toISO: string, attendees: number) => {
    const s = get();
    // BR-131 — لا حجز في الماضي، والمدة بين ساعة وأربع
    const from = new Date(fromISO).getTime();
    const to = new Date(toISO).getTime();
    if (from < Date.now()) {
      get().pushToast('تاريخ غير صالح', 'لا يمكن الحجز في وقت مضى', 'bad');
      return null;
    }
    const hours = (to - from) / 3600e3;
    if (hours < 1 || hours > 4) {
      get().pushToast('مدة غير صالحة', 'مدة الحجز بين ساعة وأربع ساعات', 'bad');
      return null;
    }
    // BR-130 · DEF-023 — لم يكن هناك أي فحص تعارض: حجزان على نفس الملعب نفس الساعة
    const clash = findBookingConflict(s.bookings, facilityId, fromISO, toISO);
    if (clash) {
      get().pushToast(
        'الموعد محجوز',
        `المرفق محجوز من ${fmtDateTime(clash.fromISO)} حتى ${fmtDateTime(clash.toISO)} — اختر وقتًا آخر`,
        'bad',
      );
      return null;
    }
    const booking: Booking = {
      id: nanoid(8),
      facilityId,
      byPersonId: currentActor(s),
      fromISO,
      toISO,
      status: 'confirmed',
      qrToken: `QR-BKG-${nanoid(6).toUpperCase()}`,
      attendees,
    };
    set((st) => ({ bookings: [booking, ...st.bookings] }));
    get().appendAudit('booking', booking.id, 'create', undefined, { facilityId, attendees });
    const facility = s.assets.find((a) => a.id === facilityId);
    get().notify('admin', 'حجز جديد', `${facility?.nameAr ?? ''} — ${attendees} أشخاص`, '/a/events');
    get().pushToast('تم تأكيد الحجز', 'رمز QR الخاص بالحجز يقبل عند البوابة أيضًا', 'ok');
    return booking;
  },

  cancelBooking: (id: string) => {
    const b = get().bookings.find((x) => x.id === id);
    if (!b || b.status !== 'confirmed') return;
    // BR-132 · DEF-036 — الإلغاء للحجوزات المستقبلية فقط
    if (new Date(b.fromISO).getTime() < Date.now()) {
      get().pushToast('لا يمكن الإلغاء', 'الحجز مضى وقته', 'warn');
      return;
    }
    set((st) => ({ bookings: updateById(st.bookings, id, { status: 'cancelled' as const }) }));
    get().appendAudit('booking', id, 'update', { status: 'confirmed' }, { status: 'cancelled' });
    get().pushToast('أُلغي الحجز', undefined, 'warn');
  },
});
