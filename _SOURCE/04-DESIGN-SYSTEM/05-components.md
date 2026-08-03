# مكتبة المكونات — Component Library

`Design System` · v1.0
لكل مكوّن: عقده، وحالاته، وقواعد وصوليته، وما تغيّر فيه.

---

## فهرس

| # | المكوّن | الحالة | الملف |
|---|---|---|---|
| `C-01` | `Logo` ✨ | جديد | `components/Logo.tsx` |
| `C-02` | `Button` | معاد بناؤه | `components/ui.tsx` |
| `C-03` | `Card` | معاد بناؤه | `components/ui.tsx` |
| `C-04` | `Field` · `Input` · `Select` · `TextArea` | معاد بناؤه | `components/ui.tsx` |
| `C-05` | `Modal` · `ConfirmDialog` | مُصلح (a11y) | `components/ui.tsx` |
| `C-06` | `StatusPill` | معاد بناؤه | `components/StatusPill.tsx` |
| `C-07` | `Stat` | معاد بناؤه | `components/ui.tsx` |
| `C-08` | `EmptyState` | مُحسَّن | `components/ui.tsx` |
| `C-09` | `Timeline` | كما هو | `components/Timeline.tsx` |
| `C-10` | `SlaBadge` | مُصلح (منطق) | `components/SlaBadge.tsx` |
| `C-11` | `PlateBadge` · `Txn` | كما هو | `components/PlateBadge.tsx` |
| `C-12` | `EscalationLadder` | مُحسَّن | `components/EscalationLadder.tsx` |
| `C-13` | `GateDecisionPanel` ✨ | مستخرج | `components/GateDecisionPanel.tsx` |
| `C-14` | `AuditDrawer` | كما هو | `components/AuditDrawer.tsx` |
| `C-15` | `ToastHost` | مُصلح | `components/ToastHost.tsx` |
| `C-16` | `NotificationsBell` | مُصلح (منطق) | `components/NotificationsBell.tsx` |
| `C-17` | `DataTable` ✨ | جديد | `components/DataTable.tsx` |
| `C-18` | `PageHeader` ✨ | جديد | `components/ui.tsx` |

---

## C-01 · Logo ✨ جديد

```tsx
<Logo variant="mark" | "lockup" size={32} tone="onLight" | "onDark" compact />
```

| الخاصية | النوع | الافتراضي | الوصف |
|---|---|---|---|
| `variant` | `'mark' \| 'lockup'` | `'mark'` | العلامة وحدها أو مع الاسم |
| `size` | `number` | `32` | ارتفاع العلامة بالبكسل |
| `tone` | `'onLight' \| 'onDark'` | `'onLight'` | يعكس الألوان |
| `compact` | `boolean` | `false` | يخفي السطر الإنجليزي |

