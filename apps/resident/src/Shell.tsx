import { useMemo } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileWarning,
  Home,
  Megaphone,
  UserRound,
} from 'lucide-react';
import { ErrorBoundary, AppShell, NotificationsBell, ToastHost, type NavItem } from '@dq/ui';
import { ago, useStore } from '@dq/core';
import { useGo } from './lib/nav';
import { EmergencyButton } from './components/EmergencyButton';

const NAV: NavItem[] = [
  { to: '/', labelAr: 'الرئيسية', icon: Home, end: true },
  { to: '/property', labelAr: 'عقاري', icon: Building2 },
  { to: '/permits', labelAr: 'التصاريح', icon: BadgeCheck },
  { to: '/requests', labelAr: 'الطلبات والبلاغات', icon: ClipboardList },
  /* SCR-62 — المقيم كان يُشعَر بمخالفته ولا يملك أي طريقة للاطلاع أو التظلّم */
  { to: '/violations', labelAr: 'مخالفاتي', icon: FileWarning },
  { to: '/bookings', labelAr: 'الحجوزات', icon: CalendarDays },
  { to: '/community', labelAr: 'المجتمع', icon: Megaphone },
  { to: '/payments', labelAr: 'المدفوعات', icon: CreditCard },
  { to: '/account', labelAr: 'حسابي', icon: UserRound },
];

export function ResidentShell() {
  const location = useLocation();
  const go = useGo();

  const persona = useStore((s) => s.persona);
  const setPersona = useStore((s) => s.setPersona);
  const notifications = useStore((s) => s.notifications);
  const currentUsers = useStore((s) => s.currentUsers);
  const people = useStore((s) => s.people);
  const markAllRead = useStore((s) => s.markAllRead);
  const markRead = useStore((s) => s.markRead);
  const toasts = useStore((s) => s.toasts);
  const dismissToast = useStore((s) => s.dismissToast);

  if (persona !== 'resident') setPersona('resident');

  const me = currentUsers.resident;
  const user = useMemo(() => people.find((p) => p.id === me), [people, me]);

  /* BR-175 · DEF-004 — الإشعار الموجّه لشخص يصل إليه، لا يضيع في العدم */
  const mine = useMemo(
    () => notifications.filter((n) => n.toPersonaOrPerson === 'resident' || n.toPersonaOrPerson === me),
    [notifications, me],
  );

  return (
    <>
      <AppShell
        nav={NAV}
        density="comfortable"
        maxWidth={960}
        portalNameAr="بوابة المقيم"
        portalNameEn="RESIDENT PORTAL"
        isActive={(i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to))}
        renderLink={(item, cls, children) => (
          <NavLink to={item.to} end={item.end} className={cls}>
            {children}
          </NavLink>
        )}
        headerEnd={
          <>
            <NotificationsBell
              items={mine}
              relTime={ago}
              onMarkAllRead={() => markAllRead('resident')}
              onOpen={(n) => {
                markRead(n.id);
                go(n.deepLink);
              }}
            />
            <span className="hidden items-center gap-2 border-s border-ink-100 ps-3 md:flex">
              <span className="flex size-8 items-center justify-center rounded-pill bg-brand-50 text-micro font-bold text-brand-700">
                {user?.nameAr.slice(0, 2)}
              </span>
              <span className="text-micro font-semibold text-ink-700">{user?.nameAr}</span>
            </span>
          </>
        }
        extra={<EmergencyButton />}
      >
        <ErrorBoundary labelAr="هذه الشاشة">
          <Outlet />
        </ErrorBoundary>
      </AppShell>
      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
