const { db } = require('../config/database');
const bcrypt = require('bcrypt');

class User {
    // Create new user
    static async create(userData) {
        const { fullname, email, password, phone, province, city, blood_type } = userData;
        const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
        const hashedPassword = await bcrypt.hash(password, rounds);

        const [result] = await db.execute(
            'INSERT INTO users (fullname, email, password, phone, province, city, blood_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [fullname, email, hashedPassword, phone || null, province, city, blood_type]
        );
        return result.insertId;
    }

    // Find user by email
    static async findByEmail(email) {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0] || null;
    }

    // Find user by ID
    static async findById(id) {
        const [rows] = await db.execute(
            'SELECT id, fullname, email, phone, province, city, blood_type, role, is_verified, created_at FROM users WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    }

    // Update user profile
    static async update(id, userData) {
        const { fullname, phone, province, city, blood_type } = userData;
        const [result] = await db.execute(
            'UPDATE users SET fullname = ?, phone = ?, province = ?, city = ?, blood_type = ? WHERE id = ?',
            [fullname, phone, province, city, blood_type, id]
        );
        return result.affectedRows > 0;
    }

    // Update password
    static async updatePassword(id, newPassword) {
        const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
        const hashedPassword = await bcrypt.hash(newPassword, rounds);
        const [result] = await db.execute(
            'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
            [hashedPassword, id]
        );
        return result.affectedRows > 0;
    }

    // Save reset token
    static async saveResetToken(email, token, expiry) {
        const [result] = await db.execute(
            'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?',
            [token, expiry, email]
        );
        return result.affectedRows > 0;
    }

    // Find by reset token (only valid non-expired tokens)
    static async findByResetToken(token) {
        const [rows] = await db.execute(
            'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
            [token]
        );
        return rows[0] || null;
    }

    // Verify password
    static async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }
}

module.exports = User;