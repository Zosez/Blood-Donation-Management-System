const { db } = require('../config/database');

class BloodRequest {
    static async create(requestData) {
        const { user_id, blood_type, units, hospital_name, city, urgency, expires_at } = requestData;
        const [result] = await db.execute(
            'INSERT INTO blood_requests (user_id, blood_type, units, hospital_name, city, urgency, expires_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [user_id, blood_type, units || 1, hospital_name, city, urgency || 'normal', expires_at || null, 'active']
        );
        return result.insertId;
    }

    static async findAllActive() {
        const [rows] = await db.execute(
            'SELECT * FROM blood_requests WHERE status = ? ORDER BY urgency DESC, created_at DESC',
            ['active']
        );
        return rows;
    }

    static async findByUserId(userId) {
        const [rows] = await db.execute(
            'SELECT * FROM blood_requests WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        return rows;
    }

    static async updateStatus(id, status) {
        const [result] = await db.execute(
            'UPDATE blood_requests SET status = ? WHERE id = ?',
            [status, id]
        );
        return result.affectedRows > 0;
    }

    static async findMatchedRequests(bloodType) {
        const [rows] = await db.execute(
            'SELECT * FROM blood_requests WHERE status = ? AND blood_type = ? ORDER BY urgency DESC, created_at DESC',
            ['active', bloodType]
        );
        return rows;
    }
}

module.exports = BloodRequest;
