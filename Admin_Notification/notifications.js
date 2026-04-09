document.addEventListener('DOMContentLoaded', () => {

  /* ─── 1. IMPACT BAR ANIMATION ─── */
  const impactBar = document.getElementById('impactBar');
  if (impactBar) {
    setTimeout(() => { impactBar.style.width = '74%'; }, 400);
  }


  /* ─── 2. NOTIFICATION UNREAD COUNTER ─── */
  function getUnreadCount() {
    return document.querySelectorAll('.notif-item.unread').length;
  }

  function updateBadges() {
    const count = getUnreadCount();
    const bellBadge   = document.getElementById('bellBadge');
    const sidebarBadge = document.querySelector('.sidebar-badge');

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


  /* ─── 3. MARK ALL AS READ ─── */
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


  /* ─── 4. INDIVIDUAL NOTIFICATION CLICK (mark read) ─── */
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


  /* ─── 5. NOTIFICATION ACTION BUTTONS ─── */
  document.querySelectorAll('.notif-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const id     = btn.dataset.id;
      const item   = document.querySelector(`.notif-item[data-id="${id}"]`);

      // Mark as read on action
      if (item && item.classList.contains('unread')) {
        item.classList.remove('unread');
        item.classList.add('read');
        const dot = item.querySelector('.notif-dot');
        if (dot) dot.style.opacity = '0';
        updateBadges();
      }

      const messages = {
        respond:  ' Opening urgent match details…',
        view:     ' Loading request approval…',
        details:  ' Fetching status update…',
      };

      showToast(messages[action] || 'Opening…', 'info');
    });
  });


  /* ─── 6. NAV BELL BUTTON ─── */
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


  /* ─── 7. GO TO SETTINGS BUTTON ─── */
  const goSettingsBtn = document.getElementById('goSettingsBtn');
  if (goSettingsBtn) {
    goSettingsBtn.addEventListener('click', () => {
      showToast(' Opening notification settings…', 'info');
    });
  }


  /* ─── 8. NEW REQUEST BUTTON ─── */
  const newRequestBtn = document.getElementById('newRequestBtn');
  if (newRequestBtn) {
    newRequestBtn.addEventListener('click', () => {
      showToast(' New request form coming soon!', 'info');
    });
  }


  /* ─── 9. NAV AVATAR DROPDOWN (placeholder) ─── */
  const navAvatar = document.getElementById('navAvatar');
  if (navAvatar) {
    navAvatar.addEventListener('click', () => {
      showToast(' Profile menu coming soon!', 'info');
    });
  }


  /* ─── 10. SIDEBAR NAV LINKS ─── */
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const label = link.textContent.trim();
      if (!link.classList.contains('active')) {
        showToast(`Navigating to ${label}…`, 'info');
      }
    });
  });


  /* ─── 11. TOAST NOTIFICATION ─── */
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
      background:   c.bg,
      border:       `1px solid ${c.border}`,
      color:        c.text,
    });

    document.body.appendChild(toast);
    activeToast = toast;

    requestAnimationFrame(() => {
      toast.style.opacity   = '1';
      toast.style.transform = 'translateY(0)';
    });

    toastTimeout = setTimeout(() => {
      toast.style.opacity   = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

});