const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { db } = require('../config/database');

const router = express.Router();

/**
 * POST /api/donor-registrations
 * User submits a donor registration request (goes to admin review queue)
 */
router.post(
    '/',
    authenticateToken,
    [
        body('blood_type').trim().notEmpty().withMessage('Blood type is required'),
        body('phone').trim().notEmpty().withMessage('Phone number is required'),
        body('province').trim().notEmpty().withMessage('Province is required'),
        body('city').trim().notEmpty().withMessage('City is required'),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const userId = req.user.id;

            // ── Availability guard (server-side) ──────────────────────────
            const [userRows] = await db.execute(
                'SELECT is_available_donor, cooldown_ends_at FROM users WHERE id = ?', [userId]
            );
            if (userRows.length === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            const dbUser = userRows[0];

            // Block if on cooldown
            if (dbUser.cooldown_ends_at && new Date(dbUser.cooldown_ends_at) > new Date()) {
                const daysLeft = Math.ceil((new Date(dbUser.cooldown_ends_at) - new Date()) / (1000 * 60 * 60 * 24));
                return res.status(403).json({
                    success: false,
                    message: `You are currently in a post-donation cooldown period (${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining). You cannot register until your cooldown expires.`,
                    cooldown_days_remaining: daysLeft
                });
            }

            // Block if availability is OFF
            if (!dbUser.is_available_donor) {
                return res.status(403).json({
                    success: false,
                    message: 'Your availability is set to OFF. Please enable your donor availability from your dashboard before registering.'
                });
            }
            // ─────────────────────────────────────────────────────────────
            const {
                blood_type,
                donation_type,
                availability_level,
                phone,
                email,
                hospital,
                province,
                city,
                last_donated,
                relationship,
                notes,
                fullname
            } = req.body;

            // Prevent duplicate pending submission
            const [existing] = await db.execute(
                `SELECT id FROM donor_registrations WHERE user_id = ? AND status = 'pending'`,
                [userId]
            );
            if (existing.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'You already have a pending donor registration. Please wait for admin review.'
                });
            }

            // Get user fullname from DB if not provided
            let donorName = fullname;
            if (!donorName) {
                const [users] = await db.execute('SELECT fullname FROM users WHERE id = ?', [userId]);
                donorName = users[0]?.fullname || 'Unknown';
            }

            // Parse last_donated date safely
            let lastDonatedDate = null;
            if (last_donated) {
                const parsed = new Date(last_donated);
                if (!isNaN(parsed.getTime())) lastDonatedDate = parsed.toISOString().split('T')[0];
            }

            const [result] = await db.execute(
                `INSERT INTO donor_registrations
                 (user_id, fullname, blood_type, donation_type, availability_level,
                  phone, email, hospital, province, city, last_donated, relationship, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    donorName,
                    blood_type,
                    donation_type || 'Whole Blood',
                    availability_level || 'normal',
                    phone,
                    email || null,
                    hospital || null,
                    province || null,
                    city,
                    lastDonatedDate,
                    relationship || null,
                    notes || null
                ]
            );

            console.log(`[DONOR REG] New registration #${result.insertId} by user ${userId}`);

            res.status(201).json({
                success: true,
                message: 'Donor registration submitted successfully. An admin will review your request shortly.',
                registration_id: result.insertId
            });
        } catch (error) {
            console.error('Donor registration error:', error);
            res.status(500).json({ success: false, message: 'Server error during registration' });
        }
    }
);

/**
 * GET /api/donor-registrations/my
 * Returns the current user's own donor registration(s)
 */
router.get('/my', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT id, blood_type, donation_type, availability_level, status, created_at, reviewed_at
             FROM donor_registrations
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT 10`,
            [req.user.id]
        );
        res.json({ success: true, registrations: rows });
    } catch (error) {
        console.error('Get my registrations error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
