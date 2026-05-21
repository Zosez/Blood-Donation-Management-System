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
  const notifBtn      = document.getElementById('notifBtn');
  const notifPanel    = document.getElementById('notifPanel');
  const notifClose    = document.getElementById('notifClose');
  const notifList     = document.getElementById('notifList');
  const notifDot      = notifBtn?.querySelector('.notif-dot');
  const notifMarkAll  = document.getElementById('notifMarkAll');
  let   notifLoaded   = false;

  const NOTIF_ICONS = {
    blood_request:        `<svg width="14" height="16" viewBox="0 0 18 22" fill="none"><path d="M9 1C9 1 1 9.5 1 14.5a8 8 0 0 0 16 0C17 9.5 9 1 9 1z" fill="#C0281C"/></svg>`,
    donation_completed:   `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    donor_approved:       `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    donor_rejected:       `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C0281C" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    donation_accepted:    `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    default:              `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
  };
  const NOTIF_COLOR = {
    blood_request:      'red',
    donation_completed: 'green',
    donor_approved:     'green',
    donor_rejected:     'red',
    donation_accepted:  'orange',
    default:            'grey'
  };

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr);
    const m = Math.floor(diff / 60000);
    if (m < 1)   return 'Just now';
    if (m < 60)  return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24)  return `${h}h ago`;
    const d = Math.floor(h / 24);
    return d === 1 ? 'Yesterday' : `${d} days ago`;
  }

  function renderNotifications(notifications) {
    if (!notifList) return;
    if (!notifications.length) {
      notifList.innerHTML = `<li class="notif-item" style="justify-content:center;padding:2.5rem 1rem;color:#9CA3AF;font-size:.82rem;text-align:center;flex-direction:column;gap:4px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" stroke-width="1.5" style="margin:0 auto 6px;"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        No notifications yet
      </li>`;
      return;
    }
    notifList.innerHTML = notifications.map(n => {
      const type   = n.type || 'default';
      const icon   = NOTIF_ICONS[type] || NOTIF_ICONS.default;
      const color  = NOTIF_COLOR[type] || 'grey';
      const unread = !n.is_read ? ' unread' : '';
      return `<li class="notif-item${unread}" data-id="${n.id}" style="cursor:pointer;">
        <span class="notif-icon ${color}">${icon}</span>
        <div>
          <p class="notif-text">${n.message || n.title || ''}</p>
          <p class="notif-time">${timeAgo(n.created_at)}</p>
        </div>
      </li>`;
    }).join('');

    // Click individual item → mark read
    notifList.querySelectorAll('.notif-item[data-id]').forEach(li => {
      li.addEventListener('click', () => markOneRead(li.dataset.id, li));
    });
  }

  function updateBadge(unreadCount) {
    if (!notifDot) return;
    if (unreadCount > 0) {
      notifDot.style.display = 'flex';
      notifDot.textContent      = unreadCount > 9 ? '9+' : String(unreadCount);
      // Show "Mark all read" button
      if (notifMarkAll) { notifMarkAll.style.opacity = '1'; notifMarkAll.style.pointerEvents = 'auto'; }
    } else {
      notifDot.style.display    = 'none';
      if (notifMarkAll) { notifMarkAll.style.opacity = '0'; notifMarkAll.style.pointerEvents = 'none'; }
    }
  }

  async function loadNotifications() {
    const token = localStorage.getItem('token');
    if (!token || !notifList) return;
    if (!notifLoaded) {
      notifList.innerHTML = `<li class="notif-item" style="justify-content:center;padding:2rem;color:#9CA3AF;font-size:.82rem;">Loading…</li>`;
    }
    try {
      const res = await fetch('/api/notifications', { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const notifications = data.notifications || [];
      renderNotifications(notifications);
      const unread = notifications.filter(n => !n.is_read).length;
      updateBadge(unread);
      notifLoaded = true;
    } catch (err) {
      console.error('Notification fetch error:', err);
      if (!notifLoaded) {
        notifList.innerHTML = `<li class="notif-item" style="justify-content:center;padding:2rem;color:#EF4444;font-size:.82rem;">Failed to load notifications.</li>`;
      }
    }
  }

  async function fetchUnreadCount() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      const unread = (data.notifications || []).filter(n => !n.is_read).length;
      updateBadge(unread);
    } catch (_) {}
  }

  async function markOneRead(id, liEl) {
    if (!liEl.classList.contains('unread')) return;
    const token = localStorage.getItem('token');
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } });
      liEl.classList.remove('unread');
      // Decrement badge
      const remaining = notifList.querySelectorAll('.notif-item.unread').length;
      updateBadge(remaining);
    } catch (_) {}
  }

  async function markAllRead() {
    const token = localStorage.getItem('token');
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } });
      notifList.querySelectorAll('.notif-item.unread').forEach(li => li.classList.remove('unread'));
      updateBadge(0);
    } catch (_) {}
  }

  function openNotif()  {
    notifPanel?.classList.add('open');
    loadNotifications(); // always refresh on open
  }
  function closeNotif() { notifPanel?.classList.remove('open'); }

  notifBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    avatarDropdown?.classList.remove('show');
    notifPanel?.classList.contains('open') ? closeNotif() : openNotif();
  });
  notifClose?.addEventListener('click', (e) => { e.stopPropagation(); closeNotif(); });
  notifMarkAll?.addEventListener('click', (e) => { e.stopPropagation(); markAllRead(); });

  document.addEventListener('click', (e) => {
    if (notifPanel && notifBtn) {
      if (!notifPanel.contains(e.target) && !notifBtn.contains(e.target)) closeNotif();
    }
  });

  // Poll unread count every 60 s
  fetchUnreadCount();
  setInterval(fetchUnreadCount, 60000);

    /* ─── Avatar dropdown ─── */
    const navAvatar      = document.getElementById('navAvatar');
    const avatarDropdown = document.getElementById('avatarDropdown');
    const logoutBtn      = document.getElementById('logoutBtn');

    navAvatar?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeNotif(); // close notif if open
      avatarDropdown?.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (navAvatar && avatarDropdown) {
        if (!navAvatar.contains(e.target) && !avatarDropdown.contains(e.target)) {
          avatarDropdown.classList.remove('show');
        }
      }
    });

    logoutBtn?.addEventListener('click', async () => {
      const token = localStorage.getItem('token');
      
      try {
        await fetch('http://localhost:5000/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (err) {
        console.error('Logout API error:', err);
      }
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      avatarDropdown?.classList.remove('show');
      showToast('Signed out successfully.', 'success');
      
      setTimeout(() => {
        window.location.replace('/login');
      }, 1000);
    });

    /* ─── Hamburger ─── */
    const hamburger = document.getElementById('navHamburger');
    const navLinks  = document.querySelector('.nav-links');

    hamburger?.addEventListener('click', () => {
      navLinks?.classList.toggle('active');
    });

    /* ─── Escape key closes both ─── */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeNotif();
        avatarDropdown?.classList.remove('show');
      }
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

  function updateAvailabilityUI(checked, showToasts = true) {
    const statusText = statusBadge?.querySelector('span:last-child');
    if (checked) {
      if (statusText) statusText.textContent = 'Ready to Donate';
      statusDot?.classList.add('green');
      statusDot && (statusDot.style.background = '');
      if (showToasts) showToast('Availability set to Ready to Donate.', 'success');
    } else {
      if (statusText) statusText.textContent = 'Unavailable';
      statusDot?.classList.remove('green');
      statusDot && (statusDot.style.background = '#9CA3AF');
      if (showToasts) showToast('Availability set to Unavailable.', 'warning');
    }
  }

  /* Client-side rate limiter: max 3 toggles per 60 seconds */
  const toggleRateLimit = {
    attempts: [],
    maxAttempts: 3,
    windowMs: 60 * 1000,
    check() {
      const now = Date.now();
      this.attempts = this.attempts.filter(t => now - t < this.windowMs);
      if (this.attempts.length >= this.maxAttempts) return false;
      this.attempts.push(now);
      return true;
    },
    remainingSeconds() {
      if (!this.attempts.length) return 0;
      const oldest = Math.min(...this.attempts);
      return Math.ceil((this.windowMs - (Date.now() - oldest)) / 1000);
    }
  };

  function setCooldownUI(daysRemaining) {
    const cooldownEl = document.getElementById('cooldown-notice');
    if (cooldownEl) {
      cooldownEl.textContent = `⏳ Donation cooldown active — ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining before you can mark yourself as available again.`;
      cooldownEl.style.display = 'block';
    }
    if (availToggle) {
      availToggle.disabled = true;
      availToggle.title    = `Cooldown: ${daysRemaining} days remaining`;
      if (availToggle.parentElement) {
        availToggle.parentElement.style.opacity = '0.5';
        availToggle.parentElement.style.cursor  = 'not-allowed';
        availToggle.parentElement.title = `Cooldown: ${daysRemaining} days remaining`;
      }
    }
  }

  availToggle?.addEventListener('change', async () => {
    /* Rate limit check */
    if (!toggleRateLimit.check()) {
      availToggle.checked = !availToggle.checked; // revert
      const secs = toggleRateLimit.remainingSeconds();
      showToast(`Too many changes. Please wait ${secs}s before toggling again.`, 'warning');
      return;
    }

    const wantAvailable = availToggle.checked;
    updateAvailabilityUI(wantAvailable);

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch('/api/auth/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ is_available: wantAvailable })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        /* Revert toggle to previous state */
        availToggle.checked = !wantAvailable;
        updateAvailabilityUI(!wantAvailable, false);
        showToast(data.message || 'Could not update availability.', 'danger');

        /* If cooldown info returned, lock the toggle */
        if (data.cooldown_days_remaining > 0) {
          setCooldownUI(data.cooldown_days_remaining);
        }
      }
    } catch(e) {
      console.error('Failed saving availability:', e);
      /* Revert toggle */
      availToggle.checked = !wantAvailable;
      updateAvailabilityUI(!wantAvailable, false);
      showToast('Network error. Please try again.', 'danger');
    }
  });

  /* ─── DYNAMIC DONOR DATA LOADING ─── */
  const token = localStorage.getItem('token');
  async function loadDonorData() {
      if (!token) {
        showToast('Please log in to view real data', 'warning');
        return;
      }
      
      try {
          // 1. Get user info from localStorage
          const userData = localStorage.getItem('user');
          if (userData) {
              const user = JSON.parse(userData);
              // Update avatar name in navbar pill with actual username
              const nameEl = document.getElementById('nav-user-name');
              if (nameEl) nameEl.textContent = user.fullname?.split(' ')[0] || user.fullname || 'User';
              if (availToggle) {
                  availToggle.checked = user.is_available_donor === 1;
                  updateAvailabilityUI(availToggle.checked, false);
              }
          }

          // 2. Fetch fresh user data from backend for live stats
          const meRes = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
          if (meRes.ok) {
              const meData = await meRes.json();
              const freshUser = meData.user || {};
              // Update localStorage with fresh user data
              localStorage.setItem('user', JSON.stringify(freshUser));
              
              const unitsEl = document.getElementById('total-units-val');
              const livesEl = document.getElementById('lives-impacted-val');
              const totalUnits  = freshUser.total_donations || 0;
              const livesHelped = totalUnits * 3;   // 1 unit = 3 people
              if (unitsEl) unitsEl.innerHTML = `${totalUnits} <span class="stat-unit">Units</span>`;
              if (livesEl) livesEl.innerHTML = `${livesHelped} <span class="stat-unit">People</span>`;

              // Sync availability toggle with fresh backend value
              if (availToggle) {
                  availToggle.checked = freshUser.is_available_donor === 1;
                  updateAvailabilityUI(availToggle.checked, false);
              }

              // If on 56-day cooldown: lock the toggle and show notice
              if (freshUser.on_cooldown && freshUser.cooldown_days_remaining > 0) {
                  setCooldownUI(freshUser.cooldown_days_remaining);
              } else {
                  // Clear any stale cooldown notice
                  const cooldownEl = document.getElementById('cooldown-notice');
                  if (cooldownEl) cooldownEl.style.display = 'none';
                  if (availToggle) {
                      availToggle.disabled = false;
                      availToggle.title = '';
                      if (availToggle.parentElement) {
                          availToggle.parentElement.style.opacity = '';
                          availToggle.parentElement.style.cursor  = '';
                          availToggle.parentElement.title = '';
                      }
                  }
              }
          }

          // 3. Fetch gamification stats (tier + next badge)
          try {
              const gamRes = await fetch('/api/gamification/stats', { headers: { 'Authorization': 'Bearer ' + token } });
              if (gamRes.ok) {
                  const gamData = await gamRes.json();
                  if (gamData.success) {
                      const s = gamData.data;
                      const TIER_COLORS = { Bronze: '#cd7f32', Silver: '#9CA3AF', Gold: '#D97706', Platinum: '#6B7280' };
                      const unitsEl = document.getElementById('total-units-val');
                      const livesEl = document.getElementById('lives-impacted-val');
                      if (unitsEl) unitsEl.innerHTML = s.donationCount + ' <span class="stat-unit">Units</span>';
                      if (livesEl) livesEl.innerHTML = (s.donationCount * 3) + ' <span class="stat-unit">People</span>';
                      const tierEl = document.getElementById('donor-tier-val');
                      const hintEl = document.getElementById('donor-tier-hint');
                      if (tierEl) { tierEl.textContent = s.currentTier; tierEl.style.color = TIER_COLORS[s.currentTier] || '#111827'; }
                      if (hintEl) hintEl.textContent = s.nextTier ? (s.donationsToNextTier + ' donation' + (s.donationsToNextTier !== 1 ? 's' : '') + ' to ' + s.nextTier) : 'Maximum tier reached!';
                      const nb = s.lockedBadges && s.lockedBadges[0];
                      const nbName = document.getElementById('next-badge-name');
                      const nbIcon = document.getElementById('next-badge-icon');
                      if (nbName) nbName.textContent = nb ? nb.name : 'All badges earned!';
                      if (nbIcon) nbIcon.textContent = nb ? nb.icon : '🏆';
                  }
              }
          } catch (gamErr) { console.warn('[DASHBOARD] Gamification stats failed:', gamErr.message); }

          // 3. Fetch matched requests
          const matchRes = await fetch('/api/blood-requests/matched', { headers: { 'Authorization': `Bearer ${token}` } });
          if (matchRes.ok) {
              const { requests } = await matchRes.json();
              renderMatchedRequests(requests);
          }
      } catch (err) {
          console.error('Failed loading donor data:', err);
      }
  }

  function renderMatchedRequests(requests) {
    const grid = document.getElementById('matched-requests-grid');
    const count = document.getElementById('matched-requests-count');
    if (!grid || !count) return;

    if (!requests || requests.length === 0) {
        grid.innerHTML = '<p style="color:#6B7280; font-size: 0.9rem; grid-column: 1/-1;">No matched requests in your area right now.</p>';
        count.textContent = '0 Near You';
        return;
    }

    count.textContent = `${requests.length} Near You`;

    grid.innerHTML = requests.map(r => {
        const urn = (r.urgency_level || r.urgency || 'normal').toLowerCase();
        const colorClass = urn === 'critical' ? 'critical' : urn === 'urgent' ? 'urgent' : 'normal';
        const btnClass   = urn === 'critical' ? 'btn-red'   : urn === 'urgent' ? 'btn-orange' : 'btn-dark';
        const btnLabel   = urn === 'critical' ? 'Donate Now' : urn === 'urgent' ? 'Respond' : 'View Details';
        return `
      <div class="request-card ${colorClass}">
        <div class="req-top">
          <span class="urgency-badge ${colorClass}-badge">${urn.toUpperCase()}</span>
          <span class="blood-type">${r.blood_type}</span>
        </div>
        <div class="req-body">
          <p class="req-hospital">${r.hospital_name}</p>
          <p class="req-meta">
            <svg width="10" height="13" viewBox="0 0 12 16" fill="none"><path d="M6 1C3.79 1 2 2.79 2 5c0 3.25 4 9 4 9s4-5.75 4-9c0-2.21-1.79-4-4-4z" fill="#9CA3AF"/></svg>
            ${r.city} &bull; ${r.units_required || r.units || '1'} Units Needed
          </p>
        </div>
        <button class="req-btn ${btnClass}" onclick="window.location.href='/userDonations'">${btnLabel}</button>
      </div>
        `;
    }).join('');
  }

  loadDonorData();

  // Auto-refresh donor stats every 30 seconds for real-time updates
  setInterval(() => {
    if (document.visibilityState !== 'hidden') {
      loadDonorData();
    }
  }, 30000);

  // Refresh donor stats when page regains focus (after admin completes donation)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      loadDonorData();
    }
  });

  window.addEventListener('focus', () => {
    loadDonorData();
  });

  /* ─── DYNAMIC RECEIVER DATA LOADING ─── */
  async function loadReceiverData() {
    if (!token) {
      console.warn('No token for receiver data');
      return;
    }

    try {
      const reqRes = await fetch('/api/blood-requests/my', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (reqRes.ok) {
        const data = await reqRes.json();
        const requests = data.requests || data;

        if (requests && requests.length > 0) {
          // For the most recent (active) request, fetch real attempt counts
          const activeReq = requests[0];
          let attemptStats = { notified: 0, accepted: 0, confirmed: 0 };

          try {
            const attRes = await fetch(`/api/donation-attempts/request/${activeReq.id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (attRes.ok) {
              const attData = await attRes.json();
              const attempts = attData.attempts || [];
              attemptStats.notified  = attempts.length;
              attemptStats.accepted  = attempts.filter(a => a.status === 'accepted').length;
              attemptStats.confirmed = attempts.filter(a => a.blood_units).length;
            }
          } catch (e) {
            console.warn('Could not fetch attempt stats:', e);
          }

          renderActiveRequest(activeReq, attemptStats);
          renderRequestHistory(requests);
        } else {
          renderEmptyActiveRequest();
          renderEmptyRequestHistory();
        }
      } else {
        console.warn('Failed to fetch receiver data:', reqRes.status);
        renderEmptyActiveRequest();
        renderEmptyRequestHistory();
      }
    } catch (err) {
      console.error('Failed loading receiver data:', err);
      renderEmptyActiveRequest();
      renderEmptyRequestHistory();
    }
  }

  function renderActiveRequest(request, stats = {}) {
    const activeCard = document.querySelector('.active-request-card');
    if (!activeCard) return;

    const bloodType = request.blood_type || 'N/A';
    const createdTime = getTimeAgo(request.created_at);
    const requestId = request.id || 'N/A';
    const statusLabel = (request.status || 'pending').toUpperCase();
    const statusColor = request.status === 'ongoing' ? '#16A34A' : request.status === 'completed' ? '#2563EB' : '#D97706';

    const notified  = stats.notified  || 0;
    const accepted  = stats.accepted  || 0;
    const confirmed = stats.confirmed || 0;

    activeCard.innerHTML = `
      <div class="active-req-left">
        <div class="active-req-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </div>
        <div>
          <p class="active-req-id">Active Request #${requestId} &nbsp;<span style="font-size:0.75rem;font-weight:700;color:${statusColor};">${statusLabel}</span></p>
          <p class="active-req-meta">Blood Type: <span class="blood-${getBgClass(bloodType)}">${bloodType}</span> &bull; Created ${createdTime}</p>
        </div>
      </div>
      <div class="active-req-stats">
        <div class="req-stat">
          <span class="req-stat-num">${String(notified).padStart(2, '0')}</span>
          <span class="req-stat-label">NOTIFIED</span>
        </div>
        <div class="req-stat">
          <span class="req-stat-num green-num">${String(accepted).padStart(2, '0')}</span>
          <span class="req-stat-label">ACCEPTED</span>
          <div class="req-stat-bar"><div class="req-stat-fill" style="width: ${Math.min(accepted * 20, 100)}%"></div></div>
        </div>
        <div class="req-stat">
          <span class="req-stat-num">${String(confirmed).padStart(2, '0')}</span>
          <span class="req-stat-label">CONFIRMED</span>
        </div>
      </div>
    `;
  }

  function renderEmptyActiveRequest() {
    const activeCard = document.querySelector('.active-request-card');
    if (!activeCard) return;

    activeCard.innerHTML = `
      <div class="active-req-left">
        <div class="active-req-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </div>
        <div>
          <p class="active-req-id">No Active Request</p>
          <p class="active-req-meta" style="color: #9CA3AF;">Submit a blood request to get started.</p>
        </div>
      </div>
      <div class="active-req-stats">
        <div class="req-stat">
          <span class="req-stat-num">00</span>
          <span class="req-stat-label">NOTIFIED</span>
        </div>
        <div class="req-stat">
          <span class="req-stat-num">00</span>
          <span class="req-stat-label">ACCEPTED</span>
          <div class="req-stat-bar"><div class="req-stat-fill"></div></div>
        </div>
        <div class="req-stat">
          <span class="req-stat-num">00</span>
          <span class="req-stat-label">CONFIRMED</span>
        </div>
      </div>
    `;
  }

  function renderRequestHistory(requests) {
    const tbody = document.querySelector('.history-table tbody');
    if (!tbody) return;

    if (!requests || requests.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #9CA3AF; padding: 2rem;">No request history available.</td></tr>';
      return;
    }

    tbody.innerHTML = requests.map(req => {
      const bloodType = req.blood_type || 'N/A';
      const units = req.units_required || 1;
      const dateStr = new Date(req.created_at || req.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      const status = req.status || 'pending';
      const statusClass = status.toLowerCase() === 'completed' ? 'completed' : 
                         status.toLowerCase() === 'cancelled' ? 'cancelled' : 'pending';

      return `
        <tr>
          <td class="req-id-cell">#${req.id}</td>
          <td><span class="blood-chip">${bloodType}</span> ${units} Unit${units !== 1 ? 's' : ''}</td>
          <td>${dateStr}</td>
          <td><span class="status-pill ${statusClass}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
          <td><a href="#" class="action-link">View Details</a></td>
        </tr>
      `;
    }).join('');

    // Attach event listeners to dynamically created action links
    document.querySelectorAll('.history-table .action-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Opening request details.', 'info');
      });
    });
  }

  function renderEmptyRequestHistory() {
    const tbody = document.querySelector('.history-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #9CA3AF; padding: 2rem;">No request history available.</td></tr>';
  }

  function getTimeAgo(dateString) {
    if (!dateString) return 'recently';
    
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }

  function getBgClass(bloodType) {
    if (!bloodType) return 'neutral';
    const type = bloodType.toLowerCase();
    if (type.includes('neg') || type.includes('-')) return 'neg';
    return 'pos';
  }

  loadReceiverData();
  // Old hardcoded buttons listener removed because we added onclick directly into the new DOM html.

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

// ───────── bloodRequest REDIRECT ─────────
document.getElementById("blood-request").addEventListener("click", () => {
    window.location.href = "/bloodRequest";
});

// ───────── userProfile REDIRECT ─────────
document.getElementById("user-profile").addEventListener("click", () => {
    window.location.href = "/userProfile";
});

// ───────── donorRequest REDIRECT ─────────
document.getElementById("donor-request").addEventListener("click", () => {
    window.location.href = "/userDonations";
});

// ───────── userProfile REDIRECT ─────────
document.getElementById("home-logo").addEventListener("click", () => {
    window.location.href = "/";
});

// ───────── submitRequest REDIRECT ─────────
document.getElementById("submit-request").addEventListener("click", () => {
    window.location.href = "/requestBlood";
});





