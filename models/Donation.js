const { db } = require('../config/database');

class Donation {
    static async create(donationData) {
        const { user_id, donation_date, blood_units, donation_center, next_eligible_date } = donationData;
        const [result] = await db.execute(
            'INSERT INTO donations (user_id, donation_date, blood_units, donation_center, next_eligible_date, status) VALUES (?, ?, ?, ?, ?, ?)',
            [user_id, donation_date, blood_units || 1, donation_center, next_eligible_date || null, 'pending']
        );
        return result.insertId;
    }

    static async findByUserId(userId) {
        const [rows] = await db.execute(
            'SELECT * FROM donations WHERE user_id = ? ORDER BY donation_date DESC',
            [userId]
        );
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM donations WHERE id = ?', [id]);
        return rows[0] || null;
    }

    static async updateStatus(id, status) {
        const [result] = await db.execute(
            'UPDATE donations SET status = ? WHERE id = ?',
            [status, id]
        );
        return result.affectedRows > 0;
    }
}

module.exports = Donation;