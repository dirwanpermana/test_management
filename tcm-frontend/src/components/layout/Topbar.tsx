import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';

export function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="topbar">
      <div />
      <div className="topbar-user">
        <span className="badge-role">{user?.role}</span>
        <span>{user?.fullName}</span>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </header>
  );
}
