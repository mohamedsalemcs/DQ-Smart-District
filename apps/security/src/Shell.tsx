import { useMemo } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity,
  DoorOpen,
  FileWarning,
  Footprints,
  Gauge,
  MapPinned,
  Orbit,
  Radio,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { ErrorBoundary, AppShell, NotificationsBell, SpeedToggle, ToastHost, type NavItem } from '@dq/ui';
import { ago, useStore } from '@dq/core';
import { useGo } from './lib/nav';

const NAV: NavItem[] = [
  { to: '/', labelAr: 'غرفة العمليات', icon: Radio, end: true, groupAr: 'الصورة العامة' },
  { to: '/twin', labelAr: 'الخريطة الذكية', icon: Orbit },
  { to: '/shift', labelAr: 'الوردية', icon: Gauge, groupAr: 'وردیتي' },
  { to: '/patrol', labelAr: 'الدوريات', icon: MapPinned },
  { to: '/tour', labelAr: 'الجولات', icon: Footprints },
  { to: '/gate/gate-1', labelAr: 'البوابة', icon: DoorOpen, groupAr: 'أدوات النقطة' },
  { to: '/lookup', labelAr: 'التحقق', icon: Search },
  { to: '/incidents', labelAr: 'البلاغات', icon: ShieldAlert, groupAr: 'التوثيق' },
  { to: '/violations/new', labelAr: 'تسجيل مخالفة', icon: FileWarning },
  { to: '/reports', labelAr: 'التقارير', icon: Activity },
];

export function SecurityShell() {
  const location = useLocation();
  const go = useGo();

  const persona = useStore((s) => s.persona);
  const setPersona = useStore((s) => s.setPersona);
  const notifications = useStore((s) => s.notifications);
  const currentUsers = useStore((s) => s.currentUsers);
  const markAllRead = useStore((s) => s.markAllRead);
  const markRead = useStore((s) => s.markRead);
  const toasts = useStore((s) => s.toasts);
  const dismissToast = useStore((s) => s.dismissToast);
  const demoSpeed = useStore((s) => s.demoSpeed);
  const setDemoSpeed = useStore((s) => s.setDemoSpeed);

  if (persona !== 'security') setPersona('security');

  const mine = useMemo(() => {
    const me = currentUsers.security;
    return notifications.filter((n) => n.toPersonaOrPerson === 'security' || n.toPersonaOrPerson === me);
  }, [notifications, currentUsers]);

  return (
    <>
      <AppShell
        nav={NAV}
        density="comfortable"
        maxWidth={1280}
        portalNameAr="التشغيل الأمني"
        portalNameEn="SECURITY OPS"
        isActive={(i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to))}
        renderLink={(item, cls, children) => (
          <NavLink to={item.to} end={item.end} className={cls}>
            {children}
          </NavLink>
        )}
        headerEnd={
          <>
            <SpeedToggle speed={demoSpeed} onToggle={() => setDemoSpeed(demoSpeed === 1 ? 10 : 1)} />
            <NotificationsBell
              items={mine}
              relTime={ago}
              onMarkAllRead={() => markAllRead('security')}
              onOpen={(n) => {
                markRead(n.id);
                go(n.deepLink);
              }}
            />
            <span className="hidden items-center gap-2 border-s border-ink-100 ps-3 md:flex">
              <span className="flex size-8 items-center justify-center rounded-pill bg-brand-50 text-brand-700">
                <ShieldCheck size={15} aria-hidden />
              </span>
              <span className="text-micro font-semibold text-ink-700">مشرف الأمن</span>
            </span>
          </>
        }
      >
        <ErrorBoundary labelAr="هذه الشاشة">
          <Outlet />
        </ErrorBoundary>
      </AppShell>
      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
