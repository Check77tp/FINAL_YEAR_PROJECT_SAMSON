import { useAuth } from '../../hooks/useAuth';
import StudentHome from './StudentHome';
import TechnicianHome from './TechnicianHome';
import AdminHome from './AdminHome';

// One route (/), three role-specific dashboards — see StudentHome,
// TechnicianHome, and AdminHome for the actual content per role.
function Home() {
  const { user } = useAuth();

  if (user?.role === 'technician') return <TechnicianHome />;
  if (user?.role === 'administrator') return <AdminHome />;
  return <StudentHome />;
}

export default Home;
