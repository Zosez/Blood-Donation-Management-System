const tokenBlacklist = new Set();

function addToBlacklist(token) {
    tokenBlacklist.add(token);
    
    const decoded = require('jsonwebtoken').decode(token);
    if (decoded && decoded.exp) {
        const expiryMs = decoded.exp * 1000;
        const now = Date.now();
        const delayMs = Math.max(0, expiryMs - now);
        
        if (delayMs > 0) {
            setTimeout(() => {
                tokenBlacklist.delete(token);
            }, delayMs);
        }
    }
}

function isTokenBlacklisted(token) {
    return tokenBlacklist.has(token);
}

function clearAllBlacklist() {
    tokenBlacklist.clear();
}

module.exports = {
    addToBlacklist,
    isTokenBlacklisted,
    clearAllBlacklist
};
