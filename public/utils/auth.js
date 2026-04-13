const API_URL = 'http://localhost:5000/api';

function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function removeToken() {
    localStorage.removeItem('token');
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

function removeUser() {
    localStorage.removeItem('user');
}

function isAuthenticated() {
    return !!getToken();
}

async function logout() {
    const token = getToken();
    if (token) {
        try {
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (err) {
            console.error('Logout request failed:', err);
        }
    }
    removeToken();
    removeUser();
}

async function fetchProtected(url, options = {}) {
    const token = getToken();
    if (!token) {
        throw new Error('Not authenticated');
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
        removeToken();
        removeUser();
        window.location.href = '/login';
        throw new Error('Authentication failed');
    }

    return response;
}

function redirectToLogin() {
    removeToken();
    removeUser();
    window.location.replace('/login');
}

function redirectToDashboard() {
    const user = getUser();
    const redirectUrl = user?.role === 'admin' ? '/admindashboard' : '/userdashboard';
    window.location.replace(redirectUrl);
}

module.exports = {
    getToken,
    setToken,
    removeToken,
    getUser,
    setUser,
    removeUser,
    isAuthenticated,
    logout,
    fetchProtected,
    redirectToLogin,
    redirectToDashboard
};
