/* ============================================================
   pendingRequests.js  —  Admin Pending Requests (Live Backend)
   API: GET  /api/admin/blood-requests?status=
        POST /api/admin/approve-request/:id
        POST /api/admin/reject-request/:id
   ============================================================ */

const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  if (!token) { window.location.href = '/login'; return null; }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    return null;
  }

  return res;
}

document.addEventListener('DOMContentLoaded', () => {

  /* ── Toast ───────────────────────────────────────────── */
  let toastTimeout = null;
  let activeToast = null;

  function showToast(message, type = 'default') {
    const colors = {
      default: { bg: '#ffffff', border: '#e2e8f0', text: '#1e293b' },
      success: { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
      warning: { bg: '#fff7ed', border: '#fdba74', text: '#92400e' },
      danger: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
      info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' }
    };
    const c = colors[type] || colors.default;
    if (toastTimeout) clearTimeout(toastTimeout);
    if (activeToast) activeToast.remove();

    const toast = document.createElement('div');
    toast.className = 'll-toast';
    toast.textContent = message;
    Object.assign(toast.style, {
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      opacity: '0', transform: 'translateY(20px)'
    });
    document.body.appendChild(toast);
    activeToast = toast;

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    toastTimeout = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
    }, 3000);
  }

  /* ── Nav / Avatar / Logout ───────────────────────────── */
  const navAvatar = document.getElementById('navAvatar');
  const avatarDropdown = document.getElementById('avatarDropdown');

  if (navAvatar && avatarDropdown) {
    navAvatar.addEventListener('click', (e) => {
      e.stopPropagation();
      avatarDropdown.classList.toggle('show');
    });
    document.addEventListener('click', (e) => {
      if (!navAvatar.contains(e.target) && !avatarDropdown.contains(e.target)) {
        avatarDropdown.classList.remove('show');
      }
    });
  }

  document.getElementById('dropdownLogoutBtn')?.addEventListener('click', async () => {
    if (avatarDropdown) avatarDropdown.classList.remove('show');
    showToast('Logging out…', 'warning');
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (_) { }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setTimeout(() => { window.location.href = '/login'; }, 1200);
  });

  /* ── Mobile Sidebar ──────────────────────────────────── */
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  if (mobileMenuBtn && sidebar && sidebarOverlay) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.add('open');
      sidebarOverlay.classList.add('active');
    });
    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('active');
    });
  }

  /* ── Sidebar Nav ─────────────────────────────────────── */
  document.getElementById('admin-dashboard')?.addEventListener('click', (e) => {
    e.preventDefault(); window.location.href = '/adminDashboard';
  });
  document.getElementById('admin-notification')?.addEventListener('click', (e) => {
    e.preventDefault(); window.location.href = '/adminNotification';
  });
  document.getElementById('admin-users')?.addEventListener('click', (e) => {
    e.preventDefault(); window.location.href = '/adminUsers';
  });
  document.getElementById('admin-profile')?.addEventListener('click', (e) => {
    e.preventDefault(); window.location.href = '/adminProfile';
  });
  document.getElementById('admin-events')?.addEventListener('click', (e) => {
    e.preventDefault(); window.location.href = '/adminEvents';
  });
  document.getElementById('nav-inventory')?.addEventListener('click', (e) => {
    e.preventDefault(); window.location.href = '/adminInventory';
  });


  /* ── Modal ───────────────────────────────────────────── */
  const requestModal = document.getElementById('requestModal');
  const modalClose = document.getElementById('modalClose');
  const modalDoneBtn = document.getElementById('modalDoneBtn');

  function openRequestModal(req) {
    document.getElementById('modalFacility').textContent = req.hospital_name || req.facility || '—';
    document.getElementById('modalRequestId').textContent = `Request #${req.id}`;
    document.getElementById('modalBloodType').textContent = req.blood_type || '—';
    document.getElementById('modalUrgency').textContent = capitalise(req.urgency_level || '—');
    document.getElementById('modalUnits').textContent =
      `${req.units_required} Unit${req.units_required > 1 ? 's' : ''}`;
    document.getElementById('modalStatus').textContent = capitalise(req.status || '—');
    document.getElementById('modalNote').textContent =
      req.notes || `${req.hospital_name} has requested ${req.units_required} unit(s) of ${req.blood_type} blood. ` +
      `Urgency: ${capitalise(req.urgency_level)}. Please verify and take action.`;
    requestModal.classList.add('show');
  }

  function closeRequestModal() {
    requestModal.classList.remove('show');
  }

  modalClose?.addEventListener('click', closeRequestModal);
  modalDoneBtn?.addEventListener('click', closeRequestModal);
  requestModal?.addEventListener('click', (e) => {
    if (e.target === requestModal) closeRequestModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && requestModal?.classList.contains('show')) closeRequestModal();
  });

  /* ── Filters ─────────────────────────────────────────── */
  const requestSearch = document.getElementById('requestSearch');
  const urgencyFilter = document.getElementById('urgencyFilter');
  const statusFilter = document.getElementById('statusFilter');

  // In-memory store of all rows from API (so filtering is instant, no extra API calls)
  let allRequests = [];

  function applyFilters() {
    const search = (requestSearch?.value || '').toLowerCase().trim();
    const urgency = (urgencyFilter?.value || '').toLowerCase();
    const status = (statusFilter?.value || '').toLowerCase();

    const filtered = allRequests.filter(req => {
      const searchMatch = !search ||
        (req.hospital_name || '').toLowerCase().includes(search) ||
        String(req.id).includes(search) ||
        (req.blood_type || '').toLowerCase().includes(search) ||
        (req.requester_name || '').toLowerCase().includes(search);

      const urgencyMatch = !urgency || (req.urgency_level || '').toLowerCase() === urgency;
      const statusMatch = !status || (req.status || '').toLowerCase() === status;

      return searchMatch && urgencyMatch && statusMatch;
    });

    renderTable(filtered);
  }

  requestSearch?.addEventListener('input', () => applyFilters());
  urgencyFilter?.addEventListener('change', () => applyFilters());
  statusFilter?.addEventListener('change', () => applyFilters());

  /* ── Stats ───────────────────────────────────────────── */
  function updateStats(requests) {
    const pending = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const critical = requests.filter(r => r.urgency_level === 'critical' && r.status === 'pending').length;
    const units = requests.filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + (r.units_required || 0), 0);

    const el1 = document.getElementById('pendingCount');
    const el2 = document.getElementById('approvedCount');
    const el3 = document.getElementById('criticalCount');
    const el4 = document.getElementById('unitCount');
    const el5 = document.getElementById('pendingBadge');

    if (el1) el1.textContent = pending;
    if (el2) el2.textContent = approved;
    if (el3) el3.textContent = critical;
    if (el4) el4.textContent = units;
    if (el5) el5.textContent = pending;
  }

  /* ── Helpers ─────────────────────────────────────────── */
  function capitalise(str) {
    if (!str) return '—';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function bloodTagClass(type) {
    const map = {
      'O-': 'o-neg', 'O+': 'o-pos',
      'A-': 'a-neg', 'A+': 'a-pos',
      'B-': 'b-neg', 'B+': 'b-pos',
      'AB-': 'ab-neg', 'AB+': 'ab-pos'
    };
    return map[type] || '';
  }

  function urgencyClass(level) {
    const map = { critical: 'critical', urgent: 'expedited', normal: 'standard' };
    return map[(level || '').toLowerCase()] || 'standard';
  }

  function urgencyLabel(level) {
    const map = { critical: 'Critical', urgent: 'Expedited', normal: 'Standard' };
    return map[(level || '').toLowerCase()] || capitalise(level);
  }

  function statusPillClass(status) {
    const map = {
      pending: 'pending', approved: 'approved',
      rejected: 'rejected', fulfilled: 'fulfilled', cancelled: 'rejected'
    };
    return map[(status || '').toLowerCase()] || 'pending';
  }

  /* ── Approve / Reject API calls ──────────────────────── */
  async function approveRequest(id, rowEl) {
    const btn = rowEl.querySelector('.approve-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Approving…'; }

    try {
      const res = await apiFetch(`/admin/approve-request/${id}`, { method: 'POST' });
      if (!res) return;

      if (res.ok) {
        // Update local store
        const req = allRequests.find(r => r.id == id);
        if (req) req.status = 'approved';

        updateStats(allRequests);
        applyFilters();
        showToast('✅ Request approved. Matched donors notified.', 'success');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(`Approval failed: ${err.message || 'Unknown error'}`, 'danger');
        if (btn) { btn.disabled = false; btn.textContent = 'Approve'; }
      }
    } catch (e) {
      showToast('Network error. Please try again.', 'danger');
      if (btn) { btn.disabled = false; btn.textContent = 'Approve'; }
    }
  }

  async function rejectRequest(id, rowEl) {
    // Prompt for a reason (min 20 chars as required by backend)
    const reason = window.prompt(
      'Enter rejection reason (minimum 20 characters):'
    );
    if (!reason) return;
    if (reason.trim().length < 20) {
      showToast('Rejection reason must be at least 20 characters.', 'warning');
      return;
    }

    const btn = rowEl.querySelector('.reject-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Rejecting…'; }

    try {
      const res = await apiFetch(`/admin/reject-request/${id}`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() })
      });
      if (!res) return;

      if (res.ok) {
        const req = allRequests.find(r => r.id == id);
        if (req) req.status = 'rejected';

        updateStats(allRequests);
        applyFilters();
        showToast('Request rejected.', 'danger');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(`Rejection failed: ${err.message || 'Unknown error'}`, 'danger');
        if (btn) { btn.disabled = false; btn.textContent = 'Reject'; }
      }
    } catch (e) {
      showToast('Network error. Please try again.', 'danger');
      if (btn) { btn.disabled = false; btn.textContent = 'Reject'; }
    }
  }

  /* ── Row Builder ─────────────────────────────────────── */
  function buildActionButtons(req) {
    const s = (req.status || '').toLowerCase();
    if (s === 'pending') {
      return `
        <button class="icon-btn view-btn"    type="button">View</button>
        <button class="icon-btn approve-btn" type="button">Approve</button>
        <button class="icon-btn danger-btn reject-btn" type="button">Reject</button>
      `;
    }
    if (s === 'approved') {
      return `<button class="icon-btn view-btn" type="button">View</button>`;
    }
    return `<button class="icon-btn view-btn" type="button">View</button>`;
  }

  function buildRow(req) {
    const tr = document.createElement('tr');
    tr.dataset.id = req.id;

    tr.innerHTML = `
      <td>
        <div class="patient-name">${req.hospital_name || '—'}</div>
        <div class="patient-req">Request #${req.id}${req.requester_name ? ' · ' + req.requester_name : ''}</div>
      </td>
      <td><span class="blood-tag ${bloodTagClass(req.blood_type)}">${req.blood_type || '—'}</span></td>
      <td><span class="urgency ${urgencyClass(req.urgency_level)}">${urgencyLabel(req.urgency_level)}</span></td>
      <td><strong>${req.units_required} Unit${req.units_required > 1 ? 's' : ''}</strong></td>
      <td><span class="status-pill ${statusPillClass(req.status)}">${capitalise(req.status)}</span></td>
      <td>
        <div class="action-row">
          ${buildActionButtons(req)}
        </div>
      </td>
    `;

    // Attach click handlers
    tr.querySelector('.view-btn')?.addEventListener('click', () => openRequestModal(req));

    tr.querySelector('.approve-btn')?.addEventListener('click', () => {
      approveRequest(req.id, tr);
    });

    tr.querySelector('.reject-btn')?.addEventListener('click', () => {
      rejectRequest(req.id, tr);
    });

    return tr;
  }

  /* ── Table Render ────────────────────────────────────── */
  function renderTable(requests) {
    const tbody = document.getElementById('requestsBody');
    tbody.innerHTML = '';

    if (!requests.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;padding:40px;color:#9CA3AF;">
            No requests found.
          </td>
        </tr>
      `;
      return;
    }

    requests.forEach(req => tbody.appendChild(buildRow(req)));
  }

  /* ── Initial Load ────────────────────────────────────── */
  async function loadRequests() {
    const tbody = document.getElementById('requestsBody');
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:40px;color:#9CA3AF;">
          <div style="display:flex;align-items:center;justify-content:center;gap:10px;">
            <div class="notif-spinner" style="width:20px;height:20px;border:3px solid #f3f3f3;border-top:3px solid #C82020;border-radius:50%;animation:spin 0.7s linear infinite;"></div>
            Loading requests…
          </div>
        </td>
      </tr>
    `;

    // Inject spinner keyframes if not present
    if (!document.getElementById('spin-style')) {
      const s = document.createElement('style');
      s.id = 'spin-style';
      s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(s);
    }

    try {
      const res = await apiFetch('/admin/blood-requests');
      if (!res) return;

      if (!res.ok) {
        showToast('Failed to load requests.', 'danger');
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#ef4444;">Failed to load requests.</td></tr>`;
        return;
      }

      const data = await res.json();
      allRequests = data.requests || [];

      updateStats(allRequests);
      applyFilters(); // renders table with current filter state (all by default)

    } catch (e) {
      console.error('Load requests error:', e);
      showToast('Network error loading requests.', 'danger');
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#ef4444;">Network error. Please refresh.</td></tr>`;
    }
  }

  loadRequests();

});

