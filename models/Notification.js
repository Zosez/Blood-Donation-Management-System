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

    static async findByUserId(userId, limit = 50, offset = 0) {
        const [rows] = await db.execute(
            `SELECT * FROM notifications WHERE user_id = ? 
             ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );
        return rows;
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
