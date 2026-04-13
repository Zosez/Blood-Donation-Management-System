const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const BloodRequest = require('../models/BloodRequest');
const { authenticateToken } = require('../middleware/auth');

// ──────────────────────────────────────────────
// GET /api/blood-requests  — list all active requests (public or auth)
// ──────────────────────────────────────────────
// This can be public since Active Requests is typically a public board
router.get('/', async (req, res) => {
    try {
        const requests = await BloodRequest.findAll({ status: 'pending' });
        res.json({ requests });
    } catch (error) {
        console.error('Get all active requests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// All following routes require authentication
router.use(authenticateToken);

// ──────────────────────────────────────────────
// GET /api/blood-requests/my  — get current user's blood requests
// ──────────────────────────────────────────────
router.get('/my', async (req, res) => {
    try {
        const requests = await BloodRequest.findByUserId(req.user.id);
        res.json({ requests });
    } catch (error) {
        console.error('Get user blood requests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ──────────────────────────────────────────────
// POST /api/blood-requests  — create a new blood request
// ──────────────────────────────────────────────
router.post(
    '/',
    [
        body('blood_type').trim().notEmpty().withMessage('Blood type is required'),
        body('units_required').isInt({ min: 1, max: 10 }).withMessage('Units must be between 1 and 10'),
        body('hospital_name').trim().notEmpty().withMessage('Hospital name is required'),
        body('urgency_level').optional().isIn(['normal', 'urgent', 'critical']).withMessage('Invalid urgency level'),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            // Verify user exists before creating blood request
            const User = require('../models/user');
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(401).json({ message: 'User not found. Please login again.' });
            }

            const {
                blood_type, units_required, urgency_level,
                hospital_name, city, date_needed,
                relationship, donation_type, notes
            } = req.body;

            const requestId = await BloodRequest.create({
                user_id: req.user.id,
                blood_type,
                units_required,
                urgency_level: urgency_level || 'normal',
                hospital_name,
                city,
                date_needed,
                relationship,
                donation_type,
                notes
            });

            res.status(201).json({
                message: 'Blood request submitted successfully',
                request_id: requestId
            });
        } catch (error) {
            console.error('Create blood request error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

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

// ──────────────────────────────────────────────
// PATCH /api/blood-requests/:id/status  — update request status
// ──────────────────────────────────────────────
router.patch(
    '/:id/status',
    [
        param('id').isInt().withMessage('Invalid request ID'),
        body('status').isIn(['pending', 'approved', 'fulfilled', 'cancelled']).withMessage('Invalid status value'),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const request = await BloodRequest.findById(req.params.id);
            if (!request) {
                return res.status(404).json({ message: 'Blood request not found' });
            }

            const updated = await BloodRequest.updateStatus(req.params.id, req.body.status);
            if (!updated) {
                return res.status(500).json({ message: 'Failed to update status' });
            }

            res.json({ message: 'Status updated successfully', status: req.body.status });
        } catch (error) {
            console.error('Update blood request status error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

module.exports = router;
