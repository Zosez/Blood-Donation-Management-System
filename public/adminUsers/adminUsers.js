document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/api';

    // DOM Elements
    const userTableBody = document.querySelector('tbody');
    const searchInput = document.querySelector('.filter-input-wrap input');
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('statusFilter');
    const bloodFilter = document.getElementById('bloodFilter');
    const showingText = document.querySelector('.showing-text');
    const toast = document.getElementById('toast');

    // ── MODAL UTILITIES ──────────────────────────────
    function showConfirmModal(message, title = 'Confirm') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
            overlay.innerHTML = `
                <div style="background:#fff;width:100%;max-width:400px;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.3);border:1px solid #E5E7EB;overflow:hidden;">
                    <div style="padding:24px;text-align:center;">
                        <h3 style="font-family:'Sora',sans-serif;font-size:1rem;font-weight:700;color:#111827;margin-bottom:8px;">${title}</h3>
                        <p style="font-family:'Inter',sans-serif;font-size:0.9rem;color:#6B7280;margin-bottom:24px;white-space:pre-line;line-height:1.5;">${message}</p>
                        <div style="display:flex;gap:12px;justify-content:center;">
                            <button class="btn-confirm" style="background:#C0281C;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;font-family:'Sora',sans-serif;transition:background 0.2s;">OK</button>
                            <button class="btn-cancel" style="background:#F3F4F6;color:#6B7280;border:1px solid #E5E7EB;padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;font-family:'Sora',sans-serif;transition:background 0.2s;">Cancel</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            const confirmBtn = overlay.querySelector('.btn-confirm');
            const cancelBtn = overlay.querySelector('.btn-cancel');
            confirmBtn.addEventListener('mouseenter', () => confirmBtn.style.background = '#A01C15');
            confirmBtn.addEventListener('mouseleave', () => confirmBtn.style.background = '#C0281C');
            cancelBtn.addEventListener('mouseenter', () => cancelBtn.style.background = '#E5E7EB');
            cancelBtn.addEventListener('mouseleave', () => cancelBtn.style.background = '#F3F4F6');
            const closeModal = () => { overlay.remove(); };
            confirmBtn.addEventListener('click', () => { resolve(true); closeModal(); });
            cancelBtn.addEventListener('click', () => { resolve(false); closeModal(); });
            overlay.addEventListener('click', (e) => { if (e.target === overlay) { resolve(false); closeModal(); } });
        });
    }

    // Modals
    const editUserModal = document.getElementById('editUserModal');
    const editUserForm = document.getElementById('editUserForm');
    const closeEditModal = document.getElementById('closeEditModal');
    const cancelEditBtn = document.getElementById('cancelEditBtn');

    // Edit Form Fields
    const editUserId = document.getElementById('editUserId');
    const editFullname = document.getElementById('editFullname');
    const editEmail = document.getElementById('editEmail');
    const editBloodType = document.getElementById('editBloodType');
    const editCity = document.getElementById('editCity');
    const editRole = document.getElementById('editRole');
    const editVerified = document.getElementById('editVerified');

    // Sidebar Links
    const sidebarLinks = {
        'admin-dashboard': '/adminDashboard',
        'admin-request': '/pendingRequests',
        'nav-inventory': '/adminInventory',
        'admin-notification': '/adminNotification',
        'admin-users': '/adminUsers',
        'admin-events': '/adminEvents',
        'admin-profile': '/adminProfile'
    };

    // Global state
    let allUsers = [];

    // Initialize sidebar
    Object.keys(sidebarLinks).forEach(id => {
        const link = document.getElementById(id);
        if (link) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = sidebarLinks[id];
            });
        }
    });

    // Helper: Show Toast
    function showToast(message, type = 'success') {
        if (!toast) return;
        toast.textContent = message;
        toast.className = `ll-toast show ${type}`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // Helper: Get Auth Token
    const getAuthToken = () => localStorage.getItem('token');

    // Helper: Redirect to login if unauthorized
    const handleUnauthorized = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    // Modal Control
    const openModal = (user) => {
        editUserId.value = user.id;
        editFullname.value = user.fullname;
        editEmail.value = user.email;
        editBloodType.value = user.blood_type || 'O+';
        editCity.value = user.city || '';
        editRole.value = user.role;
        editVerified.value = user.is_verified ? '1' : '0';
        
        editUserModal.classList.add('active');
    };

    const closeModal = () => {
        editUserModal.classList.remove('active');
    };

    if (closeEditModal) closeEditModal.addEventListener('click', closeModal);
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeModal);

    // Fetch Users
    async function fetchUsers() {
        const token = getAuthToken();
        if (!token) return handleUnauthorized();

        try {
            const response = await fetch(`${API_URL}/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                return handleUnauthorized();
            }

            const data = await response.json();
            if (response.ok) {
                allUsers = data.users;
                renderUsers(allUsers);
            } else {
                console.error('Failed to fetch users:', data.message);
                showToast('Failed to load users', 'error');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            showToast('Network error loading users', 'error');
        }
    }

    // Render User Table
    function renderUsers(users) {
        userTableBody.innerHTML = '';
        
        users.forEach(user => {
            const initials = user.fullname.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="user-cell">
                        <div class="avatar" style="background:#fce7f3;color:#be185d;width:38px;height:38px;">${initials}</div>
                        <span class="user-name">${user.fullname}</span>
                    </div>
                </td>
                <td class="cell-muted">${user.email}</td>
                <td><span class="blood-badge">${user.blood_type || 'N/A'}</span></td>
                <td class="cell-muted">${user.city || 'N/A'}</td>
                <td><span class="role-badge ${user.role}">${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span></td>
                <td>
                    <span class="status-wrap ${user.is_verified ? 'status-active' : 'status-suspended'}">
                        <span class="status-dot"></span>
                        ${user.is_verified ? 'Verified' : 'Unverified'}
                    </span>
                </td>
                <td><span class="donations-num">0</span></td>
                <td>
                    <div class="action-btns" style="display:flex;gap:12px;">
                        <button class="edit-btn" data-id="${user.id}" style="background:none;border:none;color:#3b82f6;cursor:pointer;" title="Edit User">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="delete-btn" data-id="${user.id}" style="background:none;border:none;color:#ef4444;cursor:pointer;" title="Delete User">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            `;
            userTableBody.appendChild(tr);
        });

        if (showingText) {
            showingText.innerHTML = `Showing <b>1 – ${users.length}</b> of <b>${users.length}</b> users`;
        }

        // Add event listeners
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const user = allUsers.find(u => u.id == btn.dataset.id);
                if (user) openModal(user);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => handleDeleteUser(btn.dataset.id));
        });
    }

    // Handle Edit Form Submission
    if (editUserForm) {
        editUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const token = getAuthToken();
            const userId = editUserId.value;
            const submitBtn = editUserForm.querySelector('button[type="submit"]');

            const updateData = {
                fullname: editFullname.value,
                email: editEmail.value,
                blood_type: editBloodType.value,
                city: editCity.value,
                role: editRole.value,
                is_verified: parseInt(editVerified.value)
            };

            try {
                submitBtn.disabled = true;
                const response = await fetch(`${API_URL}/admin/users/${userId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updateData)
                });

                if (response.ok) {
                    showToast('User updated successfully');
                    closeModal();
                    fetchUsers();
                } else {
                    const data = await response.json();
                    showToast(data.message || 'Update failed', 'error');
                }
            } catch (error) {
                console.error('Update error:', error);
                showToast('Network error', 'error');
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    // Handle User Deletion
    async function handleDeleteUser(userId) {
        const confirmed = await showConfirmModal('Are you sure you want to delete this user? This action cannot be undone.', 'Delete User');
        if (!confirmed) return;

        const token = getAuthToken();
        try {
            const response = await fetch(`${API_URL}/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                showToast('User deleted successfully');
                fetchUsers();
            } else {
                const data = await response.json();
                showToast(data.message || 'Delete failed', 'error');
            }
        } catch (error) {
            console.error('Delete error:', error);
            showToast('Network error', 'error');
        }
    }

    // Filter Logic
    function filterUsers() {
        const query = searchInput.value.toLowerCase();
        const role = roleFilter.value;
        const status = statusFilter.value;
        const blood = bloodFilter.value;

        const filtered = allUsers.filter(user => {
            const matchQuery = user.fullname.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
            const matchRole = role === 'All Roles' || user.role.toLowerCase() === role.toLowerCase();
            const matchStatus = status === 'All Status' || (status === 'Active' && user.is_verified) || (status === 'Suspended' && !user.is_verified);
            const matchBlood = blood === 'Any Type' || user.blood_type === blood;

            return matchQuery && matchRole && matchStatus && matchBlood;
        });

        renderUsers(filtered);
    }

    if (searchInput) searchInput.addEventListener('input', filterUsers);
    if (roleFilter) roleFilter.addEventListener('change', filterUsers);
    if (statusFilter) statusFilter.addEventListener('change', filterUsers);
    if (bloodFilter) bloodFilter.addEventListener('change', filterUsers);

    // Export CSV
    document.querySelector('.btn-export')?.addEventListener('click', () => {
        const headers = ['Name', 'Email', 'Blood Type', 'City', 'Role', 'Status'];
        const csvRows = allUsers.map(user => [
            user.fullname,
            user.email,
            user.blood_type || 'N/A',
            user.city || 'N/A',
            user.role,
            user.is_verified ? 'Verified' : 'Unverified'
        ]);

        const csv = [headers, ...csvRows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement('a'), { href: url, download: 'lifelink_users.csv' });
        a.click();
        URL.revokeObjectURL(url);
    });

    // Logout Handler
    const navLogoutBtn = document.getElementById('logoutBtn');
    const dropdownLogoutBtn = document.getElementById('dropdownLogoutBtn');
    
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    if (navLogoutBtn) navLogoutBtn.addEventListener('click', logout);
    if (dropdownLogoutBtn) dropdownLogoutBtn.addEventListener('click', logout);

    // Profile Dropdown
    const navAvatar = document.getElementById('navAvatar');
    const avatarDropdown = document.getElementById('avatarDropdown');
    
    if (navAvatar) {
        navAvatar.addEventListener('click', (e) => {
            e.stopPropagation();
            avatarDropdown.classList.toggle('show');
        });
    }
    document.addEventListener('click', () => {
        if (avatarDropdown) avatarDropdown.classList.remove('show');
    });

    // Initialize
    fetchUsers();
});