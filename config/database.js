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
                role ENUM('donor', 'recipient', 'admin') DEFAULT 'donor',
                is_available_donor TINYINT(1) DEFAULT 1,
                is_verified TINYINT(1) DEFAULT 0,
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