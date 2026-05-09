document.addEventListener('DOMContentLoaded', () => {

  /* ─── TOAST NOTIFICATION ─── */
  let toastTimeout = null;
  let activeToast = null;

  function showToast(message, type = 'success') {
    const colors = {
      success: { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
      warn: { bg: '#fff7ed', border: '#fdba74', text: '#92400e' },
      error: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
      info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
      default: { bg: '#ffffff', border: '#e2e8f0', text: '#1e293b' }
    };

    const c = colors[type] || colors.default;

    if (toastTimeout) clearTimeout(toastTimeout);
    if (activeToast) activeToast.remove();

    const toast = document.createElement('div');
    toast.className = 'll-toast';
    toast.textContent = message;

    Object.assign(toast.style, {
      background: c.bg,
      border: `1px solid ${c.border}`,
      color: c.text,
      opacity: '0',
      transform: 'translateY(20px)'
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
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 300);
    }, 3000);
  }

  /* ─── IMPACT BAR ANIMATION ─── */
  const impactBar = document.getElementById('impactBar');

  if (impactBar) {
    setTimeout(() => {
      impactBar.style.width = '74%';
    }, 400);
  }

  /* ─── NOTIFICATION UNREAD COUNTER ─── */
  function getUnreadCount() {
    return document.querySelectorAll('.notif-item.unread').length;
  }

  function updateBadges() {
    const count = getUnreadCount();
    const bellBadge = document.getElementById('bellBadge');
    const sidebarBadge = document.getElementById('sidebarNotifBadge');

    if (bellBadge) {
      bellBadge.textContent = count;
      bellBadge.style.display = count > 0 ? 'flex' : 'none';
    }

    if (sidebarBadge) {
      sidebarBadge.textContent = count;
      sidebarBadge.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  updateBadges();

  /* ─── MARK ALL AS READ ─── */
  const markAllBtn = document.getElementById('markAllBtn');

  if (markAllBtn) {
    markAllBtn.addEventListener('click', () => {
      const unread = document.querySelectorAll('.notif-item.unread');

      if (unread.length === 0) {
        showToast('All notifications are already read.', 'info');
        return;
      }

      unread.forEach(item => {
        item.classList.remove('unread');
        item.classList.add('read');

        const dot = item.querySelector('.notif-dot');
        if (dot) dot.style.opacity = '0';
      });

      updateBadges();
      showToast('All notifications marked as read.', 'success');
    });
  }

  /* ─── INDIVIDUAL NOTIFICATION CLICK ─── */
  document.querySelectorAll('.notif-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.notif-action-btn')) return;

      if (item.classList.contains('unread')) {
        item.classList.remove('unread');
        item.classList.add('read');

        const dot = item.querySelector('.notif-dot');
        if (dot) dot.style.opacity = '0';

        updateBadges();
      }
    });
  });

  /* ─── NOTIFICATION ACTION BUTTONS ─── */
  document.querySelectorAll('.notif-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();

      const action = btn.dataset.action;
      const id = btn.dataset.id;
      const item = document.querySelector(`.notif-item[data-id="${id}"]`);

      if (item && item.classList.contains('unread')) {
        item.classList.remove('unread');
        item.classList.add('read');

        const dot = item.querySelector('.notif-dot');
        if (dot) dot.style.opacity = '0';

        updateBadges();
      }

      const messages = {
        respond: 'Opening urgent match details.',
        view: 'Loading request approval.',
        details: 'Fetching status update.'
      };

      showToast(messages[action] || 'Opening.', 'info');
    });
  });

  /* ─── NAV BELL BUTTON ─── */
  const navBellBtn = document.getElementById('navBellBtn');

  if (navBellBtn) {
    navBellBtn.addEventListener('click', () => {
      const count = getUnreadCount();

      if (count > 0) {
        showToast(`You have ${count} unread notification${count > 1 ? 's' : ''}.`, 'info');
      } else {
        showToast('No new notifications.', 'info');
      }
    });
  }

  /* ─── NEW REQUEST BUTTON ─── */
  const newRequestBtn = document.getElementById('newRequestBtn');

  if (newRequestBtn) {
    newRequestBtn.addEventListener('click', () => {
      showToast('New request form coming soon.', 'info');
    });
  }

  /* ─── NAV AVATAR DROPDOWN ─── */
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

  /* ─── LOGOUT ─── */
  document.getElementById('dropdownLogoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();

    if (avatarDropdown) avatarDropdown.classList.remove('show');

    showToast('Logging out… Goodbye, Admin User!', 'warn');

    setTimeout(() => {
      showToast('Session ended. Redirecting…', 'error');
    }, 1800);

    setTimeout(() => {
      window.location.href = '../login/login.html';
    }, 3000);
  });

  /* ─── MOBILE SIDEBAR ─── */
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

  /* ─── SIDEBAR NAV LINKS ─── */
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');

      if (href && href !== '#') {
        return;
      }

      e.preventDefault();

      const label = link.textContent.trim().replace(/\s+/g, ' ');
      showToast(`${label} — coming soon!`, 'info');
    });
  });

});