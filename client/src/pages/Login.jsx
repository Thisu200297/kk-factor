import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/common/Icon';
import { Spinner } from '../components/common/Loader';
import { InlineError } from '../components/common/States';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function Login() {
  useDocumentTitle('Sign in');

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const { login, isAuthenticated, initialising } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Send the user back where the guard interrupted them.
  const redirectTo = location.state?.from?.pathname || '/';

  if (!initialising && isAuthenticated) return <Navigate to={redirectTo} replace />;

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(form);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="equaliser mx-auto mb-4 justify-center text-primary" aria-hidden="true">
            <span /><span /><span /><span />
          </span>
          <h1 className="text-headline-md font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Sign in to manage the newsroom and media library.
          </p>
        </div>

        <form onSubmit={onSubmit} className="card space-y-4 p-6" noValidate>
          <div>
            <label className="label" htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={onChange}
              className="input"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={form.password}
                onChange={onChange}
                className="input pr-11"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-1 top-1/2 -translate-y-1/2 btn-icon !h-9 !w-9"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
              </button>
            </div>
          </div>

          <InlineError message={error} />

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? <Spinner size={18} /> : <Icon name="login" size={18} />}
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="pt-2 text-center text-sm text-on-surface-variant">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
