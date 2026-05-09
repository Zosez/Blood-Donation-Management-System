/* ── main.js ── */

document.addEventListener('DOMContentLoaded', () => {
  // Protect admin route
  if (!ADMIN_AUTH.protectRoute()) return;

  /* ── NAV: active state on click ── */
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
    });
  });

  /* ── SEARCH: live filter table rows ── */
  const searchInputs = document.querySelectorAll('.search-wrap input, .filter-input-wrap input');
  const roleSelect   = document.getElementById('roleFilter');
  const statusSelect = document.getElementById('statusFilter');
  const bloodSelect  = document.getElementById('bloodFilter');

  function filterTable() {
    const query  = (document.querySelector('.search-wrap input').value || '').toLowerCase();
    const dbQuery= (document.querySelector('.filter-input-wrap input') || {value:''}).value.toLowerCase();
    const role   = roleSelect   ? roleSelect.value   : 'All Roles';
    const status = statusSelect ? statusSelect.value : 'All Status';
    const blood  = bloodSelect  ? bloodSelect.value  : 'Any Type';

    const rows = document.querySelectorAll('tbody tr');
    let visible = 0;

    rows.forEach(row => {
      const name      = row.querySelector('.user-name')?.textContent.toLowerCase()   || '';
      const email     = row.cells[1]?.textContent.toLowerCase()                      || '';
      const bloodType = row.querySelector('.blood-badge')?.textContent.trim()        || '';
      const roleText  = row.querySelector('.role-badge')?.textContent.trim()         || '';
      const statusEl  = row.querySelector('.status-wrap');
      const statusText= statusEl ? (statusEl.classList.contains('status-active') ? 'Active' : 'Suspended') : '';

      const matchQuery  = !query   || name.includes(query)   || email.includes(query);
      const matchDB     = !dbQuery || name.includes(dbQuery) || email.includes(dbQuery);
      const matchRole   = role   === 'All Roles'  || roleText.toLowerCase()  === role.toLowerCase();
      const matchStatus = status === 'All Status' || statusText === status;
      const matchBlood  = blood  === 'Any Type'   || bloodType === blood;

      const show = matchQuery && matchDB && matchRole && matchStatus && matchBlood;
      row.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    /* update "Showing X – Y of N" */
    const showingEl = document.querySelector('.showing-text');
    if (showingEl) {
      showingEl.innerHTML = `Showing <b>1 – ${visible}</b> of <b>${visible}</b> users`;
    }
  }

  searchInputs.forEach(el => el.addEventListener('input', filterTable));
  if (roleSelect)   roleSelect.addEventListener('change',   filterTable);
  if (statusSelect) statusSelect.addEventListener('change', filterTable);
  if (bloodSelect)  bloodSelect.addEventListener('change',  filterTable);

  /* ── PAGINATION: page button highlight ── */
  document.querySelectorAll('.pg-btn:not(.arrow):not(.dots)').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  /* ── EXPORT CSV ── */
  document.querySelector('.btn-export')?.addEventListener('click', () => {
    const headers = ['Name', 'Email', 'Blood Type', 'City', 'Role', 'Status', 'Donations', 'Joined'];
    const rows = [...document.querySelectorAll('tbody tr')]
      .filter(r => r.style.display !== 'none')
      .map(r => [
        r.querySelector('.user-name')?.textContent.trim()   || '',
        r.cells[1]?.textContent.trim()                      || '',
        r.querySelector('.blood-badge')?.textContent.trim() || '',
        r.cells[3]?.textContent.trim()                      || '',
        r.querySelector('.role-badge')?.textContent.trim()  || '',
        r.querySelector('.status-wrap')?.textContent.trim() || '',
        r.querySelector('.donations-num')?.textContent.trim()|| '',
        r.querySelector('.joined-date')?.textContent.trim() || '',
      ]);

    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'lifelink_users.csv' });
    a.click();
    URL.revokeObjectURL(url);
  });

  /* ── NEW REQUEST: placeholder alert ── */
  document.querySelector('.btn-new-request')?.addEventListener('click', () => {
    alert('New request form coming soon!');
  });

  /* ── Standard Sidebar Nav ── */
  document.getElementById('admin-dashboard')?.addEventListener('click', (e) => {
    e.preventDefault(); window.location.href = '/adminDashboard';
  });
  document.getElementById('admin-request')?.addEventListener('click', (e) => {
    e.preventDefault(); window.location.href = '/pendingRequests';
  });
  document.getElementById('admin-notification')?.addEventListener('click', (e) => {
    e.preventDefault(); window.location.href = '/adminNotification';
  });
  document.getElementById('admin-events')?.addEventListener('click', (e) => {
    e.preventDefault(); window.location.href = '/adminEvents';
  });
  document.getElementById('admin-profile')?.addEventListener('click', (e) => {
    e.preventDefault(); window.location.href = '/adminProfile';
  });
  document.getElementById('home-logo')?.addEventListener('click', (e) => {
    e.preventDefault(); window.location.href = '/adminDashboard';
  });

  /* ── Avatar dropdown ── */
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

  /* ── Logout ── */
  document.getElementById('dropdownLogoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  });

  /* ── Mobile sidebar ── */
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  if (mobileMenuBtn && sidebar && sidebarOverlay) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.add('open'); sidebarOverlay.classList.add('active');
    });
    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('open'); sidebarOverlay.classList.remove('active');
    });
  }

});
