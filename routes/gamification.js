'use strict';

/**
 * routes/gamification.js
 * GET  /api/gamification/stats   → stats + badges for logged-in user
 * POST /api/gamification/resync  → clears stale badges and re-awards from scratch
 */

const express = require('express');
const router  = express.Router();
const { authenticateToken }                        = require('../middleware/auth');
const { getDonationStats, syncBadgesForUser }      = require('../services/gamificationService');
const { db }                                       = require('../config/database');

// ── GET /api/gamification/stats ──────────────────────────────────────────────
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const data = await getDonationStats(req.user.id);
        res.json({ success: true, data });
    } catch (error) {
        console.error('[GAMIFICATION] getDonationStats error:', error);
        res.status(500).json({ success: false, message: 'Failed to load donation stats' });
    }
});

// ── POST /api/gamification/resync ────────────────────────────────────────────
// Clears this user's stale user_badges rows and re-awards badges from the
// correct authoritative count (donations.completed only — no double-count).
// Called automatically by donationStats.js on first profile page load.
router.post('/resync', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Get correct authoritative count
        const [[row]] = await db.execute(
            `SELECT COUNT(*) AS cnt FROM donations WHERE user_id = ? AND status = 'completed'`,
            [userId]
        );
        const donationCount = Number(row.cnt);

        // 2. Clear stale badges (earned under old double-count logic)
        await db.execute('DELETE FROM user_badges WHERE user_id = ?', [userId]);

        // 3. Re-award correctly
        await syncBadgesForUser(userId, donationCount);

        console.log(`[GAMIFICATION] Resync complete for user ${userId}: count=${donationCount}`);
        res.json({ success: true, donationCount });
    } catch (err) {
        console.error('[GAMIFICATION] resync error:', err);
        res.status(500).json({ success: false, message: 'Resync failed' });
    }
});

module.exports = router;
