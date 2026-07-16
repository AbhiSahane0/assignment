const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await Employee.findOne({ email, isDeleted: false }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    if (user.status === 'INACTIVE') {
      return res.status(403).json({ success: false, message: 'Your account is deactivated. Contact an administrator.' });
    }

    const token = signToken(user._id);
    res.json({ success: true, token, user: user.toJSON() });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
// JWTs are stateless — the client discards the token. This endpoint exists
// so the frontend has an explicit logout call (and a place to add token
// blacklisting later if needed).
const logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
};

// GET /api/auth/me
const me = async (req, res) => {
  const user = await Employee.findById(req.user._id).populate('reportingManager', 'name employeeId designation');
  res.json({ success: true, user });
};

module.exports = { login, logout, me };
