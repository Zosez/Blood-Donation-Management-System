function initProtectedRoute(requiredRole = null) {
    if (typeof module === 'undefined' || !module.exports) {
        // Browser environment
        const auth = window.Auth || {};
        
        function checkAuth() {
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');
            
            if (!token || !user) {
                window.location.replace('/login');
                return false;
            }

            if (requiredRole) {
                try {
                    const userData = JSON.parse(user);
                    if (userData.role !== requiredRole) {
                        window.location.replace('/userdashboard');
                        return false;
                    }
                } catch (e) {
                    window.location.replace('/login');
                    return false;
                }
            }

            return true;
        }

        document.addEventListener('DOMContentLoaded', () => {
            if (!checkAuth()) {
                document.body.style.display = 'none';
            }
        });

        if (!checkAuth()) {
            document.body.style.display = 'none';
        }
    }
}
