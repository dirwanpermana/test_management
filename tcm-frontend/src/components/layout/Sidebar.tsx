import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';

// const menus = [
const baseMenus = [
  { to: '/test-cases', label: 'Test Case', icon: '📋' },
  { to: '/bugs', label: 'List Bug', icon: '🐞' },
  { to: '/monitoring', label: 'Monitoring', icon: '📊' },
];

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { user } = useAuth();
   const menus = user?.role === 'QA'
     ? [...baseMenus, { to: '/notes', label: 'Notes', icon: '📝' }]
     : baseMenus;

  return (
    <aside className={`sidebar${collapsed ? ' sidebar-collapsed' : ''}`}>
      <div className="sidebar-topbar">
        <button className="burger-btn" onClick={onToggle} aria-label="Toggle sidebar" type="button">
          <span /><span /><span />
        </button>
        {!collapsed && <div className="sidebar-logo">OnTest</div>}
      </div>
      <nav>
        {menus.map((m) => (
          <NavLink
            key={m.to}
            to={m.to}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            title={m.label}
          >
            <span className="sidebar-link-icon">{m.icon}</span>
            <span className="sidebar-link-text">{m.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}