import { FormEvent, useState } from 'react';
import api, { errorMessage } from '../api/client';
import { Employee, Role, ROLE_LABELS } from '../types';
import { useAuth } from '../context/AuthContext';
import { Alert, btnPrimary, btnSecondary, inputClass } from './ui';

interface Props {
  employee: Employee | null; // null → create mode
  managers: Employee[]; // options for reporting manager
  onSaved: () => void;
  onCancel: () => void;
}

interface FieldErrors {
  [field: string]: string;
}

export default function EmployeeForm({ employee, managers, onSaved, onCancel }: Props) {
  const { user } = useAuth();
  const isEdit = !!employee;

  const [form, setForm] = useState({
    employeeId: employee?.employeeId ?? '',
    name: employee?.name ?? '',
    email: employee?.email ?? '',
    password: '',
    phone: employee?.phone ?? '',
    department: employee?.department ?? '',
    designation: employee?.designation ?? '',
    salary: employee?.salary?.toString() ?? '',
    joiningDate: employee?.joiningDate?.slice(0, 10) ?? '',
    status: employee?.status ?? 'ACTIVE',
    role: employee?.role ?? 'EMPLOYEE',
    reportingManager: employee?.reportingManager?._id ?? '',
    profileImage: employee?.profileImage ?? '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  // Frontend validation mirroring the backend rules
  const validate = (): FieldErrors => {
    const errs: FieldErrors = {};
    if (!/^[A-Za-z0-9-]+$/.test(form.employeeId)) errs.employeeId = 'Letters, numbers and hyphens only.';
    if (form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters.';
    if (!/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(form.email)) errs.email = 'Enter a valid email.';
    if (!isEdit && form.password.length < 6) errs.password = 'Minimum 6 characters.';
    if (isEdit && form.password && form.password.length < 6) errs.password = 'Minimum 6 characters.';
    if (!/^\+?[0-9]{10,15}$/.test(form.phone)) errs.phone = 'Phone must be 10-15 digits.';
    if (!form.department.trim()) errs.department = 'Department is required.';
    if (!form.designation.trim()) errs.designation = 'Designation is required.';
    if (form.salary === '' || Number(form.salary) < 0 || Number.isNaN(Number(form.salary))) errs.salary = 'Salary must be a non-negative number.';
    if (!form.joiningDate) errs.joiningDate = 'Joining date is required.';
    return errs;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    setApiError('');
    try {
      const payload: Record<string, unknown> = {
        ...form,
        salary: Number(form.salary),
        reportingManager: form.reportingManager || null,
      };
      if (!payload.password) delete payload.password;

      if (isEdit) {
        await api.put(`/employees/${employee!._id}`, payload);
      } else {
        await api.post('/employees', payload);
      }
      onSaved();
    } catch (err) {
      setApiError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const field = (
    label: string,
    name: keyof typeof form,
    type = 'text',
    extra: Record<string, unknown> = {}
  ) => (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <input type={type} className={inputClass} value={form[name]} onChange={set(name)} {...extra} />
      {errors[name] && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors[name]}</p>}
    </div>
  );

  // HR cannot hand out SUPER_ADMIN
  const roleOptions: Role[] =
    user?.role === 'SUPER_ADMIN' ? ['EMPLOYEE', 'HR_MANAGER', 'SUPER_ADMIN'] : ['EMPLOYEE', 'HR_MANAGER'];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {apiError && <Alert kind="error">{apiError}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        {field('Employee ID', 'employeeId', 'text', { placeholder: 'EMP-019', disabled: isEdit })}
        {field('Full Name', 'name', 'text', { placeholder: 'Jane Doe' })}
        {field('Email', 'email', 'email', { placeholder: 'jane@ems.com' })}
        {field(isEdit ? 'New Password (leave blank to keep)' : 'Password', 'password', 'password')}
        {field('Phone', 'phone', 'tel', { placeholder: '9876543210' })}
        {field('Department', 'department', 'text', { placeholder: 'Engineering' })}
        {field('Designation', 'designation', 'text', { placeholder: 'Developer' })}
        {field('Salary', 'salary', 'number', { min: 0, step: '0.01' })}
        {field('Joining Date', 'joiningDate', 'date')}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
          <select className={inputClass} value={form.status} onChange={set('status')}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
          <select className={inputClass} value={form.role} onChange={set('role')}>
            {roleOptions.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Reporting Manager</label>
          <select className={inputClass} value={form.reportingManager} onChange={set('reportingManager')}>
            <option value="">— None —</option>
            {managers
              .filter((m) => m._id !== employee?._id)
              .map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name} ({m.employeeId})
                </option>
              ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          {field('Profile Image URL (optional)', 'profileImage', 'url', { placeholder: 'https://…' })}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button type="button" className={btnSecondary} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={btnPrimary} disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Employee'}
        </button>
      </div>
    </form>
  );
}
