import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { LayoutDashboard, Users, Network, CircleUserRound, Menu, Sun, Moon, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ROLE_LABELS } from '../types';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-indigo-600 text-white'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
  }`;

export default function Layout() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdminOrHr = user?.role === 'SUPER_ADMIN' || user?.role === 'HR_MANAGER';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const nav = (
    <nav className="flex flex-col gap-1 p-4">
      {isAdminOrHr && (
        <>
          <NavLink to="/" end className={linkClass} onClick={() => setSidebarOpen(false)}>
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>
          <NavLink to="/employees" className={linkClass} onClick={() => setSidebarOpen(false)}>
            <Users size={18} /> Employees
          </NavLink>
        </>
      )}
      <NavLink to="/organization" className={linkClass} onClick={() => setSidebarOpen(false)}>
        <Network size={18} /> Org Chart
      </NavLink>
      <NavLink to="/profile" className={linkClass} onClick={() => setSidebarOpen(false)}>
        <CircleUserRound size={18} /> My Profile
      </NavLink>
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Topbar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <button
            className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <Menu size={20} />
          </button>
          <span className="text-lg font-bold tracking-tight">
            <span className="text-indigo-600 dark:text-indigo-400">EMS</span> · Employee Management
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            title="Toggle dark mode"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="hidden text-right sm:block">
            <div className="text-sm font-semibold">{user?.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{user && ROLE_LABELS[user.role]}</div>
          </div>
          {user?.profileImage && (
            <img src={user.profileImage} alt="" className="h-9 w-9 rounded-full border border-slate-200 dark:border-slate-700" />
          )}
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 top-14 z-20 w-56 transform border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 md:static md:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {nav}
        </aside>

        <main className="min-h-[calc(100vh-3.5rem)] flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
