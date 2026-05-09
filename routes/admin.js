const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { db } = require('../config/database');
const User = require('../models/user');
const Notification = require('../models/Notification');
const { sendCriticalBloodRequestEmail } = require('../config/mailer');

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

// ──────────────────────────────────────────────
// Helper: find users matched to a blood request
// Match criteria: exact blood_type + case-insensitive city
// Exclude: the submitter, admins, users with no city
// ──────────────────────────────────────────────
async function findMatchedUsers(request) {
    return await User.findMatchedDonors(
        request.blood_type,
        request.city,
        request.user_id
    );
}

// ──────────────────────────────────────────────
// Helper: handle all post-approval notifications & emails
// ──────────────────────────────────────────────
async function handleRequestApproval(request) {
    try {
        // STEP 1 — Find all matched users (bloodType + city, excludes submitter/admins)
        const matchedUsers = await findMatchedUsers(request);
        if (matchedUsers.length === 0) {
            console.log(`[APPROVAL] No matched donors found for request #${request.id}`);
            return;
        }

        console.log(`[APPROVAL] Found ${matchedUsers.length} matched donor(s) for request #${request.id}`);

        // STEP 2 — Create in-app notifications for ALL matched users (bulk insert)
        const notifications = matchedUsers.map(user => ({
            user_id: user.id,
            type: 'blood_match',
            title: `Blood Needed – ${request.blood_type} in ${request.city}`,
            message: `A ${request.urgency_level} request for ${request.blood_type} blood has been posted at ${request.hospital_name}, ${request.city}. Please help if you can.`,
            blood_request_id: request.id
        }));

        await Notification.insertMany(notifications);
        console.log(`[APPROVAL] Created ${notifications.length} in-app notification(s)`);

        // STEP 3 — Send email ONLY if urgency_level === 'critical'
        if (request.urgency_level === 'critical') {
            const emailTargets = matchedUsers.filter(user => !!user.email);
            const emailPromises = emailTargets.map(user =>
                sendCriticalBloodRequestEmail(user, request)
            );
            // Promise.allSettled ensures one failure doesn't block others
            const results = await Promise.allSettled(emailPromises);
            const sent = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
            console.log(`[APPROVAL] Critical emails: ${sent}/${emailTargets.length} sent`);
        }
        // urgency_level 'normal' or 'urgent' → in-app notification only, NO email
    } catch (err) {
        // Log but never let this block the approval response
        console.error('[APPROVAL] handleRequestApproval error:', err.message);
    }
}

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
 * GET /api/admin/recent-activity
 * Returns a unified activity feed from real DB events:
 *   - Blood requests submitted, approved, rejected
 *   - New user registrations
 * Newest first, limit 10
 */
router.get('/recent-activity', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT * FROM (

                -- Blood request submitted
                SELECT
                    br.id            AS event_id,
                    'request_new'    AS event_type,
                    br.created_at    AS event_time,
                    br.blood_type,
                    br.hospital_name,
                    br.city,
                    br.urgency_level,
                    br.units_required,
                    br.status,
                    u.fullname       AS actor_name,
                    NULL             AS extra
                FROM blood_requests br
                JOIN users u ON br.user_id = u.id

                UNION ALL

                -- Blood request approved / rejected (status change)
                SELECT
                    br.id            AS event_id,
                    CASE br.status
                        WHEN 'approved' THEN 'request_approved'
                        WHEN 'rejected' THEN 'request_rejected'
                        ELSE 'request_updated'
                    END              AS event_type,
                    COALESCE(br.updated_at, br.created_at) AS event_time,
                    br.blood_type,
                    br.hospital_name,
                    br.city,
                    br.urgency_level,
                    br.units_required,
                    br.status,
                    u.fullname       AS actor_name,
                    NULL             AS extra
                FROM blood_requests br
                JOIN users u ON br.user_id = u.id
                WHERE br.status IN ('approved', 'rejected')

                UNION ALL

                -- New user registered
                SELECT
                    u.id             AS event_id,
                    'user_registered' AS event_type,
                    u.created_at     AS event_time,
                    u.blood_type,
                    NULL             AS hospital_name,
                    u.city,
                    NULL             AS urgency_level,
                    NULL             AS units_required,
                    NULL             AS status,
                    u.fullname       AS actor_name,
                    NULL             AS extra
                FROM users u
                WHERE u.role = 'user'

            ) AS activity
            ORDER BY event_time DESC
            LIMIT 10
        `);

        res.json({ activity: rows });
    } catch (error) {
        console.error('Recent activity error:', error);
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
 * GET /api/admin/blood-requests
 * Returns ALL blood requests (no status filter) — for admin dashboard
 * Supports optional ?status= filter tab on frontend
 */
router.get('/blood-requests', async (req, res) => {
    try {
        const { status } = req.query;

        let query = `
            SELECT 
                br.id,
                br.blood_type,
                br.urgency_level,
                br.units_required,
                br.hospital_name,
                br.city,
                br.status,
                br.patient_name,
                br.notes,
                br.created_at,
                u.fullname AS requester_name,
                u.email    AS requester_email
            FROM blood_requests br
            JOIN users u ON br.user_id = u.id
        `;
        const params = [];

        if (status && ['pending', 'approved', 'rejected', 'fulfilled', 'cancelled'].includes(status)) {
            query += ' WHERE br.status = ?';
            params.push(status);
        }

        query += ' ORDER BY br.created_at DESC';

        const [requests] = await db.execute(query, params);
        res.json({ requests });
    } catch (error) {
        console.error('Admin blood requests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * POST /api/admin/approve-request/:requestId
 * Approve a blood request and trigger matching + notifications
 */
router.post('/approve-request/:requestId', async (req, res) => {
    try {
        const { requestId } = req.params;

        // Fetch the full request first (needed for matching)
        const [requests] = await db.execute('SELECT * FROM blood_requests WHERE id = ?', [requestId]);
        if (requests.length === 0) {
            return res.status(404).json({ message: 'Request not found' });
        }

        const request = requests[0];

        // Update request status to approved
        const [result] = await db.execute(
            'UPDATE blood_requests SET status = "approved", updated_at = NOW() WHERE id = ?',
            [requestId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Request not found' });
        }

        // Trigger notification matching asynchronously (non-blocking)
        setImmediate(() => handleRequestApproval(request));

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

        // Update request status to rejected and store reason
        await db.execute(
            'UPDATE blood_requests SET status = "rejected", updated_at = NOW(), notes = CONCAT(IFNULL(notes, ""), "\\nAdmin Rejection: ", ?) WHERE id = ?',
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
