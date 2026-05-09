document.addEventListener('DOMContentLoaded', () => {

  /* ─── TOAST ─── */
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
      background: c.bg,
      border: `1px solid ${c.border}`,
      color: c.text,
      display: 'block',
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

  /* ─── SIDEBAR NAV ─── */
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');

      // Real links should open normally
      if (href && href !== '#') {
        return;
      }

      // Only stop unfinished pages
      e.preventDefault();

      document.querySelectorAll('.sidebar-link').forEach(item => {
        item.classList.remove('active');
      });

      link.classList.add('active');

      const label = link.textContent.trim().replace(/\s+/g, ' ');
      showToast(`${label} — coming soon!`, 'info');
    });
  });

  /* ─── LOGOUT ─── */
  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();

    showToast('Logging out… Goodbye, Admin User!', 'warning');

    setTimeout(() => {
      showToast('Session ended. Redirecting…', 'danger');
    }, 1800);

    setTimeout(() => {
      window.location.href = '../login/login.html';
    }, 3000);
  });

  /* ─── BELL / NOTIFICATIONS ─── */
  document.getElementById('notifBtn')?.addEventListener('click', () => {
    window.location.href = '../Admin_Notification/notifications.html';
  });

  /* ─── NAV AVATAR ─── */
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

  document.getElementById('dropdownLogoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();

    if (avatarDropdown) avatarDropdown.classList.remove('show');

    showToast('Logging out… Goodbye, Admin User!', 'warning');

    setTimeout(() => {
      showToast('Session ended. Redirecting…', 'danger');
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

  /* ─── VIEW ALL BUTTON ─── */
  document.getElementById('viewAllBtn')?.addEventListener('click', () => {
    window.location.href = '../Admin_PendingRequests/pendingRequests.html';
  });

  /* ─── ROW ACTION BUTTONS ─── */
  document.querySelectorAll('.row-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();

      const { facility, type, urgency, units } = btn.dataset;
      showToast(`Opening ${facility} — ${type} · ${urgency} · ${units} units`, 'info');
    });
  });

  document.querySelectorAll('tbody tr').forEach(row => {
    row.addEventListener('click', () => {
      row.querySelector('.row-action-btn')?.click();
    });
  });

  /* ─── BROADCAST BUTTON ─── */
  document.getElementById('broadcastBtn')?.addEventListener('click', () => {
    showToast('Emergency broadcast activated. Notifying matched donors.', 'danger');

    const btn = document.getElementById('broadcastBtn');
    btn.textContent = 'BROADCAST SENT';
    btn.style.background = 'white';
    btn.style.color = '#C0281C';

    setTimeout(() => {
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="2"/>
          <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
        </svg>
        ACTIVATE BROADCAST`;
      btn.style.background = '';
      btn.style.color = '';
    }, 4000);
  });

  /* ─── MANAGE DONORS ─── */
  document.getElementById('manageDonorsBtn')?.addEventListener('click', () => {
    showToast('User Management — coming soon!', 'info');
  });

  /* ─── STAT CARD CLICK ─── */
  document.querySelectorAll('.stat-card').forEach((card, i) => {
    card.addEventListener('click', () => {
      const msgs = [
        'Total Users: 2,842 — +12% from last month',
        'Pending Requests: 5 — Action required',
        'Open Requests: 48 — Across 18 hospitals',
        'Donations Today: 156 — Great work, team!'
      ];

      showToast(msgs[i] || 'Stat details coming soon.', 'info');
    });
  });

  /* ─── ANIMATED COUNTERS ─── */
  function animateCounter(el, target, duration = 1500) {
    let start = 0;
    const step = target / (duration / 16);

    const timer = setInterval(() => {
      start += step;

      if (start >= target) {
        el.textContent = target.toLocaleString();
        clearInterval(timer);
      } else {
        el.textContent = Math.floor(start).toLocaleString();
      }
    }, 16);
  }

  const countersStarted = new Set();

  function startCounters() {
    document.querySelectorAll('[data-count]').forEach(el => {
      if (!countersStarted.has(el)) {
        const rect = el.getBoundingClientRect();

        if (rect.top < window.innerHeight) {
          countersStarted.add(el);
          animateCounter(el, parseInt(el.dataset.count, 10));
        }
      }
    });
  }

  window.addEventListener('scroll', startCounters);
  setTimeout(startCounters, 300);

  /* ─── SCROLL REVEAL ─── */
  const revealEls = document.querySelectorAll('.reveal');

  function revealOnScroll() {
    revealEls.forEach(el => {
      if (el.getBoundingClientRect().top < window.innerHeight - 80) {
        el.classList.add('visible');
      }
    });
  }

  window.addEventListener('scroll', revealOnScroll);
  window.addEventListener('load', revealOnScroll);
  setTimeout(revealOnScroll, 100);

  /* ─── BLOOD DISTRIBUTION CHART ─── */
  function redrawChart() {
    const canvas = document.getElementById('bloodChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const data = [8, 31, 22, 7, 28, 4];
    const colors = ['#DC2626', '#2563EB', '#059669', '#D97706', '#7C3AED', '#DB2777'];
    const total = data.reduce((a, b) => a + b, 0);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const outerR = 90;
    const innerR = 55;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let startAngle = -Math.PI / 2;
    const gap = 0.03;

    data.forEach((val, i) => {
      const slice = (val / total) * (Math.PI * 2) - gap;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, startAngle + gap / 2, startAngle + gap / 2 + slice);
      ctx.closePath();
      ctx.fillStyle = colors[i];
      ctx.fill();

      startAngle += slice + gap;
    });

    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.fillStyle = '#111827';
    ctx.font = 'bold 18px Sora, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('6 Types', cx, cy);
  }

  setTimeout(redrawChart, 200);

  /* ─── INITIAL TOAST ─── */
  setTimeout(() => {
    showToast('Welcome back, Admin User!', 'success');
  }, 800);

});