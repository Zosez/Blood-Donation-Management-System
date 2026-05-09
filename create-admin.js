const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
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

async function createAdminUser() {
    try {
        const email = 'admin@lifelink.com';
        const password = 'Admin@123';
        const fullname = 'Admin User';
        
        // Check if user already exists
        const [existing] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        
        if (existing.length > 0) {
            console.log('✓ Admin user already exists');
            await db.end();
            return;
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create admin user
        await db.execute(
            'INSERT INTO users (fullname, email, password, role, is_verified, phone, city, province) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [fullname, email, hashedPassword, 'admin', 1, '+1234567890', 'Toronto', 'Ontario']
        );
        
        console.log('✓ Admin user created successfully');
        console.log('  Email: ' + email);
        console.log('  Password: ' + password);
        
        await db.end();
    } catch (error) {
        console.error('✗ Error creating admin user:', error.message);
        process.exit(1);
    }
}

createAdminUser();
