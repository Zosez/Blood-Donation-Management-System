const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { db } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// ─────────────────────────────────────────────────────────────
// Helper: format a DB event row for API response
// ─────────────────────────────────────────────────────────────
function formatEvent(row) {
    return {
        id:          row.id,
        title:       row.title,
        event_date:  row.event_date,          // ISO date string
        event_time:  row.event_time || '',
        location:    row.location || '',
        blood_types: row.blood_types || '',
        quota:       row.quota || 40,
        registered:  row.registered || 0,
        description: row.description || '',
        status:      row.status || 'Upcoming',
        created_at:  row.created_at
    };
}

// ─────────────────────────────────────────────────────────────
// GET /api/events
// Public — returns all Upcoming events (for landing page)
// Admin may pass ?all=1 to get Closed + Cancelled too
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const showAll = req.query.all === '1';
        const [rows] = showAll
            ? await db.execute(
                'SELECT * FROM events ORDER BY event_date ASC'
              )
            : await db.execute(
                "SELECT * FROM events WHERE status = 'Upcoming' ORDER BY event_date ASC"
              );

        res.json({ events: rows.map(formatEvent) });
    } catch (err) {
        console.error('[EVENTS] GET / error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/events/:id
// Public — single event details
// ─────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM events WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ message: 'Event not found' });
        res.json({ event: formatEvent(rows[0]) });
    } catch (err) {
        console.error('[EVENTS] GET /:id error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/events
// Admin only — create a new event
// ─────────────────────────────────────────────────────────────
router.post(
    '/',
    authenticateToken,
    requireAdmin,
    [
        body('title').trim().notEmpty().isLength({ max: 255 }).withMessage('Title required'),
        body('event_date').isISO8601().withMessage('Valid date required'),
        body('event_time').optional().trim().isLength({ max: 50 }),
        body('location').optional().trim().isLength({ max: 255 }),
        body('blood_types').optional().trim().isLength({ max: 255 }),
        body('quota').optional().isInt({ min: 1 }),
        body('description').optional().trim().isLength({ max: 2000 })
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        try {
            const { title, event_date, event_time, location, blood_types, quota, description } = req.body;

            const [result] = await db.execute(
                `INSERT INTO events (title, event_date, event_time, location, blood_types, quota, description, status, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'Upcoming', ?)`,
                [
                    title,
                    event_date,
                    event_time || null,
                    location   || null,
                    blood_types || null,
                    quota || 40,
                    description || null,
                    req.user.id
                ]
            );

            const [rows] = await db.execute('SELECT * FROM events WHERE id = ?', [result.insertId]);
            res.status(201).json({ message: 'Event created', event: formatEvent(rows[0]) });
        } catch (err) {
            console.error('[EVENTS] POST / error:', err.message);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// ─────────────────────────────────────────────────────────────
// PUT /api/events/:id
// Admin only — update event details
// ─────────────────────────────────────────────────────────────
router.put(
    '/:id',
    authenticateToken,
    requireAdmin,
    [
        body('title').optional().trim().notEmpty().isLength({ max: 255 }),
        body('event_date').optional().isISO8601(),
        body('event_time').optional().trim().isLength({ max: 50 }),
        body('location').optional().trim().isLength({ max: 255 }),
        body('blood_types').optional().trim().isLength({ max: 255 }),
        body('quota').optional().isInt({ min: 1 }),
        body('description').optional().trim().isLength({ max: 2000 })
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        try {
            const { id } = req.params;
            const [existing] = await db.execute('SELECT id FROM events WHERE id = ?', [id]);
            if (!existing.length) return res.status(404).json({ message: 'Event not found' });

            const { title, event_date, event_time, location, blood_types, quota, description } = req.body;

            await db.execute(
                `UPDATE events SET
                    title       = COALESCE(?, title),
                    event_date  = COALESCE(?, event_date),
                    event_time  = COALESCE(?, event_time),
                    location    = COALESCE(?, location),
                    blood_types = COALESCE(?, blood_types),
                    quota       = COALESCE(?, quota),
                    description = COALESCE(?, description)
                 WHERE id = ?`,
                [title || null, event_date || null, event_time || null,
                 location || null, blood_types || null, quota || null,
                 description || null, id]
            );

            const [rows] = await db.execute('SELECT * FROM events WHERE id = ?', [id]);
            res.json({ message: 'Event updated', event: formatEvent(rows[0]) });
        } catch (err) {
            console.error('[EVENTS] PUT /:id error:', err.message);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// ─────────────────────────────────────────────────────────────
// PATCH /api/events/:id/status
// Admin only — change status (Close or Cancel)
// body: { status: 'Closed' | 'Cancelled' }
// ─────────────────────────────────────────────────────────────
router.patch(
    '/:id/status',
    authenticateToken,
    requireAdmin,
    [
        body('status').isIn(['Upcoming', 'Closed', 'Cancelled']).withMessage('Invalid status')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        try {
            const { id } = req.params;
            const { status } = req.body;

            const [existing] = await db.execute('SELECT id FROM events WHERE id = ?', [id]);
            if (!existing.length) return res.status(404).json({ message: 'Event not found' });

            await db.execute('UPDATE events SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
            res.json({ message: `Event marked as ${status}` });
        } catch (err) {
            console.error('[EVENTS] PATCH /:id/status error:', err.message);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// ─────────────────────────────────────────────────────────────
// DELETE /api/events/:id
// Admin only — permanently delete an event
// ─────────────────────────────────────────────────────────────
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const [existing] = await db.execute('SELECT id FROM events WHERE id = ?', [id]);
        if (!existing.length) return res.status(404).json({ message: 'Event not found' });

        await db.execute('DELETE FROM events WHERE id = ?', [id]);
        res.json({ message: 'Event deleted' });
    } catch (err) {
        console.error('[EVENTS] DELETE /:id error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/events/:id/register
// Authenticated user — register for an event
// ─────────────────────────────────────────────────────────────
router.post('/:id/register', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check event exists and is Upcoming
        const [rows] = await db.execute('SELECT * FROM events WHERE id = ?', [id]);
        if (!rows.length) return res.status(404).json({ message: 'Event not found' });

        const event = rows[0];
        if (event.status !== 'Upcoming') {
            return res.status(400).json({ message: 'This event is no longer accepting registrations.' });
        }

        if (event.registered >= event.quota) {
            return res.status(400).json({ message: 'This event has reached its quota.' });
        }

        // Insert registration (UNIQUE key prevents duplicates)
        try {
            await db.execute(
                'INSERT INTO event_registrations (event_id, user_id) VALUES (?, ?)',
                [id, userId]
            );
        } catch (dupErr) {
            if (dupErr.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'You are already registered for this event.' });
            }
            throw dupErr;
        }

        // Increment registered count
        await db.execute('UPDATE events SET registered = registered + 1 WHERE id = ?', [id]);

        res.json({ message: 'Successfully registered for event.' });
    } catch (err) {
        console.error('[EVENTS] POST /:id/register error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
