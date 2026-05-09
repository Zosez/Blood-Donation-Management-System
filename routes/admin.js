const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { db } = require('../config/database');
const User = require('../models/user');

// All admin routes require authentication
router.use(authenticateToken);

// Admin authorization middleware
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
}

router.use(requireAdmin);

/**
 * GET /api/admin/dashboard-stats
 * Returns KPI stats for admin dashboard
 */
router.get('/dashboard-stats', async (req, res) => {
    try {
        // Total users
        const [userCountResult] = await db.execute('SELECT COUNT(*) as count FROM users WHERE role = "user"');
        const totalUsers = userCountResult[0].count;

        // Pending requests
        const [pendingResult] = await db.execute('SELECT COUNT(*) as count FROM blood_requests WHERE status = "pending"');
        const pendingRequests = pendingResult[0].count;

        // Open requests (approved but not fulfilled)
        const [openResult] = await db.execute('SELECT COUNT(*) as count FROM blood_requests WHERE status = "approved"');
        const openRequests = openResult[0].count;

        // Donations today
        const [donationsResult] = await db.execute(`
            SELECT COUNT(*) as count FROM donations 
            WHERE DATE(donation_date) = CURDATE() AND status = "completed"
        `);
        const donationsToday = donationsResult[0].count;

        res.json({
            totalUsers,
            pendingRequests,
            openRequests,
            donationsToday
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * GET /api/admin/pending-requests
 * Returns pending blood requests sorted by urgency
 */
router.get('/pending-requests', async (req, res) => {
    try {
        const [requests] = await db.execute(`
            SELECT 
                id,
                blood_type,
                urgency_level,
                units_required,
                hospital_name,
                created_at,
                status
            FROM blood_requests 
            WHERE status = "pending"
            ORDER BY 
                CASE urgency_level 
                    WHEN 'critical' THEN 1
                    WHEN 'urgent' THEN 2
                    WHEN 'normal' THEN 3
                END,
                created_at ASC
            LIMIT 50
        `);

        // Format urgency for display
        const formattedRequests = requests.map(req => ({
            id: req.id,
            facility: req.hospital_name,
            blood_type: req.blood_type,
            urgency_level: req.urgency_level,
            units_required: req.units_required,
            created_at: req.created_at
        }));

        res.json({ requests: formattedRequests });
    } catch (error) {
        console.error('Pending requests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * POST /api/admin/approve-request/:requestId
 * Approve a blood request and trigger matching
 */
router.post('/approve-request/:requestId', async (req, res) => {
    try {
        const { requestId } = req.params;

        // Update request status to approved
        const [result] = await db.execute(
            'UPDATE blood_requests SET status = "approved" WHERE id = ?',
            [requestId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Request not found' });
        }

        res.json({ message: 'Request approved successfully', request_id: requestId });
    } catch (error) {
        console.error('Approve request error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * POST /api/admin/reject-request/:requestId
 * Reject a blood request with reason
 */
router.post('/reject-request/:requestId', async (req, res) => {
    try {
        const { requestId } = req.params;
        const { reason } = req.body;

        if (!reason || reason.length < 20) {
            return res.status(400).json({ message: 'Reason must be at least 20 characters' });
        }

        // Get request details first
        const [requests] = await db.execute('SELECT * FROM blood_requests WHERE id = ?', [requestId]);
        if (requests.length === 0) {
            return res.status(404).json({ message: 'Request not found' });
        }

        const request = requests[0];

        // Update request status to rejected and store reason
        await db.execute(
            'UPDATE blood_requests SET status = "cancelled", notes = CONCAT(IFNULL(notes, ""), "\\nAdmin Rejection: ", ?) WHERE id = ?',
            [reason, requestId]
        );

        res.json({ message: 'Request rejected successfully', request_id: requestId });
    } catch (error) {
        console.error('Reject request error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * GET /api/admin/users
 * Get all users (for user management page)
 */
router.get('/users', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const offset = parseInt(req.query.offset) || 0;

        const [users] = await db.execute(`
            SELECT 
                id,
                fullname,
                email,
                blood_type,
                city,
                is_verified,
                is_available_donor,
                created_at
            FROM users 
            WHERE role = "user"
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        const [countResult] = await db.execute('SELECT COUNT(*) as count FROM users WHERE role = "user"');
        const total = countResult[0].count;

        res.json({ users, total, limit, offset });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
