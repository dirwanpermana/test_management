import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';

const PAGE_TITLES: Record<string, string> = {
  '/test-cases': 'Test Case',
  '/bugs': 'List Bug',
  '/monitoring': 'Monitoring',
  '/notes': 'Notes',
};

export function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const title = PAGE_TITLES[location.pathname];

  return (
    <header className="topbar">
      <div className="topbar-left">
        {title && <h1 className="topbar-title">{title}</h1>}
      </div>
      <div className="topbar-user">
        <span className="badge-role">{user?.role}</span>
        <span>{user?.fullName}</span>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </header>
  );
}