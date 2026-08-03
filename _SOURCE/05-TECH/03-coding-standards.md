# معايير الكود — Coding Standards

`Tech Lead` · v1.0

---

## 1. القواعد غير القابلة للتفاوض

| # | القاعدة | التحقق |
|---|---|---|
| `CS-01` | **لا لون خام** في أي `.tsx` — من الرموز فقط | `grep -rn "#[0-9A-Fa-f]\{6\}" src/ --include=*.tsx` ⇒ **0** |
| `CS-02` | **لا مقاس نص خام** — من المقياس فقط | `grep -rn "text-\[" src/` ⇒ **0** |
| `CS-03` | **لا ظل مضمّن** — رموز `shadow-e*` | `grep -rn "boxShadow" src/` ⇒ **0** |
| `CS-04` | **لا خاصية اتجاه فيزيائية** — منطقية فقط | `grep -rEn "\b(ml|mr|pl|pr)-|text-(left\|right)" src/` ⇒ **0** |
| `CS-05` | **لا `<div onClick>`** — `<button>`/`<a>` | مراجعة + eslint-jsx-a11y |
| `CS-06` | **لا نص مضمّن** — من `i18n/strings.ts` | مراجعة |
| `CS-07` | **لا `useStore()` بلا محدِّد** | `grep -rn "useStore()" src/` ⇒ **0** |
| `CS-08` | **كل طفرة تكتب في التدقيق** | مراجعة الشرائح |
| `CS-09` | **كل انتقال حالة يمر بـ`assertTransition`** | مراجعة الشرائح |
| `CS-10` | **لا `!` غير آمنة** على نتائج البحث | `grep -rn "find(.*)!" src/` |

---

## 2. نمط الشريحة

```ts
export const createXSlice = (set: Set, get: Get) => ({
  doThing: (id: ID, input: Input) => {
    // 1 · الحراسة — الوجود ثم الصلاحية ثم الانتقال
    const s = get();
    const entity = s.things.find(t => t.id === id);
    if (!entity) return;
    assertCan(s, 'thing.do');                                    // BR-046
    assertTransition('thing', thingTransitions, entity.status, 'next');

    // 2 · الطفرة — غير متحوّلة عبر updateById
    set(st => ({ things: updateById(st.things, id, patch) }));

    // 3 · التدقيق — دائمًا، بالفاعل الحقيقي
    get().appendAudit('thing', id, 'update', { status: entity.status }, { status: 'next' });

    // 4 · الإشعار — للمعنيّ تحديدًا لا للشخصية كلها
    get().notify(ownerOf(entity), 'العنوان', 'النص', `/deep/link/${id}`, 'info');

    // 5 · التغذية الراجعة
    get().pushToast('تم …', undefined, 'ok');
  },
});
```

**الترتيب مُلزم.** أي مخالفة تُرفض في المراجعة.

### مضادات النمط المرصودة

| ❌ | ✅ | الموضع |
|---|---|---|
| `people.find(p => p.role === 'supervisor')!` | `currentActor(s)` | `violations.ts:109` `DEF-006` |
| `escalationStep: 5` | `settings.suspendAtStep` | `violations.ts:120` `DEF-013` |
| `before: { accessState: 'allowed' }` | `before: { accessState: vehicle.accessState }` | `violations.ts:124` `DEF-015` |
| القفز إلى `closed` بلا `assertTransition` | المرور بالانتقالين | `mahadir.ts:104` `DEF-019` |
| `notify('resident', …)` لأمر خاص | `notify(owner.id, …)` | `gates.ts:52` `DEF-028` |
| `useStore.setState({ settings })` | `set()` داخل شريحة | `Settings.tsx:546` `TD-06` |
| `to === 'closed' ? 'update' : 'update'` | `'update'` | `violations.ts:157` `DEF-042` |
| `void admin;` `void m;` | حذفها | `sensors.ts:160` `DEF-043` |

---

## 3. نمط المكوّن

```tsx
export function ThingScreen() {
  // 1 · محدِّدات ذرّية — لا useStore() عاريًا
  const things = useStore(s => s.things);
  const doThing = useStore(s => s.doThing);

  // 2 · المشتقات في useMemo — هوية اللقطة في Zustand
  const open = useMemo(() => things.filter(t => t.status !== 'closed'), [things]);

  // 3 · الحالة المحلية للواجهة فقط
  const [selectedId, setSelectedId] = useState<ID | null>(null);

  // 4 · الحالات الأربع أولًا
  if (loading) return <ThingSkeleton />;
  if (!open.length) return <EmptyState title="…" hint="…" action={…} />;

  return (/* … */);
}
```

