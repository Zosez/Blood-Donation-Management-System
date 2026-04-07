document.addEventListener('DOMContentLoaded', () => {

  /* ─── TOAST ─── */
  let toastTimeout = null;
  let activeToast = null;

  function showToast(message, type = 'default') {
    const colors = {
      default: { bg: '#ffffff', border: '#e2e8f0', text: '#1e293b' },
      success: { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
      warning: { bg: '#fff7ed', border: '#fdba74', text: '#92400e' },
      danger:  { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
      info:    { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' }
    };

    // Dark mode adjustments
    const isDark = document.body.classList.contains('dark');

    const c = colors[type] || colors.default;

    if (toastTimeout) clearTimeout(toastTimeout);
    if (activeToast) activeToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;

    Object.assign(toast.style, {
      background: isDark ? '#1e293b' : c.bg,
      border: `1px solid ${isDark ? '#334155' : c.border}`,
      color: isDark ? '#f1f5f9' : c.text,
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

  /* ─── SIDEBAR TOGGLE ─── */
  const sidebar = document.getElementById('sidebar');
  const mainWrapper = document.querySelector('.main-wrapper');
  const sidebarToggle = document.getElementById('sidebarToggle');
  let sidebarCollapsed = false;

  sidebarToggle.addEventListener('click', () => {
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      sidebar.classList.toggle('mobile-open');
    } else {
      sidebarCollapsed = !sidebarCollapsed;
      sidebar.classList.toggle('collapsed', sidebarCollapsed);
      mainWrapper.classList.toggle('expanded', sidebarCollapsed);
      showToast(sidebarCollapsed ? 'Sidebar collapsed' : 'Sidebar expanded', 'info');
    }
  });

  // Close sidebar on mobile when clicking outside
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
        sidebar.classList.remove('mobile-open');
      }
    }
  });

  /* ─── SIDEBAR NAV ─── */
  const sidebarLinks = document.querySelectorAll('.sidebar-link[data-page]');

  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      const label = link.querySelector('span')?.textContent || 'Page';

      sidebarLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Update topbar title
      const titles = {
        dashboard: { title: 'Admin Dashboard', sub: 'Overview of LifeLink platform activity' },
        pending:   { title: 'Pending Requests', sub: 'Review and approve blood requests' },
        myrequests:{ title: 'My Requests', sub: 'Track your submitted requests' },
        users:     { title: 'User Management', sub: 'Manage donors, admins, and hospitals' },
        logs:      { title: 'Audit Logs', sub: 'View all system activity logs' },
      };

      const info = titles[page] || { title: label, sub: '' };
      document.getElementById('pageTitle').textContent = info.title;
      document.getElementById('pageSubtitle').textContent = info.sub;

      // Show/hide pages
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      const targetPage = document.getElementById('page-' + page);
      if (targetPage) {
        targetPage.classList.add('active');
      } else {
        // Show placeholder for unbuilt pages
        document.getElementById('page-dashboard').classList.add('active');
        showToast(`${info.title} — coming soon!`, 'info');
        return;
      }

      showToast(`Navigated to ${info.title}`, 'success');

      // Mobile: close sidebar after nav
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('mobile-open');
      }
    });
  });

  /* ─── SETTINGS MODAL ─── */
  const settingsOverlay = document.getElementById('settingsOverlay');
  const settingsLink = document.getElementById('settingsLink');
  const closeSettings = document.getElementById('closeSettings');

  settingsLink?.addEventListener('click', (e) => {
    e.preventDefault();
    settingsOverlay.classList.add('open');
  });

  closeSettings?.addEventListener('click', () => {
    settingsOverlay.classList.remove('open');
  });

  settingsOverlay?.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) {
      settingsOverlay.classList.remove('open');
    }
  });

  /* ─── LOGOUT ─── */
  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    showToast('Logging out... Goodbye, Dr. Sarah Chen!', 'warning');
    setTimeout(() => {
      showToast('Session ended. Redirecting...', 'danger');
    }, 1800);
  });

  /* ─── VIEW ALL BUTTON ─── */
  document.getElementById('viewAllBtn')?.addEventListener('click', () => {
    showToast('Loading all pending requests...', 'info');
    // Trigger pending nav
    document.querySelector('[data-page="pending"]')?.click();
  });

  /* ─── ROW ACTION BUTTONS ─── */
  document.querySelectorAll('.row-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const { facility, type, urgency, units } = btn.dataset;
      showToast(`Opening ${facility} — ${type} · ${urgency} · ${units} units`, 'info');
    });
  });

  // Row click
  document.querySelectorAll('tbody tr').forEach(row => {
    row.addEventListener('click', () => {
      const btn = row.querySelector('.row-action-btn');
      if (btn) btn.click();
    });
  });

  /* ─── BROADCAST BUTTON ─── */
  document.getElementById('broadcastBtn')?.addEventListener('click', () => {
    showToast('🚨 Emergency Broadcast Activated! Notifying all O- matched donors...', 'danger');
    const btn = document.getElementById('broadcastBtn');
    btn.textContent = '✓ BROADCAST SENT';
    btn.style.background = 'white';
    btn.style.color = '#C0281C';
    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-satellite-dish"></i> ACTIVATE BROADCAST';
      btn.style.background = '';
      btn.style.color = '';
    }, 4000);
  });

  /* ─── AUDIT LOG BUTTON ─── */
  document.getElementById('auditBtn')?.addEventListener('click', () => {
    showToast('Opening full audit log...', 'info');
    document.querySelector('[data-page="logs"]')?.click();
  });

  /* ─── MANAGE DONORS BUTTON ─── */
  document.getElementById('manageDonorsBtn')?.addEventListener('click', () => {
    showToast('Opening User Management...', 'info');
    document.querySelector('[data-page="users"]')?.click();
  });

  /* ─── SEARCH ─── */
  const searchInput = document.getElementById('searchInput');
  let searchTimer;

  searchInput?.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const val = e.target.value.trim();
    if (!val) return;
    searchTimer = setTimeout(() => {
      showToast(`Searching for "${val}"...`, 'default');
    }, 600);
  });

  /* ─── STAT CARD CLICK ─── */
  document.querySelectorAll('.stat-card').forEach((card, i) => {
    card.addEventListener('click', () => {
      const msgs = [
        'Total Users: 2,842 — +12% from last month',
        'Pending Requests: 12 — Action required urgently!',
        'Open Requests: 48 — Across 18 hospitals',
        'Donations Today: 156 — Great work, team!'
      ];
      showToast(msgs[i] || 'Stat details coming soon', 'info');
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
          animateCounter(el, parseInt(el.dataset.count));
        }
      }
    });
  }

  window.addEventListener('scroll', startCounters);
  setTimeout(startCounters, 300);

  /* ─── SCROLL REVEAL ─── */
  const revealEls = document.querySelectorAll('.reveal');

  function revealOnScroll() {
    const wh = window.innerHeight;
    revealEls.forEach(el => {
      if (el.getBoundingClientRect().top < wh - 80) {
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
    const isDark = document.body.classList.contains('dark');

    const data   = [8, 31, 22, 7, 28, 4];
    const colors = ['#DC2626','#2563EB','#059669','#D97706','#7C3AED','#DB2777'];
    const total  = data.reduce((a,b) => a+b, 0);
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
      ctx.arc(cx, cy, outerR, startAngle + gap/2, startAngle + gap/2 + slice);
      ctx.closePath();
      ctx.fillStyle = colors[i];
      ctx.fill();
      startAngle += slice + gap;
    });

    // Inner circle (donut hole)
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? '#111827' : '#ffffff';
    ctx.fill();

    // Center text
    ctx.fillStyle = isDark ? '#f8fafc' : '#111827';
    ctx.font = 'bold 18px Sora, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('6 Types', cx, cy);
  }

  setTimeout(redrawChart, 200);

  /* ─── USER AVATAR TOOLTIP ─── */
  document.querySelector('.topbar-user')?.addEventListener('click', () => {
    showToast('Dr. Sarah Chen — System Administrator', 'default');
  });

  /* ─── LIVE TIME IN TOPBAR ─── */
  function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const subtitle = document.getElementById('pageSubtitle');
    if (subtitle && !subtitle.dataset.custom) {
      // only update on dashboard
      const activePage = document.querySelector('.sidebar-link.active')?.dataset.page;
      if (activePage === 'dashboard') {
        subtitle.dataset.live = timeStr;
      }
    }
  }
  setInterval(updateTime, 60000);

  /* ─── KEYBOARD SHORTCUT: Ctrl+K for search ─── */
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchInput?.focus();
      showToast('Search activated (Ctrl+K)', 'info');
    }
    if (e.key === 'Escape') {
      settingsOverlay.classList.remove('open');
      if (searchInput === document.activeElement) {
        searchInput.blur();
      }
    }
  });

  /* ─── INITIAL TOAST ─── */
  setTimeout(() => {
    showToast('Welcome back, Dr. Sarah Chen!', 'success');
  }, 800);

});
