import { useAuth } from '../../hooks/useAuth';
import { lazy, Suspense } from 'react';

// Lazy so a student never downloads the admin dashboard (and its chart
// library), and vice versa.
const StudentHome = lazy(() => import('./StudentHome'));
const TechnicianHome = lazy(() => import('./TechnicianHome'));
const AdminHome = lazy(() => import('./AdminHome'));

// One route (/), three role-specific dashboards — see StudentHome,
// TechnicianHome, and AdminHome for the actual content per role.
function Home() {
  const { user } = useAuth();

  let Dashboard = StudentHome;
  if (user?.role === 'technician') Dashboard = TechnicianHome;
  if (user?.role === 'administrator') Dashboard = AdminHome;

  return (
    <Suspense fallback={null}>
      <Dashboard />
    </Suspense>
  );
}

export default Home;
