export type Role = 'SUPER_ADMIN' | 'HR_MANAGER' | 'EMPLOYEE';
export type Status = 'ACTIVE' | 'INACTIVE';

export interface ManagerRef {
  _id: string;
  name: string;
  employeeId: string;
  designation: string;
}

export interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  salary: number;
  joiningDate: string;
  status: Status;
  role: Role;
  reportingManager: ManagerRef | null;
  profileImage: string;
  createdAt: string;
}

export interface TreeNode extends Omit<Employee, 'reportingManager'> {
  reportingManager: string | null;
  directReports: TreeNode[];
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  departmentCount: number;
  byDepartment: { department: string; count: number }[];
  byRole: { role: Role; count: number }[];
  recentJoiners: Pick<Employee, '_id' | 'name' | 'designation' | 'department' | 'joiningDate' | 'profileImage'>[];
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  HR_MANAGER: 'HR Manager',
  EMPLOYEE: 'Employee',
};
