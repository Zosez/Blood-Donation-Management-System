const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lifelink_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const db = pool.promise();

// Auto-create tables if they don't exist
async function initializeDatabase() {
    try {
        // Create database if it doesn't exist
        const tempPool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            waitForConnections: true,
            connectionLimit: 2,
            queueLimit: 0
        }).promise();

        await tempPool.execute(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'lifelink_db'}\``);
        await tempPool.end();

        // Disable foreign key checks during table creation
        await db.execute('SET FOREIGN_KEY_CHECKS=0');

        // Create users table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                fullname VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                province VARCHAR(100),
                city VARCHAR(100),
                blood_type VARCHAR(10),
                date_of_birth DATE,
                role ENUM('user', 'admin') DEFAULT 'user',
                is_available_donor TINYINT(1) DEFAULT 1,
                is_verified TINYINT(1) DEFAULT 0,
                onboarded TINYINT(1) DEFAULT 0,
                reset_token VARCHAR(255),
                reset_token_expiry DATETIME,
                email_verification_token VARCHAR(255),
                email_verification_expiry DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Create donations table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS donations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                donation_date DATE NOT NULL,
                blood_units DECIMAL(3,1) DEFAULT 1.0,
                donation_center VARCHAR(255),
                next_eligible_date DATE,
                status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Create blood_requests table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS blood_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                blood_type VARCHAR(10) NOT NULL,
                units_required INT NOT NULL DEFAULT 1,
                urgency_level ENUM('normal', 'urgent', 'critical') DEFAULT 'normal',
                hospital_name VARCHAR(255) NOT NULL,
                city VARCHAR(100),
                date_needed DATE,
                relationship VARCHAR(50),
                donation_type VARCHAR(50) DEFAULT 'Whole Blood',
                notes TEXT,
                status ENUM('pending', 'approved', 'fulfilled', 'cancelled') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Create notifications table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT,
                blood_request_id INT,
                related_user_id INT,
                is_read TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (blood_request_id) REFERENCES blood_requests(id) ON DELETE CASCADE,
                FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_user_id (user_id),
                INDEX idx_created_at (created_at),
                INDEX idx_is_read (is_read)
            )
        `);

        // Migrate: add verification columns if missing (safe for existing tables)
        try {
            await db.execute(`ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255)`);
        } catch (e) { /* column already exists */ }
        try {
            await db.execute(`ALTER TABLE users ADD COLUMN email_verification_expiry DATETIME`);
        } catch (e) { /* column already exists */ }
        try {
            await db.execute(`ALTER TABLE users ADD COLUMN is_available_donor TINYINT(1) DEFAULT 1`);
        } catch (e) { /* column already exists */ }
        try {
            await db.execute(`ALTER TABLE users ADD COLUMN onboarded TINYINT(1) DEFAULT 0`);
            console.log('[DB] Added onboarded column to users table');
        } catch (e) { 
            console.log('[DB] Onboarded column already exists or skipped');
        }

        // Create indexes for frequently queried columns
        try {
            await db.execute(`CREATE INDEX IF NOT EXISTS idx_email ON users(email)`);
        } catch (e) { /* index already exists */ }
        try {
            await db.execute(`CREATE INDEX IF NOT EXISTS idx_blood_type ON users(blood_type)`);
        } catch (e) { /* index already exists */ }
        try {
            await db.execute(`CREATE INDEX IF NOT EXISTS idx_br_blood_type ON blood_requests(blood_type)`);
        } catch (e) { /* index already exists */ }
        try {
            await db.execute(`CREATE INDEX IF NOT EXISTS idx_br_status ON blood_requests(status)`);
        } catch (e) { /* index already exists */ }
        try {
            await db.execute(`CREATE INDEX IF NOT EXISTS idx_donations_user ON donations(user_id)`);
        } catch (e) { /* index already exists */ }
        try {
            await db.execute(`CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(donation_date)`);
        } catch (e) { /* index already exists */ }

        // Re-enable foreign key checks
        await db.execute('SET FOREIGN_KEY_CHECKS=1');

        console.log('Database tables initialized successfully');
    } catch (error) {
        console.error('Database initialization error:', error.message);
        console.error('Make sure MySQL is running and accessible.');
        process.exit(1);
    }
}

module.exports = { db, initializeDatabase };