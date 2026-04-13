const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const BloodRequest = require('../models/BloodRequest');
const { authenticateToken } = require('../middleware/auth');

// All blood-request routes require authentication
router.use(authenticateToken);

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
// GET /api/blood-requests  — list all active requests
// Supports optional query filters: ?blood_type=A+&status=pending
// ──────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const filters = {};
        if (req.query.blood_type) filters.blood_type = req.query.blood_type;
        if (req.query.status) filters.status = req.query.status;

        const requests = await BloodRequest.findAll(filters);
        res.json({ requests });
    } catch (error) {
        console.error('Get blood requests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ──────────────────────────────────────────────
// GET /api/blood-requests/my  — list logged-in user's requests
// ──────────────────────────────────────────────
router.get('/my', async (req, res) => {
    try {
        const requests = await BloodRequest.findByUserId(req.user.id);
        res.json({ requests });
    } catch (error) {
        console.error('Get my blood requests error:', error);
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
