const { db } = require('../config/database');
const bcrypt = require('bcrypt');

class User {
    // Create new user
    static async create(userData) {
        const { fullname, email, password, phone, province, city, blood_type, date_of_birth } = userData;
        const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
        const hashedPassword = await bcrypt.hash(password, rounds);

        const [result] = await db.execute(
            'INSERT INTO users (fullname, email, password, phone, province, city, blood_type, date_of_birth) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [fullname, email, hashedPassword, phone || null, province, city, blood_type, date_of_birth || null]
        );
        return result.insertId;
    }

    // Find user by email
    static async findByEmail(email) {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        const user = rows[0] || null;
        if (user) {
            console.log(`[USER MODEL findByEmail] Email: ${email}, User ID: ${user.id}, onboarded: ${user.onboarded}, type: ${typeof user.onboarded}`);
        }
        return user;
    }

    // Find user by ID
    static async findById(id) {
        const [rows] = await db.execute(
            'SELECT id, fullname, email, password, phone, province, city, blood_type, role, is_available_donor, is_verified, onboarded, date_of_birth, created_at FROM users WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    }

    // Update user profile
    static async update(id, userData) {
        const { fullname, phone, province, city, blood_type, date_of_birth } = userData;
        const [result] = await db.execute(
            'UPDATE users SET fullname = ?, phone = ?, province = ?, city = ?, blood_type = ?, date_of_birth = ? WHERE id = ?',
            [fullname, phone, province, city, blood_type, date_of_birth || null, id]
        );
        return result.affectedRows > 0;
    }

    // Update availability
    static async updateAvailability(id, isAvailable) {
        const [result] = await db.execute(
            'UPDATE users SET is_available_donor = ? WHERE id = ?',
            [isAvailable ? 1 : 0, id]
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

    // Save email verification token
    static async saveVerificationToken(email, token, expiry) {
        const [result] = await db.execute(
            'UPDATE users SET email_verification_token = ?, email_verification_expiry = ? WHERE email = ?',
            [token, expiry, email]
        );
        return result.affectedRows > 0;
    }

    // Find user by verification token (only valid non-expired tokens)
    static async findByVerificationToken(token) {
        const [rows] = await db.execute(
            'SELECT * FROM users WHERE email_verification_token = ? AND email_verification_expiry > NOW()',
            [token]
        );
        return rows[0] || null;
    }

    // Mark user email as verified and clear token
    static async markEmailVerified(userId) {
        const [result] = await db.execute(
            'UPDATE users SET is_verified = 1, email_verification_token = NULL, email_verification_expiry = NULL WHERE id = ?',
            [userId]
        );
        return result.affectedRows > 0;
    }

    // Mark user as onboarded
    static async markOnboarded(userId) {
        const [result] = await db.execute(
            'UPDATE users SET onboarded = 1 WHERE id = ?',
            [userId]
        );
        return result.affectedRows > 0;
    }
}

module.exports = User;