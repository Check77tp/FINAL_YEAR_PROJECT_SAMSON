import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Login.css';

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // ID number is the default/primary credential per CLAUDE.md's
  // "Authentication: ID-Based Login" — email is a secondary, toggled path.
  const [useEmailLogin, setUseEmailLogin] = useState(false);
  const [idNumber, setIdNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(useEmailLogin ? { email, password } : { idNumber, password });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <aside className="login-page-brand">
        <div className="login-page-brand-content">
          <h2 className="login-page-brand-title">Maintenance Hub</h2>
          <p className="login-page-brand-tagline">
            Providing a streamlined digital environment for UNZA students and staff to manage
            hostel infrastructure and maintenance requests efficiently.
          </p>
        </div>
      </aside>

      <div className="login-page-form-panel">
        <div className="login-page-form-card">
          <h1 className="login-page-title">Welcome Back</h1>
          <p className="login-page-subtitle">Sign in to your maintenance portal account</p>

          <form className="login-page-form" onSubmit={handleSubmit} noValidate>
            {useEmailLogin ? (
              <>
                <label className="login-page-label" htmlFor="login-email">
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  className="login-page-input"
                  placeholder="e.g. jdoe@unza.zm"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </>
            ) : (
              <>
                <label className="login-page-label" htmlFor="login-id-number">
                  Student or Staff ID
                </label>
                <input
                  id="login-id-number"
                  type="text"
                  className="login-page-input"
                  placeholder="e.g. 2023001234"
                  value={idNumber}
                  onChange={(event) => setIdNumber(event.target.value)}
                  autoComplete="username"
                  required
                />
              </>
            )}

            <label className="login-page-label" htmlFor="login-password">
              Password
            </label>
            <div className="login-page-password-field">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="login-page-input"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-page-toggle-password"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <button
              type="button"
              className="login-page-toggle-method"
              onClick={() => {
                setError('');
                setUseEmailLogin((useEmail) => !useEmail);
              }}
            >
              {useEmailLogin ? 'Log in with Student/Staff ID instead' : 'Log in with email instead'}
            </button>

            {error && (
              <p className="login-page-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="login-page-submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="login-page-signup">
            New student resident? <Link to="/register">Sign up as Student</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
