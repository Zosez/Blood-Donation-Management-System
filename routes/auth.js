const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user');
const Donation = require('../models/Donation');
const { authenticateToken } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../config/mailer');
const { addToBlacklist } = require('../middleware/tokenBlacklist');

// Helper: generate JWT token
function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role || 'user' },
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
        body('fullname').trim().notEmpty().isLength({ min: 2, max: 255 }).withMessage('Full name must be 2-255 characters'),
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters'),
        body('phone').optional().trim().matches(/^[\d\s\-\+\(\)]{10,20}$/).withMessage('Invalid phone format'),
        body('blood_type').trim().isIn(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']).withMessage('Invalid blood type'),
        body('province').trim().notEmpty().isLength({ min: 2, max: 100 }).withMessage('Valid province required'),
        body('city').trim().notEmpty().isLength({ min: 2, max: 100 }).withMessage('Valid city required'),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { fullname, email, password, phone, province, city, blood_type, date_of_birth } = req.body;

            // Check if email already exists
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.status(409).json({ message: 'Email already registered. Please login instead.' });
            }

            // Create user (is_verified defaults to 0)
            const userId = await User.create({ fullname, email, password, phone, province, city, blood_type, date_of_birth });

            // Generate and send verification email asynchronously (fire-and-forget)
            // This prevents the UI from hanging while Nodemailer negotiates the SMTP connection
            generateAndSendVerification(email).catch(err => {
                console.error('[AUTH] Background email sending failed:', err);
            });

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

            // Generate and send new verification email in background
            generateAndSendVerification(email).catch(err => {
                console.error('[AUTH] Background resend verification failed:', err);
            });

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

            // Check if user has completed onboarding (treat NULL as 0/false for new users)
            const isNewUser = !user.onboarded || user.onboarded === 0;
            
            // Debug: Check role value
            console.log(`[AUTH LOGIN DEBUG] Role Value: "${user.role}", Type: ${typeof user.role}, IsAdmin: ${user.role === 'admin'}`);
            
            // Determine redirect URL based on role
            let redirectUrl = '/userdashboard';
            if (user.role === 'admin') {
                redirectUrl = '/adminDashboard';
            } else if (isNewUser) {
                redirectUrl = '/welcome';
            }
            
            console.log(`[AUTH LOGIN] Email: ${user.email}, Role: "${user.role}", IsNewUser: ${isNewUser}, RedirectURL: ${redirectUrl}`);

            res.json({
                message: 'Login successful',
                token,
                user: sanitizeUser(user),
                isNewUser: isNewUser,
                redirectUrl: redirectUrl
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
                // Security: Don't reveal if email exists
                return res.json({ 
                    message: 'If this email is registered, a password reset link has been sent to your inbox.' 
                });
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

            // Save token to database
            await User.saveResetToken(email, resetToken, expiry);

            // Send password reset email in background
            sendPasswordResetEmail(email, resetToken).catch(err => {
                console.warn(`[AUTH] Background password reset email send failed for ${email}:`, err);
            });

            res.json({
                message: 'If this email is registered, a password reset link has been sent to your inbox.',
                resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined // Only in dev
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
        body('token').notEmpty().isLength({ min: 32, max: 128 }).withMessage('Invalid reset token'),
        body('newPassword').isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters'),
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

        // Get donation eligibility info
        const donationEligibility = await Donation.checkDonationEligibility(req.user.id);

        const sanitized = sanitizeUser(user);
        
        // Add donation eligibility data
        sanitized.next_eligible_date = donationEligibility.nextEligibleDate;
        sanitized.is_donation_eligible = donationEligibility.eligible;
        sanitized.days_until_eligible = donationEligibility.daysUntilEligible;

        // Add cooldown info
        const now = new Date();
        const cooldownEnds = user.cooldown_ends_at ? new Date(user.cooldown_ends_at) : null;
        sanitized.on_cooldown = cooldownEnds ? cooldownEnds > now : false;
        sanitized.cooldown_ends_at = user.cooldown_ends_at || null;
        if (sanitized.on_cooldown && cooldownEnds) {
            const diffDays = Math.ceil((cooldownEnds - now) / (1000 * 60 * 60 * 24));
            sanitized.cooldown_days_remaining = diffDays;
        } else {
            sanitized.cooldown_days_remaining = 0;
        }

        res.json({ user: sanitized });
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

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Block re-enabling if still on 56-day cooldown
        if (req.body.is_available === true || req.body.is_available === 'true') {
            const now = new Date();
            const cooldownEnds = user.cooldown_ends_at ? new Date(user.cooldown_ends_at) : null;
            if (cooldownEnds && cooldownEnds > now) {
                const diffDays = Math.ceil((cooldownEnds - now) / (1000 * 60 * 60 * 24));
                return res.status(400).json({
                    message: `You are on a 56-day donation cooldown. You can donate again in ${diffDays} day${diffDays === 1 ? '' : 's'}.`,
                    cooldown_days_remaining: diffDays,
                    cooldown_ends_at: user.cooldown_ends_at
                });
            }
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

// ──────────────────────────────────────────────
// POST /api/auth/change-password  (protected)
// ──────────────────────────────────────────────
router.post('/change-password', authenticateToken, [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8, max: 128 }).withMessage('New password must be 8-128 characters'),
    body('confirmPassword').notEmpty().withMessage('Confirm password is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isPasswordValid = await User.verifyPassword(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Update password
        const success = await User.updatePassword(req.user.id, newPassword);
        if (!success) {
            return res.status(400).json({ message: 'Failed to update password' });
        }

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ──────────────────────────────────────────────
// PUT /api/auth/profile  (protected)
// ──────────────────────────────────────────────
router.put('/profile', authenticateToken, [
    body('fullname').optional().trim().isLength({ min: 2, max: 255 }).withMessage('Full name must be 2-255 characters'),
    body('phone').optional().trim().matches(/^[\d\s\-\+\(\)]{10,20}$|^$/).withMessage('Invalid phone format'),
    body('province').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Valid province required'),
    body('city').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Valid city required'),
    body('date_of_birth').optional().isISO8601().withMessage('Invalid date format'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update only provided fields
        const updateData = {
            fullname: req.body.fullname || user.fullname,
            phone: req.body.phone !== undefined ? req.body.phone : user.phone,
            province: req.body.province || user.province,
            city: req.body.city || user.city,
            blood_type: user.blood_type,
            date_of_birth: req.body.date_of_birth || user.date_of_birth
        };

        const success = await User.update(req.user.id, updateData);
        if (!success) {
            return res.status(400).json({ message: 'Failed to update profile' });
        }

        const updatedUser = await User.findById(req.user.id);
        res.json({ 
            message: 'Profile updated successfully',
            user: sanitizeUser(updatedUser)
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ──────────────────────────────────────────────
// POST /api/auth/mark-onboarded  (protected)
// ──────────────────────────────────────────────
router.post('/mark-onboarded', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Update user onboarded status
        await User.markOnboarded(userId);

        res.json({ message: 'Onboarding completed successfully' });
    } catch (error) {
        console.error('Mark onboarded error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ──────────────────────────────────────────────
// POST /api/auth/logout  (protected)
// ──────────────────────────────────────────────
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        if (req.token) {
            addToBlacklist(req.token);
        }
        res.json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
