document.addEventListener('DOMContentLoaded', () => {
  /* ── Notification Panel ── */
  const notifBtn = document.getElementById('notifBtn');
  const notifPanel = document.getElementById('notifPanel');
  const notifClose = document.getElementById('notifClose');
  const notifOverlay = document.getElementById('notifOverlay');

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
    if (activeToast) {
      activeToast.remove();
      activeToast = null;
    }

    const toast = document.createElement('div');
    toast.className = 'll-toast';
    toast.textContent = message;

    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      background: c.bg,
      border: `1px solid ${c.border}`,
      color: c.text,
      borderRadius: '10px',
      padding: '.85rem 1.1rem',
      fontFamily: "'Outfit', sans-serif",
      fontWeight: '600',
      fontSize: '.88rem',
      boxShadow: '0 8px 24px rgba(0,0,0,.12)',
      zIndex: '1000',
      opacity: '0',
      transform: 'translateY(20px)',
      transition: 'opacity .3s, transform .3s',
      maxWidth: '420px',
      lineHeight: '1.4'
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
        if (activeToast === toast) activeToast = null;
      }, 300);
    }, 3000);
  }

  function openNotif(e) {
    if (e) e.preventDefault();
    if (!notifPanel || !notifOverlay) return;

    notifPanel.classList.add('open');
    notifOverlay.classList.add('show');
  }

  function closeNotif(e) {
    if (e) e.preventDefault();
    if (!notifPanel || !notifOverlay) return;

    notifPanel.classList.remove('open');
    notifOverlay.classList.remove('show');
  }

  if (notifBtn) {
    notifBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (notifPanel.classList.contains('open')) {
        closeNotif();
      } else {
        openNotif();
      }
    });
  }

  if (notifClose) {
    notifClose.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeNotif();
    });
  }

  if (notifOverlay) {
    notifOverlay.addEventListener('click', closeNotif);
  }

  if (notifPanel) {
    notifPanel.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && notifPanel && notifPanel.classList.contains('open')) {
      closeNotif();
    }
  });

  /* ── Navbar ── */
  const navLinks = document.querySelectorAll('.nav-links a');

  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navLinks.forEach((nav) => nav.classList.remove('active'));
      link.classList.add('active');

      const sectionName = link.dataset.section || link.textContent.trim();
      showToast(`${sectionName} opened.`, 'info');
    });
  });

  /* ── Availability Toggle ── */
  const availToggle = document.getElementById('availToggle');
  const statusBadge = document.querySelector('.status-badge');
  const statusDot = document.querySelector('.status-dot');

  if (availToggle && statusBadge && statusDot) {
    availToggle.addEventListener('change', () => {
      const statusText = statusBadge.querySelector('span:last-child');

      if (availToggle.checked) {
        if (statusText) statusText.textContent = 'Ready to Donate';
        statusDot.classList.add('green');
        statusDot.style.background = '';
        statusDot.style.boxShadow = '';
        showToast('Availability updated to Ready to Donate.', 'success');
      } else {
        if (statusText) statusText.textContent = 'Unavailable';
        statusDot.classList.remove('green');
        statusDot.style.background = '#94a3b8';
        statusDot.style.boxShadow = 'none';
        showToast('Availability updated to Unavailable.', 'warning');
      }
    });
  }

  /* ── Request Buttons ── */
  document.querySelectorAll('.req-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const card = e.currentTarget.closest('.request-card');
      if (!card) return;

      const hospital = card.querySelector('.req-hospital')?.textContent.trim() || 'Hospital';
      const bloodType = card.querySelector('.blood-type')?.textContent.trim() || '';
      const buttonText = btn.textContent.trim();

      if (buttonText === 'Donate Now') {
        showToast(`Donation started for ${hospital} ${bloodType}.`, 'danger');
      } else if (buttonText === 'Respond') {
        showToast(`Response sent for ${hospital} ${bloodType}.`, 'warning');
      } else if (buttonText === 'View Details') {
        showToast(`Viewing details for ${hospital} ${bloodType}.`, 'info');
      } else {
        showToast(`Action completed for ${hospital}.`, 'default');
      }
    });
  });

  /* ── Submit Blood Request ── */
  const submitBtn = document.querySelector('.submit-request-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      showToast('Blood request submission opened.', 'danger');
    });
  }

  /* ── Action Links ── */
  document.querySelectorAll('.action-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const action = link.textContent.trim();

      if (action === 'View Receipt') {
        showToast('Opening receipt details.', 'success');
      } else if (action === 'View History') {
        showToast('Opening request history.', 'info');
      } else {
        showToast(`${action} opened.`, 'default');
      }
    });
  });

  /* ── Notification Items ── */
  document.querySelectorAll('.notif-item').forEach((item) => {
    item.addEventListener('click', () => {
      const text =
        item.querySelector('.notif-text')?.textContent.trim() || 'Notification opened.';
      item.classList.remove('unread');
      showToast(text, 'info');
    });
  });

  /* ── Avatar ── */
  const avatar = document.querySelector('.avatar');
  if (avatar) {
    avatar.addEventListener('click', () => {
      showToast('Profile opened.', 'info');
    });
  }

  /* ── Animate Bars ── */
  const bars = document.querySelectorAll('.stat-bar-fill, .req-stat-fill');
  if ('IntersectionObserver' in window && bars.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    bars.forEach((bar) => {
      bar.style.animationPlayState = 'paused';
      observer.observe(bar);
    });
  }
});