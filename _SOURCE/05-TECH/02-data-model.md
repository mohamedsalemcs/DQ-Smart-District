# نموذج البيانات — Data Model

`Tech Lead` · v1.0
المصدر: [`src/types/index.ts`](../../src/types/index.ts) · 486 سطرًا · 34 نوعًا

---

## 1. مخطط العلاقات

```
                    Person ──────┐
                      │ role     │ ownerId / tenantId / residentIds
                      │          ▼
                      │      Property ◄──── qrToken (تحقق لا إذن · BR-022)
                      │          │
                      │          │ vehicleIds
                      ▼          ▼
              Permit          Vehicle
              │ gateIds       │ accessState ◄── ★ الحقيقة الوحيدة (A1)
              │ qrToken       │ suspension
              │               │      │ sourceViolationId
              ▼               ▼      ▼
           GateEvent ◄──── evaluateGate() ──► Violation
              │                                  │ escalationStep
              │                                  │ repeatCount
              ▼                                  ▼
            Gate                          EscalationSettings
                                                (ladder · suspendAtStep)

   ServiceRequest ──► Organization        Incident ──► Mahdar
        │ dueISO (من SLA)                    │ txnNo    │ locked
        │ slaBreached                        │ dispatch │ hashChain
        ▼                                    ▼          ▼
    TimelineEvent[]                      Patrol    SeizedItem[]

   Asset ──► SensorReading ──► ServiceRequest (أمر عمل آلي)
   Booking · EmbassyAppointment · VisitorPass ──► evaluateGate()
   AuditEntry ◄── كل طفرة · بلا استثناء (A3)
   Notification ──► deepLink
```

## 2. الكيانات الأساسية

### `Vehicle` — أهم كيان في النظام

```ts
interface Vehicle {
  id: ID;
  plate: string;              // يُعرض داخل <bdi> دائمًا
  make: string; color: string;
  ownerPersonId: ID;
  propertyId?: ID;            // مرتبطة بوحدة ⇒ مسموحة (BR-107)
  accessState: 'allowed' | 'suspended' | 'blocked';   // ★ الحقيقة الوحيدة
  suspension?: Suspension;
}

interface Suspension {
  reason: string;
  fromISO: ISO; untilISO: ISO;   // ← DEF-001: كان untilISO لا يُفحص أبدًا
  decidedBy: ID;                 // ← DEF-006: كان يُزوَّر لأول مشرف
  sourceViolationId: ID;
  liftedAtISO?: ISO;
}
```

**ملاحظات التدقيق:**
- `accessState` هي نقطة الالتقاء بين قرار الإدارة وإنفاذ البوابة — كل تصميم النظام يقوم عليها
- `untilISO` كان **يُكتب ويُعرض ولا يُفحص** (`DEF-001`)
- `decidedBy` كان يُملأ بأول مشرف لا بالفاعل (`DEF-006`)
- `liftedAtISO` يميّز الرفع اليدوي من الانتهاء التلقائي

### `Permit`

```ts
interface Permit {
  id: ID;
  kind: PermitKind;            // 6 أنواع
  status: PermitStatus;        // 7 حالات · expired و cancelled كانتا ميتتين
  requestedBy: ID;
  hostPropertyId?: ID;
  subject: { nameAr; nationalId?; phone? };
  vehicleId?: ID; plate?: string;
  gateIds: ID[];               // ← DEF-002: كان لا يُقرأ في evaluateGate إطلاقًا
  validFromISO: ISO; validToISO: ISO;
  companions: number;
  qrToken: string;
  approvals: Approval[];       // يُلحَق ولا يُستبدل (BR-039)
  createdISO: ISO;
}
```

### `Violation`

```ts
interface Violation {
  id: ID;
  subject: 'property' | 'vehicle' | 'person';
  subjectId: ID;
  code: string; labelAr: string;
  status: ViolationStatus;     // 6 حالات + appealed و cancelled ✨
  loggedBy: ID; lat; lng; media: string[];
  graceUntilISO?: ISO;
  repeatCount: number;         // ← GAP-11: كان بلا نافذة زمنية (مدى الحياة)
  escalationStep: 0|1|2|3|4|5; // ← DEF-013: كان يُكتب 5 ثابتًا عند الإيقاف
  events: TimelineEvent[];
}
```

### `Mahdar` — السجل النهائي

```ts
interface Mahdar {
  id: ID; incidentId: ID; txnNo: string;
  summaryAr: string; resolutionAr: string;
  waiver?: { agreed: boolean; noteAr: string };
  seized: SeizedItem[];        // كل مضبوط بسلسلة عهدة
  signatures: { partyId: ID; dataUrl: string; atISO: ISO }[];
                               // ← DEF-021: partyId كان يُملأ بالاسم
  approvedBy?: ID; approvedISO?: ISO;
  locked: boolean;             // بعده: كل طفرة مرفوضة ومسجّلة (BR-085)
  hashChain: string[];         // sha256(السابق + الحمولة)
}
```

**سلسلة التحقق** — أقوى ما في النموذج. أي تلاعب بالمحتوى يكسر السلسلة كشفًا.

### `AuditEntry` — العمود الفقري للحوكمة

```ts
interface AuditEntry {
  id: ID; atISO: ISO; actorId: ID;
  entity: string; entityId: ID;
  action: 'create' | 'update' | 'approve' | 'lock' | 'reject';
  before?: unknown; after?: unknown;
}
```

**`reject`** هو النوع الأذكى: يسجّل المحاولات **المرفوضة** لا الناجحة فقط. محاولة تعديل محضر مقفل تُسجَّل بوصفها محاولة. هذا ما يجعل السجل دليلًا لا مجرد تاريخ.

