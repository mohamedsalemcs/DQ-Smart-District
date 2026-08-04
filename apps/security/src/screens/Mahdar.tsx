import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileSignature, History, Lock, PackagePlus, ShieldCheck } from 'lucide-react';
import { useStore } from '@dq/core';
import { Button, Card, ConfirmDialog, EmptyState, Field, Input, Modal, SectionTitle, TextArea } from '@dq/ui';
import { SignaturePad } from '../components/SignaturePad';
import { AuditDrawer } from '../components/AuditDrawer';
import { Txn } from '@dq/ui';
import { fmtDateTime } from '@dq/core';

/** §11 Path B endpoint — parties, seized items, waiver, signatures, approve, LOCK.
 *  Once locked the store rejects every mutation; try it on stage. */
export function MahdarScreen() {
  const { id } = useParams();
  const store = useStore();
  const incident = store.incidents.find((i) => i.id === id);
  const mahdar = incident?.mahdarId ? store.mahadir.find((m) => m.id === incident.mahdarId) : undefined;

  const [summary, setSummary] = useState(mahdar?.summaryAr ?? '');
  const [resolution, setResolution] = useState(mahdar?.resolutionAr ?? '');
  const [waiverAgreed, setWaiverAgreed] = useState(mahdar?.waiver?.agreed ?? false);
  const [waiverNote, setWaiverNote] = useState(mahdar?.waiver?.noteAr ?? 'تنازل الطرفان عن أي مطالبات متبادلة');
  const [seizedDesc, setSeizedDesc] = useState('');
  const [signingParty, setSigningParty] = useState<string | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  if (!incident || !mahdar) return <EmptyState title="لا يوجد محضر لهذا البلاغ بعد" hint="افتح المحضر من شاشة إدارة الحادث" />;

  const locked = mahdar.locked;
  const supervisor = store.people.find((p) => p.id === mahdar.approvedBy);
  const allSigned = incident.parties.length > 0 && incident.parties.every((p) => p.signatureDataUrl);

  const saveTexts = () => {
    const ok = store.updateMahdar(mahdar.id, { summaryAr: summary, resolutionAr: resolution });
    if (!ok) {
      // the store refused (locked) — snap the fields back to the approved text
      setSummary(mahdar.summaryAr);
      setResolution(mahdar.resolutionAr);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-lg font-bold">
          محضر <Txn no={mahdar.txnNo} className="text-brand-600" />
        </h1>
        <div className="flex items-center gap-2">
          {locked && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-caption font-bold text-brand-600">
              <Lock size={13} /> معتمد ومقفل
            </span>
          )}
          <Button size="sm" variant="ghost" onClick={() => setAuditOpen(true)}>
            <History size={13} /> سجل التدقيق
          </Button>
        </div>
      </div>

      {locked && (
        <div className="rounded-card border border-brand-300 bg-brand-50 p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold text-brand-600">
            <ShieldCheck size={16} /> السجل نهائي
          </p>
          <p className="mt-1 text-caption text-ink-500">
            اعتمده {supervisor?.nameAr} في {mahdar.approvedISO ? fmtDateTime(mahdar.approvedISO) : ''} · أي محاولة تعديل ستُرفض
            وتُسجَّل في سجل التدقيق — جرّبها.
          </p>
          <p className="mt-2 text-micro text-ink-500">
            سلسلة التحقق: <bdi dir="ltr" className="plate">{mahdar.hashChain[mahdar.hashChain.length - 1]?.slice(0, 32)}…</bdi>
          </p>
        </div>
      )}

      {/* summary & resolution */}
      <Card className="space-y-3 p-5">
        <SectionTitle>الوقائع والتسوية</SectionTitle>
        <Field label="ملخص الواقعة">
          <TextArea value={summary} onChange={(e) => setSummary(e.target.value)} onBlur={saveTexts} placeholder="ملخص ما جرى كما عاينته الدورية…" />
        </Field>
        <Field label="التسوية / الإجراء">
          <TextArea value={resolution} onChange={(e) => setResolution(e.target.value)} onBlur={saveTexts} placeholder="ما تم الاتفاق عليه أو الإجراء المتخذ…" />
        </Field>
        {locked && <p className="text-caption text-ink-500">الحقول تُعرض كما اعتُمدت — الحفظ سيُرفض من المخزن.</p>}
      </Card>

      {/* waiver */}
      <Card className="p-5">
        <SectionTitle>التنازل (تنازل)</SectionTitle>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={waiverAgreed}
            onChange={(e) => {
              setWaiverAgreed(e.target.checked);
              store.setMahdarWaiver(mahdar.id, e.target.checked, waiverNote);
            }}
            className="mt-0.5 h-4 w-4 accent-gold"
          />
          <span>سُجّل تنازل بين الأطراف</span>
        </label>
        {waiverAgreed && (
          <div className="mt-2">
            <Input value={waiverNote} onChange={(e) => setWaiverNote(e.target.value)} onBlur={() => store.setMahdarWaiver(mahdar.id, waiverAgreed, waiverNote)} />
          </div>
        )}
      </Card>

      {/* seized items */}
      <Card className="p-5">
        <SectionTitle>المضبوطات وسلسلة العهدة</SectionTitle>
        {mahdar.seized.length === 0 && <p className="mb-2 text-caption text-ink-500">لا مضبوطات مسجلة</p>}
        <ul className="mb-3 space-y-2">
          {mahdar.seized.map((it) => (
            <li key={it.id} className="rounded-card bg-ink-0 p-3 text-sm">
              <p className="font-medium">{it.descriptionAr}</p>
              <p className="mt-1 text-caption text-ink-500">
                {it.custody.map((c) => `${c.action === 'seized' ? 'ضُبط' : c.action === 'labelled' ? 'رُقّم' : c.action} · ${fmtDateTime(c.atISO)}`).join(' ← ')}
              </p>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Input placeholder="وصف المضبوط…" value={seizedDesc} onChange={(e) => setSeizedDesc(e.target.value)} />
          <Button
            variant="outline"
            className="border-ink-300 text-ink-800"
            onClick={() => {
              if (seizedDesc.trim() && store.addSeizedItem(mahdar.id, seizedDesc)) setSeizedDesc('');
            }}
          >
            <PackagePlus size={15} /> إضافة
          </Button>
        </div>
      </Card>

      {/* signatures */}
      <Card className="p-5">
        <SectionTitle>توقيعات الأطراف</SectionTitle>
        {incident.parties.length === 0 && <p className="text-caption text-ink-500">لا أطراف مسجلة على هذا البلاغ</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          {incident.parties.map((p) => (
            <div key={p.nameAr} className="rounded-card bg-ink-0 p-3">
              <p className="text-sm font-medium">{p.nameAr}</p>
              <p className="text-caption text-ink-500">{p.role === 'reporter' ? 'مبلّغ' : p.role === 'subject' ? 'طرف' : 'شاهد'}</p>
              {p.signatureDataUrl ? (
                <div className="mt-2">
                  <img src={p.signatureDataUrl} alt={`توقيع ${p.nameAr}`} className="h-14 w-full rounded bg-ink-0 object-contain" />
                  <p className="mt-1 text-micro text-ink-500">وُقّع {p.signedISO ? fmtDateTime(p.signedISO) : ''}</p>
                </div>
              ) : (
                <Button size="sm" className="mt-2 w-full" onClick={() => setSigningParty(p.nameAr)}>
                  <FileSignature size={14} /> توقيع إلكتروني
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* approve & lock */}
      {!locked && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">اعتماد المشرف</p>
              <p className="text-caption text-ink-500">
                {allSigned ? 'جميع الأطراف وقّعت — جاهز للاعتماد' : 'بانتظار توقيع جميع الأطراف قبل الاعتماد'}
              </p>
            </div>
            <Button size="lg" disabled={!allSigned} onClick={() => setApproveOpen(true)}>
              <Lock size={16} /> اعتماد وقفل المحضر
            </Button>
          </div>
        </Card>
      )}

      <Modal open={!!signingParty} onClose={() => setSigningParty(null)} title={`توقيع: ${signingParty ?? ''}`} wide>
        <SignaturePad
          onCancel={() => setSigningParty(null)}
          onConfirm={(dataUrl) => {
            store.signMahdar(mahdar.id, signingParty!, dataUrl);
            setSigningParty(null);
          }}
        />
      </Modal>

      <ConfirmDialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        onConfirm={() => {
          store.updateMahdar(mahdar.id, { summaryAr: summary, resolutionAr: resolution });
          void store.approveMahdar(mahdar.id);
        }}
        title="اعتماد المحضر وقفله؟"
        body="بعد القفل يصبح السجل نهائيًا: أي تعديل لاحق سيُرفض ويُسجَّل كمحاولة مرفوضة في سجل التدقيق. تُضاف بصمة تحقق (sha-256) لسلسلة السجل."
        confirmLabel="اعتماد وقفل"
      />

      <AuditDrawer open={auditOpen} onClose={() => setAuditOpen(false)} entity="mahdar" entityId={mahdar.id} />
    </div>
  );
}
