import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import api, { errorMessage } from '../api/client';
import { DashboardStats, ROLE_LABELS, Role } from '../types';
import { Card, Spinner, Alert, Avatar } from '../components/ui';
import { useTheme } from '../context/ThemeContext';

// Palette validated with the dataviz six-checks validator for each mode
const SERIES = {
  light: { primary: '#6366f1', roles: ['#6366f1', '#0ea5e9', '#f59e0b'] },
  dark: { primary: '#6366f1', roles: ['#6366f1', '#0284c7', '#d97706'] },
};

function StatTile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <Card>
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1 text-3xl font-bold tabular-nums ${accent}`}>{value}</div>
    </Card>
  );
}

export default function Dashboard() {
  const { dark } = useTheme();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/dashboard/stats')
      .then((res) => setStats(res.data.data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <Alert kind="error">{error}</Alert>;
  if (!stats) return <Spinner />;

  const colors = dark ? SERIES.dark : SERIES.light;
  const gridStroke = dark ? '#334155' : '#e2e8f0';
  const tickFill = dark ? '#94a3b8' : '#64748b';
  const tooltipStyle = {
    backgroundColor: dark ? '#0f172a' : '#ffffff',
    border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
    borderRadius: 8,
    fontSize: 13,
    color: dark ? '#e2e8f0' : '#0f172a',
  };

  const roleData = stats.byRole.map((r) => ({ ...r, label: ROLE_LABELS[r.role as Role] ?? r.role }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Dashboard</h1>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Total Employees" value={stats.totalEmployees} accent="text-slate-900 dark:text-white" />
        <StatTile label="Active Employees" value={stats.activeEmployees} accent="text-emerald-600 dark:text-emerald-400" />
        <StatTile label="Inactive Employees" value={stats.inactiveEmployees} accent="text-amber-600 dark:text-amber-400" />
        <StatTile label="Departments" value={stats.departmentCount} accent="text-indigo-600 dark:text-indigo-400" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Employees by department */}
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Employees by Department</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.byDepartment} layout="vertical" margin={{ left: 8, right: 32 }}>
              <CartesianGrid horizontal={false} stroke={gridStroke} strokeDasharray="2 4" />
              <XAxis type="number" allowDecimals={false} tick={{ fill: tickFill, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="department"
                width={110}
                tick={{ fill: tickFill, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip cursor={{ fill: dark ? '#1e293b' : '#f1f5f9' }} contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Employees" fill={colors.primary} radius={[0, 4, 4, 0]} barSize={18}>
                <LabelList dataKey="count" position="right" style={{ fill: tickFill, fontSize: 12 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Role distribution */}
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Role Distribution</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={roleData} margin={{ top: 16 }}>
              <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="2 4" />
              <XAxis dataKey="label" tick={{ fill: tickFill, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: tickFill, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: dark ? '#1e293b' : '#f1f5f9' }} contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Employees" radius={[4, 4, 0, 0]} barSize={48}>
                {roleData.map((entry, i) => (
                  <Cell key={entry.role} fill={colors.roles[i % colors.roles.length]} />
                ))}
                <LabelList dataKey="count" position="top" style={{ fill: tickFill, fontSize: 12 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent joiners */}
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Recent Joiners</h2>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {stats.recentJoiners.map((e) => (
            <li key={e._id} className="flex items-center gap-3 py-2.5">
              <Avatar src={e.profileImage} name={e.name} size={9} />
              <div className="flex-1">
                <div className="text-sm font-medium">{e.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {e.designation} · {e.department}
                </div>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {new Date(e.joiningDate).toLocaleDateString()}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
