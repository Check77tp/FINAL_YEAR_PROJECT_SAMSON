import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Sidebar from '../Sidebar/Sidebar';
import TopNav from '../TopNav/TopNav';
import './Layout.css';

// Shell wrapping every protected page — see ProtectedRoute.jsx. Login and
// Register render outside this (no sidebar/top nav on auth screens).
function Layout({ children }) {
  const { user } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar role={user?.role} mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="app-shell-main">
        <TopNav onMenuClick={() => setMobileNavOpen(true)} />
        <div className="app-shell-content">{children}</div>
      </div>
    </div>
  );
}

export default Layout;
