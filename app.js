const express = require("express");
const cors = require('cors');
const dotenv = require('dotenv');
const session = require("express-session");
const path = require("path");

const app = express();

// Load environment variables
dotenv.config();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.use(session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true
}));

// // Import routes
// const authRoutes = require('./routes/auth');
// const donationRoutes = require('./routes/donations');

// // Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/donations', donationRoutes);

// // Health check endpoint
// app.get('/api/health', (req, res) => {
//     res.json({ status: 'OK', message: 'LifeLink API is running' });
// });

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});


// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public/login/login.html"));
});

app.get("/signup",(req,res)=>{
    res.sendFile(path.join(__dirname, "public/signup/signup.html"));
});

app.get("/passwordReset",(req,res)=>{
    res.sendFile(path.join(__dirname, "public/passwordReset/passwordreset.html"));
});

app.get("/aboutUs",(req,res)=>{
    res.sendFile(path.join(__dirname, "public/aboutUs/about.html"));
});

app.get("/activeRequests",(req,res)=>{
    res.sendFile(path.join(__dirname, "public/activeRequests/activeRequests.html"));
});

app.get("/userdashboard",(req,res)=>{
    res.sendFile(path.join(__dirname, "public/userdashboard/userdashboard.html"));
});

app.get("/bloodRequest",(req,res)=>{
    res.sendFile(path.join(__dirname, "public/bloodRequest/bloodrequests.html"));
});

app.get("/userProfile",(req,res)=>{
    res.sendFile(path.join(__dirname, "public/userProfile/userProfile.html"));
});

app.get("/requestBlood",(req,res)=>{
    res.sendFile(path.join(__dirname, "public/requestBlood/requestBlood.html"));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
});