import { useState } from 'react';
import { Save } from 'lucide-react';
import { useStore } from '@dq/core';
import { Button, Card, Field, Input, SectionTitle } from '@dq/ui';
import { permitKindAr } from '@dq/core';

/** §10 — escalation rules editable AND actually driving behaviour:
 *  the violations screen and the suspend action read these values live. */
export function AdminSettings() {
  const store = useStore();
  const [ladder, setLadder] = useState(store.settings.ladder);
  const [graceDays, setGraceDays] = useState(store.settings.graceDays);
  const [suspendAtStep, setSuspendAtStep] = useState(store.settings.suspendAtStep);
  const [suspensionDays, setSuspensionDays] = useState(store.settings.suspensionDays);

  const save = () => {
    useStore.setState({ settings: { ...store.settings, ladder, graceDays, suspendAtStep, suspensionDays } });
    store.appendAudit('settings', 'escalation', 'update', store.settings, { ladder, graceDays, suspendAtStep, suspensionDays });
    store.pushToast('حُفظت الإعدادات', 'سلّم التصعيد المعدّل يسري فورًا على شاشة المخالفات', 'ok');
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <SectionTitle action={<Button onClick={save}><Save size={15} /> حفظ</Button>}>الإعدادات</SectionTitle>

      <Card className="p-5">
        <p className="mb-1 text-sm font-bold">سلّم التصعيد</p>
        <p className="mb-4 text-caption text-ink-500">هذه القيم تقود شاشة المخالفات مباشرة — عدّل مسمى درجة واحفظ ثم افتح مخالفة لترى الأثر.</p>
        <div className="space-y-2">
          {ladder.map((step, i) => (
            <div key={step.step} className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-50 text-caption font-bold">{step.step}</span>
              <Input
                value={step.labelAr}
                onChange={(e) => setLadder((l) => l.map((s, j) => (j === i ? { ...s, labelAr: e.target.value } : s)))}
                className="!w-40"
              />
              <Input
                value={step.descriptionAr}
                onChange={(e) => setLadder((l) => l.map((s, j) => (j === i ? { ...s, descriptionAr: e.target.value } : s)))}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Field label="مهلة التصحيح الافتراضية (أيام)">
            <Input type="number" min={1} value={graceDays} onChange={(e) => setGraceDays(+e.target.value)} />
          </Field>
          <Field label="درجة إيقاف المركبة">
            <Input type="number" min={1} max={5} value={suspendAtStep} onChange={(e) => setSuspendAtStep(+e.target.value)} />
          </Field>
          <Field label="مدة الإيقاف الافتراضية (أيام)">
            <Input type="number" min={1} value={suspensionDays} onChange={(e) => setSuspensionDays(+e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-sm font-bold">أنواع التصاريح</p>
        <div className="flex flex-wrap gap-2">
          {Object.values(permitKindAr).map((k) => (
            <span key={k} className="rounded-full bg-ink-50 px-3 py-1 text-caption">{k}</span>
          ))}
        </div>
        <p className="mt-2 text-caption text-ink-500">إدارة كاملة لأنواع التصاريح خارج نطاق نموذج الإثبات.</p>
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-sm font-bold">جدول SLA</p>
        <table className="w-full text-sm">
          <tbody>
            {[
              ['تسرب مياه', '4 ساعات'],
              ['إنارة', '24 ساعة'],
              ['نظافة', '24 ساعة'],
              ['أرصفة وتشجير', '72 ساعة'],
            ].map(([k, v]) => (
              <tr key={k} className="border-b border-ink-100 last:border-0">
                <td className="py-2">{k}</td>
                <td className="py-2 text-end tabular-nums text-ink-500">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
