const { db } = require('../config/database');

class BloodRequest {
    /**
     * Create a new blood request.
     * @returns {number} insertId
     */
    static async create(data) {
        const {
            user_id, blood_type, units_required, urgency_level,
            hospital_name, city, date_needed, relationship,
            donation_type, notes
        } = data;

        const [result] = await db.execute(
            `INSERT INTO blood_requests
                (user_id, blood_type, units_required, urgency_level,
                 hospital_name, city, date_needed, relationship,
                 donation_type, notes, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [
                user_id,
                blood_type,
                units_required || 1,
                urgency_level || 'normal',
                hospital_name,
                city || null,
                date_needed || null,
                relationship || null,
                donation_type || 'Whole Blood',
                notes || null
            ]
        );
        return result.insertId;
    }

    /**
     * Return all active (non-cancelled) requests.
     * Optionally filter by blood_type and/or status.
     * JOINs users to include requester name.
     */
    static async findAll(filters = {}) {
        let query = `
            SELECT br.*, u.fullname AS requester_name, u.phone AS requester_phone
            FROM blood_requests br
            JOIN users u ON br.user_id = u.id
            WHERE br.status != 'cancelled'
        `;
        const params = [];

        if (filters.blood_type) {
            query += ' AND br.blood_type = ?';
            params.push(filters.blood_type);
        }
        if (filters.status) {
            query += ' AND br.status = ?';
            params.push(filters.status);
        }

        query += ' ORDER BY br.created_at DESC';

        const [rows] = await db.execute(query, params);
        return rows;
    }

    /**
     * Find a single blood request by ID.
     */
    static async findById(id) {
        const [rows] = await db.execute(
            `SELECT br.*, u.fullname AS requester_name, u.phone AS requester_phone
             FROM blood_requests br
             JOIN users u ON br.user_id = u.id
             WHERE br.id = ?`,
            [id]
        );
        return rows[0] || null;
    }

    /**
     * Find all requests belonging to a specific user.
     */
    static async findByUserId(userId) {
        const [rows] = await db.execute(
            `SELECT * FROM blood_requests WHERE user_id = ? ORDER BY created_at DESC`,
            [userId]
        );
        return rows;
    }

    /**
     * Update the status of a blood request.
     */
    static async updateStatus(id, status) {
        const [result] = await db.execute(
            'UPDATE blood_requests SET status = ? WHERE id = ?',
            [status, id]
        );
        return result.affectedRows > 0;
    }

    static async findMatchedRequests(bloodType, userCity = null) {
        let query = 'SELECT * FROM blood_requests WHERE status = ? AND blood_type = ?';
        let params = ['pending', bloodType];
        
        if (userCity) {
            query += ' AND city = ?';
            params.push(userCity);
        }
        
        query += ' ORDER BY FIELD(urgency_level, \'critical\', \'urgent\', \'normal\') ASC, created_at DESC LIMIT 10';
        
        const [rows] = await db.execute(query, params);
        return rows;
    }

    // Get nearby matched requests (within same city or province)
    static async findNearbyRequests(bloodType, userCity, compatibleTypes) {
        const placeholders = compatibleTypes.map(() => '?').join(',');
        const query = `
            SELECT * FROM blood_requests 
            WHERE status IN ('pending', 'open')
            AND blood_type IN (${placeholders})
            AND city = ?
            ORDER BY FIELD(urgency_level, 'critical', 'urgent', 'normal') ASC, created_at DESC
            LIMIT 10
        `;
        
        const [rows] = await db.execute(query, [...compatibleTypes, userCity]);
        return rows;
    }

    static async findEligibleDonors(requiredBloodType, compatibleTypes) {
        const placeholders = compatibleTypes.map(() => '?').join(',');
        const query = `
            SELECT id, email, fullname, blood_type, city, is_available_donor
            FROM users
            WHERE blood_type IN (${placeholders})
            AND is_verified = 1
            AND is_available_donor = 1
            AND role = 'user'
        `;
        
        const [rows] = await db.execute(query, compatibleTypes);
        return rows;
    }

    static async findEligibleDonorsForRequest(requestId) {
        const request = await this.findById(requestId);
        if (!request) return [];

        const { db: dbModule } = require('../config/database');
        const compatMap = {
            'O-': ['O-'],
            'O+': ['O-', 'O+'],
            'A-': ['O-', 'A-'],
            'A+': ['O-', 'O+', 'A-', 'A+'],
            'B-': ['O-', 'B-'],
            'B+': ['O-', 'O+', 'B-', 'B+'],
            'AB-': ['O-', 'A-', 'B-', 'AB-'],
            'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
        };

        const compatibleTypes = compatMap[request.blood_type] || [];
        return await this.findEligibleDonors(request.blood_type, compatibleTypes);
    }
}

module.exports = BloodRequest;
