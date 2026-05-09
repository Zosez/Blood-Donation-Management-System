/**
 * Admin Authentication Utility
 * Provides helpers for checking admin role on the frontend
 */

const ADMIN_AUTH = {
    /**
     * Check if current user is admin
     * @returns {boolean} true if user is admin, false otherwise
     */
    isAdmin() {
        const user = this.getUser();
        return user && user.role === 'admin';
    },

    /**
     * Get current user from localStorage
     * @returns {Object|null} user object or null
     */
    getUser() {
        try {
            const userJson = localStorage.getItem('user');
            return userJson ? JSON.parse(userJson) : null;
        } catch {
            return null;
        }
    },

    /**
     * Check token validity
     * @returns {boolean} true if token exists, false otherwise
     */
    hasToken() {
        return !!localStorage.getItem('token');
    },

    /**
     * Protect admin route - redirects if not authorized
     * Call this at the top of admin page scripts
     */
    protectRoute() {
        if (!this.hasToken()) {
            console.warn('[ADMIN AUTH] No token found - redirecting to login');
            window.location.href = '/login';
            return false;
        }

        if (!this.isAdmin()) {
            console.warn('[ADMIN AUTH] User is not admin - redirecting to user dashboard');
            window.location.href = '/userdashboard';
            return false;
        }

        return true;
    },

    /**
     * Protect user route - redirects admin to admin dashboard
     * Call this at the top of user page scripts
     */
    protectUserRoute() {
        if (!this.hasToken()) {
            // No token - proceed (user will see page or login)
            return true;
        }

        if (this.isAdmin()) {
            console.warn('[ADMIN AUTH] Admin trying to access user page - redirecting to admin dashboard');
            window.location.href = '/adminDashboard';
            return false;
        }

        return true;
    }
};

// Auto-protect if this script is loaded
if (document.currentScript && document.currentScript.getAttribute('data-protect') === 'true') {
    document.addEventListener('DOMContentLoaded', () => {
        ADMIN_AUTH.protectRoute();
    });
}
