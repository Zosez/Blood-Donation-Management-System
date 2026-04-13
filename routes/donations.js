const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Donation = require('../models/Donation');
const { authenticateToken } = require('../middleware/auth');

// All donation routes require authentication
router.use(authenticateToken);

// ──────────────────────────────────────────────
// GET /api/donations/eligibility  — check donation eligibility
// ──────────────────────────────────────────────
router.get('/eligibility', async (req, res) => {
    try {
        const eligibility = await Donation.checkDonationEligibility(req.user.id);
        res.json({ eligibility });
    } catch (error) {
        console.error('Check eligibility error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ──────────────────────────────────────────────
// POST /api/donations  — record a new donation
// ──────────────────────────────────────────────
router.post(
    '/',
    [
        body('donation_date').notEmpty().isISO8601().withMessage('Valid donation date is required'),
        body('donation_center').trim().notEmpty().withMessage('Donation center is required'),
        body('blood_units').optional().isFloat({ min: 0.5, max: 5 }).withMessage('Blood units must be between 0.5 and 5'),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            // Verify user exists before creating donation
            const User = require('../models/user');
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(401).json({ message: 'User not found. Please login again.' });
            }

            // Check donation eligibility
            const eligibility = await Donation.checkDonationEligibility(req.user.id);
            if (!eligibility.eligible) {
                return res.status(403).json({
                    message: 'You are not eligible to donate yet',
                    nextEligibleDate: eligibility.nextEligibleDate,
                    lastDonationDate: eligibility.lastDonationDate,
                    daysUntilEligible: eligibility.daysUntilEligible
                });
            }

            const { donation_date, blood_units, donation_center, next_eligible_date } = req.body;

            const donationId = await Donation.create({
                user_id: req.user.id,
                donation_date,
                blood_units: blood_units || 1,
                donation_center,
                next_eligible_date: next_eligible_date || null
            });

            res.status(201).json({
                message: 'Donation recorded successfully',
                donation_id: donationId
            });
        } catch (error) {
            console.error('Create donation error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// ──────────────────────────────────────────────
// GET /api/donations  — list current user's donations
// ──────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const donations = await Donation.findByUserId(req.user.id);
        res.json({ donations });
    } catch (error) {
        console.error('Get donations error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ──────────────────────────────────────────────
// GET /api/donations/stats  — get current user's donation stats
// ──────────────────────────────────────────────
router.get('/stats', async (req, res) => {
    try {
        const stats = await Donation.getUserStats(req.user.id);
        res.json({ stats });
    } catch (error) {
        console.error('Get donation stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
