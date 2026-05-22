'use strict';

/**
 * services/gamificationService.js
 *
 * Data sources:
 *   donations        → user_id, blood_units DECIMAL, status ('completed')
 *   donation_attempts → donor_id, blood_units INT, status ('accepted')
 *
 * NOTE on double-counting:
 *   When a blood-request donation is confirmed via /:id/confirm-complete, the
 *   handler inserts a row into `donations` (status='completed') AND the matching
 *   `donation_attempts` row stays status='accepted'.  Counting BOTH would double-
 *   count every request-based donation.  We therefore count ONLY `donations` as
 *   the canonical, authoritative source for all confirmed donations.
 */

const { db } = require('../config/database');

/* ── Tier thresholds ───────────────────────────────────────────────────────── */
const TIERS = [
    { name: 'Bronze',   min: 0,  max: 4         },
    { name: 'Silver',   min: 5,  max: 14        },
    { name: 'Gold',     min: 15, max: 29        },
    { name: 'Platinum', min: 30, max: Infinity  },
];

const ML_PER_UNIT = 450; // standard whole blood unit in ml

/* ── Helpers ───────────────────────────────────────────────────────────────── */

/**
 * Resolve tier info for a given donation count.
 */
function resolveTier(count) {
    const idx  = TIERS.findIndex(t => count >= t.min && count <= t.max);
    const tier = TIERS[Math.max(0, idx)];
    const next = TIERS[idx + 1] || null;

    const bandSize        = tier.max === Infinity ? 1 : (tier.max - tier.min + 1);
    const posInBand       = count - tier.min;
    const progressPercent = tier.max === Infinity
        ? 100
        : Math.round((posInBand / bandSize) * 100);

    return {
        current:          tier.name,
        next:             next ? next.name : null,
        donationsToNext:  next ? next.min - count : 0,
        progressPercent:  Math.min(100, Math.max(0, progressPercent)),
    };
}

/**
 * Format a volume in ml for display.
 * @example formatVolume(999) → "999 ml"
 * @example formatVolume(1000) → "1.00 L"
 */
function formatVolume(ml) {
    if (ml >= 1000) return `${(ml / 1000).toFixed(2)} L`;
    return `${ml} ml`;
}

/* ── syncBadgesForUser ─────────────────────────────────────────────────────── */
/**
 * Lazy backfill: award every badge the user qualifies for that they don't yet have.
 * Also keeps users.total_donations + users.donor_tier in sync.
 * Safe to call on every page load — INSERT IGNORE prevents duplicates.
 *
 * @param {number} userId
 * @param {number} donationCount  - authoritative recount (from donations table)
 */
async function syncBadgesForUser(userId, donationCount) {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const newTier = resolveTier(donationCount).current;

        // Sync users row
        await conn.execute(
            `UPDATE users SET total_donations = ?, donor_tier = ? WHERE id = ?`,
            [donationCount, newTier, userId]
        );

        // Award all badges the user now qualifies for
        const [eligible] = await conn.execute(
            `SELECT id FROM badges WHERE unlocks_at <= ?`,
            [donationCount]
        );

        if (eligible.length > 0) {
            const placeholders = eligible.map(() => '(?, ?)').join(',');
            const params       = eligible.flatMap(b => [userId, b.id]);
            await conn.execute(
                `INSERT IGNORE INTO user_badges (user_id, badge_id) VALUES ${placeholders}`,
                params
            );
        }

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        console.error('[GAMIFICATION] syncBadgesForUser error (non-fatal):', err.message);
    } finally {
        conn.release();
    }
}

/* ── getDonationStats ──────────────────────────────────────────────────────── */
/**
 * Returns full gamification stats for a user.
 * Lazily syncs badges + tier on every call (idempotent).
 *
 * @param {number} userId
 * @returns {Promise<object>}
 */
