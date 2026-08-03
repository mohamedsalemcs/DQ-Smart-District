import {
  Gavel,
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleDashed,
  Clock,
  FileEdit,
  Lock,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  ShieldAlert,
  Timer,
  XCircle,
} from 'lucide-react';
import type { ComponentType } from 'react';

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral';

/** Colour is never the only signal: every pill carries icon + word (§5). */
export function StatusPill({
  labelAr,
  tone,
  icon: Icon,
  dark = false,
}: {
  labelAr: string;
  tone: Tone;
  icon?: ComponentType<{ size?: number | string; className?: string }>;
  dark?: boolean;
}) {
  const light: Record<Tone, string> = {
    ok: 'bg-ok-600-50 text-ok-600',
    warn: 'bg-warn-600-50 text-warn-600',
    bad: 'bg-danger-50 text-danger-600',
    info: 'bg-ink-50/10 text-info-500',
    neutral: 'bg-ink-50 text-ink-500',
  };
  const onDark: Record<Tone, string> = {
    ok: 'bg-ok-600-50 text-ok-600',
    warn: 'bg-warn-600-50 text-warn-600-600',
    bad: 'bg-danger-50 text-danger-600',
    info: 'bg-info-50 text-ink-800',
    neutral: 'bg-ink-100 text-ink-800',
  };
  const FallbackIcon = tone === 'ok' ? CheckCircle2 : tone === 'bad' ? XCircle : tone === 'warn' ? AlertTriangle : CircleDashed;
  const I = Icon ?? FallbackIcon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[--text-caption] font-medium ${dark ? onDark[tone] : light[tone]}`}>
      <I size={12} />
      {labelAr}
    </span>
  );
}

/* domain mappings */
import type { IncidentStatus, PermitStatus, RequestStatus, ViolationStatus } from '@dq/core';
import { incidentStatusAr, permitStatusAr, requestStatusAr, violationStatusAr } from '@dq/core';

export const permitPill = (s: PermitStatus, dark = false) => {
  const map: Record<PermitStatus, [Tone, typeof Clock]> = {
    draft: ['neutral', FileEdit],
    pending: ['warn', Clock],
    approved: ['ok', CheckCircle2],
    rejected: ['bad', XCircle],
    suspended: ['bad', PauseCircle],
    expired: ['neutral', Timer],
    cancelled: ['neutral', Ban],
  };
  const [tone, icon] = map[s];
  return <StatusPill labelAr={permitStatusAr[s]} tone={tone} icon={icon} dark={dark} />;
};

export const requestPill = (s: RequestStatus, dark = false) => {
  const map: Record<RequestStatus, [Tone, typeof Clock]> = {
    new: ['info', CircleDashed],
    triaged: ['info', Clock],
    assigned: ['warn', PlayCircle],
    in_progress: ['warn', PlayCircle],
    awaiting_verification: ['warn', Timer],
    closed: ['ok', CheckCircle2],
    reopened: ['bad', RotateCcw],
    rejected: ['neutral', Ban], // BR-058
  };
  const [tone, icon] = map[s];
  return <StatusPill labelAr={requestStatusAr[s]} tone={tone} icon={icon} dark={dark} />;
};

export const violationPill = (s: ViolationStatus, dark = false) => {
  const map: Record<ViolationStatus, [Tone, typeof Clock]> = {
    open: ['bad', ShieldAlert],
    notified: ['warn', Clock],
    grace: ['warn', Timer],
    escalated: ['bad', AlertTriangle],
    remediated: ['ok', CheckCircle2],
    closed: ['neutral', Lock],
    appealed: ['info', Gavel],      // EP-20
    cancelled: ['ok', CheckCircle2], // قُبل التظلّم
  };
  const [tone, icon] = map[s];
  return <StatusPill labelAr={violationStatusAr[s]} tone={tone} icon={icon} dark={dark} />;
};

export const incidentPill = (s: IncidentStatus, dark = false) => {
  const map: Record<IncidentStatus, [Tone, typeof Clock]> = {
    open: ['bad', ShieldAlert],
    dispatched: ['warn', PlayCircle],
    on_scene: ['warn', Timer],
    pending_mahdar: ['info', FileEdit],
    pending_approval: ['warn', Clock],
    closed: ['neutral', Lock],
    closed_no_action: ['neutral', Ban], // BR-072
  };
  const [tone, icon] = map[s];
  return <StatusPill labelAr={incidentStatusAr[s]} tone={tone} icon={icon} dark={dark} />;
};
