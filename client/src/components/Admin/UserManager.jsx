import { useCallback, useState } from 'react';
import Icon from '../common/Icon';
import { ConfirmDialog } from '../common/Modal';
import { ListSkeleton } from '../common/Loader';
import { EmptyState, ErrorState } from '../common/States';
import { useToast } from '../common/Toast';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../hooks/useAuth';
import { usersApi } from '../../utils/api';
import { formatDate, classNames } from '../../utils/format';

export default function UserManager() {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const fetcher = useCallback(() => usersApi.list({ limit: 100 }), []);
  const users = useFetch(fetcher);

  const changeTier = async (user, tier) => {
    setBusyId(user.id);
    try {
      await usersApi.setTier(user.id, tier);
      toast.success(
        `${user.name} is now ${tier === 'premium' ? 'a premium member' : 'a standard listener'}`
      );
      users.refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = async (user, role) => {
    setBusyId(user.id);
    try {
      await usersApi.setRole(user.id, role);
      toast.success(`${user.name} is now ${role === 'admin' ? 'an administrator' : 'a standard user'}`);
      users.refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (user) => {
    setBusyId(user.id);
    try {
      await usersApi.setStatus(user.id, !user.isActive);
      toast.success(user.isActive ? 'Account disabled' : 'Account enabled');
      users.refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await usersApi.remove(pendingDelete.id);
      toast.success('User deleted');
      setPendingDelete(null);
      users.refetch();
    } catch (err) {
      toast.error(err.message);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const items = users.data?.items || [];

  return (
    <section className="space-y-5">
      <h2 className="text-headline-md font-bold">Users</h2>

      {users.loading ? (
        <div className="card p-5"><ListSkeleton rows={5} /></div>
      ) : users.error ? (
        <ErrorState message={users.error} onRetry={users.refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon="group" title="No users" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Membership</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((user) => {
                const isSelf = user.id === currentUser?.id;
                return (
                  <tr key={user.id} className={classNames(busyId === user.id && 'opacity-60')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-xs font-semibold text-primary">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-on-surface">
                            {user.name}
                            {isSelf && <span className="ml-2 text-xs text-on-surface-variant">(you)</span>}
                          </span>
                          <span className="block truncate text-xs text-on-surface-variant">{user.email}</span>
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        disabled={isSelf || busyId === user.id}
                        onChange={(event) => changeRole(user, event.target.value)}
                        className="input !w-auto !py-1.5 !text-xs disabled:opacity-50"
                        aria-label={`Role for ${user.name}`}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>

                    {/*
                      Membership is separate from role on purpose: role decides
                      who may edit the site, membership decides who may play an
                      episode marked for members. There is no payment system
                      behind it yet, so it is set by hand here.
                    */}
                    <td className="px-4 py-3">
                      <select
                        value={user.tier || 'normal'}
                        disabled={busyId === user.id}
                        onChange={(event) => changeTier(user, event.target.value)}
                        className="input !w-auto !py-1.5 !text-xs disabled:opacity-50"
                        aria-label={`Membership for ${user.name}`}
                      >
                        <option value="normal">Normal</option>
                        <option value="premium">Premium</option>
                      </select>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={classNames(
                          'badge',
                          user.isActive ? 'bg-success/15 text-success' : 'bg-error-container/20 text-error'
                        )}
                      >
                        {user.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs text-on-surface-variant">{formatDate(user.createdAt)}</td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => toggleActive(user)}
                          disabled={isSelf || busyId === user.id}
                          className="btn-icon"
                          title={user.isActive ? 'Disable account' : 'Enable account'}
                          aria-label={user.isActive ? 'Disable account' : 'Enable account'}
                        >
                          <Icon name={user.isActive ? 'block' : 'check_circle'} size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(user)}
                          disabled={isSelf || busyId === user.id}
                          className="btn-icon hover:text-error"
                          aria-label={`Delete ${user.name}`}
                        >
                          <Icon name="delete" size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
        onConfirm={onDelete}
        busy={deleting}
        title="Delete this user?"
        message={`${pendingDelete?.name} will be permanently removed. Users who have authored articles cannot be deleted — disable the account instead.`}
      />
    </section>
  );
}
