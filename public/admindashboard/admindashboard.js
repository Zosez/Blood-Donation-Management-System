document.addEventListener('DOMContentLoaded', () => {
  // Protect admin route
  if (!ADMIN_AUTH.protectRoute()) return;

  const API_URL = 'http://localhost:5000/api';
  const token = localStorage.getItem('token');

  /* ─── LOAD DASHBOARD DATA ─── */
  async function loadDashboardData() {
    try {
      // Fetch dashboard stats
      const statsRes = await fetch(`${API_URL}/admin/dashboard-stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!statsRes.ok) throw new Error('Failed to fetch stats');
      const stats = await statsRes.json();

      // Update stat cards with animation
      const statValues = document.querySelectorAll('[data-count]');
      if (statValues[0]) { statValues[0].dataset.count = stats.totalUsers; }
      if (statValues[1]) { statValues[1].dataset.count = stats.pendingRequests; }
      if (statValues[2]) { statValues[2].dataset.count = stats.openRequests; }
      if (statValues[3]) { statValues[3].dataset.count = stats.donationsToday; }

      // Update pending badge
      const pendingBadge = document.getElementById('pendingBadge');
      if (pendingBadge) pendingBadge.textContent = stats.pendingRequests;

      // Fetch pending requests
      const requestsRes = await fetch(`${API_URL}/admin/pending-requests`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!requestsRes.ok) throw new Error('Failed to fetch requests');
      const { requests } = await requestsRes.json();

      // Populate requests table
      populateRequestsTable(requests);

      // Load recent activity feed (non-blocking — own try/catch inside)
      loadRecentActivity();

      // Trigger counter animation
      startCounters();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      showToast('Failed to load dashboard data', 'danger');
    }
  }

  function populateRequestsTable(requests) {
    const tbody = document.getElementById('requestsBody');
    if (!tbody) return;

    // Clear existing rows
    tbody.innerHTML = '';

    if (requests.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #9CA3AF;">No pending requests</td></tr>';
      return;
    }

    // Map blood types to CSS classes
    const bloodTypeClass = {
      'O-': 'o-neg', 'O+': 'o-pos',
      'A-': 'a-neg', 'A+': 'a-pos',
      'B-': 'b-neg', 'B+': 'b-pos',
      'AB-': 'ab-neg', 'AB+': 'ab-pos'
    };

    // Map urgency levels
    const urgencyMap = {
      'critical': { class: 'critical', label: 'Critical' },
      'urgent': { class: 'expedited', label: 'Expedited' },
      'normal': { class: 'standard', label: 'Standard' }
    };

    requests.forEach(req => {
      const urgency = urgencyMap[req.urgency_level] || urgencyMap['normal'];
      const bloodClass = bloodTypeClass[req.blood_type] || 'o-neg';

      const row = document.createElement('tr');
      row.dataset.id = req.id;
      row.innerHTML = `
        <td>
          <div class="patient-name">${req.facility}</div>
          <div class="patient-req">Request #${req.id}</div>
        </td>
        <td><span class="blood-tag ${bloodClass}">${req.blood_type}</span></td>
        <td><span class="urgency ${urgency.class}">
          <svg width="6" height="6" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" fill="currentColor"/></svg>
          ${urgency.label}</span></td>
        <td><strong>${req.units_required} Unit${req.units_required > 1 ? 's' : ''}</strong></td>
        <td>
          <button class="row-action-btn" data-id="${req.id}" data-facility="${req.facility}" data-type="${req.blood_type}" data-urgency="${urgency.label}" data-units="${req.units_required}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </td>
      `;

      tbody.appendChild(row);
    });

    // Reattach event listeners
    attachRequestRowListeners();
  }

  /* ─── RECENT ACTIVITY FEED ─── */
  function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minute${Math.floor(diff / 60) > 1 ? 's' : ''} ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? 's' : ''} ago`;
  }

  function activityConfig(event) {
    switch (event.event_type) {
      case 'request_new':
        return {
          dot: 'blue-dot',
          title: 'New Blood Request',
          desc: `${event.actor_name} submitted a ${event.urgency_level || 'normal'} request for ${event.blood_type} blood at ${event.hospital_name}, ${event.city}.`
        };
      case 'request_approved':
        return {
          dot: 'green-dot',
          title: 'Request Approved',
          desc: `Request #${event.event_id} for ${event.blood_type} blood at ${event.hospital_name} has been approved. Donors notified.`
        };
      case 'request_rejected':
        return {
          dot: 'red-dot',
          title: 'Request Rejected',
          desc: `Request #${event.event_id} for ${event.blood_type} blood at ${event.hospital_name} was rejected.`
        };
      case 'user_registered':
        return {
          dot: 'blue-dot',
          title: 'New Donor Registered',
          desc: `${event.actor_name}${event.blood_type ? ' (' + event.blood_type + ')' : ''} joined as a donor${event.city ? ' in ' + event.city : ''}.`
        };
      default:
        return {
          dot: 'gray-dot',
          title: 'System Event',
          desc: 'A system event was recorded.'
        };
    }
  }

  async function loadRecentActivity() {
    const list = document.getElementById('activityList');
    if (!list) return;

    try {
      const res = await fetch(`${API_URL}/admin/recent-activity`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Activity fetch failed');

      const { activity } = await res.json();

      if (!activity || activity.length === 0) {
        list.innerHTML = `
          <li class="activity-item">
            <div class="activity-dot gray-dot"></div>
            <div class="activity-content">
              <strong style="color:#9CA3AF;">No recent activity yet.</strong>
            </div>
          </li>`;
        return;
      }

      list.innerHTML = activity.map(event => {
        const { dot, title, desc } = activityConfig(event);
        const pulse = event.event_type === 'request_new' && event.urgency_level === 'critical' ? ' pulse' : '';
        return `
          <li class="activity-item">
            <div class="activity-dot ${dot}${pulse}"></div>
            <div class="activity-content">
              <strong>${title}</strong>
              <p>${desc}</p>
              <span class="activity-time">${timeAgo(event.event_time)}</span>
            </div>
          </li>`;
      }).join('');

    } catch (err) {
      console.warn('[ACTIVITY] Failed to load:', err.message);
      // Leave the loading placeholder — don't crash the whole dashboard
    }
  }


  function attachRequestRowListeners() {
    document.querySelectorAll('.row-action-btn').forEach(btn => {
      btn.removeEventListener('click', handleRowAction);
      btn.addEventListener('click', handleRowAction);
    });

    document.querySelectorAll('tbody tr').forEach(row => {
      row.removeEventListener('click', handleRowClick);
      row.addEventListener('click', handleRowClick);
    });
  }

  function handleRowAction(e) {
    e.stopPropagation();
    const { facility, type, urgency, units, id } = e.currentTarget.dataset;
    showToast(`Opening ${facility} — ${type} · ${urgency} · ${units} units`, 'info');
    // Show action modal here later (approve/reject)
  }

  function handleRowClick() {
    this.querySelector('.row-action-btn')?.click();
  }

  /* ─── TOAST ─── */
  let toastTimeout = null;
  let activeToast = null;

  function showToast(message, type = 'default') {
    const colors = {
      default: { bg: '#ffffff', border: '#e2e8f0', text: '#1e293b' },
      success: { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
      warning: { bg: '#fff7ed', border: '#fdba74', text: '#92400e' },
      danger: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
      info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
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
      transform: 'translateY(20px)',
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

  /* ─── SIDEBAR NAV ─── */
  const sidebarLinks = document.querySelectorAll('.sidebar-link[data-page]');

  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      const label = link.textContent.trim();

      sidebarLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      const titles = {
        dashboard: { title: 'Admin Dashboard', sub: 'Overview of LifeLink platform activity' },
        pending: { title: 'Pending Requests', sub: 'Review and approve blood requests' },
        users: { title: 'User Management', sub: 'Manage donors, admins, and hospitals' },

      };

      const info = titles[page] || { title: label, sub: '' };
      document.getElementById('pageTitle').textContent = info.title;
      document.getElementById('pageSubtitle').textContent = info.sub;

      if (page !== 'dashboard') {
        showToast(`${info.title} — coming soon!`, 'info');
      }
    });
  });


  /* ─── LOGOUT ─── */
  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showToast('Logging out… Goodbye!', 'warning');
    setTimeout(() => {
      window.location.href = '/login';
    }, 1500);
  }

  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    handleLogout();
  });

  document.getElementById('dropdownLogoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    const avatarDropdown = document.getElementById('avatarDropdown');
    if (avatarDropdown) avatarDropdown.classList.remove('show');
    handleLogout();
  });

  /* ─── BELL / NOTIFICATIONS ─── */
  document.getElementById('notifBtn')?.addEventListener('click', () => {
    showToast('You have 3 unread notifications.', 'info');
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

  /* ─── NAV AVATAR DROPDOWN - moved to logout handlers above ─── */

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
    showToast('Loading all pending requests…', 'info');
    document.querySelector('[data-page="pending"]')?.click();
  });

  /* ─── BROADCAST BUTTON ─── */
  document.getElementById('broadcastBtn')?.addEventListener('click', () => {
    showToast(' Emergency Broadcast Activated! Notifying all O- matched donors…', 'danger');
    const btn = document.getElementById('broadcastBtn');
    btn.textContent = '✓ BROADCAST SENT';
    btn.style.background = 'white';
    btn.style.color = '#C0281C';
    setTimeout(() => {
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
        </svg>
        ACTIVATE BROADCAST`;
      btn.style.background = '';
      btn.style.color = '';
    }, 4000);
  });



  /* ─── MANAGE DONORS ─── */
  document.getElementById('manageDonorsBtn')?.addEventListener('click', () => {
    showToast('Opening User Management…', 'info');
    document.querySelector('[data-page="users"]')?.click();
  });

  /* ─── STAT CARD CLICK ─── */
  document.querySelectorAll('.stat-card').forEach((card, i) => {
    card.addEventListener('click', () => {
      const statValues = document.querySelectorAll('[data-count]');
      const vals = Array.from(statValues).map(el => parseInt(el.textContent.replace(/,/g, '')));
      const msgs = [
        `Total Users: ${vals[0]} — Active users on platform`,
        `Pending Requests: ${vals[1]} — Action required urgently!`,
        `Open Requests: ${vals[2]} — Across multiple hospitals`,
        `Donations Today: ${vals[3]} — Great work, team!`,
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

  /* ─── LOAD DASHBOARD DATA ─── */
  loadDashboardData().then(() => {
    setTimeout(startCounters, 300);
  });

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

    // Donut hole
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Center text
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

document.getElementById('admin-notification')?.addEventListener('click', () => {
  window.location.href = '/adminNotification';
});

document.getElementById('admin-users')?.addEventListener('click', () => {
  window.location.href = '/adminUsers';
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