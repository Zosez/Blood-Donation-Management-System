/* ============================================================
   notifications.js  —  User Notification Page (Live Backend)
   API: GET  /api/notifications
        PATCH /api/notifications/read-all
        PATCH /api/notifications/:id/read
   ============================================================ */

const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  if (!token) { window.location.href = '/login'; return null; }

  try {
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
  } catch (e) {
    return null;
  }
}

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60)  return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}M AGO`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}H AGO`;
  return `${Math.floor(diff / 86400)}D AGO`;
}

document.addEventListener('DOMContentLoaded', () => {

  /* ─── Impact bar animation ─────────────────────────── */
  const impactBar = document.getElementById('impactBar');
  if (impactBar) setTimeout(() => { impactBar.style.width = '74%'; }, 400);

  /* ─── Toast ─────────────────────────────────────────── */
  let toastTimeout = null;
  let activeToast  = null;

  function showToast(message, type = 'success') {
    const colors = {
      success: { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
      warn:    { bg: '#fff7ed', border: '#fdba74', text: '#92400e' },
      error:   { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
      info:    { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
      default: { bg: '#ffffff', border: '#e2e8f0', text: '#1e293b' },
    };
    const c = colors[type] || colors.default;
    if (toastTimeout) clearTimeout(toastTimeout);
    if (activeToast)  activeToast.remove();
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
      toast.style.opacity = '1'; toast.style.transform = 'translateY(0)';
    });
    toastTimeout = setTimeout(() => {
      toast.style.opacity = '0'; toast.style.transform = 'translateY(20px)';
      setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
    }, 3000);
  }

  /* ─── Nav Avatar Dropdown ────────────────────────────── */
  const navAvatar      = document.getElementById('navAvatar');
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
    showToast('Logging out…', 'warn');
    try { await apiFetch('/auth/logout', { method: 'POST' }); } catch (_) {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setTimeout(() => { window.location.href = '/login'; }, 1200);
  });

  /* ─── Mobile Sidebar ─────────────────────────────────── */
  const mobileMenuBtn  = document.getElementById('mobileMenuBtn');
  const sidebar        = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  if (mobileMenuBtn && sidebar && sidebarOverlay) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.add('open'); sidebarOverlay.classList.add('active');
    });
    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('open'); sidebarOverlay.classList.remove('active');
    });
  }

  /* ─── Sidebar Nav ────────────────────────────────────── */
  document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    showToast('Logging out…', 'warn');
    try { await apiFetch('/auth/logout', { method: 'POST' }); } catch (_) {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setTimeout(() => { window.location.href = '/login'; }, 1200);
  });

  document.getElementById('newRequestBtn')?.addEventListener('click', () => {
    window.location.href = '/requestBlood';
  });

  /* ─── Settings Modal ─────────────────────────────────── */
  const settingsOverlay = document.getElementById('settingsOverlay');
  document.getElementById('settingsLink')?.addEventListener('click', (e) => {
    e.preventDefault(); settingsOverlay?.classList.add('open');
  });
  document.getElementById('closeSettings')?.addEventListener('click', () => {
    settingsOverlay?.classList.remove('open');
  });
  settingsOverlay?.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) settingsOverlay.classList.remove('open');
  });
  document.getElementById('notifSelect')?.addEventListener('change', (e) => {
    showToast(`Notification preference: ${e.target.value}`, 'info');
  });
  document.getElementById('goSettingsBtn')?.addEventListener('click', () => {
    settingsOverlay?.classList.add('open');
  });

  /* ─── Populate user name in sidebar ─────────────────── */
  function populateUserInfo() {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const name = user.fullname || user.name || 'User';
      const sidebarName = document.querySelector('.sidebar-user-name');
      const sidebarRole = document.querySelector('.sidebar-user-role');
      const navAvatarName = document.querySelector('.nav-avatar-name');
      if (sidebarName) sidebarName.textContent = name;
      if (sidebarRole) sidebarRole.textContent = 'Blood Donor';
      if (navAvatarName) navAvatarName.textContent = name.split(' ')[0];
      const dropdownName = document.querySelector('.dropdown-name');
      if (dropdownName) dropdownName.textContent = name;
    } catch (_) {}
  }
  populateUserInfo();

  /* ─── Badge updater ──────────────────────────────────── */
  function updateBadges(count) {
    const bellBadge    = document.getElementById('bellBadge');
    const sidebarBadge = document.querySelector('.sidebar-badge');
    if (bellBadge) {
      bellBadge.textContent  = count > 99 ? '99+' : count;
      bellBadge.style.display = count > 0 ? 'flex' : 'none';
    }
    if (sidebarBadge) {
      sidebarBadge.textContent  = count;
      sidebarBadge.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  /* ─── Render notification list ───────────────────────── */
  function renderNotifications(notifications) {
    const list = document.getElementById('notifList');
    if (!list) return;

    if (!notifications || notifications.length === 0) {
      list.innerHTML = `
        <div style="text-align:center;padding:60px 20px;color:#9CA3AF;">
          <div style="font-size:48px;margin-bottom:12px;">🔔</div>
          <div style="font-size:16px;font-weight:600;margin-bottom:6px;">All caught up!</div>
          <div style="font-size:14px;">No notifications yet. When someone needs your blood type, you'll hear about it here.</div>
        </div>
      `;
      updateBadges(0);
      return;
    }

    const unreadCount = notifications.filter(n => !n.is_read).length;
    updateBadges(unreadCount);

    list.innerHTML = notifications.map(n => {
      const isUnread   = !n.is_read;
      const safeTitle  = (n.title   || '').replace(/</g, '&lt;');
      const safeMsg    = (n.message || '').replace(/</g, '&lt;');
      const dotColor   = isUnread ? 'dot-red' : '';
      const iconColor  = isUnread ? 'icon-red' : 'icon-gray';

      return `
        <div class="notif-item${isUnread ? ' unread' : ''}" data-id="${n.id}" data-request-id="${n.blood_request_id || ''}">
          <div class="notif-dot ${dotColor}"></div>
          <div class="notif-icon-wrap ${iconColor}">
            <svg width="18" height="18" viewBox="0 0 18 22" fill="none">
              <path d="M9 1C9 1 1 9.5 1 14.5a8 8 0 0 0 16 0C17 9.5 9 1 9 1z" fill="currentColor"/>
            </svg>
          </div>
          <div class="notif-body">
            <div class="notif-item-title">${safeTitle}</div>
            <div class="notif-item-desc">${safeMsg}</div>
          </div>
          <div class="notif-meta">
            <span class="notif-time">${timeAgo(n.created_at)}</span>
            ${n.blood_request_id
              ? `<button class="notif-action-btn" data-action="view" data-id="${n.id}" data-request="${n.blood_request_id}">View</button>`
              : ''}
          </div>
        </div>
      `;
    }).join('');

    /* Attach click handlers for individual items */
    list.querySelectorAll('.notif-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        if (e.target.closest('.notif-action-btn')) return;
        if (item.classList.contains('unread')) {
          await markRead(item.dataset.id);
          item.classList.remove('unread');
          item.classList.add('read');
          const dot = item.querySelector('.notif-dot');
          if (dot) { dot.classList.remove('dot-red'); }
          const newUnread = document.querySelectorAll('.notif-item.unread').length;
          updateBadges(newUnread);
        }
      });
    });

    /* Action button → navigate to blood request */
    list.querySelectorAll('.notif-action-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await markRead(btn.dataset.id);
        window.location.href = '/bloodRequest';
      });
    });
  }

  /* ─── API: mark single read ──────────────────────────── */
  async function markRead(id) {
    await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  /* ─── API: mark all read ─────────────────────────────── */
  document.getElementById('markAllBtn')?.addEventListener('click', async () => {
    const unread = document.querySelectorAll('.notif-item.unread');
    if (unread.length === 0) {
      showToast('All notifications are already read.', 'info');
      return;
    }
    const res = await apiFetch('/notifications/read-all', { method: 'PATCH' });
    if (res && res.ok) {
      unread.forEach(item => {
        item.classList.remove('unread');
        const dot = item.querySelector('.notif-dot');
        if (dot) dot.classList.remove('dot-red');
      });
      updateBadges(0);
      showToast('All notifications marked as read.', 'success');
    } else {
      showToast('Failed to mark all as read.', 'error');
    }
  });

  /* ─── Initial fetch ──────────────────────────────────── */
  async function loadNotifications() {
    const list = document.getElementById('notifList');
    if (list) {
      list.innerHTML = `
        <div style="text-align:center;padding:48px;color:#9CA3AF;">
          <div style="width:28px;height:28px;border:3px solid #f3f3f3;border-top:3px solid #C82020;
               border-radius:50%;animation:spin 0.7s linear infinite;margin:0 auto 12px;"></div>
          Loading notifications…
        </div>
      `;
      if (!document.getElementById('notif-spin-style')) {
        const s = document.createElement('style');
        s.id = 'notif-spin-style';
        s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(s);
      }
    }

    const res = await apiFetch('/notifications');
    if (!res) return;

    if (!res.ok) {
      showToast('Failed to load notifications.', 'error');
      if (list) list.innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444;">Failed to load. Please refresh.</div>`;
      return;
    }

    const data = await res.json();
    renderNotifications(data.notifications || []);
  }

  loadNotifications();

});