> **تحذير Zustand:** `useStore(s => s.x.filter(...))` **يخلق مصفوفة جديدة كل رسم** فيتسبب في حلقة لا نهائية. المشتق يُحسب في `useMemo` من قيمة أُخذت بمحدِّد بسيط. التعليق التحذيري موجود في [`store/index.ts:83`](../../src/store/index.ts#L83) ولم يُلتزم به.

---

## 4. TypeScript

| القاعدة | التفصيل |
|---|---|
| `strict: true` | مفعّل ✅ |
| لا `any` | استخدم `unknown` + تضييق |
| لا `as` إلا للاتحادات النصية بعد تحقق | |
| لا `!` على نتائج `find` | تحقّق صراحة وارجع مبكرًا |
| `Record<Union, T>` للخرائط الكاملة | يجبر التغطية عند إضافة عضو |
| اشتقاق المدخلات من العقد | `Parameters<Store['createX']>[0]` |

**نقطة قوة:** استخدام `Record<PermitStatus, string>` في `i18n/strings.ts` يعني أن إضافة حالة جديدة **تكسر البناء** حتى تُترجَم. ممتاز — يجب تعميمه.

---

## 5. تسمية الملفات والرموز

| العنصر | النمط | مثال |
|---|---|---|
| المكوّن | `PascalCase.tsx` | `GateDecisionPanel.tsx` |
| الشريحة | `camelCase.ts` | `violations.ts` |
| المرفق | `camelCase.ts` | `roadGraph.ts` |
| النوع | `PascalCase` | `GateDecision` |
| الثابت | `SCREAMING_SNAKE` | `PATROL_STEP` |
| النص العربي | لاحقة `Ar` | `labelAr` · `reasonAr` |
| المعرّف | لاحقة `Id` | `propertyId` |
| التاريخ | لاحقة `ISO` | `validFromISO` |
| البوليني | بادئة `is`/`has`/`can` | `isPast` · `canSuspend` |

---

## 6. التعليقات

**اكتب التعليق حين يشرح «لماذا» لا «ماذا».**

```ts
// ✅ يشرح قرارًا
/** The gate never re-derives the escalation rule: it reads vehicle.accessState
 *  (written by the ladder at suspend time). That separation is the architectural claim. */

// ✅ يشرح حدًّا
// maxParallelFileOps: 2 — الافتراضي 20؛ كل عملية تحتفظ بملف في الذاكرة (تفادي OOM)

// ❌ يعيد قراءة الكود
// set the status to closed
```

**نقطة قوة:** التعليقات الحالية جيدة بحق — تشرح قرارات لا آليات. حافظ على هذا المستوى.

---

## 7. قائمة المراجعة

### الوظيفة
- [ ] كل معايير القبول مستوفاة
- [ ] الانتقالات محكومة بآلة الحالة
- [ ] الحالات الحدّية: فراغ · خطأ · تحميل · صلاحية

### الحوكمة
- [ ] كل طفرة تكتب في التدقيق
- [ ] الفاعل هو الفاعل الحقيقي — لا دور مفترض
- [ ] المحاولات المرفوضة مسجَّلة
- [ ] الإشعارات موجَّهة للمعنيّ لا للشخصية كلها

### التصميم
- [ ] لا لون/مقاس/ظل خام
- [ ] كل حالة = لون + أيقونة + كلمة
- [ ] الاستدارة والمسافات من الرموز

### الوصولية
- [ ] كل تباين مقيس ومطابق
- [ ] يعمل بلوحة المفاتيح
- [ ] حلقة تركيز مرئية ≥ 3:1
- [ ] الحوارات تحبس التركيز وتعيده
- [ ] النتائج الحاسمة `aria-live`
- [ ] لا نص تحت 12px

### RTL
- [ ] لا خاصية فيزيائية
- [ ] كل مقطع لاتيني في `<bdi>`
- [ ] الاتجاه البصري صحيح (السلّم · الزمن · التقدّم)

### الأداء
- [ ] محدِّدات ذرّية
- [ ] المشتقات في `useMemo`
- [ ] لا عمل ثقيل في الرسم

---

## 8. فحوص آلية مقترحة

```bash
# CS-01 · ألوان خام
grep -rn "#[0-9A-Fa-f]\{6\}" src/ --include=*.tsx && exit 1

# CS-02 · مقاسات خام
grep -rn "text-\[" src/ --include=*.tsx && exit 1

# CS-03 · ظلال مضمّنة
grep -rn "boxShadow" src/ --include=*.tsx && exit 1

# CS-04 · اتجاه فيزيائي
grep -rEn "\b(ml|mr|pl|pr)-[0-9]|text-(left|right)" src/ && exit 1

# CS-07 · مخزن بلا محدِّد
grep -rn "useStore()" src/ --include=*.tsx && exit 1

# CS-10 · تأكيدات غير آمنة
grep -rn "find(.*))!" src/ && exit 1

# الأنواع
npx tsc --noEmit
```

| الفحص | الحالة الآن | الهدف |
|---|---|---|
| ألوان خام | 34 | 0 |
| مقاسات خام | 71 | 0 |
| ظلال مضمّنة | 9 | 0 |
| اتجاه فيزيائي | 0 ✅ | 0 |
| مخزن بلا محدِّد | 19 | 0 |
| `!` غير آمنة | 6 | 0 |
| `tsc --noEmit` | ✅ نظيف | نظيف |
