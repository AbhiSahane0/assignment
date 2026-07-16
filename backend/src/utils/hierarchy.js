const Employee = require('../models/Employee');

/**
 * Returns true if assigning `managerId` as the reporting manager of
 * `employeeId` would create a cycle (e.g. A reports to B, B reports to A,
 * or a longer chain). Walks up the manager chain from the proposed
 * manager — if we ever reach the employee, it's circular.
 */
async function wouldCreateCycle(employeeId, managerId) {
  if (!managerId) return false;
  if (String(employeeId) === String(managerId)) return true;

  const visited = new Set();
  let current = String(managerId);

  while (current) {
    if (current === String(employeeId)) return true;
    if (visited.has(current)) return true; // pre-existing cycle safety net
    visited.add(current);

    const manager = await Employee.findById(current).select('reportingManager').lean();
    current = manager && manager.reportingManager ? String(manager.reportingManager) : null;
  }
  return false;
}

/**
 * Builds the full organization tree from a flat employee list.
 * Employees without a manager (or whose manager is deleted) become roots.
 */
function buildTree(employees) {
  const byId = new Map();
  employees.forEach((e) => byId.set(String(e._id), { ...e, directReports: [] }));

  const roots = [];
  byId.forEach((node) => {
    const managerId = node.reportingManager ? String(node.reportingManager) : null;
    if (managerId && byId.has(managerId)) {
      byId.get(managerId).directReports.push(node);
    } else {
      roots.push(node);
    }
  });

  // Stable ordering: managers with more reports first, then by name
  const sortNodes = (nodes) => {
    nodes.sort((a, b) => b.directReports.length - a.directReports.length || a.name.localeCompare(b.name));
    nodes.forEach((n) => sortNodes(n.directReports));
  };
  sortNodes(roots);
  return roots;
}

module.exports = { wouldCreateCycle, buildTree };