---

## 3. الأنواع الميتة والحقول المهملة

| النوع/الحقل | الحالة | العيب |
|---|---|---|
| `PermitStatus.expired` | معرّفة، لا شيء ينتقل إليها | `DEF-008` |
| `PermitStatus.cancelled` | معرّفة، لا مسار لها | `GAP-04` |
| `RequestStatus.triaged` | في البذرة فقط · **بلا مخرج في الواجهة** | `DEF-009` |
| `IncidentStatus.pending_approval` | في الآلة · **تُتخطى بالقفز** | `DEF-019` |
| `Booking.status = 'used'` | في النوع · **لا شيء يكتبها** | `DEF-016` |
| `Permit.gateIds` | يُكتب ويُخزَّن · **لا يُقرأ في القرار** | `DEF-002` |
| `Suspension.untilISO` | يُكتب ويُعرض · **لا يُفحص** | `DEF-001` |
| `ServiceRequest.slaBreached` | يُكتب `false` · **لا يُحدَّث** | `DEF-011` |
| `Permit.vehicleId` | معرّف · لا يُملأ (يُستخدم `plate`) | `TD-12` |
| `VisitorPass.status = 'expired'` | لا شيء ينتقل إليها | `TD-13` |
| `EmbassyAppointment.status = 'expired'` | لا شيء ينتقل إليها | `TD-13` |

> **نمط متكرر:** النوع يعِد بما لا ينفّذه المنطق. أحد عشر موضعًا. هذه ليست أخطاء متفرقة — هي **فجوة منهجية بين تعريف النموذج وتنفيذ السلوك**، وهي بالضبط ما ولّد أربعة من عيوب P0.

---

## 4. الكيانات المضافة ✨

```ts
/** MOD-22 · التظلّم — EP-20 */
interface Appeal {
  id: ID;
  violationId: ID;
  submittedBy: ID;
  reasonAr: string;
  attachments: string[];
  submittedISO: ISO;
  status: 'pending' | 'accepted' | 'rejected';
  decidedBy?: ID;
  decidedISO?: ISO;
  decisionNoteAr?: string;      // إلزامي عند الرفض
}

/** MOD-23 · التصعيد الخارجي — EP-21 */
interface ExternalEscalation {
  id: ID;
  incidentId: ID;
  agency: 'red_crescent' | 'civil_defense' | 'traffic' | 'police';
  escalatedBy: ID;
  atISO: ISO;
  noteAr: string;
  acknowledgedISO?: ISO;
}

/** BR-109 · اتجاه المسح */
type GateDirection = 'in' | 'out';
// تُضاف إلى GateEvent

/** BR-182 · جدول SLA النافذ */
interface SlaRule {
  kind: RequestKind;
  priority: ServiceRequest['priority'];
  hours: number;
}
// تُضاف إلى EscalationSettings كـ slaRules: SlaRule[]
```

---

## 5. قواعد النمذجة

| # | القاعدة | لماذا |
|---|---|---|
| `DM-01` | كل تاريخ `ISO` نصًا بتوقيت UTC | لا التباس منطقة زمنية |
| `DM-02` | كل معرّف `string` (`nanoid`) | لا اعتماد على ترتيب رقمي |
| `DM-03` | كل نص معروض بلاحقة `Ar` | يجعل الاسترجاع الإنجليزي آليًا |
| `DM-04` | لا حقول محسوبة في النموذج | تُشتق في `useMemo` لتفادي التباعد |
| `DM-05` | الخط الزمني `events[]` على كل كيان يمر بدورة حياة | الشفافية للمستخدم |
| `DM-06` | القرارات تُلحَق (`approvals[]`) ولا تُستبدل | السجل تراكمي |
| `DM-07` | **كل قيمة في اتحاد نصي يجب أن يكون لها مسار كتابة ومسار قراءة** | يمنع نمط الأنواع الميتة أعلاه |
| `DM-08` ✨ | **كل حقل يُعرض للمستخدم يجب أن يؤثر في سلوك** | `gateIds` و`untilISO` كانا يُعرضان بلا أثر |

**`DM-07` و`DM-08` هما درس التدقيق الأهم.** لو طُبّقا من البداية لما وُجد أي من العيوب الحرجة الأربعة.

---

## 6. سلامة البيانات

| الفحص | الحالة |
|---|---|
| كل `Person.propertyId` يشير لعقار موجود | ✅ |
| كل `Vehicle.ownerPersonId` يشير لشخص موجود | ✅ |
| كل `Property.residentIds` أشخاص موجودون | ✅ |
| كل `Violation.subjectId` يطابق نوع `subject` | ✅ |
| كل `Suspension.sourceViolationId` مخالفة موجودة | ✅ |
| كل `Mahdar.incidentId` بلاغ موجود | ✅ |
| كل `Notification.deepLink` مسار صالح | ⚠️ بعضها `/a` عام لا الكيان |
| كل `Incident.dispatch.patrolId` دورية موجودة | ✅ |
| **`suspendAtStep` ≤ آخر درجة في السلّم** | ❌ `DEF-032` |
| **لا حجزين متداخلين على مرفق** | ❌ `DEF-023` |
| **عدد مواعيد اليوم ≤ الحد** | ❌ `DEF-024` |

البذرة متماسكة مرجعيًا — **مبنية بعناية حقيقية**. الإخفاقات الثلاثة كلها في القيود التي تُفرض وقت التشغيل لا وقت البذر.
