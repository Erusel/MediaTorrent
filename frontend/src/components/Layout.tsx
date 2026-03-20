import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '\u{1F4CA}' },
  { path: '/upload', label: 'Upload', icon: '\u{2B06}\u{FE0F}' },
  { path: '/progress', label: 'Progress', icon: '\u{23F3}' },
  { path: '/library', label: 'Library', icon: '\u{1F3AC}' },
  { path: '/leaderboard', label: 'Leaderboard', icon: '\u{1F3C6}' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">MediaTorrent</div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className={`sidebar-link ${location.pathname === '/admin' ? 'active' : ''}`}
            >
              <span>{'\u2699\uFE0F'}</span>
              <span>Admin</span>
            </Link>
          )}
        </nav>
        <div className="sidebar-user">
          <div style={{ fontWeight: 600 }}>{user?.username}</div>
          <div className="text-dim text-sm">{user?.role}</div>
          <button
            className="btn-secondary mt-2"
            style={{ width: '100%', padding: '6px' }}
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
