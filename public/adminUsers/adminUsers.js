/* ── userManagement.js ── */

document.addEventListener('DOMContentLoaded', () => {

  /* ── NAV: active state on click ── */
  document.querySelectorAll('.sidebar-link').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-link').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
    });
  });

  /* ── SEARCH / FILTER: live filter table rows ── */
  const searchInput  = document.querySelector('.filter-input-wrap input');
  const roleSelect   = document.getElementById('roleFilter');
  const statusSelect = document.getElementById('statusFilter');
  const bloodSelect  = document.getElementById('bloodFilter');

  function filterTable() {
    const dbQuery = searchInput ? searchInput.value.toLowerCase() : '';
    const role    = roleSelect   ? roleSelect.value   : 'All Roles';
    const status  = statusSelect ? statusSelect.value : 'All Status';
    const blood   = bloodSelect  ? bloodSelect.value  : 'Any Type';

    const rows = document.querySelectorAll('tbody tr');
    let visible = 0;

    rows.forEach(row => {
      const name      = row.querySelector('.user-name')?.textContent.toLowerCase()    || '';
      const email     = row.querySelector('.cell-muted')?.textContent.toLowerCase()   || '';
      const bloodType = row.querySelector('.blood-badge')?.textContent.trim()         || '';
      const roleText  = row.querySelector('.role-badge')?.textContent.trim()          || '';
      const statusEl  = row.querySelector('.status-wrap');
      const statusText= statusEl ? (statusEl.classList.contains('status-active') ? 'Active' : 'Suspended') : '';

      const matchDB     = !dbQuery || name.includes(dbQuery) || email.includes(dbQuery);
      const matchRole   = role   === 'All Roles'  || roleText.toLowerCase() === role.toLowerCase();
      const matchStatus = status === 'All Status' || statusText === status;
      const matchBlood  = blood  === 'Any Type'   || bloodType === blood;

      const show = matchDB && matchRole && matchStatus && matchBlood;
      row.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    const showingEl = document.querySelector('.showing-text');
    if (showingEl) {
      showingEl.innerHTML = `Showing <b>1 – ${visible}</b> of <b>${visible}</b> users`;
    }
  }

  if (searchInput)  searchInput.addEventListener('input',   filterTable);
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
      .map(r => {
        const cells = r.querySelectorAll('td');
        return [
          r.querySelector('.user-name')?.textContent.trim()    || '',
          cells[1]?.textContent.trim()                         || '',
          r.querySelector('.blood-badge')?.textContent.trim()  || '',
          cells[3]?.textContent.trim()                         || '',
          r.querySelector('.role-badge')?.textContent.trim()   || '',
          r.querySelector('.status-wrap')?.textContent.trim()  || '',
          r.querySelector('.donations-num')?.textContent.trim()|| '',
          r.querySelector('.joined-date')?.textContent.trim()  || '',
        ];
      });

    const csv  = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'lifelink_users.csv' });
    a.click();
    URL.revokeObjectURL(url);
  });

  /* ── PROFILE DROPDOWN: toggle & close ── */
  const profileTrigger  = document.getElementById('profileTrigger');
  const profileDropdown = document.getElementById('profileDropdown');

  if (profileTrigger && profileDropdown) {
    profileTrigger.addEventListener('click', e => {
      e.stopPropagation();
      profileDropdown.classList.toggle('show');
    });
    document.addEventListener('click', e => {
      if (!profileDropdown.contains(e.target) && !profileTrigger.contains(e.target)) {
        profileDropdown.classList.remove('show');
      }
    });
  }

  /* ── MOBILE MENU ── */
  const mobileMenuBtn   = document.getElementById('mobileMenuBtn');
  const sidebar         = document.getElementById('sidebar');
  const sidebarOverlay  = document.getElementById('sidebarOverlay');

  function openSidebar() {
    sidebar?.classList.add('open');
    sidebarOverlay?.classList.add('active');
  }
  function closeSidebar() {
    sidebar?.classList.remove('open');
    sidebarOverlay?.classList.remove('active');
  }

  mobileMenuBtn?.addEventListener('click', openSidebar);
  sidebarOverlay?.addEventListener('click', closeSidebar);

});

document.getElementById('admin-notification')?.addEventListener('click', () => {
  window.location.href = '/adminNotification';
});

document.getElementById('admin-dashboard')?.addEventListener('click', () => {
  window.location.href = '/adminDashboard';
});

document.getElementById('admin-request')?.addEventListener('click', () => {
  window.location.href = '/pendingRequests';
});

document.getElementById('admin-profile')?.addEventListener('click', () => {
  window.location.href = '/adminProfile';
});

document.getElementById('admin-events')?.addEventListener('click', () => {
  window.location.href = '/adminEvents';
});

document.getElementById('nav-inventory')?.addEventListener('click', () => {
  window.location.href = '/adminInventory';
});