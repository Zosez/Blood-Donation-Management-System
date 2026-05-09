const express = require('express');
const router = express.Router();
const { param, validationResult } = require('express-validator');
const Notification = require('../models/Notification');
const { authenticateToken } = require('../middleware/auth');

// All notification routes require authentication
router.use(authenticateToken);

// ──────────────────────────────────────────────
// GET /api/notifications
// Get user notifications (newest first, limit 20)
// ──────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const notifications = await Notification.findByUserIdWithRequest(req.user.id, 20);
        res.json({ notifications });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ──────────────────────────────────────────────
// GET /api/notifications/unread-count
// Get unread notification count (for badge)
// ──────────────────────────────────────────────
router.get('/unread-count', async (req, res) => {
    try {
        const count = await Notification.countUnread(req.user.id);
        res.json({ count });
    } catch (error) {
        console.error('Unread count error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ──────────────────────────────────────────────
// PATCH /api/notifications/read-all
// Mark all notifications as read
// ──────────────────────────────────────────────
router.patch('/read-all', async (req, res) => {
    try {
        await Notification.markAllAsRead(req.user.id);
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ──────────────────────────────────────────────
// PATCH /api/notifications/:id/read
// Mark single notification as read (ownership check)
// ──────────────────────────────────────────────
router.patch('/:id/read', [
    param('id').isInt().withMessage('Invalid notification ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const success = await Notification.markAsReadForUser(req.params.id, req.user.id);
        if (!success) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