**يستبدل:** `<span className="…bg-gold…">DQ</span>` في [`Shell.tsx:69`](../../src/app/Shell.tsx#L69)
**الوصولية:** `role="img"` + `aria-label="الحي الدبلوماسي الذكي"` · مسارات SVG بلا نص

---

## C-02 · Button

```tsx
<Button variant="primary" size="md" tone="light" icon={Save} loading disabled>نص</Button>
```

| الخاصية | القيم | الافتراضي |
|---|---|---|
| `variant` | `primary` · `secondary` · `ghost` · `danger` · `success` · `outline` | `primary` |
| `size` | `sm` (32px) · `md` (40px) · `lg` (48px) · `xl` (56px) | `md` |
| `tone` | `light` · `dark` | `light` |
| `loading` | `boolean` — يعرض مؤشرًا ويعطّل | `false` |

### مواصفة الأنماط

| النمط | فاتح | داكن |
|---|---|---|
| `primary` | `bg-accent-400` `text-brand-800` وزن 600 · تحويم `accent-500` | نفسه |
| `secondary` | `bg-brand-700` `text-n-000` | `bg-brand-600` `text-brand-050` |
| `outline` | `border-n-200` `text-n-800` · تحويم `bg-n-050` | `border-brand-400` `text-brand-050` |
| `ghost` | `text-n-700` · تحويم `bg-n-050` | `text-brand-100` · تحويم `bg-brand-600` |
| `danger` | `bg-bad-500` `text-n-000` | نفسه |
| `success` | `bg-ok-500` `text-n-000` | نفسه |

### ما تغيّر

| # | التغيير | السبب |
|---|---|---|
| 1 | `primary` صار `accent-400` مع `brand-800` نصًا | تباين **5.92** بدل 6.53 مع نص أقرأ |
| 2 | أُضيف `secondary` | كانت `primary` تُستخدم لكل شيء فيغيب التسلسل |
| 3 | أُضيف `loading` | 5 شاشات تحاكي الانتظار بـ`useState` محلي (`DEF-052`) |
| 4 | أُضيف `xl` (56px) | شاشة البوابة تحتاج 56px (`--tap-gate`) |
| 5 | `disabled:opacity-40` → `disabled:opacity-50` + `cursor-not-allowed` | 40% يهبط تحت حد التباين |

**الوصولية:** `aria-busy` عند التحميل · `aria-disabled` لا `disabled` وحده (المعطّل بـ`disabled` لا يستقبل التركيز فلا يعرف مستخدم قارئ الشاشة بوجوده) · الأيقونة `aria-hidden`.

---

## C-03 · Card

```tsx
<Card tone="light" | "dark" elevation={1|2|3} interactive padding="sm"|"md"|"lg">
```

| الخاصية | الافتراضي | الوصف |
|---|---|---|
| `tone` | `light` | `dark` يستخدم `brand-700` + حد أبيض شفاف |
| `elevation` | `1` | `e1` ساكنة · `e2` مرفوعة · `e3` عائمة |
| `interactive` | `false` | يضيف تحويمًا وحلقة تركيز — **يجعلها `button`** |
| `padding` | `md` (16px) | `sm` 12px · `lg` 20px |

### ما تغيّر
- الاستدارة 6px → **10px**
- الظل من `style={{ boxShadow: 'var(--shadow-card)' }}` مضمّنًا → رمز `shadow-e1`
- `interactive` يصيّرها `<button>` — **إصلاح وصولية**: البطاقات القابلة للنقر كانت `<div onClick>` في 7 مواضع، غير قابلة للوصول بلوحة المفاتيح (`DEF-053`)

---

## C-04 · حقول الإدخال

```tsx
<Field label="السبب" required hint="يظهر للمقيم" error="حقل إلزامي" tone="dark">
  <Input … />
</Field>
```

| الحالة | الحد | الخلفية | النص |
|---|---|---|---|
| ساكن | `n-200` | `n-000` | `n-800` |
| تحويم | `n-300` | `n-000` | |
| تركيز | `brand-700` 2px + حلقة | `n-000` | |
| خطأ | `bad-500` | `bad-050` | + رسالة تحتها |
| معطّل | `n-100` | `n-050` | `n-300` |
| قراءة فقط | بلا حد | `n-050` | `n-700` |

**الارتفاع 40px** (كان ~36px) — يطابق `Button md` فتصطف الصفوف.

### ما تغيّر — الوصولية
| # | كان | صار |
|---|---|---|
| 1 | التسمية `<span>` داخل `<label>` بلا `htmlFor` | `id` مولّد + `htmlFor` + `aria-describedby` |
| 2 | لا عرض للأخطاء — كل شاشة تخترع شكلها | `error` مدمجة + `aria-invalid` + `role="alert"` |
| 3 | `*` للإلزامي نصًا فقط | `required` + `aria-required` + `<span aria-hidden>*</span>` |
| 4 | لا نمط داكن — النماذج الأمنية تستخدم مدخلات فاتحة | `tone="dark"` |

---

## C-05 · Modal · ConfirmDialog

### ما تغيّر — إصلاحات وصولية حرجة

| # | العيب | الإصلاح |
|---|---|---|
| `DEF-048` | **لا حبس للتركيز** — Tab يخرج خلف الحاجب | حبس التركيز داخل الحوار |
| `DEF-048` | **لا إعادة للتركيز** — بعد الإغلاق يعود إلى `<body>` | يُحفظ العنصر المُفعِّل ويُعاد إليه |
| — | لا `aria-labelledby` | العنوان مربوط بمعرّف |
| — | التمرير الخلفي يستمر | `overflow: hidden` على `<body>` |
| — | لا انتقال للظهور | `rise-in` 200ms |

**`ConfirmDialog`** — قاعدة `BR-008`: النص يذكر **الأثر** لا السؤال.

| ❌ | ✅ |
|---|---|
| «إغلاق المخالفة؟» | «سيُنقل السجل إلى الأرشيف مع كامل الخط الزمني. لا يمكن التراجع.» |

---

## C-06 · StatusPill

```tsx
<StatusPill labelAr="مصعّدة" tone="bad" icon={AlertTriangle} tone="dark" size="sm"|"md" />
```

**القاعدة `BR-007`: لون + أيقونة + كلمة. دائمًا. الثلاثة.**

| النغمة | فاتح | داكن |
|---|---|---|
| `ok` | `bg-ok-050` `text-ok-600` | `bg-ok-600/25` `text-ok-300` |
| `warn` | `bg-warn-050` `text-warn-600` | `bg-warn-600/25` `text-warn-300` |
| `bad` | `bg-bad-050` `text-bad-600` | `bg-bad-600/25` `text-bad-300` |
| `info` | `bg-info-050` `text-info-500` | `bg-info-500/25` `text-info-300` |
| `neutral` | `bg-n-050` `text-n-600` | `bg-brand-600` `text-brand-100` |

### ما تغيّر
- ألوان النص كانت `text-ok`/`text-warn`/`text-bad` الراسبة على خلفياتها الشفافة 10% — الآن درجات `600` المطابقة لـAAA
- على الداكن كانت ألوان خامًا (`text-[#8FD4B5]`, `text-[#F0B7B0]`) — الآن رموز
- المقاس من 12px إلى **12px وزن 600** بأيقونة 13px

**خرائط الحالات** (`permitPill`, `requestPill`, `violationPill`, `incidentPill`) — تُبقى كما هي مع إضافة الحالات الجديدة: `rejected` للطلبات، `appealed`/`cancelled` للمخالفات، `closed_no_action` للبلاغات.

---

## C-07 · Stat

```tsx
<Stat label="بلاغات مفتوحة" value={23} delta={+12} deltaLabel="مقابل الأسبوع الماضي"
      trend={[…]} tone="warn" onClick={…} icon={ClipboardList} />
```

| ما تغيّر | لماذا |
|---|---|
| `delta` + `deltaLabel` صارا جزءًا من العقد | الرقم بلا مقارنة لا يقول شيئًا — «23 بلاغًا» أكثر أم أقل؟ |
| `trend` خط مصغّر مدمج | كان يُبنى يدويًا في `Dashboard` |
| `onClick` يصيّرها `<button>` | كانت `<button>` بلا حلقة تركيز |
| اتجاه الدلتا بأيقونة **وسهم** لا بلون فقط | `BR-007` |

**قاعدة الدلتا:** ارتفاع البلاغات المفتوحة **سيئ**، وارتفاع الرضا **جيد**. الاتجاه لا يحدد النغمة — الخاصية `deltaGood` تحددها صراحة.

---

## C-13 · GateDecisionPanel ✨ مستخرج

أهم مكوّن بصري في المنتج، وكان مضمّنًا في `Gate.tsx` بلا إعادة استخدام ولا اختبار.

```tsx
<GateDecisionPanel decision={result} onOpenViolation={…} onCallHost={…} onRequestSupervisor={…} onManualOverride={…} />
```

### المواصفة 🔴 حرجة للسلامة

| القرار | التعبئة | النص | التباين | الأيقونة | العنوان |
|---|---|---|---|---|---|
| **مسموح** | `ok-600` | `n-000` | **7.57 AAA** | `CheckCircle2` 64px | 40px/800 |
| **مرفوض** | `bad-600` | `n-000` | **9.74 AAA** | `XCircle` 64px | 40px/800 |
| **تحقق** | `warn-600` | `n-000` | **7.19 AAA** ← كان **3.26 ❌** | `ShieldQuestion` 64px | 40px/800 |

### ما تغيّر

| # | التغيير | السبب |
|---|---|---|
| 1 | التعبئات إلى درجات `600` | لوحة «يتطلب تحقق» كانت **راسبة** بـ3.26 على الشاشة الحرجة |
| 2 | `role="status"` + **`aria-live="assertive"`** | `DEF-049` — قارئ الشاشة لا يعلن النتيجة |
| 3 | شريط علوي 6px مميز الشكل لكل قرار | إشارة رابعة بعد اللون والأيقونة والكلمة |
| 4 | أزرار الإجراءات `size="xl"` (56px) | `--tap-gate` |
| 5 | زر **«تجاوز يدوي (قرار مشرف)»** على حالة الرفض | `BR-106` · `GAP-07` |
| 6 | اللوحة لا تختفي حتى المسح التالي | الحارس قد يلتفت للسائق ويعود |

---

## C-17 · DataTable ✨ جديد

`SCR-17` «السكان والعقارات» يعرض 40 عقارًا و60 مقيمًا **بلا بحث ولا فرز ولا ترقيم** (`DEF-033`).

```tsx
<DataTable columns={…} rows={…} searchable sortable pageSize={25}
           onRowClick={…} emptyState={…} density="compact"|"comfortable" />
```

**الوصولية:** `<table>` دلالي · `<th scope="col">` · `aria-sort` على العمود المفروز · التنقل بالأسهم · إعلان نتائج البحث بـ`aria-live`.

---

## قواعد عامة للمكونات

| # | القاعدة |
|---|---|
| 1 | لا لون خام ولا مقاس خام ولا ظل خام — من الرموز فقط |
| 2 | كل مكوّن تفاعلي له حالة تركيز مرئية بتباين ≥ 3:1 |
| 3 | كل حالة = لون + أيقونة + كلمة |
| 4 | كل مكوّن يدعم `light` و`dark` — بلا استثناء |
| 5 | كل نص من `i18n/strings.ts` — لا نص مضمّن |
| 6 | كل عنصر قابل للنقر `<button>` أو `<a>` — لا `<div onClick>` |
| 7 | كل أيقونة زخرفية `aria-hidden="true"` |
| 8 | كل مكوّن يقبل `className` للتوسيع لا للتجاوز |
