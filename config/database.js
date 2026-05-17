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
                blood_type VARCHAR(10),
                blood_units DECIMAL(3,1) DEFAULT 1.0,
                donation_center VARCHAR(255),
                next_eligible_date DATE,
                status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Migration: add blood_type to donations if missing
        try {
            await db.execute(`ALTER TABLE donations ADD COLUMN blood_type VARCHAR(10) AFTER donation_date`);
        } catch (e) { /* column already exists */ }

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
        try {
            await db.execute(`ALTER TABLE users ADD COLUMN date_of_birth DATE`);
            console.log('[DB] Added date_of_birth column to users table');
        } catch (e) {
            console.log('[DB] date_of_birth column already exists or skipped');
        }

        // Migrate: add total_donations column to users if missing
        try {
            await db.execute(`ALTER TABLE users ADD COLUMN total_donations INT DEFAULT 0`);
            console.log('[DB] Added total_donations column to users table');
        } catch (e) {
            console.log('[DB] total_donations column already exists or skipped');
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

        // Migrate: add 'rejected' to blood_requests status ENUM if missing
        try {
            await db.execute(`
                ALTER TABLE blood_requests 
                MODIFY COLUMN status ENUM('pending','approved','rejected','fulfilled','cancelled','ongoing','completed') DEFAULT 'pending'
            `);
            console.log('[DB] blood_requests.status ENUM updated to include ongoing and completed');
        } catch (e) {
            console.log('[DB] blood_requests.status ENUM already up to date');
        }

        // Migrate: add patient_name column to blood_requests if missing
        try {
            await db.execute(`ALTER TABLE blood_requests ADD COLUMN patient_name VARCHAR(255)`);
            console.log('[DB] Added patient_name column to blood_requests');
        } catch (e) { /* column already exists */ }

        // Migrate: add contact column to blood_requests if missing
        try {
            await db.execute(`ALTER TABLE blood_requests ADD COLUMN contact VARCHAR(50)`);
            console.log('[DB] Added contact column to blood_requests');
        } catch (e) { /* column already exists */ }

        // Migrate: add updated_at column to blood_requests if missing
        try {
            await db.execute(`ALTER TABLE blood_requests ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP`);
            console.log('[DB] Added updated_at column to blood_requests');
        } catch (e) { /* column already exists */ }

        // Create events table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS events (
                id           INT AUTO_INCREMENT PRIMARY KEY,
                title        VARCHAR(255) NOT NULL,
                event_date   DATE NOT NULL,
                event_time   VARCHAR(50),
                location     VARCHAR(255),
                blood_types  VARCHAR(255),
                quota        INT DEFAULT 40,
                registered   INT DEFAULT 0,
                description  TEXT,
                status       ENUM('Upcoming','Closed','Cancelled') DEFAULT 'Upcoming',
                created_by   INT,
                created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at   TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log('[DB] events table ready');

        // Create event_registrations table (tracks which user registered for which event)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS event_registrations (
                id         INT AUTO_INCREMENT PRIMARY KEY,
                event_id   INT NOT NULL,
                user_id    INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_reg (event_id, user_id),
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
            )
        `);
        console.log('[DB] event_registrations table ready');

        // Create donation_attempts table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS donation_attempts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                request_id INT NOT NULL,
                donor_id INT NOT NULL,
                donor_name VARCHAR(255),
                donor_phone VARCHAR(20),
                donor_email VARCHAR(255),
                status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
                questionnaire_passed BOOLEAN DEFAULT true,
                blood_units INT,
                blood_type_donated VARCHAR(10),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE CASCADE,
                FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_request_id (request_id),
                INDEX idx_donor_id (donor_id),
                INDEX idx_status (status)
            )
        `);
        console.log('[DB] donation_attempts table ready');

        // Migrate: add blood_units and blood_type_donated columns if missing
        try {
            await db.execute(`ALTER TABLE donation_attempts ADD COLUMN blood_units INT`);
            console.log('[DB] Added blood_units column to donation_attempts');
        } catch (e) {
            console.log('[DB] blood_units column already exists');
        }

        try {
            await db.execute(`ALTER TABLE donation_attempts ADD COLUMN blood_type_donated VARCHAR(10)`);
            console.log('[DB] Added blood_type_donated column to donation_attempts');
        } catch (e) {
            console.log('[DB] blood_type_donated column already exists');
        }

        // Create donor_registrations table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS donor_registrations (
                id                 INT AUTO_INCREMENT PRIMARY KEY,
                user_id            INT NOT NULL,
                fullname           VARCHAR(255) NOT NULL,
                blood_type         VARCHAR(10)  NOT NULL,
                donation_type      VARCHAR(50)  DEFAULT 'Whole Blood',
                availability_level ENUM('normal','weekday','emergency') DEFAULT 'normal',
                phone              VARCHAR(30),
                email              VARCHAR(255),
                hospital           VARCHAR(255),
                province           VARCHAR(100),
                city               VARCHAR(100),
                last_donated       DATE,
                relationship       VARCHAR(50),
                notes              TEXT,
                status             ENUM('pending','approved','rejected') DEFAULT 'pending',
                reviewed_by        INT,
                reviewed_at        DATETIME,
                created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_dr_user_id (user_id),
                INDEX idx_dr_status  (status)
            )
        `);
        console.log('[DB] donor_registrations table ready');

        // Migration: add lives_impacted if missing
        try {
            await db.execute(`ALTER TABLE users ADD COLUMN lives_impacted INT DEFAULT 0`);
            console.log('[DB] Added lives_impacted column to users table');
        } catch (e) {
            console.log('[DB] lives_impacted column already exists or skipped');
        }

        // Migration: add cooldown_ends_at if missing
        try {
            await db.execute(`ALTER TABLE users ADD COLUMN cooldown_ends_at DATETIME`);
            console.log('[DB] Added cooldown_ends_at column to users table');
        } catch (e) {
            console.log('[DB] cooldown_ends_at column already exists or skipped');
        }

        // Create inventory table — blood bank stock (source of truth for live blood supply)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS inventory (
                id                    INT AUTO_INCREMENT PRIMARY KEY,
                blood_type            VARCHAR(10)  NOT NULL,
                units                 DECIMAL(5,1) NOT NULL DEFAULT 1.0,
                source_type           ENUM('donation','manual','event') DEFAULT 'donation',
                donor_registration_id INT,
                received_at           DATE NOT NULL,
                notes                 TEXT,
                recorded_by           INT,
                created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (donor_registration_id) REFERENCES donor_registrations(id) ON DELETE SET NULL,
                FOREIGN KEY (recorded_by)           REFERENCES users(id)               ON DELETE SET NULL,
                INDEX idx_inv_blood_type   (blood_type),
                INDEX idx_inv_received_at  (received_at)
            )
        `);
        console.log('[DB] inventory table ready');

        // Migrate donor_registrations.status to include completed
        try {
            await db.execute(`
                ALTER TABLE donor_registrations
                MODIFY COLUMN status ENUM('pending','approved','rejected','completed') DEFAULT 'pending'
            `);
            console.log('[DB] donor_registrations.status ENUM updated');
        } catch (e) { console.log('[DB] donor_registrations.status already updated'); }

        // ── GAMIFICATION TABLES ───────────────────────────────────────────────

        // Badge definitions (seeded once)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS badges (
                id          VARCHAR(50)  PRIMARY KEY,
                name        VARCHAR(100) NOT NULL,
                description TEXT,
                icon        VARCHAR(10)  NOT NULL,
                unlocks_at  INT          NOT NULL
            )
        `);

        // Seed badge definitions (INSERT IGNORE = safe to re-run)
        await db.execute(`
            INSERT IGNORE INTO badges (id, name, description, icon, unlocks_at) VALUES
              ('first_drop',         'First Drop',       'Awarded for your very first confirmed donation.',          '🩸', 1),
              ('life_saver_5',       'Life Saver',        'You have saved up to 15 lives — keep it up!',             '❤️', 5),
              ('dedicated_donor_10', 'Dedicated Donor',   'Double digits! You are a true dedicated donor.',          '⭐', 10),
              ('gold_heart_15',      'Gold Heart',        'Fifteen donations — your heart is pure gold.',            '💛', 15),
              ('champion_25',        'Champion Donor',    'Twenty-five donations — a true blood donation champion.', '🏅', 25),
              ('platinum_legend_30', 'Platinum Legend',   'Thirty donations — you have reached legendary status.',   '🏆', 30)
        `);
        console.log('[DB] badges table ready + seeded');

        // User badges earned (UNIQUE guard prevents duplicates)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS user_badges (
                id         INT AUTO_INCREMENT PRIMARY KEY,
                user_id    INT         NOT NULL,
                badge_id   VARCHAR(50) NOT NULL,
                awarded_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_badge (user_id, badge_id),
                FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
                FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
                INDEX idx_ub_user_id (user_id)
            )
        `);
        console.log('[DB] user_badges table ready');

        // Add donor_tier column to users (safe migration)
        try {
            await db.execute(`ALTER TABLE users ADD COLUMN donor_tier ENUM('Bronze','Silver','Gold','Platinum') DEFAULT 'Bronze'`);
            console.log('[DB] Added donor_tier column to users');
        } catch (e) { console.log('[DB] donor_tier column already exists'); }

        // ─────────────────────────────────────────────────────────────────────

        await db.execute('SET FOREIGN_KEY_CHECKS=1');

        console.log('Database tables initialized successfully');
    } catch (error) {
        console.error('Database initialization error:', error.message);
        console.error('Make sure MySQL is running and accessible.');
        process.exit(1);
    }
}

module.exports = { db, initializeDatabase };