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

    static async getUserStats(userId) {
        const [rows] = await db.execute(
            'SELECT COUNT(id) as total_donations, SUM(blood_units) as total_units FROM donations WHERE user_id = ? AND status != "cancelled"',
            [userId]
        );
        return {
            total_donations: rows[0].total_donations || 0,
            total_units: Number(rows[0].total_units) || 0
        };
    }

    static async getLastDonation(userId) {
        const [rows] = await db.execute(
            'SELECT MAX(donation_date) as last_donation_date FROM donations WHERE user_id = ? AND status = "completed"',
            [userId]
        );
        return rows[0].last_donation_date || null;
    }

    static async checkDonationEligibility(userId) {
        const lastDonation = await this.getLastDonation(userId);
        
        if (!lastDonation) {
            return { eligible: true, nextEligibleDate: null };
        }

        const lastDonationDate = new Date(lastDonation);
        const daysToWait = 56;
        const nextEligibleDate = new Date(lastDonationDate.getTime() + daysToWait * 24 * 60 * 60 * 1000);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const eligible = nextEligibleDate <= today;

        return {
            eligible,
            nextEligibleDate: nextEligibleDate.toISOString().split('T')[0],
            lastDonationDate: lastDonationDate.toISOString().split('T')[0],
            daysUntilEligible: Math.max(0, Math.ceil((nextEligibleDate - today) / (1000 * 60 * 60 * 24)))
        };
    }
}

module.exports = Donation;