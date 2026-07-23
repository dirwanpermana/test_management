import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('qa1');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/test-cases');
    } catch {
      setError('Username atau password salah');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Test Case Management</h1>
        <p className="subtitle">Masuk untuk melanjutkan</p>

        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} required />

        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        {error && <div className="error-text">{error}</div>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Memproses...' : 'Login'}
        </button>

        <div className="hint-box">
          <strong>Akun mock (password sama: password123)</strong>
          <div>QA: qa1, qa2</div>
          <div>Developer: dev1, dev2</div>
        </div>
      </form>
    </div>
  );
}
