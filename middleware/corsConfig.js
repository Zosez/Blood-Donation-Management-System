const cors = require('cors');

function getCorsOptions() {
    const allowedOriginsStr = process.env.ALLOWED_ORIGINS || 'http://localhost:5000';
    const allowedOrigins = allowedOriginsStr.split(',').map(origin => origin.trim());
    
    return {
        origin: function (origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('CORS not allowed'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        optionsSuccessStatus: 200
    };
}

function corsMiddleware() {
    return cors(getCorsOptions());
}

module.exports = { corsMiddleware, getCorsOptions };
