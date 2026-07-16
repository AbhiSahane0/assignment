const { parse } = require('csv-parse/sync');
const Employee = require('../models/Employee');
const { ApiError } = require('../middleware/errorHandler');
const { wouldCreateCycle } = require('../utils/hierarchy');

// Fields an EMPLOYEE may edit on their own profile
const SELF_EDITABLE_FIELDS = ['phone', 'profileImage', 'password'];

/**
 * GET /api/employees
 * Search (name/email), filter (department/role/status), sort
 * (name/joiningDate), pagination.
 */
const listEmployees = async (req, res, next) => {
  try {
    const {
      search,
      department,
      role,
      status,
      sortBy = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 10,
    } = req.query;

    const filter = { isDeleted: false };
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: rx }, { email: rx }];
    }
    if (department) filter.department = department;
    if (role) filter.role = role;
    if (status) filter.status = status;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const [items, total] = await Promise.all([
      Employee.find(filter)
        .populate('reportingManager', 'name employeeId designation')
        .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Employee.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/employees/:id
const getEmployee = async (req, res, next) => {
  try {
    // Employees may only view their own record
    if (req.user.role === 'EMPLOYEE' && String(req.user._id) !== req.params.id) {
      throw new ApiError(403, 'You can only view your own profile.');
    }
    const employee = await Employee.findOne({ _id: req.params.id, isDeleted: false })
      .populate('reportingManager', 'name employeeId designation');
    if (!employee) throw new ApiError(404, 'Employee not found.');
    res.json({ success: true, data: employee });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/employees  (SUPER_ADMIN, HR_MANAGER)
 * HR cannot create SUPER_ADMIN accounts.
 */
const createEmployee = async (req, res, next) => {
  try {
    const payload = { ...req.body };

    if (req.user.role === 'HR_MANAGER' && payload.role === 'SUPER_ADMIN') {
      throw new ApiError(403, 'HR Managers cannot assign the Super Admin role.');
    }
    if (payload.reportingManager) {
      const manager = await Employee.findOne({ _id: payload.reportingManager, isDeleted: false });
      if (!manager) throw new ApiError(400, 'Reporting manager not found.');
    }

    const employee = await Employee.create(payload);
    res.status(201).json({ success: true, data: employee.toJSON() });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/employees/:id
 * - SUPER_ADMIN: any field on anyone
 * - HR_MANAGER: any field except promoting anyone to SUPER_ADMIN or
 *   editing an existing SUPER_ADMIN
 * - EMPLOYEE: only own record, only SELF_EDITABLE_FIELDS
 */
const updateEmployee = async (req, res, next) => {
  try {
    const target = await Employee.findOne({ _id: req.params.id, isDeleted: false }).select('+password');
    if (!target) throw new ApiError(404, 'Employee not found.');

    let updates = { ...req.body };

    if (req.user.role === 'EMPLOYEE') {
      if (String(req.user._id) !== req.params.id) {
        throw new ApiError(403, 'You can only edit your own profile.');
      }
      const attempted = Object.keys(updates);
      const blocked = attempted.filter((f) => !SELF_EDITABLE_FIELDS.includes(f));
      if (blocked.length) {
        throw new ApiError(403, `You may only update: ${SELF_EDITABLE_FIELDS.join(', ')}. Not allowed: ${blocked.join(', ')}.`);
      }
    }

    if (req.user.role === 'HR_MANAGER') {
      if (target.role === 'SUPER_ADMIN') {
        throw new ApiError(403, 'HR Managers cannot modify a Super Admin.');
      }
      if (updates.role === 'SUPER_ADMIN') {
        throw new ApiError(403, 'HR Managers cannot assign the Super Admin role.');
      }
    }

    if (updates.reportingManager) {
      const manager = await Employee.findOne({ _id: updates.reportingManager, isDeleted: false });
      if (!manager) throw new ApiError(400, 'Reporting manager not found.');
      if (await wouldCreateCycle(target._id, updates.reportingManager)) {
        throw new ApiError(400, 'This assignment would create a circular reporting chain.');
      }
    }

    Object.assign(target, updates);
    await target.save(); // save() so the password pre-hook & validators run
    res.json({ success: true, data: target.toJSON() });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/employees/:id  (SUPER_ADMIN only — enforced in routes)
 * Soft delete; direct reports are detached from the deleted manager.
 */
const deleteEmployee = async (req, res, next) => {
  try {
    if (String(req.user._id) === req.params.id) {
      throw new ApiError(400, 'You cannot delete your own account.');
    }
    const employee = await Employee.findOne({ _id: req.params.id, isDeleted: false });
    if (!employee) throw new ApiError(404, 'Employee not found.');

    employee.isDeleted = true;
    employee.deletedAt = new Date();
    employee.status = 'INACTIVE';
    await employee.save();

    // Reports of the deleted employee move up to the deleted employee's manager
    await Employee.updateMany(
      { reportingManager: employee._id, isDeleted: false },
      { reportingManager: employee.reportingManager || null }
    );

    res.json({ success: true, message: 'Employee deleted (soft delete).' });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/employees/:id/manager  (SUPER_ADMIN, HR_MANAGER)
 * Body: { managerId: string | null }
 */
const assignManager = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, isDeleted: false });
    if (!employee) throw new ApiError(404, 'Employee not found.');

    const { managerId } = req.body;

    if (managerId) {
      const manager = await Employee.findOne({ _id: managerId, isDeleted: false });
      if (!manager) throw new ApiError(400, 'Reporting manager not found.');
      if (await wouldCreateCycle(employee._id, managerId)) {
        throw new ApiError(400, 'This assignment would create a circular reporting chain.');
      }
    }

    employee.reportingManager = managerId || null;
    await employee.save();
    const populated = await employee.populate('reportingManager', 'name employeeId designation');
    res.json({ success: true, data: populated.toJSON() });
  } catch (err) {
    next(err);
  }
};

// GET /api/employees/:id/reportees — direct reports of an employee
const getReportees = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, isDeleted: false });
    if (!employee) throw new ApiError(404, 'Employee not found.');

    const reportees = await Employee.find({ reportingManager: employee._id, isDeleted: false })
      .select('employeeId name email designation department status profileImage')
      .sort({ name: 1 });

    res.json({ success: true, data: reportees });
  } catch (err) {
    next(err);
  }
};

// GET /api/employees/meta/departments — distinct department names (for filters)
const getDepartments = async (req, res, next) => {
  try {
    const departments = await Employee.distinct('department', { isDeleted: false });
    res.json({ success: true, data: departments.sort() });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/employees/import  (SUPER_ADMIN, HR_MANAGER) — CSV import (bonus)
 * Expects multipart/form-data with a `file` field. Columns:
 * employeeId,name,email,password,phone,department,designation,salary,joiningDate[,status][,role]
 */
const importCsv = async (req, res, next) => {
  try {
    if (!req.file) throw new ApiError(400, 'Upload a CSV file in the "file" field.');

    const records = parse(req.file.buffer.toString('utf-8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const results = { imported: 0, failed: [] };
    for (const [index, row] of records.entries()) {
      try {
        if (req.user.role === 'HR_MANAGER' && row.role === 'SUPER_ADMIN') {
          throw new Error('HR cannot import Super Admin accounts');
        }
        await Employee.create({
          employeeId: row.employeeId,
          name: row.name,
          email: row.email,
          password: row.password || 'Welcome@123',
          phone: row.phone,
          department: row.department,
          designation: row.designation,
          salary: Number(row.salary),
          joiningDate: row.joiningDate,
          status: row.status || 'ACTIVE',
          role: row.role || 'EMPLOYEE',
        });
        results.imported += 1;
      } catch (e) {
        results.failed.push({ row: index + 2, email: row.email, reason: e.message });
      }
    }

    res.status(results.imported ? 201 : 400).json({ success: results.imported > 0, ...results });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  assignManager,
  getReportees,
  getDepartments,
  importCsv,
};
