import { useAuth } from '../../hooks/useAuth';
import './Home.css';

// Placeholder landing page — confirms authentication works end-to-end.
// Replace with the real role-specific dashboards (checklist items 2, 4, 5).
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
      <button type="button" className="home-page-logout" onClick={logout}>
        Log Out
      </button>
    </main>
  );
}

export default Home;
