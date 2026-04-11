document.addEventListener('DOMContentLoaded', () => {

  let toastTimeout = null;
  let activeToast  = null;

  function showToast(message, type = 'default') {
    const colors = {
      default: { bg: '#ffffff', border: '#e2e8f0', text: '#1e293b' },
      success: { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
      warning: { bg: '#fff7ed', border: '#fdba74', text: '#92400e' },
      danger:  { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
      info:    { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
    };

    const c = colors[type] || colors.default;

    if (toastTimeout) clearTimeout(toastTimeout);
    if (activeToast) { activeToast.remove(); activeToast = null; }

    const toast = document.createElement('div');
    toast.className = 'll-toast';
    toast.textContent = message;

    Object.assign(toast.style, {
      position:     'fixed',
      bottom:       '1.5rem',
      right:        '1.5rem',
      background:   c.bg,
      border:       `1px solid ${c.border}`,
      color:        c.text,
      borderRadius: '10px',
      padding:      '.85rem 1.1rem',
      fontFamily:   "'Outfit', sans-serif",
      fontWeight:   '600',
      fontSize:     '.88rem',
      boxShadow:    '0 8px 24px rgba(0,0,0,.12)',
      zIndex:       '9999',
      opacity:      '0',
      transform:    'translateY(20px)',
      transition:   '0.3s',
      maxWidth:     '420px',
      pointerEvents:'none',
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
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
        if (activeToast === toast) activeToast = null;
      }, 300);
    }, 3000);
  }

  /* ─── Notification Panel ─── */
  const notifBtn     = document.getElementById('notifBtn');
  const notifPanel   = document.getElementById('notifPanel');
  const notifClose   = document.getElementById('notifClose');
  const notifOverlay = document.getElementById('notifOverlay');

  function openNotif()  { notifPanel?.classList.add('open'); }
  function closeNotif() { notifPanel?.classList.remove('open'); }

  notifBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    notifPanel?.classList.contains('open') ? closeNotif() : openNotif();
  });

  notifClose?.addEventListener('click', (e) => { e.stopPropagation(); closeNotif(); });
  
  document.addEventListener('click', (e) => {
    if (notifPanel && notifBtn) {
      if (!notifPanel.contains(e.target) && !notifBtn.contains(e.target)) {
        closeNotif();
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && notifPanel?.classList.contains('open')) closeNotif();
  });

  /* ─── Notification items ─── */
  document.querySelectorAll('.notif-item').forEach(item => {
    item.addEventListener('click', () => {
      const text = item.querySelector('.notif-text')?.textContent.trim() || 'Notification opened.';
      item.classList.remove('unread');
      showToast(text, 'info');
    });
  });

  /* ─── Navbar links ─── */
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      showToast(`${link.dataset.section || link.textContent.trim()} opened.`, 'info');
    });
  });

  /* ─── Availability toggle ─── */
  const availToggle  = document.getElementById('availToggle');
  const statusBadge  = document.querySelector('.status-badge');
  const statusDot    = document.querySelector('.status-dot');

  availToggle?.addEventListener('change', () => {
    const statusText = statusBadge?.querySelector('span:last-child');
    if (availToggle.checked) {
      if (statusText) statusText.textContent = 'Ready to Donate';
      statusDot?.classList.add('green');
      statusDot && (statusDot.style.background = '');
      showToast('Availability set to Ready to Donate.', 'success');
    } else {
      if (statusText) statusText.textContent = 'Unavailable';
      statusDot?.classList.remove('green');
      statusDot && (statusDot.style.background = '#9CA3AF');
      showToast('Availability set to Unavailable.', 'warning');
    }
  });

  /* ─── Request buttons ─── */
  document.querySelectorAll('.req-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card     = e.currentTarget.closest('.request-card');
      const hospital = card?.querySelector('.req-hospital')?.textContent.trim() || 'Hospital';
      const blood    = card?.querySelector('.blood-type')?.textContent.trim() || '';
      const label    = btn.textContent.trim();

      if (label === 'Donate Now') showToast(`Donation started for ${hospital} (${blood}).`, 'danger');
      else if (label === 'Respond') showToast(`Response sent to ${hospital} (${blood}).`, 'warning');
      else showToast(`Viewing details for ${hospital}.`, 'info');
    });
  });

  /* ─── Submit blood request ─── */
  document.querySelector('.submit-request-btn')?.addEventListener('click', () => {
    showToast('Blood request submission opened.', 'danger');
  });

  /* ─── Action links ─── */
  document.querySelectorAll('.action-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const label = link.textContent.trim();
      if (label === 'View Receipt')  showToast('Opening receipt details.', 'success');
      else if (label === 'View History') showToast('Opening request history.', 'info');
      else showToast(`${label} opened.`, 'default');
    });
  });

  /* ─── Hamburger Menu and Avatar Dropdown ─── */
  const hamburger = document.getElementById('navHamburger');
  const navLinks = document.querySelector('.nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  const navAvatar = document.getElementById('navAvatar');
  const avatarDropdown = document.getElementById('avatarDropdown');
  const logoutBtn = document.getElementById('logoutBtn');

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

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      avatarDropdown.classList.remove('show');
      showToast('Successfully logged out.', 'info');
    });
  }

  /* ─── Animate bars on scroll ─── */
  const bars = document.querySelectorAll('.stat-bar-fill, .req-stat-fill');
  if ('IntersectionObserver' in window && bars.length) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    bars.forEach(b => { b.style.animationPlayState = 'paused'; obs.observe(b); });
  }

});