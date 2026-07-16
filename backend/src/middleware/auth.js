const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');

/**
 * Verifies the JWT (from Authorization header) and attaches the
 * authenticated employee to req.user. Rejects tokens for deleted
 * or deactivated accounts.
 */
const protect = async (req, res, next) => {
  try {
    let token;
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      token = header.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authenticated. Please log in.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Employee.findById(decoded.id);
    if (!user || user.isDeleted) {
      return res.status(401).json({ success: false, message: 'Account no longer exists.' });
    }
    if (user.status === 'INACTIVE') {
      return res.status(403).json({ success: false, message: 'Account is deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

/**
 * Role guard: authorize('SUPER_ADMIN', 'HR_MANAGER')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Requires role: ${roles.join(' or ')}.`,
    });
  }
  next();
};

module.exports = { protect, authorize };
