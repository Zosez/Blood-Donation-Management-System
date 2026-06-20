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

        // STEP 3 — Send email ONLY if urgency_level === 'urgent'
        // (Previously 'critical' triggered emails; that workflow now belongs to 'urgent'.
        //  Critical requests go through the Receiver Requests panel instead.)
        if (request.urgency_level === 'urgent') {
            const emailTargets = matchedUsers.filter(user => !!user.email);
            const emailPromises = emailTargets.map(user =>
                sendCriticalBloodRequestEmail(user, request)
            );
            // Promise.allSettled ensures one failure doesn't block others
            const results = await Promise.allSettled(emailPromises);
            const sent = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
            console.log(`[APPROVAL] Urgent emails: ${sent}/${emailTargets.length} sent`);
        }
        // urgency_level 'normal' or 'critical' → in-app notification only, NO donor email
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
        const [userCountResult] = await db.execute('SELECT COUNT(*) as count FROM users WHERE role = \'user\'');
        const totalUsers = userCountResult[0].count;

        // Pending requests
        const [pendingResult] = await db.execute('SELECT COUNT(*) as count FROM blood_requests WHERE status = \'pending\'');
        const pendingRequests = pendingResult[0].count;

        // Open requests (approved but not fulfilled)
        const [openResult] = await db.execute('SELECT COUNT(*) as count FROM blood_requests WHERE status = \'approved\'');
        const openRequests = openResult[0].count;

        // Donations today
        const [donationsResult] = await db.execute(`
            SELECT COUNT(*) as count FROM donations 
            WHERE DATE(donation_date) = CURDATE() AND status = 'completed'
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
 * GET /api/admin/sidebar-counts
 * Lightweight endpoint for sidebar badge counts
 * Returns: pending requests, inventory items needing action
 */
router.get('/sidebar-counts', async (req, res) => {
    try {
        // Count pending blood requests
        const [pendingResult] = await db.execute(
            'SELECT COUNT(*) as count FROM blood_requests WHERE status = \'pending\''
        );
        const pendingRequests = pendingResult[0].count;

        // Count inventory items needing action (low stock or pending donor regs)
        const [inventoryResult] = await db.execute(`
            SELECT COUNT(*) as count FROM inventory WHERE units < 5
        `);
        const lowStockItems = inventoryResult[0].count;

        // Also get pending donor registrations to include in inventory count
        const [pendingRegsResult] = await db.execute(
            'SELECT COUNT(*) as count FROM donor_registrations WHERE status = \'pending\''
        );
        const pendingDonorRegs = pendingRegsResult[0].count;

        // Total inventory action items = low stock + pending registrations
        const inventoryActionItems = lowStockItems + pendingDonorRegs;

        res.json({
            success: true,
            pendingRequests,
            inventoryActionItems,
            lowStockItems,
            pendingDonorRegs
        });
    } catch (error) {
        console.error('[SIDEBAR-COUNTS] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            pendingRequests: 0,
            inventoryActionItems: 0
        });
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
            WHERE status = 'pending'
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
            `UPDATE blood_requests SET status = 'approved', updated_at = NOW() WHERE id = ?`,
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
            `UPDATE blood_requests SET status = 'rejected', updated_at = NOW(), notes = CONCAT(IFNULL(notes, ''), '\\nAdmin Rejection: ', ?) WHERE id = ?`,
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

        const [users] = await db.query(`
            SELECT 
                id,
                fullname,
                email,
                blood_type,
                city,
                role,
                is_verified,
                is_available_donor,
                created_at
            FROM users 
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        const [countResult] = await db.execute('SELECT COUNT(*) as count FROM users');
        const total = countResult[0].count;

        res.json({ users, total, limit, offset });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * PATCH /api/admin/users/:userId
 * Update user details including role and verification status
 */
router.patch('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { fullname, email, blood_type, city, role, is_verified, is_available_donor } = req.body;

        // Construct dynamic update query
        let query = 'UPDATE users SET ';
        const params = [];
        const updates = [];

        if (fullname) { updates.push('fullname = ?'); params.push(fullname); }
        if (email) { updates.push('email = ?'); params.push(email); }
        if (blood_type) { updates.push('blood_type = ?'); params.push(blood_type); }
        if (city) { updates.push('city = ?'); params.push(city); }
        if (role) { updates.push('role = ?'); params.push(role); }
        if (is_verified !== undefined) { updates.push('is_verified = ?'); params.push(is_verified); }
        if (is_available_donor !== undefined) { updates.push('is_available_donor = ?'); params.push(is_available_donor); }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        query += updates.join(', ') + ' WHERE id = ?';
        params.push(userId);

        const [result] = await db.execute(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * DELETE /api/admin/users/:userId
 * Delete a user from the system
 */
router.delete('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Prevent admin from deleting themselves
        if (parseInt(userId) === req.user.id) {
            return res.status(400).json({ message: 'You cannot delete your own account' });
        }

        const [result] = await db.execute('DELETE FROM users WHERE id = ?', [userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * GET /api/admin/inventory
 * Get blood stock from inventory table + list of available donors
 */
router.get('/inventory', async (req, res) => {
    try {
        // 1. Blood stock from the new inventory table (source of truth)
        const [stockRows] = await db.execute(`
            SELECT blood_type, SUM(units) AS total_units
            FROM inventory
            GROUP BY blood_type
        `);

        // 2. Available donors (verified, is_available_donor=1, 56-day filtered)
        const [donorRows] = await db.execute(`
            SELECT
                u.id, u.fullname, u.email, u.phone, u.blood_type, u.city,
                MAX(i.received_at) AS last_donation_date
            FROM users u
            LEFT JOIN inventory i ON i.donor_registration_id IN (
                SELECT id FROM donor_registrations WHERE user_id = u.id
            )
            WHERE u.role = 'user'
              AND u.is_verified = 1
              AND u.is_available_donor = 1
            GROUP BY u.id
            ORDER BY u.fullname ASC
        `);

        const today = new Date();
        const availableDonors = donorRows.filter(donor => {
            if (!donor.last_donation_date) return true;
            const daysDiff = Math.ceil((today - new Date(donor.last_donation_date)) / (1000 * 60 * 60 * 24));
            return daysDiff >= 56;
        });

        // 3. Network nodes = distinct cities with verified users
        const [nodeRows] = await db.execute(`
            SELECT COUNT(DISTINCT LOWER(TRIM(city))) AS node_count
            FROM users
            WHERE role = 'user' AND is_verified = 1
              AND city IS NOT NULL AND city != ''
        `);
        const networkNodes = Number(nodeRows[0]?.node_count) || 0;

        // 4. Pending donor registration requests
        const [pendingRegs] = await db.execute(`
            SELECT COUNT(*) AS pending_count
            FROM donor_registrations WHERE status = 'pending'
        `);
        const pendingDonorRequests = Number(pendingRegs[0]?.pending_count) || 0;

        // 5. Critical blood types (stock < 5 units)
        const stockMap = {};
        stockRows.forEach(r => { stockMap[r.blood_type] = Number(r.total_units); });
        const allTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
        const criticalTypes = allTypes.filter(t => (stockMap[t] || 0) < 5).length;

        res.json({
            stock:                stockRows,
            donors:               availableDonors,
            totalStock:           stockRows.reduce((acc, r) => acc + Number(r.total_units), 0),
            networkNodes,
            pendingDonorRequests,
            criticalTypes
        });
    } catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


/**
 * GET /api/admin/profile
 * Get current admin details
 */
router.get('/profile', async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Admin profile not found' });
        }
        
        // Remove password before sending
        delete user.password;
        res.json({ admin: user });
    } catch (error) {
        console.error('Get admin profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * PUT /api/admin/profile
 * Update current admin profile
 */
router.put('/profile', async (req, res) => {
    try {
        const { fullname, phone, province, city, date_of_birth } = req.body;
        
        const [result] = await db.execute(
            'UPDATE users SET fullname = ?, phone = ?, province = ?, city = ?, date_of_birth = ? WHERE id = ?',
            [fullname, phone, province, city, date_of_birth || null, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Admin profile not found' });
        }

        res.json({ message: 'Admin profile updated successfully' });
    } catch (error) {
        console.error('Update admin profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * GET /api/admin/donor-registrations
 * Returns donor registration requests
 * Query: ?status=pending|approved|rejected|completed|active(=pending+approved)|all
 */
router.get('/donor-registrations', async (req, res) => {
    try {
        const { status = 'active' } = req.query;
        let whereClause = '';
        const params = [];

        if (status === 'active') {
            whereClause = "WHERE dr.status IN ('pending','approved')";
        } else if (status !== 'all') {
            whereClause = 'WHERE dr.status = ?';
            params.push(status);
        }

        const [rows] = await db.execute(`
            SELECT
                dr.id, dr.user_id, dr.fullname, dr.blood_type, dr.donation_type,
                dr.availability_level, dr.phone, dr.email, dr.hospital,
                dr.latitude, dr.longitude, dr.last_donated, dr.relationship, dr.notes,
                dr.status, dr.created_at, dr.reviewed_at,
                u2.fullname AS reviewed_by_name
            FROM donor_registrations dr
            LEFT JOIN users u2 ON dr.reviewed_by = u2.id
            ${whereClause}
            ORDER BY
                CASE dr.status WHEN 'approved' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
                dr.created_at DESC
            LIMIT 200
        `, params);

        res.json({ registrations: rows, total: rows.length });
    } catch (error) {
        console.error('Get donor registrations error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * POST /api/admin/donor-registrations/:id/approve
 * Approve a donor registration → marks the user as available donor
 */
router.post('/donor-registrations/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;

        const [regs] = await db.execute(
            'SELECT * FROM donor_registrations WHERE id = ?', [id]
        );
        if (regs.length === 0) {
            return res.status(404).json({ message: 'Registration not found' });
        }
        if (regs[0].status !== 'pending') {
            return res.status(400).json({ message: 'Registration already processed' });
        }

        const reg = regs[0];

        // Mark registration approved
        await db.execute(
            `UPDATE donor_registrations
             SET status = 'approved', reviewed_by = ?, reviewed_at = NOW()
             WHERE id = ?`,
            [req.user.id, id]
        );

        // Set user as available donor + update city if provided
        await db.execute(
            `UPDATE users
             SET is_available_donor = 1,
                 city               = COALESCE(NULLIF(?, ''), city)
             WHERE id = ?`,
            [reg.city || '', reg.user_id]
        );

        // Notify user
        try {
            const Notification = require('../models/Notification');
            await Notification.create({
                user_id:  reg.user_id,
                type:     'donor_approved',
                title:    'Donor Registration Approved!',
                message:  'Your donor registration has been approved. You are now listed as an available donor.',
                blood_request_id: null,
                related_user_id:  req.user.id
            });
        } catch (notifErr) {
            console.warn('[DONOR REG] Notification error:', notifErr.message);
        }

        console.log(`[ADMIN] Donor registration #${id} approved by admin ${req.user.id}`);
        res.json({ message: 'Registration approved successfully', registration_id: id });
    } catch (error) {
        console.error('Approve donor registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * POST /api/admin/donor-registrations/:id/complete
 * Admin records the actual donation: blood_type, units, donation_date
 * → inserts into inventory table, marks registration completed, updates user stats
 */
router.post('/donor-registrations/:id/complete', async (req, res) => {
    try {
        const { id } = req.params;
        const { blood_type, units, donation_date, notes } = req.body;

        if (!blood_type || !units || !donation_date) {
            return res.status(400).json({ message: 'blood_type, units, and donation_date are required' });
        }
        const parsedUnits = parseFloat(units);
        if (isNaN(parsedUnits) || parsedUnits <= 0) {
            return res.status(400).json({ message: 'units must be a positive number' });
        }

        const [regs] = await db.execute(
            'SELECT * FROM donor_registrations WHERE id = ?', [id]
        );
        if (regs.length === 0) {
            return res.status(404).json({ message: 'Registration not found' });
        }
        if (regs[0].status !== 'approved') {
            return res.status(400).json({ message: 'Only approved registrations can be completed' });
        }
        const reg = regs[0];

        // 1. Mark registration as completed
        await db.execute(
            `UPDATE donor_registrations
             SET status = 'completed', reviewed_by = ?, reviewed_at = NOW()
             WHERE id = ?`,
            [req.user.id, id]
        );

        // 2. Insert into inventory table
        const [invResult] = await db.execute(
            `INSERT INTO inventory
             (blood_type, units, source_type, donor_registration_id, received_at, notes, recorded_by)
             VALUES (?, ?, 'donation', ?, ?, ?, ?)`,
            [blood_type, parsedUnits, id, donation_date, notes || null, req.user.id]
        );

        // 2b. Create donations record for gamification tracking
        await db.execute(
            `INSERT INTO donations
             (user_id, blood_type, blood_units, status, donation_date)
             VALUES (?, ?, ?, 'completed', ?)`,
            [reg.user_id, blood_type, parsedUnits, donation_date]
        );

        // 3. Update user stats (total_donations, lives_impacted) + set cooldown
        await db.execute(
            `UPDATE users
             SET total_donations  = COALESCE(total_donations, 0) + 1,
                 lives_impacted   = COALESCE(lives_impacted, 0) + 1,
                 is_available_donor = 0,
                 cooldown_ends_at   = DATE_ADD(?, INTERVAL 56 DAY)
             WHERE id = ?`,
            [donation_date, reg.user_id]
        );

        // 4. Notify donor
        try {
            const Notification = require('../models/Notification');
            await Notification.create({
                user_id:  reg.user_id,
                type:     'donation_completed',
                title:    'Donation Recorded — Thank You!',
                message:  `Your donation of ${parsedUnits} unit(s) of ${blood_type} blood on ${donation_date} has been recorded. You have saved lives! Your next eligible donation date is 56 days from now.`,
                blood_request_id: null,
                related_user_id:  req.user.id
            });
        } catch (notifErr) {
            console.warn('[DONOR COMPLETE] Notification error:', notifErr.message);
        }

        console.log(`[ADMIN] Donation completed: reg #${id}, ${parsedUnits}u ${blood_type}, inventory entry #${invResult.insertId}`);

        res.json({
            success: true,
            message: 'Donation recorded and inventory updated successfully',
            inventory_id: invResult.insertId
        });
    } catch (error) {
        console.error('Complete donation error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * GET /api/admin/inventory-log
 * Returns paginated inventory entries for audit
 */
router.get('/inventory-log', async (req, res) => {
    try {
        const limit  = Math.min(parseInt(req.query.limit)  || 50, 200);
        const offset = parseInt(req.query.offset) || 0;

        const [rows] = await db.query(`
            SELECT
                i.id, i.blood_type, i.units, i.source_type, i.received_at,
                i.notes, i.created_at,
                dr.fullname  AS donor_name,
                u.fullname   AS recorded_by_name
            FROM inventory i
            LEFT JOIN donor_registrations dr ON i.donor_registration_id = dr.id
            LEFT JOIN users u ON i.recorded_by = u.id
            ORDER BY i.received_at DESC, i.created_at DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        const [countRes] = await db.execute('SELECT COUNT(*) AS total FROM inventory');

        res.json({ entries: rows, total: Number(countRes[0].total) });
    } catch (error) {
        console.error('Inventory log error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * POST /api/admin/inventory/manual
 * Admin manually adds blood units (e.g. from external donation drives)
 */
router.post('/inventory/manual', async (req, res) => {
    try {
        const { blood_type, units, received_at, notes, source_type } = req.body;
        if (!blood_type || !units || !received_at) {
            return res.status(400).json({ message: 'blood_type, units, and received_at are required' });
        }
        const parsedUnits = parseFloat(units);
        if (isNaN(parsedUnits) || parsedUnits <= 0) {
            return res.status(400).json({ message: 'units must be positive' });
        }
        const [result] = await db.execute(
            `INSERT INTO inventory (blood_type, units, source_type, received_at, notes, recorded_by)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [blood_type, parsedUnits, source_type || 'manual', received_at, notes || null, req.user.id]
        );
        res.status(201).json({ success: true, message: 'Inventory entry added', inventory_id: result.insertId });
    } catch (error) {
        console.error('Manual inventory error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * POST /api/admin/donor-registrations/:id/reject
 * Reject a donor registration
 */
router.post('/donor-registrations/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const [regs] = await db.execute(
            'SELECT * FROM donor_registrations WHERE id = ?', [id]
        );
        if (regs.length === 0) {
            return res.status(404).json({ message: 'Registration not found' });
        }
        if (regs[0].status !== 'pending') {
            return res.status(400).json({ message: 'Registration already processed' });
        }

        const reg = regs[0];

        await db.execute(
            `UPDATE donor_registrations
             SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(),
                 notes  = CONCAT(IFNULL(notes, ''), IF(? IS NOT NULL, CONCAT('\nAdmin: ', ?), ''))
             WHERE id = ?`,
            [req.user.id, reason || null, reason || null, id]
        );

        // Notify user
        try {
            const Notification = require('../models/Notification');
            await Notification.create({
                user_id:  reg.user_id,
                type:     'donor_rejected',
                title:    'Donor Registration Update',
                message:  reason
                            ? `Your donor registration was not approved: ${reason}`
                            : 'Your donor registration was not approved at this time.',
                blood_request_id: null,
                related_user_id:  req.user.id
            });
        } catch (notifErr) {
            console.warn('[DONOR REG] Notification error:', notifErr.message);
        }

        console.log(`[ADMIN] Donor registration #${id} rejected by admin ${req.user.id}`);
        res.json({ message: 'Registration rejected', registration_id: id });
    } catch (error) {
        console.error('Reject donor registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ══════════════════════════════════════════════════════════════
// RECEIVER REQUESTS — Critical blood requests managed by admin
// ══════════════════════════════════════════════════════════════

/**
 * GET /api/admin/receiver-requests
 * Returns critical blood requests with status pending or approved.
 * These are managed directly by admin (contact user → approve/decline → complete).
 */
router.get('/receiver-requests', async (req, res) => {
    try {
        const [requests] = await db.execute(`
            SELECT
                br.id,
                br.blood_type,
                br.units_required,
                br.urgency_level,
                br.hospital_name,
                br.city,
                br.status,
                br.notes,
                br.created_at,
                u.fullname  AS patient_name,
                u.email     AS patient_email,
                u.phone     AS patient_phone,
                br.user_id
            FROM blood_requests br
            JOIN users u ON br.user_id = u.id
            WHERE br.urgency_level = 'critical'
              AND br.status IN ('pending', 'approved')
            ORDER BY br.created_at DESC
        `);
        res.json({ requests, total: requests.length });
    } catch (error) {
        console.error('[RECEIVER REQUESTS] GET error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * POST /api/admin/receiver-requests/:id/approve
 * Approve a critical blood request (admin has contacted user externally).
 * Does NOT notify donors — only notifies the requesting user.
 */
router.post('/receiver-requests/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.execute(
            'SELECT * FROM blood_requests WHERE id = ? AND urgency_level = \'critical\'',
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Critical blood request not found' });
        }
        if (rows[0].status !== 'pending') {
            return res.status(400).json({ message: 'Request is not in pending status' });
        }

        const request = rows[0];

        await db.execute(
            'UPDATE blood_requests SET status = \'approved\', updated_at = NOW() WHERE id = ?',
            [id]
        );

        // Notify the requesting user
        try {
            await Notification.create({
                user_id:          request.user_id,
                type:             'blood_request_approved',
                title:            '🩸 Your Critical Blood Request Was Approved',
                message:          `Your critical blood request for ${request.blood_type} (${request.units_required} unit(s)) at ${request.hospital_name} has been reviewed and approved. Our team will be in contact with you.`,
                blood_request_id: request.id,
                related_user_id:  req.user.id
            });
        } catch (notifErr) {
            console.warn('[RECEIVER APPROVE] Notification error:', notifErr.message);
        }

        console.log(`[ADMIN] Critical receiver request #${id} approved by admin ${req.user.id}`);
        res.json({ message: 'Receiver request approved successfully', request_id: id });
    } catch (error) {
        console.error('[RECEIVER APPROVE] Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * POST /api/admin/receiver-requests/:id/decline
 * Decline a critical blood request.
 */
router.post('/receiver-requests/:id/decline', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const [rows] = await db.execute(
            'SELECT * FROM blood_requests WHERE id = ? AND urgency_level = \'critical\'',
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Critical blood request not found' });
        }
        if (!['pending', 'approved'].includes(rows[0].status)) {
            return res.status(400).json({ message: 'Request cannot be declined in its current state' });
        }

        const request = rows[0];

        await db.execute(
            `UPDATE blood_requests
             SET status = 'cancelled', updated_at = NOW(),
                 notes  = CONCAT(IFNULL(notes, ''), IF(? IS NOT NULL, CONCAT('\nAdmin decline reason: ', ?), ''))
             WHERE id = ?`,
            [reason || null, reason || null, id]
        );

        // Notify the requesting user
        try {
            await Notification.create({
                user_id:          request.user_id,
                type:             'blood_request_declined',
                title:            'Critical Blood Request Update',
                message:          reason
                                    ? `Your critical blood request for ${request.blood_type} was declined: ${reason}`
                                    : `Your critical blood request for ${request.blood_type} was not approved at this time. Please contact us for more information.`,
                blood_request_id: request.id,
                related_user_id:  req.user.id
            });
        } catch (notifErr) {
            console.warn('[RECEIVER DECLINE] Notification error:', notifErr.message);
        }

        console.log(`[ADMIN] Critical receiver request #${id} declined by admin ${req.user.id}`);
        res.json({ message: 'Receiver request declined', request_id: id });
    } catch (error) {
        console.error('[RECEIVER DECLINE] Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * POST /api/admin/receiver-requests/:id/complete
 * Mark a critical blood request as fulfilled and decrement inventory.
 * Accepts: { blood_type, units, completion_date, notes }
 * Inventory is decremented by inserting a negative-unit 'usage' entry — this
 * keeps the existing SUM(units) query accurate and preserves audit trail.
 */
router.post('/receiver-requests/:id/complete', async (req, res) => {
    try {
        const { id } = req.params;
        const { blood_type, units, completion_date, notes } = req.body;

        if (!blood_type || !units || !completion_date) {
            return res.status(400).json({ message: 'blood_type, units, and completion_date are required' });
        }
        const parsedUnits = parseFloat(units);
        if (isNaN(parsedUnits) || parsedUnits <= 0) {
            return res.status(400).json({ message: 'units must be a positive number' });
        }

        const [rows] = await db.execute(
            'SELECT * FROM blood_requests WHERE id = ? AND urgency_level = \'critical\'',
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Critical blood request not found' });
        }
        if (rows[0].status !== 'approved') {
            return res.status(400).json({ message: 'Only approved receiver requests can be completed' });
        }

        const request = rows[0];

        // 1. Check inventory has sufficient stock
        const [stockRows] = await db.execute(
            'SELECT COALESCE(SUM(units), 0) AS total FROM inventory WHERE blood_type = ?',
            [blood_type]
        );
        const currentStock = parseFloat(stockRows[0].total);
        if (currentStock < parsedUnits) {
            return res.status(400).json({
                message: `Insufficient inventory. Available ${blood_type}: ${currentStock.toFixed(1)} unit(s), requested: ${parsedUnits}.`
            });
        }

        // 2. Decrement inventory via negative-unit 'usage' entry (preserves audit trail)
        const [invResult] = await db.execute(
            `INSERT INTO inventory
             (blood_type, units, source_type, received_at, notes, recorded_by)
             VALUES (?, ?, 'usage', ?, ?, ?)`,
            [blood_type, -parsedUnits, completion_date, notes || `Receiver request #${id} fulfilled` , req.user.id]
        );

        // 3. Mark blood request as fulfilled
        await db.execute(
            'UPDATE blood_requests SET status = \'fulfilled\', updated_at = NOW() WHERE id = ?',
            [id]
        );

        // 4. Notify the requesting user
        try {
            await Notification.create({
                user_id:          request.user_id,
                type:             'blood_request_fulfilled',
                title:            '✅ Blood Request Fulfilled',
                message:          `Your critical blood request for ${blood_type} (${parsedUnits} unit(s)) at ${request.hospital_name} has been fulfilled. ${parsedUnits} unit(s) have been allocated from our inventory.`,
                blood_request_id: request.id,
                related_user_id:  req.user.id
            });
        } catch (notifErr) {
            console.warn('[RECEIVER COMPLETE] Notification error:', notifErr.message);
        }

        console.log(`[ADMIN] Critical receiver request #${id} completed: ${parsedUnits}u ${blood_type} deducted from inventory (entry #${invResult.insertId})`);
        res.json({
            success: true,
            message: 'Receiver request fulfilled and inventory decremented successfully',
            inventory_entry_id: invResult.insertId,
            units_deducted: parsedUnits,
            blood_type
        });
    } catch (error) {
        console.error('[RECEIVER COMPLETE] Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
