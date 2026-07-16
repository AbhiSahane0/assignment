import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/client';
import { Alert, btnPrimary, inputClass } from '../components/ui';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={user.role === 'EMPLOYEE' ? '/profile' : '/'} replace />;

  const validate = () => {
    if (!/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(email)) return 'Enter a valid email address.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    return '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) return setError(v);

    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            <span className="text-indigo-600 dark:text-indigo-400">EMS</span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Employee Management System</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          {error && <Alert kind="error">{error}</Alert>}

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              className={inputClass}
              placeholder="admin@ems.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              className={inputClass}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" disabled={loading} className={`${btnPrimary} w-full`}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <div className="mb-1 font-semibold">Demo accounts</div>
            <div>Super Admin — admin@ems.com / Admin@123</div>
            <div>HR Manager — hr@ems.com / Hr@12345</div>
            <div>Employee — arjun.rao@ems.com / Emp@1234</div>
          </div>
        </form>
      </div>
    </div>
  );
}
