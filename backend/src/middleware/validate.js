const { validationResult } = require('express-validator');

/**
 * Runs after express-validator chains; returns 400 with the list of
 * field errors if any validation failed.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array().map((e) => e.msg).join(', '),
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

module.exports = validate;
