const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user');
const { authenticateToken } = require('../middleware/auth');

// Helper: generate JWT token
function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
}

// Helper: sanitize user object for response (strip password & tokens)
function sanitizeUser(user) {
    if (!user) return null;
    const { password, reset_token, reset_token_expiry, ...safe } = user;
    return safe;
}

// ──────────────────────────────────────────────
// POST /api/auth/signup
// ──────────────────────────────────────────────
router.post(
    '/signup',
    [
        body('fullname').trim().notEmpty().withMessage('Full name is required'),
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
        body('blood_type').trim().notEmpty().withMessage('Blood type is required'),
        body('province').trim().notEmpty().withMessage('Province is required'),
        body('city').trim().notEmpty().withMessage('City is required'),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { fullname, email, password, phone, province, city, blood_type } = req.body;

            // Check if email already exists
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.status(409).json({ message: 'Email already registered. Please login instead.' });
            }

            // Create user
            const userId = await User.create({ fullname, email, password, phone, province, city, blood_type });

            // Get created user
            const user = await User.findById(userId);

            // Generate token
            const token = generateToken({ id: userId, email });

            res.status(201).json({
                message: 'Account created successfully',
                token,
                user: sanitizeUser(user)
            });
        } catch (error) {
            console.error('Signup error:', error);
            res.status(500).json({ message: 'Server error during registration' });
        }
    }
);

// ──────────────────────────────────────────────
// POST /api/auth/login
// ──────────────────────────────────────────────
router.post(
    '/login',
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required'),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { email, password } = req.body;

            // Find user
            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // Verify password
            const isMatch = await User.verifyPassword(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // Generate token
            const token = generateToken(user);

            res.json({
                message: 'Login successful',
                token,
                user: sanitizeUser(user)
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Server error during login' });
        }
    }
);

// ──────────────────────────────────────────────
// POST /api/auth/forgot-password
// ──────────────────────────────────────────────
router.post(
    '/forgot-password',
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { email } = req.body;

            // Find user
            const user = await User.findByEmail(email);
            if (!user) {
                return res.json({ message: 'If this email is registered, a reset link has been sent.' });
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

            // Save token to database
            await User.saveResetToken(email, resetToken, expiry);

            // In production you'd send an email here
            console.log(`[DEV] Reset token for ${email}: ${resetToken}`);

            res.json({
                message: 'If this email is registered, a reset link has been sent.',
                resetToken // Remove in production
            });
        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// ──────────────────────────────────────────────
// POST /api/auth/reset-password
// ──────────────────────────────────────────────
router.post(
    '/reset-password',
    [
        body('token').notEmpty().withMessage('Reset token is required'),
        body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { token, newPassword } = req.body;

            // Find user with valid token
            const user = await User.findByResetToken(token);
            if (!user) {
                return res.status(400).json({ message: 'Invalid or expired reset token' });
            }

            // Update password (also clears the reset token)
            await User.updatePassword(user.id, newPassword);

            res.json({ message: 'Password reset successful. You can now login with your new password.' });
        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// ──────────────────────────────────────────────
// GET /api/auth/me  (protected)
// ──────────────────────────────────────────────
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ user: sanitizeUser(user) });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
