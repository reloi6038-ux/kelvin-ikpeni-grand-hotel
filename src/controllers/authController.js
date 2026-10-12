const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

/* ---------------------------------------------------------------
 * @desc    Authenticate admin and return a JWT
 * @route   POST /api/auth/login
 * @access  Public
 * --------------------------------------------------------------- */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    admin.lastLogin = new Date();
    await admin.save({ validateBeforeSave: false });

    res.json({
      success: true,
      token: generateToken(admin._id),
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------------------------------------------------------
 * @desc    Get the currently authenticated admin
 * @route   GET /api/auth/me
 * @access  Private
 * --------------------------------------------------------------- */
exports.getMe = async (req, res, next) => {
  try {
    res.json({
      success: true,
      admin: req.admin,
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------------------------------------------------------
 * @desc    Seed the first admin account (one-time setup)
 * @route   POST /api/auth/seed
 * @access  Public (only works when no admin exists)
 * --------------------------------------------------------------- */
exports.seedAdmin = async (req, res, next) => {
  try {
    const existing = await Admin.countDocuments();

    if (existing > 0) {
      return res.status(400).json({
        success: false,
        message: 'Admin already exists. Use /api/auth/login instead.',
      });
    }

    const email = (process.env.ADMIN_EMAIL || 'admin@kelvinikpenigrand.com').toLowerCase();
    const password = process.env.ADMIN_PASSWORD || 'Admin@2024!';

    const admin = await Admin.create({
      name: 'Super Admin',
      email,
      password,
      role: 'superadmin',
    });

    res.status(201).json({
      success: true,
      message: 'Admin seeded successfully. You can now log in.',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    next(error);
  }
};