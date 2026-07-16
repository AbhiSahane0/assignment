const router = require('express').Router();
const multer = require('multer');
const {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  assignManager,
  getReportees,
  getDepartments,
  importCsv,
} = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createEmployeeRules,
  updateEmployeeRules,
  assignManagerRules,
  listQueryRules,
} = require('../utils/validators');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

router.use(protect);

router.get('/meta/departments', getDepartments);

router.get('/', authorize('SUPER_ADMIN', 'HR_MANAGER'), listQueryRules, validate, listEmployees);
router.post('/', authorize('SUPER_ADMIN', 'HR_MANAGER'), createEmployeeRules, validate, createEmployee);
router.post('/import', authorize('SUPER_ADMIN', 'HR_MANAGER'), upload.single('file'), importCsv);

router.get('/:id', getEmployee); // self-access enforced in controller
router.put('/:id', updateEmployeeRules, validate, updateEmployee); // per-role field rules in controller
router.delete('/:id', authorize('SUPER_ADMIN'), deleteEmployee);

router.patch('/:id/manager', authorize('SUPER_ADMIN', 'HR_MANAGER'), assignManagerRules, validate, assignManager);
router.get('/:id/reportees', authorize('SUPER_ADMIN', 'HR_MANAGER'), getReportees);

module.exports = router;
