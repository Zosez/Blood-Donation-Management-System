document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/api';

    // DOM Elements - Display
    const displayName = document.getElementById('displayName');
    const displayRole = document.getElementById('displayRole');
    const displayAdminId = document.getElementById('displayAdminId');
    const displayClearance = document.getElementById('displayClearance');
    const displayDepartment = document.getElementById('displayDepartment');
    
    const infoName = document.getElementById('infoName');
    const infoEmail = document.getElementById('infoEmail');
    const infoPhone = document.getElementById('infoPhone');
    const infoRole = document.getElementById('infoRole');
    
    const navAvatarName = document.querySelector('.nav-avatar-name');
    const dropdownName = document.querySelector('.dropdown-name');
    const dropdownRole = document.querySelector('.dropdown-role');
    const dropdownAdminId = document.querySelector('.avatar-dropdown .dropdown-item:nth-child(2) strong');
    const dropdownClearance = document.querySelector('.avatar-dropdown .dropdown-item:nth-child(3) strong');

    // DOM Elements - Form
    const profileForm = document.getElementById('profileForm');
    const profileNameInput = document.getElementById('profileName');
    const profileRoleInput = document.getElementById('profileRole');
    const profileAdminIdInput = document.getElementById('profileAdminId');
    const profileClearanceInput = document.getElementById('profileClearance');
    const profileEmailInput = document.getElementById('profileEmail');
    const profilePhoneInput = document.getElementById('profilePhone');
    const profileDepartmentInput = document.getElementById('profileDepartment');

    // Modals & UI Controls
    const editProfileBtn = document.getElementById('editProfileBtn');
    const profileModal = document.getElementById('profileModal');
    const modalClose = document.getElementById('modalClose');
    const cancelProfileBtn = document.getElementById('cancelProfileBtn');
    const navAvatar = document.getElementById('navAvatar');
    const avatarDropdown = document.getElementById('avatarDropdown');
    const logoutBtn = document.getElementById('dropdownLogoutBtn');
    const toast = document.getElementById('toast');

    // Sidebar Links - Use absolute paths for consistency
    const sidebarLinks = {
        'admin-dashboard': '/adminDashboard',
        'admin-requests': '/pendingRequests',
        'nav-inventory': '/adminInventory',
        'admin-notification': '/adminNotification',
        'admin-users': '/adminUsers',
        'admin-events': '/adminEvents',
        'admin-profile': '/adminProfile'
    };

    // Initialize sidebar navigation
    Object.keys(sidebarLinks).forEach(id => {
        const link = document.getElementById(id);
        if (link) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = sidebarLinks[id];
            });
        }
    });

    // Helper: Get Auth Token
    const getAuthToken = () => localStorage.getItem('token');

    // Helper: Show Toast
    function showToast(message, type = 'success') {
        if (!toast) return;
        toast.textContent = message;
        toast.className = `ll-toast show ${type}`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // Helper: Redirect to login if unauthorized
    const handleUnauthorized = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    // Toggle Avatar Dropdown
    if (navAvatar) {
        navAvatar.addEventListener('click', (e) => {
            e.stopPropagation();
            avatarDropdown.classList.toggle('active');
        });
    }

    document.addEventListener('click', () => {
        if (avatarDropdown) avatarDropdown.classList.remove('active');
    });

    // Modal Control
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            profileModal.classList.add('active');
        });
    }

    const closeModal = () => {
        profileModal.classList.remove('active');
    };

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (cancelProfileBtn) cancelProfileBtn.addEventListener('click', closeModal);

    // Fetch Admin Profile
    async function fetchProfile() {
        const token = getAuthToken();
        if (!token) return handleUnauthorized();

        try {
            const response = await fetch(`${API_URL}/admin/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                return handleUnauthorized();
            }

            const data = await response.json();
            if (response.ok) {
                updateUI(data.admin);
            } else {
                console.error('Failed to fetch profile:', data.message);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    }

    // Update UI with Admin Data
    function updateUI(admin) {
        const formattedId = `ADM-${admin.id.toString().padStart(4, '0')}`;
        
        // Display values
        if (displayName) displayName.textContent = admin.fullname;
        if (displayRole) displayRole.textContent = admin.role === 'admin' ? 'System Administrator' : admin.role;
        if (displayAdminId) displayAdminId.textContent = formattedId;
        
        if (infoName) infoName.textContent = admin.fullname;
        if (infoEmail) infoEmail.textContent = admin.email;
        if (infoPhone) infoPhone.textContent = admin.phone || 'Not provided';
        if (infoRole) infoRole.textContent = admin.role === 'admin' ? 'System Administrator' : admin.role;

        if (navAvatarName) navAvatarName.textContent = admin.fullname.split(' ')[0];
        if (dropdownName) dropdownName.textContent = admin.fullname;
        if (dropdownRole) dropdownRole.textContent = admin.role === 'admin' ? 'System Administrator' : admin.role;
        if (dropdownAdminId) dropdownAdminId.textContent = formattedId;

        // Form values
        if (profileNameInput) profileNameInput.value = admin.fullname;
        if (profileEmailInput) profileEmailInput.value = admin.email;
        if (profilePhoneInput) profilePhoneInput.value = admin.phone || '';
        if (profileAdminIdInput) profileAdminIdInput.value = formattedId;
        if (profileRoleInput) profileRoleInput.value = admin.role === 'admin' ? 'System Administrator' : admin.role;
        
        // Disable non-editable fields in demo
        if (profileEmailInput) profileEmailInput.disabled = true;
        if (profileAdminIdInput) profileAdminIdInput.disabled = true;
    }

    // Handle Form Submission
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const token = getAuthToken();
            const submitBtn = profileForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;

            const updateData = {
                fullname: profileNameInput.value,
                phone: profilePhoneInput.value,
                province: 'Bagmati Province',
                city: 'Kathmandu'
            };

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Saving...';

                const response = await fetch(`${API_URL}/admin/profile`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updateData)
                });

                const data = await response.json();

                if (response.ok) {
                    showToast('Profile updated successfully!');
                    closeModal();
                    fetchProfile();
                } else {
                    showToast(data.message || 'Failed to update profile', 'error');
                }
            } catch (error) {
                console.error('Error updating profile:', error);
                showToast('Network error. Please try again.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }

    // Logout Handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const token = getAuthToken();
            try {
                await fetch(`${API_URL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
            handleUnauthorized();
        });
    }

    // Initialize Page
    fetchProfile();
});
