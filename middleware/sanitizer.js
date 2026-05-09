const sanitizeHtml = require('sanitize-html');

function sanitizeInputs(req, res, next) {
    // Skip sanitization for auth routes - they have their own validation
    if (req.path.startsWith('/api/auth/')) {
        return next();
    }

    if (req.body && typeof req.body === 'object') {
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = sanitizeHtml(req.body[key], {
                    allowedTags: [],
                    allowedAttributes: {},
                    disallowedTagsMode: 'discard'
                }).trim();
            }
        }
    }
    next();
}

module.exports = { sanitizeInputs };
