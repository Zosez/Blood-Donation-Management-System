document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/api';

    // ── DOM ──────────────────────────────────────────
    const statsGrid      = document.getElementById('statsGrid');
    const inventoryGrid  = document.getElementById('inventoryGrid');
    const requestsBody   = document.getElementById('requestsBody');
    const tableInfo      = document.querySelector('.table-info');
    const toast          = document.getElementById('toast');
    const navAvatar      = document.getElementById('navAvatar');
    const avatarDropdown = document.getElementById('avatarDropdown');
    const logoutBtn      = document.getElementById('dropdownLogoutBtn');

    // ── Sidebar nav ──────────────────────────────────
    const sidebarLinks = {
        'nav-dashboard':     '/adminDashboard',
        'nav-pending':       '/pendingRequests',
        'nav-inventory':     '/adminInventory',
        'nav-notifications': '/adminNotification',
        'nav-users':         '/adminUsers',
        'nav-events':        '/adminEvents',
        'nav-profile':       '/adminProfile'
    };
    Object.keys(sidebarLinks).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', e => { e.preventDefault(); window.location.href = sidebarLinks[id]; });
    });

    const getAuthToken     = () => localStorage.getItem('token');
    const handleUnauthorized = () => {
        localStorage.removeItem('token'); localStorage.removeItem('user');
        window.location.href = '/login';
    };

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

    function showPromptModal(message, title = 'Enter information') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
            overlay.innerHTML = `
                <div style="background:#fff;width:100%;max-width:400px;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.3);border:1px solid #E5E7EB;overflow:hidden;">
                    <div style="padding:24px;">
                        <h3 style="font-family:'Sora',sans-serif;font-size:1rem;font-weight:700;color:#111827;margin-bottom:16px;">${title}</h3>
                        <p style="font-family:'Inter',sans-serif;font-size:0.85rem;color:#6B7280;margin-bottom:16px;">${message}</p>
                        <input type="text" class="prompt-input" placeholder="Enter your response..." style="width:100%;padding:10px 12px;border:1px solid #E5E7EB;border-radius:8px;font-family:'Inter',sans-serif;font-size:0.9rem;box-sizing:border-box;margin-bottom:16px;">
                        <div style="display:flex;gap:12px;justify-content:flex-end;">
                            <button class="btn-cancel" style="background:#F3F4F6;color:#6B7280;border:1px solid #E5E7EB;padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;font-family:'Sora',sans-serif;transition:background 0.2s;">Cancel</button>
                            <button class="btn-confirm" style="background:#C0281C;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;font-family:'Sora',sans-serif;transition:background 0.2s;">Submit</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            const input = overlay.querySelector('.prompt-input');
            const confirmBtn = overlay.querySelector('.btn-confirm');
            const cancelBtn = overlay.querySelector('.btn-cancel');
            confirmBtn.addEventListener('mouseenter', () => confirmBtn.style.background = '#A01C15');
            confirmBtn.addEventListener('mouseleave', () => confirmBtn.style.background = '#C0281C');
            cancelBtn.addEventListener('mouseenter', () => cancelBtn.style.background = '#E5E7EB');
            cancelBtn.addEventListener('mouseleave', () => cancelBtn.style.background = '#F3F4F6');
            const closeModal = () => { overlay.remove(); };
            input.focus();
            confirmBtn.addEventListener('click', () => { resolve(input.value); closeModal(); });
            cancelBtn.addEventListener('click', () => { resolve(null); closeModal(); });
            input.addEventListener('keypress', (e) => { if (e.key === 'Enter') { resolve(input.value); closeModal(); } });
            overlay.addEventListener('click', (e) => { if (e.target === overlay) { resolve(null); closeModal(); } });
        });
    }

    // ── Dropdown ─────────────────────────────────────
    const navAvatarWrapper = document.querySelector('.nav-avatar-wrapper');
    let dropdownOpen = false;
    
    navAvatar?.addEventListener('click', (e) => { 
        e.preventDefault();
        e.stopPropagation(); 
        dropdownOpen = !dropdownOpen;
        if (dropdownOpen) {
            avatarDropdown?.classList.add('show');
        } else {
            avatarDropdown?.classList.remove('show');
        }
        console.log('[DEBUG] Dropdown now:', dropdownOpen);
    });
    
    document.addEventListener('click', (e) => {
        if (dropdownOpen && navAvatarWrapper && !navAvatarWrapper.contains(e.target)) {
            dropdownOpen = false;
            avatarDropdown?.classList.remove('show');
            console.log('[DEBUG] Closed dropdown from outside click');
        }
    });
    
    logoutBtn?.addEventListener('click', handleUnauthorized);

    // ── Toast ─────────────────────────────────────────
    function showToast(message, type = 'success') {
        if (!toast) return;
        const c = { success:'#f0fdf4/#86efac/#166534', danger:'#fef2f2/#fca5a5/#991b1b', warning:'#fff7ed/#fdba74/#92400e', info:'#eff6ff/#93c5fd/#1e40af' }[type]?.split('/') || ['#eff6ff','#93c5fd','#1e40af'];
        Object.assign(toast.style, { background:c[0], border:`1px solid ${c[1]}`, color:c[2], padding:'.8rem 1.1rem', borderRadius:'10px', fontWeight:'600', fontSize:'.85rem', position:'fixed', bottom:'1.5rem', right:'1.5rem', zIndex:'9999', boxShadow:'0 8px 24px rgba(0,0,0,.15)', maxWidth:'360px', opacity:'0', transition:'.3s', fontFamily:"'Inter',sans-serif" });
        toast.textContent = message;
        toast.className = 'll-toast show';
        requestAnimationFrame(() => { toast.style.opacity = '1'; });
        clearTimeout(toast._hide);
        toast._hide = setTimeout(() => { toast.style.opacity = '0'; }, 3500);
    }

    // ── Escape HTML ───────────────────────────────────
    const esc = s => !s ? '' : String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

    // ── State ─────────────────────────────────────────
    let allRegistrations    = [];
    let activeFilter        = 'all';
    let activeRegId         = null;   // set when opening complete-donation modal
    let adminLat            = null;   // admin's location
    let adminLng            = null;

    // ── Receiver Requests State ───────────────────────
    let allReceiverRequests   = [];
    let activeReceiverFilter  = 'All Types';
    let activeReceiverReqId   = null;  // set when opening complete-receiver modal

    // ── Helper: Calculate distance using Haversine formula (in km) ──
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // ── Get admin location ──
    function getAdminLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    adminLat = position.coords.latitude;
                    adminLng = position.coords.longitude;
                    console.log(`[Admin Location] Lat: ${adminLat}, Lng: ${adminLng}`);
                    // Re-render with sorted distances
                    renderRegistrations(allRegistrations);
                },
                (error) => {
                    console.warn('[Geolocation] Failed to get admin location:', error.message);
                    // Render without distance sorting
                    renderRegistrations(allRegistrations);
                }
            );
        } else {
            console.warn('[Geolocation] Not supported in this browser');
            renderRegistrations(allRegistrations);
        }
    }

    // ── Donor Requests: Chip filter ───────────────────
    document.querySelectorAll('#requestsBody')?.forEach(() => {}); // anchor
    const donorChips = document.querySelectorAll('.table-tabs:not(#receiverTabs) .chip');
    donorChips.forEach(chip => {
        chip.addEventListener('click', () => {
            donorChips.forEach(c => c.className = c.className.replace('chip-red-solid','chip-grey'));
            chip.className = chip.className.replace('chip-grey','chip-red-solid');
            activeFilter = chip.textContent.trim();
            renderRegistrations(allRegistrations);
        });
    });

    // ── Receiver Requests: Chip filter ───────────────
    const receiverChips = document.querySelectorAll('#receiverTabs .chip');
    receiverChips.forEach(chip => {
        chip.addEventListener('click', () => {
            receiverChips.forEach(c => c.className = c.className.replace('chip-red-solid','chip-grey'));
            chip.className = chip.className.replace('chip-grey','chip-red-solid');
            activeReceiverFilter = chip.dataset.rcvFilter || chip.textContent.trim();
            renderReceiverRequests(allReceiverRequests);
        });
    });

    // ══════════════════════════════════════════════════
    // FETCH FUNCTIONS
    // ══════════════════════════════════════════════════

    async function fetchInventoryData() {
        const token = getAuthToken(); if (!token) return handleUnauthorized();
        try {
            const res = await fetch(`${API_URL}/admin/inventory`, { headers:{ 'Authorization':`Bearer ${token}` } });
            if (res.status === 401 || res.status === 403) return handleUnauthorized();
            const data = await res.json();
            if (res.ok) { renderInventory(data.stock); return data; }
        } catch (err) { console.error('Inventory fetch error:', err); }
        return null;
    }

    async function fetchDonorRegistrations() {
        const token = getAuthToken(); if (!token) return;
        try {
            const res = await fetch(`${API_URL}/admin/donor-registrations?status=active`, { headers:{ 'Authorization':`Bearer ${token}` } });
            if (!res.ok) { requestsBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#9CA3AF;">Failed to load donor requests.</td></tr>'; return; }
            const data  = await res.json();
            allRegistrations = data.registrations || [];
            renderRegistrations(allRegistrations);
            if (tableInfo) tableInfo.textContent = `Showing ${allRegistrations.length} active donor request${allRegistrations.length !== 1 ? 's' : ''}`;
        } catch (err) { console.error('Donor registrations fetch error:', err); }
    }

    // ─────────────────────────────────────────────────
    // Receiver Requests fetch
    // ─────────────────────────────────────────────────
    async function fetchReceiverRequests() {
        const token = getAuthToken(); if (!token) return;
        const tbody = document.getElementById('receiverRequestsBody');
        if (!tbody) return;
        try {
            const res = await fetch(`${API_URL}/admin/receiver-requests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#9CA3AF;">Failed to load receiver requests.</td></tr>';
                return;
            }
            const data = await res.json();
            allReceiverRequests = data.requests || [];
            renderReceiverRequests(allReceiverRequests);
        } catch (err) {
            console.error('Receiver requests fetch error:', err);
        }
    }

    // ══════════════════════════════════════════════════
    // RENDER FUNCTIONS
    // ══════════════════════════════════════════════════

    function renderStats(invData) {
        if (!statsGrid) return;
        const totalUnits       = Number(invData.totalStock)           || 0;
        const donorCount       = invData.donors?.length               || 0;
        const pendingDonorReqs = Number(invData.pendingDonorRequests) || 0;
        const networkNodes     = Number(invData.networkNodes)         || 0;

        statsGrid.innerHTML = `
            <div class="stat-card">
              <div class="stat-card-top">
                <div class="stat-icon stat-icon--red">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10L12 2Z"/></svg>
                </div>
                <div class="stat-chip stat-chip--red">Live</div>
              </div>
              <div class="stat-label">Total Blood Units</div>
              <div class="stat-value" title="Sum of all recorded inventory">${totalUnits.toFixed(1)}</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-top">
                <div class="stat-icon stat-icon--blue">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div class="stat-chip stat-chip--grey">Eligible</div>
              </div>
              <div class="stat-label">Available Donors</div>
              <div class="stat-value" title="Verified donors not on cooldown">${donorCount}</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-top">
                <div class="stat-icon stat-icon--amber">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <div class="stat-chip stat-chip--amber">Pending</div>
              </div>
              <div class="stat-label">Donor Requests</div>
              <div class="stat-value" title="Awaiting admin review">${pendingDonorReqs}</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-top">
                <div class="stat-icon stat-icon--green">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <div class="stat-chip stat-chip--green">Active</div>
              </div>
              <div class="stat-label">Network Nodes</div>
              <div class="stat-value" title="Distinct cities with verified users">${networkNodes}</div>
            </div>
        `;
    }

    function renderInventory(stock) {
        if (!inventoryGrid) return;
        const allTypes = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
        const stockMap = {};
        (stock || []).forEach(r => { stockMap[r.blood_type] = Number(r.total_units); });
        inventoryGrid.innerHTML = '';
        allTypes.forEach(type => {
            const units = stockMap[type] || 0;
            const isLow = units < 5;
            const item  = document.createElement('div');
            item.className = 'inventory-item';
            item.style.border = isLow ? '1px solid #fca5a5' : '';
            item.innerHTML = `
                <span class="inventory-item-title">${type}</span>
                <span class="inventory-item-count" style="color:${isLow ? '#ef4444' : ''}">${units.toFixed(1)}</span>
                <span class="inventory-item-label">${isLow ? '⚠ Low Stock' : 'Units Available'}</span>
            `;
            inventoryGrid.appendChild(item);
        });
    }

    function renderRegistrations(regs) {
        if (!requestsBody) return;
        requestsBody.innerHTML = '';

        let filtered = regs;
        if (activeFilter !== 'all' && activeFilter !== 'All Types') {
            const bt = activeFilter.replace('−','-');
            filtered = regs.filter(r => r.blood_type === bt);
        }

        // Sort by distance if admin location is available
        if (adminLat && adminLng) {
            filtered = filtered.sort((a, b) => {
                const distA = calculateDistance(adminLat, adminLng, parseFloat(a.latitude || 0), parseFloat(a.longitude || 0));
                const distB = calculateDistance(adminLat, adminLng, parseFloat(b.latitude || 0), parseFloat(b.longitude || 0));
                return distA - distB;
            });
        }

        if (filtered.length === 0) {
            requestsBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:28px;color:#9CA3AF;">
                ${regs.length === 0 ? 'No active donor requests.' : `No requests for blood type "${activeFilter}".`}
            </td></tr>`;
            return;
        }

        filtered.forEach(reg => {
            const dateStr = new Date(reg.created_at).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
            const isPending  = reg.status === 'pending';
            const isApproved = reg.status === 'approved';

            // Calculate distance if location available
            let distanceStr = '—';
            if (adminLat && adminLng && reg.latitude && reg.longitude) {
                const dist = calculateDistance(adminLat, adminLng, parseFloat(reg.latitude), parseFloat(reg.longitude));
                distanceStr = `${dist.toFixed(1)} km`;
            }

            // Status pill
            const statusPill = isPending
                ? `<span style="background:#fff7ed;color:#92400e;border:1px solid #fdba74;padding:5px 12px;border-radius:20px;font-size:.75rem;font-weight:600;white-space:nowrap;display:inline-block;">⏳ Pending</span>`
                : `<span style="background:#f0fdf4;color:#166534;border:1px solid #86efac;padding:5px 12px;border-radius:20px;font-size:.75rem;font-weight:600;white-space:nowrap;display:inline-block;">✓ Approved</span>`;

            // Action buttons
            let actionBtns = '';
            if (isPending) {
                actionBtns = `
                    <button class="btn-action btn-action-green approve-reg" data-id="${reg.id}" data-name="${esc(reg.fullname)}" style="background:#16a34a;color:#fff;border:none !important;padding:6px 14px;font-size:.8rem;font-weight:600;">
                        ✓ Approve
                    </button>
                    <button class="btn-action btn-action-red reject-reg" data-id="${reg.id}" data-name="${esc(reg.fullname)}" style="background:#fef2f2;color:#991b1b;border:1px solid #fca5a5 !important;padding:6px 14px;font-size:.8rem;font-weight:600;">
                        ✕ Reject
                    </button>`;
            } else if (isApproved) {
                actionBtns = `
                    <button class="complete-donation-btn" data-id="${reg.id}" data-name="${esc(reg.fullname)}" data-blood="${esc(reg.blood_type)}" style="background:linear-gradient(135deg,#C0281C,#9b1c1c);color:#fff;border:none;padding:6px 14px;border-radius:6px;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap;">
                        Complete
                    </button>`;
            }

            const tr = document.createElement('tr');
            tr.style.height = '60px';
            tr.innerHTML = `
                <td class="td-req-id">#DR-${String(reg.id).padStart(4,'0')}</td>
                <td>
                    <div class="td-facility" style="font-weight:600;">${esc(reg.fullname)}</div>
                    <div class="td-facility-sub" style="font-size:.75rem;color:#9CA3AF;margin-top:2px;">${esc(reg.email || reg.phone || '')}</div>
                </td>
                <td><span class="blood-type-box">${esc(reg.blood_type)}</span></td>
                <td style="font-size:.85rem;color:#6B7280;">${esc(reg.donation_type || 'Whole Blood')}</td>
                <td style="font-size:.85rem;color:#C0281C;font-weight:600;">${distanceStr}</td>
                <td>${statusPill}</td>
                <td class="action-cell">${actionBtns}</td>
            `;
            requestsBody.appendChild(tr);
        });

        // Attach action listeners
        document.querySelectorAll('.approve-reg').forEach(btn => btn.addEventListener('click', () => handleApprove(btn.dataset.id, btn.dataset.name)));
        document.querySelectorAll('.reject-reg').forEach(btn => btn.addEventListener('click', () => handleReject(btn.dataset.id, btn.dataset.name)));
        document.querySelectorAll('.complete-donation-btn').forEach(btn => btn.addEventListener('click', () => openCompleteModal(btn.dataset.id, btn.dataset.name, btn.dataset.blood)));
    }

    // ─────────────────────────────────────────────────
    // Render Receiver Requests
    // ─────────────────────────────────────────────────
    function renderReceiverRequests(requests) {
        const tbody      = document.getElementById('receiverRequestsBody');
        const tableInfo  = document.getElementById('receiverTableInfo');
        if (!tbody) return;
        tbody.innerHTML = '';

        // Apply blood-type filter
        let filtered = requests;
        if (activeReceiverFilter && activeReceiverFilter !== 'All Types') {
            const bt = activeReceiverFilter.replace('\u2212', '-');
            filtered = requests.filter(r => r.blood_type === bt);
        }

        const count = requests.length;
        if (tableInfo) tableInfo.textContent = `Showing ${count} active critical receiver request${count !== 1 ? 's' : ''}`;

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:28px;color:#9CA3AF;">
                ${requests.length === 0 ? 'No active critical receiver requests.' : `No critical requests for blood type "${activeReceiverFilter}".`}
            </td></tr>`;
            return;
        }

        filtered.forEach(req => {
            const isPending  = req.status === 'pending';
            const isApproved = req.status === 'approved';

            // Urgency badge (always critical here)
            const urgencyBadge = `<span style="background:#FEF2F2;color:#C0281C;border:1px solid #fca5a5;padding:4px 10px;border-radius:20px;font-size:.73rem;font-weight:700;font-family:'Sora',sans-serif;white-space:nowrap;">🚨 Critical</span>`;

            // Status pill
            const statusPill = isPending
                ? `<span style="background:#fff7ed;color:#92400e;border:1px solid #fdba74;padding:5px 12px;border-radius:20px;font-size:.75rem;font-weight:600;white-space:nowrap;display:inline-block;">⏳ Pending</span>`
                : `<span style="background:#f0fdf4;color:#166534;border:1px solid #86efac;padding:5px 12px;border-radius:20px;font-size:.75rem;font-weight:600;white-space:nowrap;display:inline-block;">✓ Approved</span>`;

            // Action buttons
            let actionBtns = '';
            if (isPending) {
                actionBtns = `
                    <button class="btn-action btn-action-green rcv-approve-btn"
                        data-id="${req.id}" data-name="${esc(req.patient_name)}"
                        style="background:#16a34a;color:#fff;border:none !important;padding:6px 14px;font-size:.8rem;font-weight:600;border-radius:6px;cursor:pointer;white-space:nowrap;">
                        ✓ Approve
                    </button>
                    <button class="btn-action btn-action-red rcv-decline-btn"
                        data-id="${req.id}" data-name="${esc(req.patient_name)}"
                        style="background:#fef2f2;color:#991b1b;border:1px solid #fca5a5 !important;padding:6px 14px;font-size:.8rem;font-weight:600;border-radius:6px;cursor:pointer;white-space:nowrap;">
                        ✕ Decline
                    </button>`;
            } else if (isApproved) {
                actionBtns = `
                    <button class="rcv-complete-btn"
                        data-id="${req.id}" data-name="${esc(req.patient_name)}"
                        data-blood="${esc(req.blood_type)}" data-units="${esc(String(req.units_required))}"
                        style="background:linear-gradient(135deg,#C0281C,#9b1c1c);color:#fff;border:none;padding:6px 14px;border-radius:6px;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap;">
                        Fulfill
                    </button>
                    <button class="btn-action btn-action-red rcv-decline-btn"
                        data-id="${req.id}" data-name="${esc(req.patient_name)}"
                        style="background:#fef2f2;color:#991b1b;border:1px solid #fca5a5 !important;padding:6px 14px;font-size:.8rem;font-weight:600;border-radius:6px;cursor:pointer;white-space:nowrap;">
                        ✕ Decline
                    </button>`;
            }

            const tr = document.createElement('tr');
            tr.style.height = '60px';
            tr.innerHTML = `
                <td class="td-req-id">#RR-${String(req.id).padStart(4,'0')}</td>
                <td>
                    <div class="td-facility" style="font-weight:600;">${esc(req.patient_name)}</div>
                    <div class="td-facility-sub" style="font-size:.75rem;color:#9CA3AF;margin-top:2px;">${esc(req.hospital_name || '')}${req.city ? ', ' + esc(req.city) : ''}</div>
                </td>
                <td><span class="blood-type-box">${esc(req.blood_type)}</span></td>
                <td style="font-size:.85rem;color:#374151;font-weight:600;">${esc(String(req.units_required))} unit${req.units_required !== 1 ? 's' : ''}</td>
                <td>${urgencyBadge}</td>
                <td>${statusPill}</td>
                <td class="action-cell">${actionBtns}</td>
            `;
            tbody.appendChild(tr);
        });

        // Attach listeners
        tbody.querySelectorAll('.rcv-approve-btn').forEach(btn =>
            btn.addEventListener('click', () => handleReceiverApprove(btn.dataset.id, btn.dataset.name))
        );
        tbody.querySelectorAll('.rcv-decline-btn').forEach(btn =>
            btn.addEventListener('click', () => handleReceiverDecline(btn.dataset.id, btn.dataset.name))
        );
        tbody.querySelectorAll('.rcv-complete-btn').forEach(btn =>
            btn.addEventListener('click', () => openCompleteReceiverModal(btn.dataset.id, btn.dataset.name, btn.dataset.blood, btn.dataset.units))
        );
    }

    // ══════════════════════════════════════════════════
    // ACTION HANDLERS
    // ══════════════════════════════════════════════════

    async function handleApprove(id, name) {
        const confirmed = await showConfirmModal(`Approve donor registration for "${name}"?\n\nThey will be notified and can be called for donation.`, 'Approve Registration');
        if (!confirmed) return;
        const token = getAuthToken();
        try {
            const res = await fetch(`${API_URL}/admin/donor-registrations/${id}/approve`, {
                method:'POST', headers:{ 'Authorization':`Bearer ${token}`, 'Content-Type':'application/json' }
            });
            const data = await res.json();
            if (res.ok) { showToast(`✓ ${name}'s registration approved.`, 'success'); await init(); }
            else showToast(data.message || 'Failed to approve.', 'danger');
        } catch { showToast('Network error. Please try again.', 'danger'); }
    }

    async function handleReject(id, name) {
        const reason = await showPromptModal(`Reason for rejecting "${name}"'s registration (optional):`, 'Reject Registration');
        if (reason === null) return;
        const token = getAuthToken();
        try {
            const res = await fetch(`${API_URL}/admin/donor-registrations/${id}/reject`, {
                method:'POST',
                headers:{ 'Authorization':`Bearer ${token}`, 'Content-Type':'application/json' },
                body: JSON.stringify({ reason: reason.trim() || null })
            });
            const data = await res.json();
            if (res.ok) { showToast(`${name}'s registration rejected.`, 'warning'); await init(); }
            else showToast(data.message || 'Failed to reject.', 'danger');
        } catch { showToast('Network error. Please try again.', 'danger'); }
    }

    // ══════════════════════════════════════════════════
    // RECEIVER REQUEST ACTION HANDLERS
    // ══════════════════════════════════════════════════

    async function handleReceiverApprove(id, name) {
        const confirmed = await showConfirmModal(
            `Approve critical blood request from "${name}"?\n\nThey will be notified that their request is approved. You can then fulfill it from inventory.`,
            'Approve Receiver Request'
        );
        if (!confirmed) return;
        const token = getAuthToken();
        try {
            const res = await fetch(`${API_URL}/admin/receiver-requests/${id}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (res.ok) {
                showToast(`✓ Request from ${name} approved.`, 'success');
                await fetchReceiverRequests();
            } else {
                showToast(data.message || 'Failed to approve.', 'danger');
            }
        } catch { showToast('Network error. Please try again.', 'danger'); }
    }

    async function handleReceiverDecline(id, name) {
        const reason = await showPromptModal(
            `Reason for declining the request from "${name}" (optional):`,
            'Decline Receiver Request'
        );
        if (reason === null) return;
        const token = getAuthToken();
        try {
            const res = await fetch(`${API_URL}/admin/receiver-requests/${id}/decline`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: reason.trim() || null })
            });
            const data = await res.json();
            if (res.ok) {
                showToast(`Request from ${name} declined.`, 'warning');
                await fetchReceiverRequests();
            } else {
                showToast(data.message || 'Failed to decline.', 'danger');
            }
        } catch { showToast('Network error. Please try again.', 'danger'); }
    }

    // ── Complete Receiver Request Modal ───────────────
    const completeReceiverModal = document.getElementById('completeReceiverModal');
    const rcvBloodTypeEl        = document.getElementById('rcvBloodType');
    const rcvUnitsEl            = document.getElementById('rcvUnits');
    const rcvDateEl             = document.getElementById('rcvCompletionDate');
    const rcvNotesEl            = document.getElementById('rcvNotes');
    const confirmRcvBtn         = document.getElementById('confirmCompleteReceiver');

    if (rcvDateEl) rcvDateEl.value = new Date().toISOString().split('T')[0];

    function openCompleteReceiverModal(id, name, bloodType, unitsNeeded) {
        activeReceiverReqId = id;
        document.getElementById('modalReceiverName').textContent      = name;
        document.getElementById('modalReceiverBloodType').textContent  = bloodType;
        document.getElementById('modalReceiverUnits').textContent      = `${unitsNeeded} unit(s)`;
        if (rcvBloodTypeEl) {
            [...rcvBloodTypeEl.options].forEach(o => { o.selected = o.text === bloodType; });
        }
        if (rcvUnitsEl)  rcvUnitsEl.value  = unitsNeeded || '1.0';
        if (rcvDateEl)   rcvDateEl.value   = new Date().toISOString().split('T')[0];
        if (rcvNotesEl)  rcvNotesEl.value  = '';
        if (completeReceiverModal) completeReceiverModal.classList.add('show');
        if (confirmRcvBtn) { confirmRcvBtn.textContent = '✓ Fulfill & Decrement Inventory'; confirmRcvBtn.disabled = false; }
    }

    function closeCompleteReceiverModal() {
        if (completeReceiverModal) completeReceiverModal.classList.remove('show');
        activeReceiverReqId = null;
    }

    document.getElementById('closeCompleteReceiverModal')?.addEventListener('click', closeCompleteReceiverModal);
    document.getElementById('cancelCompleteReceiver')?.addEventListener('click', closeCompleteReceiverModal);
    completeReceiverModal?.addEventListener('click', e => { if (e.target === completeReceiverModal) closeCompleteReceiverModal(); });

    confirmRcvBtn?.addEventListener('click', async () => {
        if (!activeReceiverReqId) return;

        const blood_type       = rcvBloodTypeEl?.value?.trim();
        const units            = parseFloat(rcvUnitsEl?.value);
        const completion_date  = rcvDateEl?.value;
        const notes            = rcvNotesEl?.value?.trim();

        if (!blood_type)      { showToast('Please select a blood type.', 'warning'); return; }
        if (!units || units <= 0) { showToast('Please enter valid units (> 0).', 'warning'); return; }
        if (!completion_date) { showToast('Please select a completion date.', 'warning'); return; }
        if (new Date(completion_date) > new Date()) { showToast('Completion date cannot be in the future.', 'warning'); return; }

        confirmRcvBtn.textContent = 'Fulfilling…';
        confirmRcvBtn.disabled    = true;

        const token = getAuthToken();
        try {
            const res = await fetch(`${API_URL}/admin/receiver-requests/${activeReceiverReqId}/complete`, {
                method:  'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body:    JSON.stringify({ blood_type, units, completion_date, notes: notes || null })
            });
            const data = await res.json();
            if (res.ok) {
                showToast(`Request fulfilled! ${units}u of ${blood_type} deducted from inventory.`, 'success');
                closeCompleteReceiverModal();
                await init(); // refresh everything (inventory stock + receiver list)
            } else {
                confirmRcvBtn.textContent = '✓ Fulfill & Decrement Inventory';
                confirmRcvBtn.disabled    = false;
                showToast(data.message || 'Failed to fulfill request.', 'danger');
            }
        } catch {
            confirmRcvBtn.textContent = '✓ Fulfill & Decrement Inventory';
            confirmRcvBtn.disabled    = false;
            showToast('Network error. Please try again.', 'danger');
        }
    });

    // ── Complete Donation Modal ───────────────────────
    const completeModal  = document.getElementById('completeDonationModal');
    const closeModalBtns = [document.getElementById('closeCompleteDonationModal'), document.getElementById('cancelCompleteDonation')];
    const confirmBtn     = document.getElementById('confirmCompleteDonation');
    const bloodTypeEl    = document.getElementById('completeBloodType');
    const unitsEl        = document.getElementById('completeUnits');
    const dateEl         = document.getElementById('completeDonationDate');
    const notesEl        = document.getElementById('completeNotes');

    // Set today as default donation date
    if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];

    function openCompleteModal(id, name, bloodType) {
        activeRegId = id;
        document.getElementById('modalDonorName').textContent      = name;
        document.getElementById('modalDonorBloodType').textContent  = bloodType;
        // Pre-select the donor's registered blood type
        if (bloodTypeEl) {
            [...bloodTypeEl.options].forEach(o => { o.selected = o.text === bloodType; });
        }
        if (unitsEl) unitsEl.value = '1.0';
        if (dateEl)  dateEl.value  = new Date().toISOString().split('T')[0];
        if (notesEl) notesEl.value = '';
        completeModal.classList.add('show');      // CSS handles visibility
        confirmBtn.textContent = '✓ Record Donation';
        confirmBtn.disabled    = false;
    }

    function closeCompleteModal() {
        completeModal.classList.remove('show');
        activeRegId = null;
    }

    closeModalBtns.forEach(btn => btn?.addEventListener('click', closeCompleteModal));
    completeModal?.addEventListener('click', e => { if (e.target === completeModal) closeCompleteModal(); });

    confirmBtn?.addEventListener('click', async () => {
        if (!activeRegId) return;

        const blood_type    = bloodTypeEl?.value?.trim();
        const units         = parseFloat(unitsEl?.value);
        const donation_date = dateEl?.value;
        const notes         = notesEl?.value?.trim();

        // Validate
        if (!blood_type) { showToast('Please select a blood type.', 'warning'); return; }
        if (!units || units <= 0) { showToast('Please enter valid units (> 0).', 'warning'); return; }
        if (!donation_date) { showToast('Please select the donation date.', 'warning'); return; }
        if (new Date(donation_date) > new Date()) { showToast('Donation date cannot be in the future.', 'warning'); return; }

        confirmBtn.textContent = 'Recording…';
        confirmBtn.disabled    = true;

        const token = getAuthToken();
        try {
            const res = await fetch(`${API_URL}/admin/donor-registrations/${activeRegId}/complete`, {
                method:  'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body:    JSON.stringify({ blood_type, units, donation_date, notes: notes || null })
            });
            const data = await res.json();
            if (res.ok) {
                showToast(`Donation recorded! ${units}u of ${blood_type} added to inventory.`, 'success');
                closeCompleteModal();
                await init(); // refresh everything
            } else {
                confirmBtn.textContent = '✓ Record Donation';
                confirmBtn.disabled    = false;
                showToast(data.message || 'Failed to record donation.', 'danger');
            }
        } catch {
            confirmBtn.textContent = '✓ Record Donation';
            confirmBtn.disabled    = false;
            showToast('Network error. Please try again.', 'danger');
        }
    });

    // ══════════════════════════════════════════════════
    // INITIALIZE — run all fetches in parallel
    // ══════════════════════════════════════════════════
    async function init() {
        const [, invData] = await Promise.all([
            fetchDonorRegistrations(),
            fetchInventoryData(),
            fetchReceiverRequests()
        ]);
        if (invData) renderStats(invData);
        // Get admin location for distance sorting
        getAdminLocation();
    }

    init();
});
