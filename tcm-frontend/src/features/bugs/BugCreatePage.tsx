import { useNavigate } from 'react-router-dom';
import { BugCreateForm } from './BugCreateForm';

export function BugCreatePage() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <button className="btn-secondary mb-3" onClick={() => navigate('/bugs')}>
        Back to List Bug
      </button>
     <BugCreateForm onCreated={() => navigate('/bugs')} />
    </div>
  );
}