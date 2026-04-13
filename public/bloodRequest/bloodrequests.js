document.addEventListener('DOMContentLoaded', () => {

  const tbody    = document.getElementById('requestsBody');
  const pills    = document.querySelectorAll('.pill');
  let   allRows  = [];   // will hold references to rendered <tr> elements

  // ─── LOAD REQUESTS FROM API ────────────────────────────────────────────

  async function loadRequests() {
    const token = localStorage.getItem('token');
    if (!token) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:48px 20px;color:#9CA3AF;font-size:.9rem;font-weight:500;">Please <a href="/login" style="color:#B91C1C;font-weight:600;">log in</a> to view your blood requests.</td></tr>`;
      return;
    }

    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:48px 20px;color:#9CA3AF;">Loading requests…</td></tr>`;

    try {
      const res = await fetch('/api/blood-requests/my', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.status === 401 || res.status === 403) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:48px 20px;color:#9CA3AF;">Session expired. <a href="/login" style="color:#B91C1C;font-weight:600;">Log in again</a>.</td></tr>`;
        return;
      }

      const data = await res.json();
      const requests = data.requests || [];

      if (requests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:48px 20px;color:#9CA3AF;font-size:.9rem;font-weight:500;">You haven't submitted any blood requests yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = '';
      requests.forEach((req, i) => {
        const tr = buildRow(req, i);
        tbody.appendChild(tr);
      });

      // Cache row references for filtering / search
      allRows = [...tbody.querySelectorAll('tr')];

      // Animate rows in
      allRows.forEach((row, i) => {
        row.style.opacity = '0';
        row.style.transform = 'translateY(10px)';
        row.style.transition = `opacity 0.3s ease ${i * 60}ms, transform 0.3s ease ${i * 60}ms`;
        setTimeout(() => { row.style.opacity = '1'; row.style.transform = 'translateY(0)'; }, 80 + i * 60);
      });

    } catch (err) {
      console.error('Load requests error:', err);
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:48px 20px;color:#EF4444;">Failed to load requests. Please try again.</td></tr>`;
    }
  }

  // ─── BUILD TABLE ROW ───────────────────────────────────────────────────

  function buildRow(req, idx) {
    const tr = document.createElement('tr');
    tr.dataset.status = req.status;

    // Format date
    const d = new Date(req.created_at);
    const dateMain = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const dateTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Blood type badge class
    const btClass = bloodBadgeClass(req.blood_type);

    // Urgency label
    const urgencyMap = { normal: 'standard', urgent: 'urgent', critical: 'critical' };
    const urgLabel = (req.urgency_level || 'normal').toUpperCase();
    const urgClass = urgencyMap[req.urgency_level] || 'standard';
    const urgPrefix = req.urgency_level === 'critical' ? '! ' : '';

    // Status badge
    const statusClass = `status-${req.status}`;

    tr.innerHTML = `
      <td class="td-date"><span class="date-main">${dateMain}</span><span class="date-time">${dateTime}</span></td>
      <td><span class="blood-badge ${btClass}">${req.blood_type}</span></td>
      <td>${req.donation_type || 'Whole Blood'}</td>
      <td>${req.units_required} Unit${req.units_required > 1 ? 's' : ''}</td>
      <td><span class="urgency ${urgClass}">${urgPrefix}${urgLabel}</span></td>
      <td>${req.city || '—'}</td>
      <td><span class="status-badge ${statusClass}">${req.status.toUpperCase()}</span></td>
      <td><a href="#" class="view-link" data-id="${req.id}">View Details</a></td>
    `;
    return tr;
  }

  function bloodBadgeClass(type) {
    const map = {
      'A+': 'blood-a-pos', 'A-': 'blood-a-neg', 'A−': 'blood-a-neg',
      'B+': 'blood-b-pos', 'B-': 'blood-b-neg', 'B−': 'blood-b-neg',
      'AB+': 'blood-ab-pos', 'AB-': 'blood-ab-neg', 'AB−': 'blood-ab-neg',
      'O+': 'blood-o-pos', 'O-': 'blood-o-neg', 'O−': 'blood-o-neg',
    };
    return map[type] || 'blood-o-pos';
  }

  // ─── KICK OFF ──────────────────────────────────────────────────────────
  loadRequests();


  /* ─── 1. STATUS FILTER PILLS ─── */
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const filter = pill.dataset.filter;

      allRows.forEach(row => {
        if (filter === 'all' || row.dataset.status === filter) {
          row.classList.remove('hidden');
        } else {
          row.classList.add('hidden');
        }
      });

      // Show empty state if no rows visible
      const visibleRows = allRows.filter(r => !r.classList.contains('hidden'));
      const existingEmpty = document.getElementById('emptyState');
      if (visibleRows.length === 0) {
        if (!existingEmpty) {
          const empty = document.createElement('tr');
          empty.id = 'emptyState';
          empty.innerHTML = `<td colspan="8" style="text-align:center; padding: 48px 20px; color: #9CA3AF; font-size: 0.9rem; font-weight: 500;">No requests found for this status.</td>`;
          tbody.appendChild(empty);
        }
      } else {
        if (existingEmpty) existingEmpty.remove();
      }
    });
  });


  /* ─── 2. NEW REQUEST BUTTON ─── */
  const newRequestBtn = document.getElementById('newRequestBtn');
  if (newRequestBtn) {
    newRequestBtn.addEventListener('click', () => {
      window.location.href = "/requestBlood";
    });
  }


  /* ─── 3. VIEW DETAILS LINKS ─── */
  tbody.addEventListener('click', (e) => {
    if (e.target.classList.contains('view-link')) {
      e.preventDefault();
      showToast('Request details coming soon!', 'info');
    }
  });


  /* ─── 4. SORT WRAP ─── */
  const sortWrap = document.querySelector('.sort-wrap');
  const sortOrders = ['Date: Newest first', 'Date: Oldest first'];
  let sortIdx = 0;

  if (sortWrap) {
    sortWrap.addEventListener('click', () => {
      sortIdx = (sortIdx + 1) % sortOrders.length;
      sortWrap.querySelector('span').textContent = sortOrders[sortIdx];

      const rowsArr = [...tbody.querySelectorAll('tr:not(#emptyState)')];
      rowsArr.reverse().forEach(row => tbody.appendChild(row));
    });
  }


  /* ─── 5. SEARCH ─── */
  const searchInput = document.querySelector('.search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase().trim();
      allRows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (query === '' || text.includes(query)) {
          row.classList.remove('hidden');
        } else {
          row.classList.add('hidden');
        }
      });
      // Reset active pill to 'all' when searching
      if (query !== '') {
        pills.forEach(p => p.classList.remove('active'));
        const allPill = document.querySelector('.pill[data-filter="all"]');
        if (allPill) allPill.classList.add('active');
      }
    });
  }


  /* ─── 6. TOAST NOTIFICATION ─── */
  let toastTimeout = null;
  let activeToast  = null;

  function showToast(message, type = 'success') {
    const colors = {
      success: { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
      warn:    { bg: '#fff7ed', border: '#fdba74', text: '#92400e' },
      error:   { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
      info:    { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
    };

    const c = colors[type] || colors.info;

    if (toastTimeout) clearTimeout(toastTimeout);
    if (activeToast) activeToast.remove();

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
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

});

// ───────── Home REDIRECT ─────────
document.getElementById("home-logo").addEventListener("click", () => {
    window.location.href = "/";
});

// ───────── Profile REDIRECT ─────────
document.getElementById("user-profile").addEventListener("click", () => {
    window.location.href = "/userProfile";
});

// ───────── userDashboard REDIRECT ─────────
document.getElementById("dashboard").addEventListener("click", () => {
    window.location.href = "/userDashboard";
});

// ───────── Back to Dashboard REDIRECT ─────────
document.getElementById("back-dashboard").addEventListener("click", () => {
    window.location.href = "/userDashboard";
});