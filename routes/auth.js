const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user');
const { authenticateToken } = require('../middleware/auth');
const { sendVerificationEmail } = require('../config/mailer');

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
    const { password, reset_token, reset_token_expiry, email_verification_token, email_verification_expiry, ...safe } = user;
    return safe;
}

// Helper: generate verification token and send email
async function generateAndSendVerification(email) {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await User.saveVerificationToken(email, verificationToken, expiry);
    await sendVerificationEmail(email, verificationToken);

    return verificationToken;
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

            // Create user (is_verified defaults to 0)
            const userId = await User.create({ fullname, email, password, phone, province, city, blood_type });

            // Generate and send verification email
            await generateAndSendVerification(email);

            // Do NOT return a token — user must verify email first
            res.status(201).json({
                message: 'Account created! Please check your email to verify your account.',
                email: email,
                requiresVerification: true
            });
        } catch (error) {
            console.error('Signup error:', error);
            res.status(500).json({ message: 'Server error during registration' });
        }
    }
);

// ──────────────────────────────────────────────
// GET /api/auth/verify-email?token=xxx
// User clicks this link from their email
// ──────────────────────────────────────────────
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).send(`
                <html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#eef0f5;">
                <div style="text-align:center;background:#fff;padding:40px;border-radius:16px;box-shadow:0 6px 40px rgba(0,0,0,0.09);">
                <h2 style="color:#EF4444;">Invalid Link</h2>
                <p>No verification token provided.</p>
                <a href="/signup" style="color:#B91C1C;font-weight:600;">Sign up again</a>
                </div></body></html>
            `);
        }

        // Find user with this verification token
        const user = await User.findByVerificationToken(token);

        if (!user) {
            return res.status(400).send(`
                <html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#eef0f5;">
                <div style="text-align:center;background:#fff;padding:40px;border-radius:16px;box-shadow:0 6px 40px rgba(0,0,0,0.09);">
                <h2 style="color:#EF4444;">Link Expired or Invalid</h2>
                <p>This verification link is no longer valid.</p>
                <a href="/signup" style="color:#B91C1C;font-weight:600;">Sign up again</a>
                </div></body></html>
            `);
        }

        // Mark email as verified
        await User.markEmailVerified(user.id);

        console.log(`[AUTH] Email verified for user: ${user.email}`);

        // Redirect to the success page
        res.redirect('/emailVerify');
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).send('Server error during email verification');
    }
});

// ──────────────────────────────────────────────
// POST /api/auth/resend-verification
// ──────────────────────────────────────────────
router.post(
    '/resend-verification',
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

            const user = await User.findByEmail(email);
            if (!user) {
                // Don't reveal whether the email exists
                return res.json({ message: 'If this email is registered, a new verification link has been sent.' });
            }

            if (user.is_verified) {
                return res.status(400).json({ message: 'This email is already verified. Please login.' });
            }

            // Generate and send new verification email
            await generateAndSendVerification(email);

            res.json({ message: 'Verification email resent. Please check your inbox.' });
        } catch (error) {
            console.error('Resend verification error:', error);
            res.status(500).json({ message: 'Server error' });
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

            // Check if email is verified
            if (!user.is_verified) {
                return res.status(403).json({
                    message: 'Please verify your email before logging in. Check your inbox for the verification link.',
                    requiresVerification: true,
                    email: email
                });
            }

            // Generate token only for verified users
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

// ──────────────────────────────────────────────
// PUT /api/auth/availability  (protected)
// ──────────────────────────────────────────────
router.put('/availability', authenticateToken, [
    body('is_available').isBoolean().withMessage('Availability must be boolean')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const success = await User.updateAvailability(req.user.id, req.body.is_available);
        if (!success) {
            return res.status(400).json({ message: 'Failed to update availability' });
        }

        res.json({ message: 'Availability updated successfully' });
    } catch (error) {
        console.error('Update availability error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
