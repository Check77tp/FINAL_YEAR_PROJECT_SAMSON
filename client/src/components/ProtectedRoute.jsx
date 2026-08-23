import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Route guard: this is a UX convenience only. The server enforces real
// access control on every request — see CLAUDE.md.
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

export default ProtectedRoute;
