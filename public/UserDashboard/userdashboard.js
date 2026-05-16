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
    const notifBtn   = document.getElementById('notifBtn');
    const notifPanel = document.getElementById('notifPanel');
    const notifClose = document.getElementById('notifClose');

    function openNotif()  { notifPanel?.classList.add('open'); }
    function closeNotif() { notifPanel?.classList.remove('open'); }

    notifBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      avatarDropdown?.classList.remove('show'); // close other dropdown
      notifPanel?.classList.contains('open') ? closeNotif() : openNotif();
    });

    notifClose?.addEventListener('click', (e) => { e.stopPropagation(); closeNotif(); });

    document.addEventListener('click', (e) => {
      if (notifPanel && notifBtn) {
        if (!notifPanel.contains(e.target) && !notifBtn.contains(e.target)) closeNotif();
      }
    });

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

  availToggle?.addEventListener('change', async () => {
    updateAvailabilityUI(availToggle.checked);
    const token = localStorage.getItem('token');
    if (token) {
        try {
            await fetch('/api/auth/availability', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ is_available: availToggle.checked })
            });
        } catch(e) {
            console.error('Failed saving availability', e);
        }
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

          // 2. Fetch stats
          const statsRes = await fetch('/api/donations/stats', { headers: { 'Authorization': `Bearer ${token}` } });
          if (statsRes.ok) {
              const { stats } = await statsRes.json();
              const unitsEl = document.getElementById('total-units-val');
              const livesEl = document.getElementById('lives-impacted-val');
              if (unitsEl) unitsEl.innerHTML = `${stats.total_units} <span class="stat-unit">Units</span>`;
              if (livesEl) livesEl.innerHTML = `${stats.total_units * 3} <span class="stat-unit">People</span>`;
          }

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

  /* ─── DYNAMIC RECEIVER DATA LOADING ─── */
  async function loadReceiverData() {
    if (!token) {
      console.warn('No token for receiver data');
      return;
    }

    try {
      // Fetch user's blood requests using correct endpoint
      const reqRes = await fetch('/api/blood-requests/my', { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });

      console.log('Receiver data response status:', reqRes.status);

      if (reqRes.ok) {
        const data = await reqRes.json();
        const requests = data.requests || data;
        
        console.log('Receiver requests:', requests);

        if (requests && requests.length > 0) {
          // Show active request (most recent)
          renderActiveRequest(requests[0]);
          // Show request history (all requests)
          renderRequestHistory(requests);
        } else {
          // Show empty state for active request
          renderEmptyActiveRequest();
          renderEmptyRequestHistory();
        }
      } else {
        console.warn('Failed to fetch receiver data:', reqRes.status, reqRes.statusText);
        renderEmptyActiveRequest();
        renderEmptyRequestHistory();
      }
    } catch (err) {
      console.error('Failed loading receiver data:', err);
      renderEmptyActiveRequest();
      renderEmptyRequestHistory();
    }
  }

  function renderActiveRequest(request) {
    const activeCard = document.querySelector('.active-request-card');
    if (!activeCard) return;

    const bloodType = request.blood_type || 'N/A';
    const createdTime = getTimeAgo(request.created_at);
    const requestId = request.id || 'N/A';

    // TODO: Get actual donor counts from donations/notifications table
    // For now, using placeholder counts (0) until backend provides these metrics
    const notified = 0;  // request.notified_count
    const accepted = 0;  // request.accepted_count  
    const confirmed = 0; // request.confirmed_count

    console.log('Rendering active request:', request);

    activeCard.innerHTML = `
      <div class="active-req-left">
        <div class="active-req-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </div>
        <div>
          <p class="active-req-id">Active Request #${requestId}</p>
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
          <div class="req-stat-bar"><div class="req-stat-fill" style="width: ${accepted * 10}%"></div></div>
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



