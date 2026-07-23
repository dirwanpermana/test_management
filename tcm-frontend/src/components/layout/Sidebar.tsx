import { NavLink } from 'react-router-dom';

const menus = [
  { to: '/test-cases', label: 'Test Case' },
  { to: '/bugs', label: 'List Bug' },
  { to: '/monitoring', label: 'Monitoring' },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">TCM</div>
      <nav>
        {menus.map((m) => (
          <NavLink
            key={m.to}
            to={m.to}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            {m.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
