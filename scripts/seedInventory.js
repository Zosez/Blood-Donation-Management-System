const { db } = require('../config/database');

async function seedInventory() {
    console.log('--- Seeding Blood Inventory ---');
    
    try {
        // 1. Get some users to associate donations with
        const [users] = await db.execute('SELECT id, fullname, blood_type FROM users LIMIT 10');
        
        if (users.length === 0) {
            console.log('No users found. Please register some users first.');
            process.exit(0);
        }

        const donationCenters = ['Kathmandu Blood Bank', 'Patan Hospital', 'Teaching Hospital', 'Bhaktapur Blood Center'];
        const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
        
        // 2. Clear existing completed donations if any (optional, but good for clean seed)
        // await db.execute("DELETE FROM donations WHERE status = 'completed'");

        console.log('Inserting sample donations...');

        for (const type of bloodTypes) {
            // Add 2-5 donations for each blood type to create stock
            const numDonations = Math.floor(Math.random() * 4) + 2;
            
            for (let i = 0; i < numDonations; i++) {
                const randomUser = users[Math.floor(Math.random() * users.length)];
                const randomCenter = donationCenters[Math.floor(Math.random() * donationCenters.length)];
                const units = (Math.random() * 2 + 1).toFixed(1); // 1.0 to 3.0 units
                
                await db.execute(
                    'INSERT INTO donations (user_id, blood_type, donation_date, blood_units, donation_center, status) VALUES (?, ?, ?, ?, ?, ?)',
                    [randomUser.id, type, new Date(), units, randomCenter, 'completed']
                );
            }
        }

        console.log('Inventory seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
}

seedInventory();
