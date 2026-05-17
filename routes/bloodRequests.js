const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const BloodRequest = require('../models/BloodRequest');
const Notification = require('../models/Notification');
const { authenticateToken } = require('../middleware/auth');
const { getCompatibleDonorTypes } = require('../utils/bloodTypeCompatibility');
const { sendCriticalRequestToAdminsEmail } = require('../config/mailer');
const { db } = require('../config/database');

// Queue for notifications (to avoid blocking requests)
const notificationQueue = [];
let processingNotifications = false;

async function processNotificationQueue() {
    if (processingNotifications || notificationQueue.length === 0) return;
    
    processingNotifications = true;
    while (notificationQueue.length > 0) {
        const notification = notificationQueue.shift();
        try {
            await Notification.create(notification);
        } catch (err) {
            console.error('Failed to send notification:', err);
        }
    }
    processingNotifications = false;
}

// ──────────────────────────────────────────────
// Helper: notify all admin users about a new blood request
// normal/urgent → in-app only
// critical      → in-app + email
// ──────────────────────────────────────────────
async function notifyAdmins(requestId, requestData, requester) {
    try {
        // Fetch all admin users
        const [admins] = await db.execute(
            'SELECT id, fullname, email FROM users WHERE role = "admin"'
        );
        if (!admins.length) return;

        const urgency = (requestData.urgency_level || 'normal').toLowerCase();
        const isCritical = urgency === 'critical';
        const urgencyLabel = isCritical ? 'CRITICAL' : urgency === 'urgent' ? 'Urgent' : 'Normal';

        // In-app notification for every admin
        const notifications = admins.map(admin => ({
            user_id: admin.id,
            type:    'admin_request',
            title:   `${urgencyLabel} Blood Request — ${requestData.blood_type} needed`,
            message: `${requester.fullname} submitted a ${urgencyLabel} request for ${requestData.blood_type} blood ` +
                     `at ${requestData.hospital_name}${requestData.city ? ', ' + requestData.city : ''}. ` +
                     `${requestData.units_required} unit(s) required. Pending your approval.`,
            blood_request_id: requestId
        }));

        await Notification.insertMany(notifications);
        console.log(`[ADMIN NOTIF] ${notifications.length} in-app notification(s) sent to admins for request #${requestId}`);

        // Email only if critical
        if (isCritical) {
            const emailResults = await Promise.allSettled(
                admins
                    .filter(a => !!a.email)
                    .map(admin => sendCriticalRequestToAdminsEmail(
                        admin,
                        { ...requestData, id: requestId },
                        requester
                    ))
            );
            const sent = emailResults.filter(r => r.status === 'fulfilled' && r.value === true).length;
            console.log(`[ADMIN NOTIF] Critical admin emails: ${sent}/${admins.length} sent`);
        }
    } catch (err) {
        console.error('[ADMIN NOTIF] notifyAdmins error:', err.message);
    }
}

