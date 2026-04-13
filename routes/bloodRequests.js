const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const BloodRequest = require('../models/BloodRequest');
const { authenticateToken } = require('../middleware/auth');

// ──────────────────────────────────────────────
// GET /api/blood-requests  — list all active requests (public or auth)
// ──────────────────────────────────────────────
// This can be public since Active Requests is typically a public board
router.get('/', async (req, res) => {
    try {
        const requests = await BloodRequest.findAllActive();
        res.json({ requests });
    } catch (error) {
        console.error('Get all active requests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// All following routes require authentication
router.use(authenticateToken);

// ──────────────────────────────────────────────
// POST /api/blood-requests  — create a new blood request
// ──────────────────────────────────────────────
router.post(
    '/',
    [
        body('blood_type').notEmpty().withMessage('Blood type is required'),
        body('units').isInt({ min: 1 }).withMessage('Units must be at least 1'),
        body('hospital_name').trim().notEmpty().withMessage('Hospital name is required'),
        body('city').trim().notEmpty().withMessage('City is required')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { blood_type, units, hospital_name, city, urgency } = req.body;
            
            // Calculate an expiration time, e.g. 48 hours from now
            const expires_at = new Date();
            expires_at.setHours(expires_at.getHours() + 48);

            const requestId = await BloodRequest.create({
                user_id: req.user.id,
                blood_type,
                units,
                hospital_name,
                city,
                urgency: urgency || 'normal',
                expires_at
            });

            res.status(201).json({
                message: 'Blood request recorded successfully',
                request_id: requestId
            });
        } catch (error) {
            console.error('Create blood request error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// ──────────────────────────────────────────────
// GET /api/blood-requests/me  — list current user's blood requests
// ──────────────────────────────────────────────
router.get('/me', async (req, res) => {
    try {
        const requests = await BloodRequest.findByUserId(req.user.id);
        res.json({ requests });
    } catch (error) {
        console.error('Get my active requests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ──────────────────────────────────────────────
// GET /api/blood-requests/matched  — get matched active requests
// ──────────────────────────────────────────────
router.get('/matched', async (req, res) => {
    try {
        // we need the user's blood type. req.user only contains id/email from standard token payload.
        // let's fetch the full user profile to get blood type.
        const User = require('../models/user');
        const currentUser = await User.findById(req.user.id);
        
        if (!currentUser || !currentUser.blood_type) {
            return res.status(400).json({ message: 'User blood type not found' });
        }

        const requests = await BloodRequest.findMatchedRequests(currentUser.blood_type);
        res.json({ requests });
    } catch (error) {
        console.error('Get matched requests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
