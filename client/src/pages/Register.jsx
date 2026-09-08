import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Icon from '../components/common/Icon';
import { Spinner } from '../components/common/Loader';
import { InlineError } from '../components/common/States';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

/** Mirrors the server-side password policy so failures are caught early. */
function passwordIssues(password) {
  const issues = [];
  if (password.length < 8) issues.push('at least 8 characters');
  if (!/[a-z]/.test(password)) issues.push('a lowercase letter');
  if (!/[A-Z]/.test(password)) issues.push('an uppercase letter');
  if (!/[0-9]/.test(password)) issues.push('a number');
  return issues;
}

export default function Register() {
  useDocumentTitle('Create an account');

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const { register, isAuthenticated, initialising } = useAuth();
  const navigate = useNavigate();

  if (!initialising && isAuthenticated) return <Navigate to="/" replace />;

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const issues = passwordIssues(form.password);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (form.password !== form.confirm) {
      setError('The two passwords do not match.');
      return;
    }
    if (issues.length) {
      setError(`Your password needs ${issues.join(', ')}.`);
      return;
    }

    setSubmitting(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password });
      navigate('/', { replace: true });
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
          <h1 className="text-headline-md font-bold">Create your account</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Free, and it takes about twenty seconds.
          </p>
        </div>

        <form onSubmit={onSubmit} className="card space-y-4 p-6" noValidate>
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input
              id="name" name="name" type="text" autoComplete="name" required
              value={form.name} onChange={onChange} className="input" placeholder="Jane Doe"
            />
          </div>

          <div>
            <label className="label" htmlFor="email">Email address</label>
            <input
              id="email" name="email" type="email" autoComplete="email" required
              value={form.email} onChange={onChange} className="input" placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password" name="password" type="password" autoComplete="new-password" required
              value={form.password} onChange={onChange} className="input" placeholder="••••••••"
              aria-describedby="password-hint"
            />
            <p id="password-hint" className="mt-1.5 text-xs text-on-surface-variant">
              {form.password && issues.length
                ? `Still needs ${issues.join(', ')}.`
                : 'Minimum 8 characters, with upper and lower case letters and a number.'}
            </p>
          </div>

          <div>
            <label className="label" htmlFor="confirm">Confirm password</label>
            <input
              id="confirm" name="confirm" type="password" autoComplete="new-password" required
              value={form.confirm} onChange={onChange} className="input" placeholder="••••••••"
            />
          </div>

          <InlineError message={error} />

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? <Spinner size={18} /> : <Icon name="person_add" size={18} />}
            {submitting ? 'Creating your account…' : 'Create account'}
          </button>

          <p className="pt-2 text-center text-sm text-on-surface-variant">
            Already registered?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
