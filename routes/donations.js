const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Donation = require('../models/Donation');
const { authenticateToken } = require('../middleware/auth');

// All donation routes require authentication
router.use(authenticateToken);

// ──────────────────────────────────────────────
// POST /api/donations  — record a new donation
// ──────────────────────────────────────────────
router.post(
    '/',
    [
        body('donation_date').notEmpty().withMessage('Donation date is required'),
        body('donation_center').trim().notEmpty().withMessage('Donation center is required'),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
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

module.exports = router;
