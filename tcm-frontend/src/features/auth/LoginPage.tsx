import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      {/* ---------- LEFT: sidebar-style login form ---------- */}
      <div className="login-sidebar">
        <div className="login-sidebar-inner">
          <div className="ontest-logo">
            <span className="ontest-logo-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                <path
                  d="M5 12.5l4.5 4.5L19 7"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="ontest-logo-text">
              On<strong>Test</strong>
            </span>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <h1>Selamat Datang Kembali 👋</h1>
            <p className="subtitle">
              Masuk ke <span className="ontest">OnTest</span> dan lanjutkan mengawal kualitas rilis Anda.
            </p>

            <label htmlFor="username">Username</label>
            <input
              id="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Johndol"
              required
            />

            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? 'Sembunyikan' : 'Lihat'}
              </button>
            </div>

            {error && <div className="error-text">⚠ {error}</div>}

            <button type="submit" className="login-submit" disabled={submitting}>
              {submitting ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <p className="login-footer-note">
            © {new Date().getFullYear()} OnTest - Test Case Management Tools
          </p>
        </div>
      </div>

      {/* ---------- RIGHT: testing-themed visual ---------- */}
      <div className="login-visual" aria-hidden="true">
        <div className="login-visual-glow login-visual-glow-a" />
        <div className="login-visual-glow login-visual-glow-b" />
        <div className="login-visual-grid" />

        <div className="login-visual-copy">
          <span className="login-visual-tag">Test Smarter, Ship Safer</span>
          <h2>
            Satu Platform untuk
            <br />
            Setiap Siklus Pengujian.
          </h2>
          <p>
            Kelola catatan, test case, bug report, dan monitoring progress pengembangan - semua dari satu tempat secara
            real-time
          </p>

          <ul className="login-visual-features">
            <li>✅ Manajemen Test Case terstruktur</li>
            <li>🐞 Bug Tracking terintegrasi</li>
            <li>📊 Reporting &amp; Insight real-time</li>
          </ul>
        </div>

        {/* Floating mockup cards depicting the testing process */}
        <div className="float-card float-card-checklist">
          <div className="float-card-header">
            <span className="dot dot-red" />
            <span className="dot dot-yellow" />
            <span className="dot dot-green" />
            <span className="float-card-title">Test Case Checklist</span>
          </div>
          <div className="check-row">
            <span className="check-box checked">✓</span> Verifikasi login JWT
          </div>
          <div className="check-row">
            <span className="check-box checked">✓</span> Validasi API response schema
          </div>
          <div className="check-row">
            <span className="check-box pending" /> Regression suite E2E
          </div>
        </div>

        <div className="float-card float-card-terminal">
          <div className="float-card-header">
            <span className="dot dot-red" />
            <span className="dot dot-yellow" />
            <span className="dot dot-green" />
            <span className="float-card-title">Bug Report Checklist</span>
          </div>
          <div className="terminal-line">
            <span className="terminal-ok">🐞</span> Bug ditemukan <span className="terminal-dim">(4 Bug)</span>
          </div>
          <div className="terminal-line">
            <span className="terminal-ok">✓</span> Bug sudah selesai di fixing <span className="terminal-dim">(12 passed)</span>
          </div>
          <div className="terminal-line terminal-cursor">Ready to deploy<span className="blink">_</span></div>
        </div>

        <div className="float-card float-card-metric">
          <div className="metric-ring">
            <svg viewBox="0 0 80 80" width="64" height="64">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#ffffff33" strokeWidth="8" />
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="#34d399"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="213.6"
                strokeDashoffset="24"
                transform="rotate(-90 40 40)"
              />
            </svg>
            <span className="metric-value">89%</span>
          </div>
          <div className="metric-label">
            Test Pass Rate
            <span className="metric-sub">Sprint 24</span>
          </div>
        </div>
      </div>
    </div>
  );
}