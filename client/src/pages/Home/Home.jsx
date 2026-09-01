import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Home.css';

// Placeholder landing page — confirms authentication works end-to-end.
// Role-specific dashboards proper are still just this + a linked page each.
function Home() {
  const { user, logout } = useAuth();

  return (
    <main className="home-page">
      <h1 className="home-page-title">Welcome, {user?.name}</h1>
      <p className="home-page-role">Signed in as {user?.role}</p>
      <p className="home-page-note">
        The {user?.role} dashboard hasn&rsquo;t been built yet — this page just confirms
        registration, login, and role assignment are working end-to-end.
      </p>
      {user?.role === 'student' && (
        <Link to="/requests" className="home-page-link">
          View My Requests
        </Link>
      )}
      {user?.role === 'administrator' && (
        <Link to="/manage-requests" className="home-page-link">
          Manage Requests
        </Link>
      )}
      {user?.role === 'technician' && (
        <Link to="/tasks" className="home-page-link">
          My Tasks
        </Link>
      )}
      <button type="button" className="home-page-logout" onClick={logout}>
        Log Out
      </button>
    </main>
  );
}

export default Home;
