require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const admins = [
    {
        name: 'Kanakadharani',
        email: 'kanakadharani12@gmail.com',
        password: 'Dharanibalaji',
        role: 'admin'
    },
    {
        name: 'Krusanth',
        email: 'krusanth.sk@gmail.com',
        password: 'krusanth22@2006',
        role: 'admin'
    }
];

async function addAdmins() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB Atlas');

        for (const admin of admins) {
            const existing = await User.findOne({ email: admin.email });
            if (existing) {
                existing.role = 'admin';
                existing.password = admin.password; // Update password too
                await existing.save();
                console.log(`Updated existing user to admin: ${admin.email}`);
            } else {
                const newUser = new User(admin);
                await newUser.save();
                console.log(`Created new admin user: ${admin.email}`);
            }
        }

        console.log('Admin access granted successully!');
        process.exit(0);
    } catch (err) {
        console.error('Error adding admins:', err);
        process.exit(1);
    }
}

addAdmins();
