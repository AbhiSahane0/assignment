import { FormEvent, useEffect, useState } from 'react';
import api, { errorMessage } from '../api/client';
import { Employee, ROLE_LABELS } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Alert, Avatar, btnPrimary, Card, inputClass, RoleBadge, Spinner, StatusBadge } from '../components/ui';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState<Employee | null>(null);
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => {
        setProfile(res.data.user);
        setPhone(res.data.user.phone);
        setProfileImage(res.data.user.profileImage || '');
      })
      .catch((err) => setError(errorMessage(err)));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!/^\+?[0-9]{10,15}$/.test(phone)) return setError('Phone must be 10-15 digits.');
    if (password && password.length < 6) return setError('Password must be at least 6 characters.');

    setSaving(true);
    try {
      const payload: Record<string, string> = { phone, profileImage };
      if (password) payload.password = password;
      const res = await api.put(`/employees/${user!._id}`, payload);
      setProfile(res.data.data);
      updateUser({ ...user!, phone, profileImage });
      setPassword('');
      toast.success('Profile updated.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return error ? <Alert kind="error">{error}</Alert> : <Spinner />;

  const readonlyRow = (label: string, value: string) => (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">My Profile</h1>

      <Card>
        <div className="flex items-center gap-4">
          <Avatar src={profile.profileImage} name={profile.name} size={14} />
          <div>
            <div className="text-lg font-semibold">{profile.name}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {profile.designation} · {profile.department}
            </div>
            <div className="mt-1 flex gap-2">
              <RoleBadge role={profile.role} />
              <StatusBadge status={profile.status} />
            </div>
          </div>
        </div>

        <div className="mt-4 divide-y divide-slate-100 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {readonlyRow('Employee ID', profile.employeeId)}
          {readonlyRow('Email', profile.email)}
          {readonlyRow('Joining Date', new Date(profile.joiningDate).toLocaleDateString())}
          {readonlyRow('Reporting Manager', profile.reportingManager?.name ?? '—')}
          {profile.role !== 'EMPLOYEE' && readonlyRow('Salary', `₹ ${profile.salary.toLocaleString()}`)}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Edit my details {user?.role === 'EMPLOYEE' && <span className="font-normal text-slate-400">(employees can change phone, photo & password)</span>}
        </h2>

        {error && <div className="mb-3"><Alert kind="error">{error}</Alert></div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Profile Image URL</label>
            <input className={inputClass} value={profileImage} onChange={(e) => setProfileImage(e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">New Password (optional)</label>
            <input type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep current" />
          </div>
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </Card>
    </div>
  );
}
