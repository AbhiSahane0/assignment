import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import api, { errorMessage } from '../api/client';
import { Employee, Pagination, ROLE_LABELS } from '../types';
import { useAuth } from '../context/AuthContext';
import EmployeeForm from '../components/EmployeeForm';
import { Alert, Avatar, btnPrimary, btnSecondary, Card, inputClass, Modal, RoleBadge, Spinner, StatusBadge } from '../components/ui';

const filterSelectClass = inputClass.replace('w-full', 'w-auto');

export default function Employees() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [rows, setRows] = useState<Employee[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // query state
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'joiningDate'>('joiningDate');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<Employee | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Employee | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>();

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/employees', {
        params: {
          search: search || undefined,
          department: department || undefined,
          role: role || undefined,
          status: status || undefined,
          sortBy,
          order,
          page,
          limit: 8,
        },
      });
      setRows(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, department, role, status, sortBy, order, page]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const refreshMeta = useCallback(() => {
    api.get('/employees/meta/departments').then((res) => setDepartments(res.data.data)).catch(() => {});
    api.get('/employees', { params: { limit: 100, status: 'ACTIVE' } })
      .then((res) => setManagers(res.data.data))
      .catch(() => {});
  }, []);

  useEffect(refreshMeta, [refreshMeta]);

  const onSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setPage(1);
      setSearch(value);
    }, 300);
  };

  const toggleSort = (field: 'name' | 'joiningDate') => {
    if (sortBy === field) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setOrder('asc');
    }
  };

  const sortIndicator = (field: string) => (sortBy === field ? (order === 'asc' ? ' ↑' : ' ↓') : '');

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/employees/${confirmDelete._id}`);
      setNotice(`${confirmDelete.name} was deleted.`);
      setConfirmDelete(null);
      fetchRows();
      refreshMeta();
    } catch (err) {
      setError(errorMessage(err));
      setConfirmDelete(null);
    }
  };

  const handleCsvImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = new FormData();
    data.append('file', file);
    try {
      const res = await api.post('/employees/import', data);
      const { imported, failed } = res.data;
      setNotice(`CSV import: ${imported} added${failed.length ? `, ${failed.length} failed (${failed[0].reason}…)` : ''}.`);
      fetchRows();
      refreshMeta();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Employees</h1>
        <div className="flex gap-2">
          <input ref={fileInput} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
          <button className={btnSecondary} onClick={() => fileInput.current?.click()}>
            ⬆ Import CSV
          </button>
          <button className={btnPrimary} onClick={() => { setEditing(null); setShowForm(true); }}>
            + Add Employee
          </button>
        </div>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      {/* Search + filters */}
      <Card className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search by name or email…"
          className={`${inputClass} max-w-xs`}
          onChange={onSearchChange}
          aria-label="Search employees"
        />
        <select className={filterSelectClass} value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }}>
          <option value="">All departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className={filterSelectClass} value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">All roles</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select className={filterSelectClass} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </Card>

      {/* Table */}
      <Card className="overflow-x-auto p-0">
        {loading ? (
          <Spinner />
        ) : (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="cursor-pointer px-4 py-3 hover:text-slate-900 dark:hover:text-white" onClick={() => toggleSort('name')}>
                  Employee{sortIndicator('name')}
                </th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Role</th>
                <th className="cursor-pointer px-4 py-3 hover:text-slate-900 dark:hover:text-white" onClick={() => toggleSort('joiningDate')}>
                  Joined{sortIndicator('joiningDate')}
                </th>
                <th className="px-4 py-3">Manager</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((emp) => (
                <tr key={emp._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={emp.profileImage} name={emp.name} size={9} />
                      <div>
                        <div className="font-medium">{emp.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {emp.employeeId} · {emp.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{emp.department}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{emp.designation}</div>
                  </td>
                  <td className="px-4 py-3"><RoleBadge role={emp.role} /></td>
                  <td className="px-4 py-3">{new Date(emp.joiningDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{emp.reportingManager?.name ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={emp.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950"
                      onClick={() => { setEditing(emp); setShowForm(true); }}
                    >
                      Edit
                    </button>
                    {isSuperAdmin && (
                      <button
                        className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                        onClick={() => setConfirmDelete(emp)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                    No employees match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} employees
          </span>
          <div className="flex gap-2">
            <button className={btnSecondary} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ← Prev
            </button>
            <button
              className={btnSecondary}
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Create / edit modal */}
      {showForm && (
        <Modal title={editing ? `Edit ${editing.name}` : 'Add Employee'} onClose={() => setShowForm(false)}>
          <EmployeeForm
            employee={editing}
            managers={managers}
            onCancel={() => setShowForm(false)}
            onSaved={() => {
              setShowForm(false);
              setNotice(editing ? 'Employee updated.' : 'Employee created.');
              fetchRows();
              refreshMeta();
            }}
          />
        </Modal>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <Modal title="Delete employee" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Delete <strong>{confirmDelete.name}</strong> ({confirmDelete.employeeId})? This is a soft delete — the
            record is kept in the database but hidden from the app. Their direct reports will be reassigned to{' '}
            {confirmDelete.reportingManager?.name ?? 'no manager'}.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button className={btnSecondary} onClick={() => setConfirmDelete(null)}>Cancel</button>
            <button
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              onClick={handleDelete}
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
