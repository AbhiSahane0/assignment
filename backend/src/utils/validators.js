const { body, query } = require('express-validator');
const Employee = require('../models/Employee');

const loginRules = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const createEmployeeRules = [
  body('employeeId')
    .trim()
    .notEmpty().withMessage('Employee ID is required')
    .matches(/^[A-Za-z0-9-]+$/).withMessage('Employee ID may only contain letters, numbers and hyphens'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone')
    .matches(/^\+?[0-9]{10,15}$/).withMessage('Phone must be 10-15 digits (optional + prefix)'),
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('designation').trim().notEmpty().withMessage('Designation is required'),
  body('salary')
    .isFloat({ min: 0 }).withMessage('Salary must be a non-negative number'),
  body('joiningDate')
    .isISO8601().withMessage('Joining date must be a valid date (YYYY-MM-DD)'),
  body('status').optional().isIn(Employee.STATUSES).withMessage('Status must be ACTIVE or INACTIVE'),
  body('role').optional().isIn(Employee.ROLES).withMessage(`Role must be one of: ${Employee.ROLES.join(', ')}`),
  body('reportingManager').optional({ values: 'null' }).isMongoId().withMessage('Reporting manager must be a valid id'),
  body('profileImage').optional().isString(),
];

// Same fields as create, but everything optional (partial update via PUT)
const updateEmployeeRules = [
  body('employeeId')
    .optional()
    .trim()
    .matches(/^[A-Za-z0-9-]+$/).withMessage('Employee ID may only contain letters, numbers and hyphens'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').optional().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone')
    .optional()
    .matches(/^\+?[0-9]{10,15}$/).withMessage('Phone must be 10-15 digits (optional + prefix)'),
  body('department').optional().trim().notEmpty().withMessage('Department cannot be empty'),
  body('designation').optional().trim().notEmpty().withMessage('Designation cannot be empty'),
  body('salary').optional().isFloat({ min: 0 }).withMessage('Salary must be a non-negative number'),
  body('joiningDate').optional().isISO8601().withMessage('Joining date must be a valid date (YYYY-MM-DD)'),
  body('status').optional().isIn(Employee.STATUSES).withMessage('Status must be ACTIVE or INACTIVE'),
  body('role').optional().isIn(Employee.ROLES).withMessage(`Role must be one of: ${Employee.ROLES.join(', ')}`),
  body('reportingManager').optional({ values: 'null' }).isMongoId().withMessage('Reporting manager must be a valid id'),
  body('profileImage').optional().isString(),
];

const assignManagerRules = [
  body('managerId')
    .optional({ values: 'null' })
    .isMongoId().withMessage('managerId must be a valid employee id or null'),
];

const listQueryRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1-100'),
  query('sortBy').optional().isIn(['name', 'joiningDate', 'createdAt', 'salary']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('order must be asc or desc'),
  query('status').optional().isIn(Employee.STATUSES),
  query('role').optional().isIn(Employee.ROLES),
];

module.exports = {
  loginRules,
  createEmployeeRules,
  updateEmployeeRules,
  assignManagerRules,
  listQueryRules,
};
