import { Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Layout from './Layout/Layout';

// Route guard: this is a UX convenience only. The server enforces real
// access control on every request — see CLAUDE.md. Every protected route
// also gets the shared Sidebar + TopNav shell via Layout, so it doesn't need
// to be repeated in App.jsx per route.
function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  // Suspense sits inside Layout so the sidebar/top bar stay on screen while a
  // page's code chunk loads.
  return (
    <Layout>
      <Suspense fallback={null}>{children}</Suspense>
    </Layout>
  );
}

export default ProtectedRoute;
