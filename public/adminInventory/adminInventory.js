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

    // ── Dropdown ─────────────────────────────────────
    navAvatar?.addEventListener('click', e => { e.stopPropagation(); avatarDropdown?.classList.toggle('show'); });
    document.addEventListener('click', () => avatarDropdown?.classList.remove('show'));
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
    let allRegistrations = [];
    let activeFilter     = 'all';
    let activeRegId      = null;   // set when opening complete-donation modal

    // ── Chip filter ───────────────────────────────────
    document.querySelectorAll('.table-tabs .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.table-tabs .chip').forEach(c => c.className = c.className.replace('chip-red-solid','chip-grey'));
            chip.className = chip.className.replace('chip-grey','chip-red-solid');
            activeFilter = chip.textContent.trim();
            renderRegistrations(allRegistrations);
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

            // Status pill
            const statusPill = isPending
                ? `<span style="background:#fff7ed;color:#92400e;border:1px solid #fdba74;padding:3px 10px;border-radius:20px;font-size:.75rem;font-weight:600;">⏳ Pending</span>`
                : `<span style="background:#f0fdf4;color:#166534;border:1px solid #86efac;padding:3px 10px;border-radius:20px;font-size:.75rem;font-weight:600;">✓ Approved</span>`;

            // Action buttons
            let actionBtns = '';
            if (isPending) {
                actionBtns = `
                    <button class="approve-reg" data-id="${reg.id}" data-name="${esc(reg.fullname)}"
                        style="background:#16a34a;color:#fff;border:none;padding:5px 12px;border-radius:6px;font-size:.78rem;font-weight:600;cursor:pointer;margin-right:4px;">
                        Approve
                    </button>
                    <button class="reject-reg" data-id="${reg.id}" data-name="${esc(reg.fullname)}"
                        style="background:#fef2f2;color:#991b1b;border:1px solid #fca5a5;padding:5px 12px;border-radius:6px;font-size:.78rem;font-weight:600;cursor:pointer;">
                        Reject
                    </button>`;
            } else if (isApproved) {
                actionBtns = `
                    <button class="complete-donation-btn"
                        data-id="${reg.id}" data-name="${esc(reg.fullname)}" data-blood="${esc(reg.blood_type)}"
                        style="background:linear-gradient(135deg,#C0281C,#9b1c1c);color:#fff;border:none;padding:5px 14px;border-radius:6px;font-size:.78rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px;">
                        🩸 Complete Donation
                    </button>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="td-req-id">#DR-${String(reg.id).padStart(4,'0')}</td>
                <td>
                    <div class="td-facility" style="font-weight:600;">${esc(reg.fullname)}</div>
                    <div class="td-facility-sub" style="font-size:.75rem;color:#9CA3AF;">${esc(reg.email || reg.phone || '')}</div>
                </td>
                <td><span class="blood-type-box">${esc(reg.blood_type)}</span></td>
                <td style="font-size:.8rem;color:#6B7280;">${esc(reg.donation_type || 'Whole Blood')}</td>
                <td>${statusPill}</td>
                <td class="time-cell">${dateStr}</td>
                <td class="action-cell">${actionBtns}</td>
            `;
            requestsBody.appendChild(tr);
        });

        // Attach action listeners
        document.querySelectorAll('.approve-reg').forEach(btn => btn.addEventListener('click', () => handleApprove(btn.dataset.id, btn.dataset.name)));
        document.querySelectorAll('.reject-reg').forEach(btn => btn.addEventListener('click', () => handleReject(btn.dataset.id, btn.dataset.name)));
        document.querySelectorAll('.complete-donation-btn').forEach(btn => btn.addEventListener('click', () => openCompleteModal(btn.dataset.id, btn.dataset.name, btn.dataset.blood)));
    }

    // ══════════════════════════════════════════════════
    // ACTION HANDLERS
    // ══════════════════════════════════════════════════

    async function handleApprove(id, name) {
        if (!confirm(`Approve donor registration for "${name}"?\n\nThey will be notified and can be called for donation.`)) return;
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
        const reason = prompt(`Reason for rejecting "${name}"'s registration (optional):`);
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
                showToast(`🩸 Donation recorded! ${units}u of ${blood_type} added to inventory.`, 'success');
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
    // INITIALIZE — run both fetches in parallel
    // ══════════════════════════════════════════════════
    async function init() {
        const [, invData] = await Promise.all([
            fetchDonorRegistrations(),
            fetchInventoryData()
        ]);
        if (invData) renderStats(invData);
    }

    init();
});
