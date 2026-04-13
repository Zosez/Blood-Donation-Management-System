const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

function getLogFileName() {
    const date = new Date().toISOString().split('T')[0];
    return path.join(logDir, `errors-${date}.log`);
}

function logError(req, res, error, statusCode) {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const route = req.originalUrl;
    const errorMessage = error.message || 'Unknown error';
    const stack = error.stack || '';
    
    const logEntry = `[${timestamp}] ${statusCode} ${method} ${route} - ${errorMessage}\n`;
    
    try {
        fs.appendFileSync(getLogFileName(), logEntry);
    } catch (logErr) {
        console.error('Failed to write to error log:', logErr);
    }
    
    console.error(`[${timestamp}] ${statusCode} ${method} ${route} - ${errorMessage}`);
}

function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode || 500;
    const isProduction = process.env.NODE_ENV === 'production';
    
    logError(req, res, err, statusCode);
    
    const response = {
        message: isProduction ? 'An error occurred' : err.message,
        status: statusCode,
    };
    
    if (!isProduction && err.stack) {
        response.stack = err.stack;
    }
    
    res.status(statusCode).json(response);
}

module.exports = {
    errorHandler,
    logError
};
