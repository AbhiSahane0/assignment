const Employee = require('../models/Employee');
const { buildTree } = require('../utils/hierarchy');

/**
 * GET /api/organization/tree
 * Full reporting tree. Employees with no (living) manager are roots.
 */
const getTree = async (req, res, next) => {
  try {
    const employees = await Employee.find({ isDeleted: false })
      .select('employeeId name email designation department role status reportingManager profileImage')
      .lean();

    res.json({ success: true, data: buildTree(employees) });
  } catch (err) {
    next(err);
  }
};

module.exports = { getTree };
