/**
 * Central error handler — converts Mongoose/JWT errors into clean
 * JSON responses with appropriate status codes.
 */
const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }

  // Duplicate key (unique email / employeeId)
  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `An employee with this ${field} already exists.`;
  }

  // Invalid ObjectId
  if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}.`;
  }

  if (status === 500 && process.env.NODE_ENV !== 'test') {
    console.error(err);
  }

  res.status(status).json({ success: false, message });
};

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = { errorHandler, ApiError };
