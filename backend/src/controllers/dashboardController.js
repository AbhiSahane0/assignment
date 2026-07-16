const Employee = require('../models/Employee');

/**
 * GET /api/dashboard/stats
 * Totals + per-department and per-role breakdowns (used by the charts).
 */
const getStats = async (req, res, next) => {
  try {
    const base = { isDeleted: false };

    const [total, active, inactive, departments, byDepartment, byRole, recentJoiners] = await Promise.all([
      Employee.countDocuments(base),
      Employee.countDocuments({ ...base, status: 'ACTIVE' }),
      Employee.countDocuments({ ...base, status: 'INACTIVE' }),
      Employee.distinct('department', base),
      Employee.aggregate([
        { $match: base },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Employee.aggregate([
        { $match: base },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      Employee.find(base)
        .select('name designation department joiningDate profileImage')
        .sort({ joiningDate: -1 })
        .limit(5),
    ]);

    res.json({
      success: true,
      data: {
        totalEmployees: total,
        activeEmployees: active,
        inactiveEmployees: inactive,
        departmentCount: departments.length,
        byDepartment: byDepartment.map((d) => ({ department: d._id, count: d.count })),
        byRole: byRole.map((r) => ({ role: r._id, count: r.count })),
        recentJoiners,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats };
