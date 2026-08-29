import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { IdCardIcon, LockIcon, ArrowRightIcon, GraduationCapIcon } from '../../components/icons';
import loginHero from '../../assets/login-hero.jpg';
import './Register.css';

function Register() {
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);
    try {
      await register({ name, email, idNumber, password });
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="register-page">
        <div className="register-page-form-panel">
          <div className="register-page-form-card">
            <h1 className="register-page-title">Account created</h1>
            <p className="register-page-subtitle">
              Your student account is ready. You can now sign in.
            </p>
            <Link to="/login" className="register-page-submit register-page-submit-link">
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page">
      <aside className="register-page-brand" style={{ backgroundImage: `url(${loginHero})` }}>
        <div className="register-page-brand-card">
          <div className="register-page-brand-badge">
            <span className="register-page-brand-badge-icon">
              <GraduationCapIcon width={20} height={20} />
            </span>
            <span className="register-page-brand-badge-text">UNZA Maintenance</span>
          </div>

          <h2 className="register-page-brand-title">Join the Maintenance Portal</h2>
          <p className="register-page-brand-tagline">
            Report hostel maintenance issues in minutes and track them through to resolution.
          </p>
        </div>
      </aside>

      <div className="register-page-form-panel">
        <div className="register-page-form-card">
          <h1 className="register-page-title">Create Student Account</h1>
          <p className="register-page-subtitle">
            Student registration only — staff accounts are provisioned by an administrator.
          </p>

          <form className="register-page-form" onSubmit={handleSubmit} noValidate>
            <label className="register-page-label" htmlFor="register-name">
              Full Name
            </label>
            <input
              id="register-name"
              type="text"
              className="register-page-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />

            <label className="register-page-label" htmlFor="register-id-number">
              Student or Staff ID
            </label>
            <div className="register-page-input-field">
              <IdCardIcon className="register-page-input-icon" />
              <input
                id="register-id-number"
                type="text"
                className="register-page-input"
                placeholder="e.g. 2023001234"
                value={idNumber}
                onChange={(event) => setIdNumber(event.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <label className="register-page-label" htmlFor="register-email">
              Email Address
            </label>
            <input
              id="register-email"
              type="email"
              className="register-page-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />

            <label className="register-page-label" htmlFor="register-password">
              Password
            </label>
            <div className="register-page-input-field">
              <LockIcon className="register-page-input-icon" />
              <input
                id="register-password"
                type="password"
                className="register-page-input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <label className="register-page-label" htmlFor="register-confirm-password">
              Confirm Password
            </label>
            <div className="register-page-input-field">
              <LockIcon className="register-page-input-icon" />
              <input
                id="register-confirm-password"
                type="password"
                className="register-page-input"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            {error && (
              <p className="register-page-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="register-page-submit" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Sign Up'}
              {!submitting && <ArrowRightIcon />}
            </button>
          </form>

          <p className="register-page-signin">
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
