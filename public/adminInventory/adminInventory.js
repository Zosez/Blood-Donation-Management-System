document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/api';

    // DOM Elements
    const statsGrid = document.getElementById('statsGrid');
    const inventoryGrid = document.getElementById('inventoryGrid');
    const requestsBody = document.getElementById('requestsBody');
    const navAvatar = document.getElementById('navAvatar');
    const avatarDropdown = document.getElementById('avatarDropdown');
    const logoutBtn = document.getElementById('dropdownLogoutBtn');
    const toast = document.getElementById('toast');

    // Sidebar Links
    const sidebarLinks = {
        'nav-dashboard': '/adminDashboard',
        'nav-pending': '/pendingRequests',
        'nav-inventory': '/adminInventory',
        'nav-notifications': '/adminNotification',
        'nav-users': '/adminUsers',
        'nav-events': '/adminEvents',
        'nav-profile': '/adminProfile'
    };

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

    // Helper: Get Auth Token
    const getAuthToken = () => localStorage.getItem('token');

    // Helper: Redirect to login if unauthorized
    const handleUnauthorized = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    // Dropdown Toggle
    if (navAvatar) {
        navAvatar.addEventListener('click', (e) => {
            e.stopPropagation();
            avatarDropdown.classList.toggle('show');
        });
    }

    document.addEventListener('click', () => {
        if (avatarDropdown) avatarDropdown.classList.remove('show');
    });

    // Show Toast
    function showToast(message, type = 'success') {
        if (!toast) return;
        toast.textContent = message;
        toast.className = `ll-toast show ${type}`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // Fetch Inventory & Donors
    async function fetchInventoryData() {
        const token = getAuthToken();
        if (!token) return handleUnauthorized();

        try {
            const response = await fetch(`${API_URL}/admin/inventory`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                return handleUnauthorized();
            }

            const data = await response.json();
            if (response.ok) {
                renderStats(data);
                renderInventory(data.stock);
                renderDonors(data.donors);
            } else {
                console.error('Failed to fetch inventory:', data.message);
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
        }
    }

    // Render Stats Row (Matching original CSS/HTML structure)
    function renderStats(data) {
        if (!statsGrid) return;
        
        const totalDonors = data.donors.length;
        const totalUnits = data.totalStock || 0;

        statsGrid.innerHTML = `
            <div class="stat-card">
              <div class="stat-card-top">
                <div class="stat-icon stat-icon--red">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10L12 2Z"/></svg>
                </div>
                <div class="stat-chip stat-chip--red">Live</div>
              </div>
              <div class="stat-label">Total Blood Units</div>
              <div class="stat-value">${totalUnits.toFixed(1)}</div>
            </div>

            <div class="stat-card">
              <div class="stat-card-top">
                <div class="stat-icon stat-icon--blue">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div class="stat-chip stat-chip--grey">Eligible</div>
              </div>
              <div class="stat-label">Available Donors</div>
              <div class="stat-value">${totalDonors}</div>
            </div>

            <div class="stat-card">
              <div class="stat-card-top">
                <div class="stat-icon stat-icon--green">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <div class="stat-chip stat-chip--green">Active</div>
              </div>
              <div class="stat-label">Network Nodes</div>
              <div class="stat-value">8</div>
            </div>

            <div class="stat-card">
              <div class="stat-card-top">
                <div class="stat-icon stat-icon--amber">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <div class="stat-chip stat-chip--amber">Alert</div>
              </div>
              <div class="stat-label">Critical Shortage</div>
              <div class="stat-value">2 Types</div>
            </div>
        `;
    }

    // Render Blood Inventory Grid (Matching original CSS)
    function renderInventory(stock) {
        if (!inventoryGrid) return;
        
        const allTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
        const stockMap = {};
        stock.forEach(item => {
            stockMap[item.blood_type] = Number(item.total_units);
        });

        inventoryGrid.innerHTML = '';
        
        allTypes.forEach(type => {
            const units = stockMap[type] || 0;
            const item = document.createElement('div');
            item.className = 'inventory-item';
            item.innerHTML = `
                <span class="inventory-item-title">${type}</span>
                <span class="inventory-item-count">${units.toFixed(1)}</span>
                <span class="inventory-item-label">Units Available</span>
            `;
            inventoryGrid.appendChild(item);
        });
    }

    // Render Donors Table (Matching original CSS)
    function renderDonors(donors) {
        if (!requestsBody) return;
        
        requestsBody.innerHTML = '';
        
        if (donors.length === 0) {
            requestsBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">No available donors found</td></tr>';
            return;
        }

        donors.forEach(donor => {
            const formattedDate = donor.last_donation_date 
                ? new Date(donor.last_donation_date).toLocaleDateString()
                : 'Never donated';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="td-req-id">#DON-${donor.id.toString().padStart(4, '0')}</td>
                <td>
                    <div class="td-facility">${donor.fullname}</div>
                    <div class="td-facility-sub">${donor.email}</div>
                </td>
                <td><span class="blood-type-box">${donor.blood_type}</span></td>
                <td>
                    <div class="status-cell status-routine">
                        <span class="status-dot"></span>Available
                    </div>
                </td>
                <td class="time-cell">${formattedDate}</td>
                <td class="action-cell">
                    <button class="btn-action btn-action-red contact-donor" data-email="${donor.email}">Contact</button>
                </td>
            `;
            requestsBody.appendChild(tr);
        });

        // Add contact event listeners
        document.querySelectorAll('.contact-donor').forEach(btn => {
            btn.addEventListener('click', () => {
                window.location.href = `mailto:${btn.dataset.email}?subject=LifeLink Blood Donation Invitation`;
            });
        });
    }

    // Logout Handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => handleUnauthorized());
    }

    // Initialize
    fetchInventoryData();
});