async function getDonationStats(userId) {
    // Count ONLY from the canonical `donations` table.
    // (donation_attempts.status='accepted' would double-count request-based donations
    //  because confirm-complete also inserts a row into `donations`.)
    const [[donRows]] = await db.execute(
        `SELECT
             COUNT(*)                      AS donation_count,
             COALESCE(SUM(blood_units), 0) AS total_units
         FROM donations
         WHERE user_id = ? AND status = 'completed'`,
        [userId]
    );

    const donationCount = Number(donRows.donation_count);
    const totalUnits    = Number(donRows.total_units);
    const totalMl       = Math.round(totalUnits * ML_PER_UNIT);

    // Lazy sync — backfill badges & tier (no-op if already correct)
    await syncBadgesForUser(userId, donationCount);

    // Tier info
    const tierInfo = resolveTier(donationCount);

    // All badge definitions
    const [allBadges] = await db.execute(
        `SELECT id, name, description, icon, unlocks_at FROM badges ORDER BY unlocks_at ASC`
    );

    // This user's earned badges (re-read after sync so it's always fresh)
    const [earnedRows] = await db.execute(
        `SELECT ub.badge_id, ub.awarded_at, b.name, b.description, b.icon, b.unlocks_at
         FROM user_badges ub
         JOIN badges b ON b.id = ub.badge_id
         WHERE ub.user_id = ?
         ORDER BY b.unlocks_at ASC`,
        [userId]
    );

    const earnedIds = new Set(earnedRows.map(r => r.badge_id));

    const earnedBadges = earnedRows.map(r => ({
        id:          r.badge_id,
        name:        r.name,
        description: r.description,
        icon:        r.icon,
        awarded_at:  r.awarded_at,
    }));

    const lockedBadges = allBadges
        .filter(b => !earnedIds.has(b.id))
        .map(b => ({
            id:          b.id,
            name:        b.name,
            description: b.description,
            icon:        b.icon,
            unlocksAt:   b.unlocks_at,
        }));

    return {
        donationCount,
        totalUnits,
        totalMlDonated:      totalMl,
        displayVolume:       formatVolume(totalMl),
        currentTier:         tierInfo.current,
        nextTier:            tierInfo.next,
        donationsToNextTier: tierInfo.donationsToNext,
        progressPercent:     tierInfo.progressPercent,
        earnedBadges,
        lockedBadges,
    };
}

/* ── checkAndAwardBadges ───────────────────────────────────────────────────── */
/**
 * Award badges inside an active transaction.
 * Uses INSERT IGNORE — idempotent.
 *
 * @param {number} userId
 * @param {number} newDonationCount
 * @param {object} connection  - active mysql2 connection (inside transaction)
 * @returns {Promise<string[]>}  newly awarded badge IDs
 */
async function checkAndAwardBadges(userId, newDonationCount, connection) {
    const [eligible] = await connection.execute(
        `SELECT id FROM badges WHERE unlocks_at <= ?`,
        [newDonationCount]
    );
    if (!eligible.length) return [];

    const eligibleIds   = eligible.map(b => b.id);
    const inList        = eligibleIds.map(() => '?').join(',');

    const [already] = await connection.execute(
        `SELECT badge_id FROM user_badges WHERE user_id = ? AND badge_id IN (${inList})`,
        [userId, ...eligibleIds]
    );
    const alreadySet = new Set(already.map(r => r.badge_id));

    const toAward = eligibleIds.filter(id => !alreadySet.has(id));
    if (!toAward.length) return [];

    const placeholders = toAward.map(() => '(?, ?)').join(',');
    const params       = toAward.flatMap(id => [userId, id]);

    await connection.execute(
        `INSERT IGNORE INTO user_badges (user_id, badge_id) VALUES ${placeholders}`,
        params
    );

    console.log(`[GAMIFICATION] Awarded badges to user ${userId}:`, toAward);
    return toAward;
}

/* ── updateDonationCount ───────────────────────────────────────────────────── */
/**
 * Recounts confirmed donations, updates users row, awards badges.
 * Must be called INSIDE a MySQL transaction.
 *
 * @param {number} userId
 * @param {object} connection
 * @returns {Promise<{ newCount, newTier, newlyAwardedBadges }>}
 */
async function updateDonationCount(userId, connection) {
    // Count ONLY from canonical donations table
    const [[row]] = await connection.execute(
        `SELECT COUNT(*) AS cnt FROM donations WHERE user_id = ? AND status = 'completed'`,
        [userId]
    );

    const newCount = Number(row.cnt);
    const newTier  = resolveTier(newCount).current;

    await connection.execute(
        `UPDATE users SET total_donations = ?, donor_tier = ? WHERE id = ?`,
        [newCount, newTier, userId]
    );

    const newlyAwardedBadges = await checkAndAwardBadges(userId, newCount, connection);

    return { newCount, newTier, newlyAwardedBadges };
}

/* ── Exports ───────────────────────────────────────────────────────────────── */
module.exports = {
    getDonationStats,
    syncBadgesForUser,
    checkAndAwardBadges,
    updateDonationCount,
    resolveTier,
    formatVolume,
};
