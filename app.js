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

// Middleware
app.use(globalLimiter);
app.use(corsMiddleware());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInputs);

// Serve static frontend files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
const authRoutes = require('./routes/auth');
const donationRoutes = require('./routes/donations');
const bloodRequestRoutes = require('./routes/bloodRequests');

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/blood-requests', bloodRequestRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'LifeLink API is running' });
});

// ── Page Routes ──

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

app.get('/userdashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/userdashboard/userdashboard.html'));
});

app.get('/bloodRequest', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/bloodRequest/bloodrequests.html'));
});

app.get('/userProfile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/userProfile/userProfile.html'));
});

app.get('/requestBlood', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/requestBlood/requestBlood.html'));
});

app.get('/admindashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admindashboard/admindashboard.html'));
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