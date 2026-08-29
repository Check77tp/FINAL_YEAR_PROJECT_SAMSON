import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { IdCardIcon, LockIcon, EyeIcon, EyeOffIcon, ArrowRightIcon, GraduationCapIcon } from '../../components/icons';
import loginHero from '../../assets/login-hero.jpg';
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
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(useEmailLogin ? { email, password, remember } : { idNumber, password, remember });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <aside className="login-page-brand" style={{ backgroundImage: `url(${loginHero})` }}>
        <div className="login-page-brand-card">
          <div className="login-page-brand-badge">
            <span className="login-page-brand-badge-icon">
              <GraduationCapIcon width={20} height={20} />
            </span>
            <span className="login-page-brand-badge-text">UNZA Maintenance</span>
          </div>

          <h2 className="login-page-brand-title">Maintenance Portal Login</h2>
          <p className="login-page-brand-tagline">
            Providing a streamlined digital environment for UNZA students and staff to manage
            hostel infrastructure and maintenance requests efficiently.
          </p>

          <div className="login-page-brand-stats">
            <div className="login-page-brand-stat">
              <span className="login-page-brand-stat-value">12k+</span>
              <span className="login-page-brand-stat-label">Residents</span>
            </div>
            <div className="login-page-brand-stat-divider" />
            <div className="login-page-brand-stat">
              <span className="login-page-brand-stat-value">98%</span>
              <span className="login-page-brand-stat-label">Resolution Rate</span>
            </div>
          </div>
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
                <div className="login-page-input-field">
                  <IdCardIcon className="login-page-input-icon" />
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
                </div>
              </>
            ) : (
              <>
                <label className="login-page-label" htmlFor="login-id-number">
                  Student or Staff ID
                </label>
                <div className="login-page-input-field">
                  <IdCardIcon className="login-page-input-icon" />
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
                </div>
              </>
            )}

            <div className="login-page-label-row">
              <label className="login-page-label" htmlFor="login-password">
                Password
              </label>
              <span className="login-page-forgot" title="Coming soon">
                Forgot Password?
              </span>
            </div>
            <div className="login-page-input-field">
              <LockIcon className="login-page-input-icon" />
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
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
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

            <label className="login-page-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              Remember this device
            </label>

            {error && (
              <p className="login-page-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="login-page-submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign In'}
              {!submitting && <ArrowRightIcon />}
            </button>
          </form>

          <div className="login-page-divider" />

          <p className="login-page-signup">
            New student resident? <Link to="/register">Sign up as Student</Link>
          </p>

          <p className="login-page-footer">
            © {new Date().getFullYear()} University of Zambia. All infrastructure managed by UNZA
            Estates &amp; Maintenance Department.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
