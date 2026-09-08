import { useState } from 'react';
import Icon from '../components/common/Icon';
import { Spinner } from '../components/common/Loader';
import { InlineError } from '../components/common/States';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { authApi, setAccessToken } from '../utils/api';

/**
 * Your account, which for now means one thing: changing your own password.
 *
 * There was no way to do this at all. The admin credentials were printed in a
 * document that gets forwarded, and the only way to change them was to edit a
 * file on the server and re-seed — so in practice nobody ever would.
 */

/** Mirrors the server-side policy, so a failure is caught before the round trip. */
function passwordIssues(password) {
  const issues = [];
  if (password.length < 8) issues.push('at least 8 characters');
  if (!/[a-z]/.test(password)) issues.push('a lowercase letter');
  if (!/[A-Z]/.test(password)) issues.push('an uppercase letter');
  if (!/[0-9]/.test(password)) issues.push('a number');
  return issues;
}

export default function Account() {
  useDocumentTitle('Your account');

  const { user } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const issues = passwordIssues(form.next);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!form.current) {
      setError('Enter your current password.');
      return;
    }
    if (issues.length) {
      setError(`Your new password needs ${issues.join(', ')}.`);
      return;
    }
    if (form.next !== form.confirm) {
      setError('The two new passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const result = await authApi.changePassword({
        currentPassword: form.current,
        newPassword: form.next,
      });
      // The server rotated the token version, so this tab needs the new token.
      if (result.accessToken) setAccessToken(result.accessToken);

      setForm({ current: '', next: '', confirm: '' });
      toast.success('Password changed. Any other devices have been signed out.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-page flex justify-center py-10 md:py-14">
      <div className="w-full max-w-md">
        <header className="mb-7">
          <h1 className="text-headline-lg">Your account</h1>
          <p className="mt-2 text-sm text-fg-muted">
            {user?.name} · {user?.email}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="badge bg-surface-3 text-fg-muted capitalize">{user?.role}</span>
            {user?.tier === 'premium' && (
              <span className="badge bg-primary-soft text-primary">Premium member</span>
            )}
          </div>
        </header>

        <form onSubmit={onSubmit} className="card space-y-4 p-6" noValidate>
          <h2 className="text-headline-sm">Change your password</h2>

          <div>
            <label className="label" htmlFor="current">Current password</label>
            <input
              id="current"
              name="current"
              type="password"
              autoComplete="current-password"
              value={form.current}
              onChange={onChange}
              className="input"
            />
          </div>

          <div>
            <label className="label" htmlFor="next">New password</label>
            <div className="relative">
              <input
                id="next"
                name="next"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.next}
                onChange={onChange}
                className="input pr-11"
                aria-describedby="password-hint"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="btn-icon absolute right-1 top-1/2 !h-9 !w-9 -translate-y-1/2"
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                <Icon name={show ? 'visibility_off' : 'visibility'} size={18} />
              </button>
            </div>
            <p id="password-hint" className="mt-1.5 text-xs text-fg-muted">
              {form.next && issues.length
                ? `Still needs ${issues.join(', ')}.`
                : 'At least 8 characters, with upper and lower case letters and a number.'}
            </p>
          </div>

          <div>
            <label className="label" htmlFor="confirm">Confirm new password</label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={onChange}
              className="input"
            />
          </div>

          <InlineError message={error} />

          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? <Spinner size={18} /> : <Icon name="password" size={18} />}
            {saving ? 'Changing…' : 'Change password'}
          </button>

          <p className="pt-1 text-xs text-fg-muted">
            You will stay signed in here. Every other device will be signed out.
          </p>
        </form>
      </div>
    </div>
  );
}
