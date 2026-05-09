const { db } = require('../config/database');

class Notification {
    static async create(notificationData) {
        const { user_id, type, title, message, blood_request_id, related_user_id } = notificationData;
        
        const [result] = await db.execute(
            `INSERT INTO notifications 
                (user_id, type, title, message, blood_request_id, related_user_id, is_read)
             VALUES (?, ?, ?, ?, ?, ?, 0)`,
            [user_id, type, title, message, blood_request_id || null, related_user_id || null]
        );
        
        return result.insertId;
    }

    /**
     * Bulk-insert multiple notifications in one query.
     * @param {Array} notifications - array of { user_id, type, title, message, blood_request_id }
     */
    static async insertMany(notifications) {
        if (!notifications || notifications.length === 0) return;

        const placeholders = notifications.map(() => '(?, ?, ?, ?, ?, 0)').join(', ');
        const values = [];
        for (const n of notifications) {
            values.push(
                n.user_id,
                n.type || 'blood_match',
                n.title,
                n.message,
                n.blood_request_id || null
            );
        }

        await db.execute(
            `INSERT INTO notifications (user_id, type, title, message, blood_request_id, is_read)
             VALUES ${placeholders}`,
            values
        );
    }

    /**
     * Find user notifications, newest first, with blood_request details joined.
     * @param {number} userId
     * @param {number} limit
     */
    static async findByUserIdWithRequest(userId, limit = 20) {
        const [rows] = await db.execute(
            `SELECT 
                n.id,
                n.user_id,
                n.type,
                n.title,
                n.message,
                n.is_read,
                n.created_at,
                n.blood_request_id,
                br.blood_type   AS req_blood_type,
                br.hospital_name AS req_hospital,
                br.city         AS req_city,
                br.status       AS req_status
             FROM notifications n
             LEFT JOIN blood_requests br ON n.blood_request_id = br.id
             WHERE n.user_id = ?
             ORDER BY n.created_at DESC
             LIMIT ?`,
            [userId, limit]
        );
        return rows;
    }

    static async findByUserId(userId, limit = 50, offset = 0) {
        const [rows] = await db.execute(
            `SELECT * FROM notifications WHERE user_id = ? 
             ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );
        return rows;
    }

    /**
     * Mark a single notification as read with ownership check.
     */
    static async markAsReadForUser(notificationId, userId) {
        const [result] = await db.execute(
            'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
            [notificationId, userId]
        );
        return result.affectedRows > 0;
    }

    static async markAsRead(notificationId) {
        const [result] = await db.execute(
            'UPDATE notifications SET is_read = 1 WHERE id = ?',
            [notificationId]
        );
        return result.affectedRows > 0;
    }

    static async markAllAsRead(userId) {
        const [result] = await db.execute(
            'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
            [userId]
        );
        return result.affectedRows > 0;
    }

    static async countUnread(userId) {
        const [rows] = await db.execute(
            'SELECT COUNT(id) as count FROM notifications WHERE user_id = ? AND is_read = 0',
            [userId]
        );
        return rows[0].count || 0;
    }

    static async deleteOlderThan(days = 30) {
        const [result] = await db.execute(
            'DELETE FROM notifications WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
            [days]
        );
        return result.affectedRows;
    }
}

module.exports = Notification;
