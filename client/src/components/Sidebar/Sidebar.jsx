import { NavLink } from 'react-router-dom';
import { GraduationCapIcon, GridIcon, ClipboardListIcon, ChartBarIcon, PlusIcon } from '../icons';
import './Sidebar.css';

const NAV_ITEMS_BY_ROLE = {
  student: [
    { to: '/', label: 'Dashboard', icon: GridIcon, end: true },
    { to: '/requests', label: 'My Requests', icon: ClipboardListIcon },
  ],
  technician: [
    { to: '/', label: 'Dashboard', icon: GridIcon, end: true },
    { to: '/tasks', label: 'My Tasks', icon: ClipboardListIcon },
  ],
  administrator: [
    { to: '/', label: 'Dashboard', icon: GridIcon, end: true },
    { to: '/manage-requests', label: 'Manage Requests', icon: ClipboardListIcon },
    { to: '/reports', label: 'Reports & Analytics', icon: ChartBarIcon },
  ],
};

// Fixed drawer on mobile (toggled from TopNav's hamburger), a collapsed icon
// rail at tablet, and the full labeled sidebar at desktop — per CLAUDE.md's
// breakpoint table. Nav items are deliberately just the routes that exist in
// App.jsx for this role; nothing here links anywhere unbuilt.
function Sidebar({ role, mobileOpen, onClose }) {
  const items = NAV_ITEMS_BY_ROLE[role] || [];

  return (
    <>
      {mobileOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar${mobileOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon">
            <GraduationCapIcon width={22} height={22} />
          </span>
          <span className="sidebar-brand-text">
            <span className="sidebar-brand-title">UNZA Maintenance</span>
            <span className="sidebar-brand-subtitle">Hostel Management</span>
          </span>
        </div>

        <nav className="sidebar-nav">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}
            >
              <Icon width={20} height={20} />
              <span className="sidebar-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        {role === 'student' && (
          <NavLink to="/requests/new" onClick={onClose} className="sidebar-cta">
            <PlusIcon width={18} height={18} />
            <span className="sidebar-cta-label">Report New Issue</span>
          </NavLink>
        )}
      </aside>
    </>
  );
}

export default Sidebar;
