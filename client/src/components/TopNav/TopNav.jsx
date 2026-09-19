import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getRecentActivity } from '../../services/activityService';
import { STATUS_LABELS, formatDate } from '../../utils/requestFormat';
import {
  MenuIcon,
  SearchIcon,
  BellIcon,
  InfoIcon,
  ChevronDownIcon,
  LogoutIcon,
  UserIcon,
} from '../icons';
import './TopNav.css';

const SEARCH_TARGET_BY_ROLE = {
  student: '/requests',
  technician: '/tasks',
  administrator: '/manage-requests',
};

const SEARCH_PLACEHOLDER_BY_ROLE = {
  student: 'Search your requests...',
  technician: 'Search your tasks...',
  administrator: 'Search requests...',
};

const DETAIL_ROUTE_BY_ROLE = {
  student: (id) => `/requests/${id}`,
  technician: (id) => `/tasks/${id}`,
  administrator: (id) => `/manage-requests/${id}`,
};

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

// Renders on every protected page (see Layout.jsx). Search, notifications,
// and help are real, working features backed by data the app already has —
// no decorative placeholders.
function TopNav({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activity, setActivity] = useState(null);
  const [activityError, setActivityError] = useState('');
  const [panelOpen, setPanelOpen] = useState(null); // 'notifications' | 'help' | 'account' | null
  const panelRef = useRef(null);

  useEffect(() => {
    getRecentActivity()
      .then(setActivity)
      .catch((err) => setActivityError(err.message));
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setPanelOpen(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function togglePanel(name) {
    setPanelOpen((current) => (current === name ? null : name));
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    const target = SEARCH_TARGET_BY_ROLE[user?.role] || '/';
    navigate(query.trim() ? `${target}?q=${encodeURIComponent(query.trim())}` : target);
    setQuery('');
  }

  function handleActivityClick(entry) {
    const toRoute = DETAIL_ROUTE_BY_ROLE[user?.role] || (() => '/');
    setPanelOpen(null);
    navigate(toRoute(entry.requestId));
  }

  return (
    <header className="top-nav">
      <button
        type="button"
        className="top-nav-menu-button"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
      >
        <MenuIcon width={22} height={22} />
      </button>

      <form className="top-nav-search" onSubmit={handleSearchSubmit} role="search">
        <SearchIcon width={18} height={18} className="top-nav-search-icon" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={SEARCH_PLACEHOLDER_BY_ROLE[user?.role] || 'Search...'}
          aria-label="Search"
        />
      </form>

      <div className="top-nav-actions" ref={panelRef}>
        <div className="top-nav-popover-anchor">
          <button
            type="button"
            className="top-nav-icon-button"
            onClick={() => togglePanel('notifications')}
            aria-label="Notifications"
          >
            <BellIcon width={20} height={20} />
            {activity && activity.length > 0 && <span className="top-nav-badge" />}
          </button>
          {panelOpen === 'notifications' && (
            <div className="top-nav-popover top-nav-popover-wide">
              <p className="top-nav-popover-title">Recent Activity</p>
              {activityError && <p className="top-nav-popover-empty">Could not load activity.</p>}
              {!activityError && activity === null && (
                <p className="top-nav-popover-empty">Loading…</p>
              )}
              {!activityError && activity && activity.length === 0 && (
                <p className="top-nav-popover-empty">No activity yet.</p>
              )}
              {activity && activity.length > 0 && (
                <ul className="top-nav-activity-list">
                  {activity.map((entry) => (
                    <li key={entry.historyId}>
                      <button
                        type="button"
                        className="top-nav-activity-item"
                        onClick={() => handleActivityClick(entry)}
                      >
                        <span className="top-nav-activity-text">
                          {user?.role !== 'student' && entry.studentName
                            ? `${entry.studentName}: `
                            : ''}
                          #REQ-{entry.requestId} marked{' '}
                          <strong>{STATUS_LABELS[entry.newStatus] || entry.newStatus}</strong>
                        </span>
                        <span className="top-nav-activity-date">{formatDate(entry.changedAt)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="top-nav-popover-anchor">
          <button
            type="button"
            className="top-nav-icon-button"
            onClick={() => togglePanel('help')}
            aria-label="Help"
          >
            <InfoIcon width={20} height={20} />
          </button>
          {panelOpen === 'help' && (
            <div className="top-nav-popover">
              <p className="top-nav-popover-title">Request Status Guide</p>
              <ul className="top-nav-help-list">
                <li><strong>Open</strong> — submitted, not yet assigned.</li>
                <li><strong>Assigned</strong> — a technician has been assigned.</li>
                <li><strong>In Progress</strong> — the technician is working on it.</li>
                <li><strong>Resolved</strong> — work is done, awaiting close-out.</li>
                <li><strong>Closed</strong> — fully complete.</li>
              </ul>
            </div>
          )}
        </div>

        <div className="top-nav-divider" />

        <div className="top-nav-popover-anchor">
          <button
            type="button"
            className="top-nav-account-button"
            onClick={() => togglePanel('account')}
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="top-nav-avatar top-nav-avatar-photo" />
            ) : (
              <span className="top-nav-avatar">{initials(user?.name)}</span>
            )}
            <span className="top-nav-account-text">
              <span className="top-nav-account-name">{user?.name}</span>
              <span className="top-nav-account-role">{user?.role}</span>
            </span>
            <ChevronDownIcon width={16} height={16} />
          </button>
          {panelOpen === 'account' && (
            <div className="top-nav-popover top-nav-popover-right">
              <Link to="/profile" className="top-nav-profile-link" onClick={() => setPanelOpen(null)}>
                <UserIcon width={18} height={18} />
                View Profile
              </Link>
              <button type="button" className="top-nav-logout" onClick={logout}>
                <LogoutIcon width={18} height={18} />
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default TopNav;
