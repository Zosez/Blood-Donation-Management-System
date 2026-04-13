"# LifeLink - Blood Donation Management System

A comprehensive web-based blood donation management system built with Node.js, Express, and MySQL.

## 🚀 Features

- **User Authentication**: Sign up, login, JWT-based session management
- **Email Verification**: Verify email accounts during registration
- **Password Reset**: Forgot password with email recovery
- **User Profile**: View and manage donor information
- **Blood Donations**: Track donation history and eligibility
- **Blood Requests**: Create and manage active blood requests
- **Admin Dashboard**: Administrative controls and user management
- **Responsive Design**: Mobile-friendly interface with hamburger navigation
- **Multi-language Support**: Internationalization support

## 🛠️ Tech Stack

- **Backend**: Node.js, Express 5.2.1
- **Database**: MySQL with auto-initialization
- **Authentication**: JWT (7-day expiry)
- **Password Security**: Bcrypt (10 rounds)
- **Email Service**: Nodemailer with Gmail SMTP
- **Frontend**: Vanilla JavaScript, HTML5, CSS3

## 📋 Prerequisites

- Node.js (v14 or higher)
- MySQL Server
- Gmail account with App Password (for email service)

## 🔧 Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd new
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   - Database credentials
   - JWT secret
   - Gmail SMTP credentials
   - Base URL

4. **Start the server**:
   ```bash
   npm start
   ```
   Server runs on `http://localhost:5000`

## 📁 Project Structure

```
├── app.js                 # Express application entry
├── config/               # Configuration files
│   ├── database.js      # MySQL connection & initialization
│   └── mailer.js        # Nodemailer setup
├── middleware/          # Express middleware
│   ├── auth.js          # JWT authentication
│   ├── rateLimiter.js   # Rate limiting
│   └── sanitizer.js     # Input validation
├── models/              # Database models
│   ├── user.js
│   ├── Donation.js
│   └── BloodRequest.js
├── routes/              # API routes
│   ├── auth.js          # Authentication endpoints
│   ├── donations.js     # Donation management
│   └── bloodRequests.js # Blood request endpoints
├── public/              # Frontend files
│   ├── index.html
│   ├── style.css
│   ├── main.js
│   ├── login/
│   ├── signup/
│   ├── passwordReset/
│   └── [other pages]/
└── utils/               # Utility functions
```

## 🔐 Security

- JWT-based authentication
- Bcrypt password hashing
- Input sanitization
- Rate limiting on auth endpoints
- Email verification for new accounts
- Password reset with time-limited tokens (1 hour)

## 📧 Email Configuration

Email services (verification, password reset) require Gmail SMTP:

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Add to `.env`:
   ```
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   ```

## 🚀 Running the Application

```bash
# Development
npm start

# Production
NODE_ENV=production npm start
```

## 📱 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/verify-email` - Verify email with token
- `GET /api/auth/me` - Get current user info

### Donations
- `POST /api/donations/record` - Record a donation
- `GET /api/donations/history` - Get donation history

### Blood Requests
- `POST /api/blood-requests` - Create blood request
- `GET /api/blood-requests` - List active requests

## 🐛 Known Issues & Future Enhancements

- Real-time notifications for matching blood requests
- Advanced search and filtering
- Donor-to-request matching algorithm
- Admin analytics and statistics
- Two-factor authentication (2FA)
- WebSocket support for live updates

## 📄 License

This project is part of a university coursework assignment.

## 👥 Contributors

- Team members from Herald College

## 📞 Support

For issues and questions, please refer to project documentation or contact the development team.
" 