// ──────────────────────────────────────────────
// GET /api/blood-requests  — list approved requests (public display)
// ──────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const allRequests = await BloodRequest.findAll();
        // Show ONLY active requests on the public page
        const requests = allRequests.filter(r => r.status === 'approved' || r.status === 'ongoing');
        res.json({ requests });
    } catch (error) {
        console.error('Get all active requests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// All following routes require authentication
router.use(authenticateToken);

// ──────────────────────────────────────────────
// GET /api/notifications  — get current user's notifications
// ──────────────────────────────────────────────
router.get('/notifications', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const offset = parseInt(req.query.offset) || 0;
        
        const notifications = await Notification.findByUserId(req.user.id, limit, offset);
        const unreadCount = await Notification.countUnread(req.user.id);
        
        res.json({ notifications, unreadCount });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ──────────────────────────────────────────────
// POST /api/notifications/:id/read  — mark notification as read
// ──────────────────────────────────────────────
router.post('/notifications/:id/read', [
    param('id').isInt().withMessage('Invalid notification ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const success = await Notification.markAsRead(req.params.id);
        if (!success) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ──────────────────────────────────────────────
// POST /api/notifications/read-all  — mark all notifications as read
// ──────────────────────────────────────────────
router.post('/notifications/read-all', async (req, res) => {
    try {
        const success = await Notification.markAllAsRead(req.user.id);
        res.json({ message: 'All notifications marked as read', count: success });
    } catch (error) {
        console.error('Mark all notifications read error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ──────────────────────────────────────────────
// GET /api/blood-requests/my  — get current user's blood requests (all statuses)
// ──────────────────────────────────────────────
// ──────────────────────────────────────────────
// GET /api/blood-requests/my  — get current user's blood requests (requires auth)
// ──────────────────────────────────────────────
router.get('/my', authenticateToken, async (req, res) => {
    try {
        console.log('\n[BLOOD_REQUESTS] GET /my');
        console.log('  userId:', req.user.id);
        
        const requests = await BloodRequest.findByUserId(req.user.id);
        console.log('  Found', requests.length, 'requests');
        if (requests.length > 0) {
            console.log('  First request:', { id: requests[0].id, user_id: requests[0].user_id });
        }
        res.json({ requests });
    } catch (error) {
        console.error('Get user blood requests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ──────────────────────────────────────────────
// GET /api/blood-requests/my-requests  — alias for /my
// ──────────────────────────────────────────────
router.get('/my-requests', authenticateToken, async (req, res) => {
    try {
        const requests = await BloodRequest.findByUserId(req.user.id);
        res.json({ requests });
    } catch (error) {
        console.error('Get user blood requests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ──────────────────────────────────────────────
// GET /api/blood-requests/matched
// Returns approved requests matching the logged-in user's
// blood_type + city (excludes their own requests)
// ──────────────────────────────────────────────
router.get('/matched', async (req, res) => {
    try {
        const { db } = require('../config/database');
        const userRow = await require('../models/user').findById(req.user.id);
        if (!userRow) return res.json({ requests: [] });

        const { blood_type, city } = userRow;
        if (!blood_type || !city) return res.json({ requests: [] });

        const [requests] = await db.execute(
            `SELECT id, blood_type, hospital_name, city, urgency_level,
                    units_required, status, created_at
             FROM blood_requests
             WHERE status = 'approved'
               AND blood_type = ?
               AND city REGEXP CONCAT('^', ?, '$')
               AND user_id != ?
             ORDER BY
               CASE urgency_level
                 WHEN 'critical' THEN 1
                 WHEN 'urgent'   THEN 2
                 ELSE 3
               END,
               created_at DESC
             LIMIT 20`,
            [
                blood_type,
                city.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                req.user.id
            ]
        );

        res.json({ requests });
    } catch (error) {
        console.error('Matched requests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ──────────────────────────────────────────────
// POST /api/blood-requests  — create a new blood request
// ──────────────────────────────────────────────
router.post(
    '/',
    [
        body('blood_type').trim().isIn(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']).withMessage('Invalid blood type'),
        body('units_required').isInt({ min: 1, max: 10 }).withMessage('Units must be between 1 and 10'),
        body('hospital_name').trim().notEmpty().isLength({ min: 2, max: 255 }).withMessage('Valid hospital name required'),
        body('urgency_level').optional().isIn(['normal', 'urgent', 'critical']).withMessage('Invalid urgency level'),
        body('city').optional().trim().isLength({ min: 2, max: 100 }),
        body('date_needed').optional().isISO8601().withMessage('Valid date required'),
        body('relationship').optional().trim().isLength({ max: 50 }),
        body('donation_type').optional().trim().isLength({ max: 50 }),
        body('notes').optional().trim().isLength({ max: 1000 })
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

            // Find and notify compatible donors asynchronously
            const compatibleTypes = getCompatibleDonorTypes(blood_type);
            const eligibleDonors = await BloodRequest.findEligibleDonors(blood_type, compatibleTypes);
            
            if (eligibleDonors.length > 0) {
                const requestTitle = `Blood Request: ${blood_type} (${urgency_level})`;
                const requestMessage = `A ${urgency_level} blood request for ${blood_type} has been posted at ${hospital_name}. ${units_required} unit(s) needed.`;
                
                eligibleDonors.forEach(donor => {
                    notificationQueue.push({
                        user_id: donor.id,
                        type: 'blood_request',
                        title: requestTitle,
                        message: requestMessage,
                        blood_request_id: requestId,
                        related_user_id: req.user.id
                    });
                });

                setImmediate(processNotificationQueue);
            }

            // ── Notify admins (non-blocking) ──────────────────────────
            // All requests → in-app to admins
            // Critical only → also email admins
            setImmediate(() => notifyAdmins(
                requestId,
                { blood_type, units_required, urgency_level: urgency_level || 'normal', hospital_name, city },
                { fullname: user.fullname }
            ));

            res.status(201).json({
                message: 'Blood request submitted successfully',
                request_id: requestId,
                notified_donors: eligibleDonors.length
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
// ──────────────────────────────────────────────
// GET /api/blood-requests/matched — matched requests (protected)
// Returns blood requests matching user's blood type and location
// ──────────────────────────────────────────────
router.get('/matched', authenticateToken, async (req, res) => {
    try {
        const User = require('../models/user');
        const { getCompatibleDonorTypes } = require('../utils/bloodTypeCompatibility');
        
        const currentUser = await User.findById(req.user.id);
        
        if (!currentUser || !currentUser.blood_type) {
            return res.status(400).json({ message: 'User blood type not found' });
        }

        // Get compatible blood types for the user
        const compatibleTypes = getCompatibleDonorTypes(currentUser.blood_type);
        
        // Find matched requests by blood type and location
        const requests = await BloodRequest.findNearbyRequests(
            currentUser.blood_type,
            currentUser.city,
            compatibleTypes
        );
        
        res.json({ 
            success: true,
            count: requests.length,
            requests 
        });
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
