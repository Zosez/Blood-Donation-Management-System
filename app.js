const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize database (creates tables if they don't exist)
const { initializeDatabase } = require('./config/database');
initializeDatabase();

const app = express();

// Import middleware
const { globalLimiter, authLimiter } = require('./middleware/rateLimiter');
const { corsMiddleware } = require('./middleware/corsConfig');
const { sanitizeInputs } = require('./middleware/sanitizer');
const { errorHandler } = require('./middleware/errorHandler');
const { adminAuthMiddleware } = require('./middleware/adminAuth');
const { authenticateToken } = require('./middleware/auth');

// Middleware
app.use(globalLimiter);
app.use(corsMiddleware());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInputs);

// Serve static frontend files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Serve AI chatbot script from /AI directory
app.use('/AI', express.static(path.join(__dirname, 'AI')));

// Import routes
const authRoutes = require('./routes/auth');
const donationRoutes = require('./routes/donations');
const bloodRequestRoutes = require('./routes/bloodRequests');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const eventsRoutes = require('./routes/events');

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/blood-requests', bloodRequestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/events', eventsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'LifeLink API is running' });
});

// ── Page Routes ──

// Helper middleware to check admin role
function requireAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        // No token provided - redirect to login
        return res.redirect('/login');
    }

    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== 'admin') {
            // Not an admin - redirect to user dashboard
            return res.redirect('/userdashboard');
        }

        next();
    } catch (err) {
        // Invalid token - redirect to login
        return res.redirect('/login');
    }
}

// Helper middleware to prevent admin access to user routes
function requireUser(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        // No token - proceed (will show login or public page)
        return next();
    }

    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role === 'admin') {
            // Admin trying to access user route - redirect to admin dashboard
            return res.redirect('/adminDashboard');
        }

        next();
    } catch (err) {
        // Invalid token - proceed (will show login)
        next();
    }
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/login/login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/signup/signup.html'));
});

app.get('/passwordReset', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/passwordReset/passwordreset.html'));
});

app.get('/emailVerify', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/emailVerify/verified.html'));
});

app.get('/check-email', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/emailVerify/checkEmail.html'));
});

app.get('/aboutUs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/aboutUs/about.html'));
});

app.get('/activeRequests', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/activeRequests/activeRequests.html'));
});

app.get('/events', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/events/events.html'));
});

app.get('/userdashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/userdashboard/userdashboard.html'));
});

app.get('/bloodRequest', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/bloodRequest/bloodrequests.html'));
});

app.get('/userProfile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/userProfile/userProfile.html'));
});

app.get('/notification', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/notification/notifications.html'));
});

app.get('/requestBlood', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/requestBlood/requestBlood.html'));
});

app.get('/userDonations', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/userDonations/userDonations.html'));
});

app.get('/donorRequest', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/donorRequest/donorRequest.html'));
});

// -- Admin Routes --
app.get('/adminDashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/adminDashboard/adminDashboard.html'));
});

app.get('/adminNotification', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/adminNotification/adminNotification.html'));
});

app.get('/pendingRequests', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pendingRequests/pendingRequests.html'));
});

app.get('/adminUsers', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/adminUsers/adminUsers.html'));
});

app.get('/adminEvents', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/adminEvents/adminEvents.html'));
});

app.get('/adminProfile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/adminProfile/adminProfile.html'));
});

app.get('/adminInventory', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/adminInventory/adminInventory.html'));
});

app.get('/welcome', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/welcome/welcome.html'));
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`LifeLink API running on port ${PORT}`);
});
