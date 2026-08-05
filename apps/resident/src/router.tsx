import { createBrowserRouter } from 'react-router-dom';
import { ResidentShell } from './Shell';
import { ResidentHome } from './screens/Home';
import { PropertyFile } from './screens/PropertyFile';
import { ResidentPermits } from './screens/Permits';
import { PermitNew } from './screens/PermitNew';
import { ResidentRequests } from './screens/Requests';
import { RequestNew } from './screens/RequestNew';
import { RequestDetail } from './screens/RequestDetail';
import { ResidentBookings } from './screens/Bookings';
import { Community } from './screens/Community';
import { Payments } from './screens/Payments';
import { Account } from './screens/Account';
import { MyViolations } from './screens/MyViolations';
import { EmbassyBooking } from './screens/EmbassyBooking';
import { VisitorPortal } from './screens/VisitorPortal';
import { LostReport } from './screens/LostReport';

export const router = createBrowserRouter(
  [
    // صفحات عامة بلا غلاف — رابط السفارة وبوابة الزوار
    { path: '/book/:embassyId', element: <EmbassyBooking /> },
    { path: '/visit', element: <VisitorPortal /> },
    { path: '/lost', element: <LostReport /> },
    {
      path: '/',
      element: <ResidentShell />,
      children: [
        { index: true, element: <ResidentHome /> },
        { path: 'property', element: <PropertyFile /> },
        { path: 'permits', element: <ResidentPermits /> },
        { path: 'permits/new', element: <PermitNew /> },
        { path: 'requests', element: <ResidentRequests /> },
        { path: 'requests/new', element: <RequestNew /> },
        { path: 'requests/:id', element: <RequestDetail /> },
        { path: 'violations', element: <MyViolations /> },
        { path: 'bookings', element: <ResidentBookings /> },
        { path: 'community', element: <Community /> },
        { path: 'payments', element: <Payments /> },
        { path: 'account', element: <Account /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') },
);
