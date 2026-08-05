import { nanoid } from 'nanoid';
import type { LostFoundItem } from '../../types';
import type { Get, Set } from '../storeTypes';
import { currentActor } from '../storeTypes';
import { nowISO } from '../../lib/time';
import { lostFoundCategoryAr } from '../../i18n/strings';

/** معيار المطابقة الآلية: التصنيف نفسه واللون نفسه لغرضين مفتوحين من نوعين متقابلين */
const isMatch = (a: LostFoundItem, b: LostFoundItem) =>
  a.status === 'open' && b.status === 'open' && a.kind !== b.kind && a.category === b.category && a.colorAr === b.colorAr;

type ReportInput = {
  category: LostFoundItem['category'];
  colorAr: string;
  descriptionAr: string;
  locationAr?: string;
  dateISO: string;
  reporterNameAr: string;
  reporterPhone: string;
};

export const createLostFoundSlice = (set: Set, get: Get) => {
  const report = (kind: 'lost' | 'found', input: ReportInput, reporterPersonId?: string) => {
    if (!input.descriptionAr.trim() || !input.reporterNameAr.trim() || !input.reporterPhone.trim()) {
      get().pushToast('بيانات ناقصة', 'الوصف واسم المبلّغ ورقم الجوال حقول إلزامية', 'bad');
      return null;
    }
    const item: LostFoundItem = {
      id: nanoid(8),
      refNo: `LF-${nanoid(5).toUpperCase()}`,
      kind,
      category: input.category,
      colorAr: input.colorAr,
      descriptionAr: input.descriptionAr.trim(),
      locationAr: input.locationAr?.trim() || undefined,
      dateISO: input.dateISO,
      reporterNameAr: input.reporterNameAr.trim(),
      reporterPhone: input.reporterPhone.trim(),
      reporterPersonId,
      status: 'open',
      createdISO: nowISO(),
    };

    // المطابقة الآلية — أقدم غرض مقابل مفتوح بالمعيار نفسه ينشئ طلب استلام معلقًا
    const counterpart = [...get().lostFoundItems].reverse().find((x) => isMatch(item, x));
    if (counterpart) {
      const at = nowISO();
      item.status = 'matched';
      item.matchedItemId = counterpart.id;
      item.matchedISO = at;
      set((st) => ({
        lostFoundItems: [
          item,
          ...st.lostFoundItems.map((x) =>
            x.id === counterpart.id ? { ...x, status: 'matched' as const, matchedItemId: item.id, matchedISO: at } : x,
          ),
        ],
      }));
      get().notify(
        'admin',
        'تطابق في المفقودات — طلب استلام جديد',
        `${lostFoundCategoryAr[item.category]} (${item.colorAr}) — ${item.refNo} يطابق ${counterpart.refNo}`,
        '/a/lostfound',
        'warn',
      );
    } else {
      set((st) => ({ lostFoundItems: [item, ...st.lostFoundItems] }));
    }

    get().appendAudit('lost_found', item.id, 'create', undefined, {
      kind,
      category: item.category,
      matched: counterpart?.id,
    });
    return item;
  };

  return {
    /** بلاغ فقدان — يصل من الرابط العام دون تسجيل دخول */
    reportLostItem: (input: ReportInput) => report('lost', input),

    /** تسجيل غرض معثور عليه — من لوحة التحكم (تسليم بوابات ومرافق) */
    reportFoundItem: (input: ReportInput) => {
      const item = report('found', input, currentActor(get()));
      if (item) {
        get().pushToast(
          'سُجّل الغرض المعثور عليه',
          item.status === 'matched' ? 'تطابق مع بلاغ فقدان قائم — راجع طلب الاستلام' : `المرجع: ${item.refNo}`,
          'ok',
        );
      }
      return item;
    },

    /** قرار المشغّل في طلب الاستلام بعد التحقق من صاحب البلاغ */
    resolveLostFoundMatch: (id: string, decision: 'returned' | 'unmatch') => {
      const item = get().lostFoundItems.find((x) => x.id === id);
      if (!item || item.status !== 'matched') return;
      const other = get().lostFoundItems.find((x) => x.id === item.matchedItemId);
      set((st) => ({
        lostFoundItems: st.lostFoundItems.map((x) => {
          if (x.id !== item.id && x.id !== other?.id) return x;
          return decision === 'returned'
            ? { ...x, status: 'returned' as const }
            : { ...x, status: 'open' as const, matchedItemId: undefined, matchedISO: undefined };
        }),
      }));
      get().appendAudit('lost_found', id, 'update', { status: 'matched' }, { status: decision });
      get().pushToast(
        decision === 'returned' ? 'سُلّم الغرض لصاحبه' : 'أُلغيت المطابقة',
        decision === 'returned' ? `${item.refNo} — أُغلق البلاغان` : 'أُعيد البلاغان إلى قائمة الانتظار',
        decision === 'returned' ? 'ok' : 'warn',
      );
    },
  };
};
