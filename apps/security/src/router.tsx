import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Skeleton } from '@dq/ui';
import { SecurityShell } from './Shell';
import { OpsRoom } from './screens/OpsRoom';
import { ShiftScreen } from './screens/Shift';
import { PatrolScreen } from './screens/Patrol';
import { TourScreen } from './screens/Tour';
import { GateScreen } from './screens/Gate';
import { LookupScreen } from './screens/Lookup';
import { IncidentsList } from './screens/Incidents';
import { IncidentNew } from './screens/IncidentNew';
import { IncidentDetail } from './screens/IncidentDetail';
import { MahdarScreen } from './screens/Mahdar';
import { ViolationNew } from './screens/ViolationNew';
import { SecurityReports } from './screens/Reports';

const DigitalTwin = lazy(() => import('./screens/DigitalTwin').then((m) => ({ default: m.DigitalTwin })));
const TwinFallback = () => (
  <div className="space-y-3">
    <Skeleton className="h-10 w-64" />
    <Skeleton className="h-[60vh] w-full" />
  </div>
);

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <SecurityShell />,
      children: [
        { index: true, element: <OpsRoom /> },
        { path: 'twin', element: <Suspense fallback={<TwinFallback />}><DigitalTwin /></Suspense> },
        { path: 'shift', element: <ShiftScreen /> },
        { path: 'patrol', element: <PatrolScreen /> },
        { path: 'tour', element: <TourScreen /> },
        { path: 'gate/:gateId', element: <GateScreen /> },
        { path: 'lookup', element: <LookupScreen /> },
        { path: 'incidents', element: <IncidentsList /> },
        { path: 'incidents/new', element: <IncidentNew /> },
        { path: 'incidents/:id', element: <IncidentDetail /> },
        { path: 'incidents/:id/mahdar', element: <MahdarScreen /> },
        { path: 'violations/new', element: <ViolationNew /> },
        { path: 'reports', element: <SecurityReports /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') },
);
