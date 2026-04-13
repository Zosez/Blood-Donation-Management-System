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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
const authRoutes = require('./routes/auth');
const donationRoutes = require('./routes/donations');
const bloodRequestRoutes = require('./routes/bloodRequests');

// API Routes
app.use('/api/auth', authRoutes);
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

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n  LifeLink Server running on http://localhost:${PORT}`);
    console.log(`  API available at http://localhost:${PORT}/api`);
    console.log(`  Frontend at http://localhost:${PORT}\n`);
});