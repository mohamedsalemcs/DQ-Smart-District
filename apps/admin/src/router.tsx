import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Skeleton } from '@dq/ui';
import { AdminShell } from './Shell';
import { AdminDashboard } from './screens/Dashboard';
import { AdminRequests } from './screens/Requests';
import { AdminPermits } from './screens/Permits';
import { AdminViolations } from './screens/Violations';
import { AdminAppeals } from './screens/Appeals';
import { EmbassyAccess } from './screens/EmbassyAccess';
import { AdminOperations } from './screens/Operations';
import { Sustainability } from './screens/Sustainability';
import { Mobility } from './screens/Mobility';
import { AdminContracts } from './screens/Contracts';
import { AdminEvents } from './screens/Events';
import { AdminPeople } from './screens/People';
import { AdminPropertyDetail } from './screens/PropertyDetail';
import { AdminRevenue } from './screens/Revenue';
import { AdminReports } from './screens/Reports';
import { AdminSettings } from './screens/Settings';

// three.js وتوابعه (~1.2MB) خارج الحزمة الأساسية — تُحمَّل عند فتح التوأم فقط
const DigitalTwin = lazy(() => import('./screens/DigitalTwin').then((m) => ({ default: m.DigitalTwin })));

const TwinFallback = () => (
  <div className="space-y-3">
    <Skeleton className="h-10 w-64" />
    <Skeleton className="h-[60vh] w-full" />
    <p className="text-center text-[--text-caption] text-ink-500">جارٍ تحميل التوأم الرقمي…</p>
  </div>
);

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AdminShell />,
      children: [
        { index: true, element: <AdminDashboard /> },
        { path: 'twin', element: <Suspense fallback={<TwinFallback />}><DigitalTwin /></Suspense> },
        { path: 'requests', element: <AdminRequests /> },
        { path: 'permits', element: <AdminPermits /> },
        { path: 'violations', element: <AdminViolations /> },
        { path: 'appeals', element: <AdminAppeals /> },
        { path: 'embassies', element: <EmbassyAccess /> },
        { path: 'operations', element: <AdminOperations /> },
        { path: 'sustainability', element: <Sustainability /> },
        { path: 'mobility', element: <Mobility /> },
        { path: 'contracts', element: <AdminContracts /> },
        { path: 'events', element: <AdminEvents /> },
        { path: 'people', element: <AdminPeople /> },
        { path: 'properties/:id', element: <AdminPropertyDetail /> },
        { path: 'revenue', element: <AdminRevenue /> },
        { path: 'reports', element: <AdminReports /> },
        { path: 'settings', element: <AdminSettings /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') },
);
