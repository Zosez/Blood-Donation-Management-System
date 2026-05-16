document.addEventListener('DOMContentLoaded', () => {

  const tbody    = document.getElementById('requestsBody');
  const pills    = document.querySelectorAll('.pill');
  let   allRows  = [];   // will hold references to rendered <tr> elements
  let   cachedRequests = []; // cache for modal lookup

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
      cachedRequests = requests; // store for modal lookup
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
      <td><a href="#" class="view-link response-link" data-id="${req.id}">View Response</a></td>
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


  /* ─── 3. VIEW RESPONSE LINKS ─── */
  tbody.addEventListener('click', (e) => {
    const link = e.target.closest('.view-link');
    if (!link) return;
    e.preventDefault();
    const id = link.dataset.id;
    // Find the request object by id from the last loaded data
    const req = cachedRequests.find(r => String(r.id) === String(id));
    if (req) {
      if (link.classList.contains('response-link')) {
        brOpenDonorResponseModal(req);
      } else {
        brOpenModal(req);
      }
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

  /* ─── AVATAR DROPDOWN ─── */
  const navAvatar      = document.getElementById('navAvatar');
  const avatarDropdown = document.getElementById('avatarDropdown');
  const logoutBtn      = document.getElementById('logoutBtn');
  const nameEl         = document.getElementById('nav-user-name');

  // Populate name from localStorage
  const userData = localStorage.getItem('user');
  if (userData && nameEl) {
    const user = JSON.parse(userData);
    nameEl.textContent = user.fullname?.split(' ')[0] || user.fullname || 'User';
  }

  navAvatar?.addEventListener('click', (e) => {
    e.stopPropagation();
    avatarDropdown?.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (navAvatar && avatarDropdown) {
      if (!navAvatar.contains(e.target) && !avatarDropdown.contains(e.target)) {
        avatarDropdown.classList.remove('show');
      }
    }
  });

  logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    avatarDropdown?.classList.remove('show');
    showToast('Signed out successfully.', 'success');
    setTimeout(() => { window.location.href = '/'; }, 1000);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') avatarDropdown?.classList.remove('show');
  });

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

document.getElementById("donations").addEventListener("click", () => {
    window.location.href = "/userDonations";
});

// ───────── Back to Dashboard REDIRECT ─────────
document.getElementById("back-dashboard").addEventListener("click", () => {
    window.location.href = "/userDashboard";
});

// ══════════════════════════════════════════
// VIEW DETAILS MODAL
// ══════════════════════════════════════════

function brFormatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function brTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function brOpenModal(r) {
  const urgency = r.urgency_level || 'normal';
  const isNeg   = r.blood_type && r.blood_type.includes('-');

  // Blood type badge colour
  const badge = document.getElementById('brModalBloodBadge');
  badge.textContent      = r.blood_type;
  badge.style.background = isNeg ? '#EFF6FF' : '#FEF2F2';
  badge.style.color      = isNeg ? '#1D4ED8' : '#C0392B';

  // Header
  document.getElementById('brModalHospital').textContent = r.hospital_name;
  const ub = document.getElementById('brModalUrgencyBadge');
  if (ub) {
    ub.textContent = urgency.charAt(0).toUpperCase() + urgency.slice(1);
    ub.className   = `br-urgency-badge ${urgency}`;
  }

  // Detail grid values
  document.getElementById('brMdBloodType').textContent   = r.blood_type;
  document.getElementById('brMdUnits').textContent        = `${r.units_required} unit${r.units_required !== 1 ? 's' : ''}`;
  document.getElementById('brMdDonationType').textContent = r.donation_type || 'Whole Blood';
  document.getElementById('brMdUrgency').textContent      = urgency.charAt(0).toUpperCase() + urgency.slice(1);
  document.getElementById('brMdHospital').textContent     = r.hospital_name;
  document.getElementById('brMdCity').textContent         = r.city || '—';
  document.getElementById('brMdDate').textContent         = brFormatDate(r.date_needed);
  document.getElementById('brMdRelationship').textContent = r.relationship || '—';

  // Status with colour
  const statusEl = document.getElementById('brMdStatus');
  const statusColors = { pending: '#D97706', approved: '#16A34A', fulfilled: '#2563EB', cancelled: '#DC2626' };
  statusEl.textContent = (r.status || 'pending').toUpperCase();
  statusEl.style.color = statusColors[r.status] || '#374151';
  statusEl.style.fontWeight = '700';

  // Submitted datetime
  const d = new Date(r.created_at);
  document.getElementById('brMdSubmitted').textContent = isNaN(d) ? '—'
    : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
      + ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Notes block
  const notesWrap = document.getElementById('brNotesWrap');
  if (r.notes && r.notes.trim()) {
    document.getElementById('brMdNotes').textContent = r.notes;
    notesWrap.style.display = 'flex';
  } else {
    notesWrap.style.display = 'none';
  }

  // Footer "posted X ago"
  document.getElementById('brMdPosted').textContent = r.created_at
    ? `Posted ${brTimeAgo(r.created_at)}` : '';

  // Open overlay
  document.getElementById('brModalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function brCloseModal(event) {
  if (event && event.target !== document.getElementById('brModalOverlay')) return;
  document.getElementById('brModalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ESC to close
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') brCloseModal(null);
});

// ─────────────────────────────────────────────────────────────────────
// DONOR RESPONSE MODAL
// ─────────────────────────────────────────────────────────────────────

async function brOpenDonorResponseModal(request) {
  const token = localStorage.getItem('token');
  if (!token) {
    showToast('Please log in to view responses', 'error');
    return;
  }

  try {
    // Fetch donation attempts for this request
    const res = await fetch(`/api/donation-attempts/request/${request.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      showToast('Failed to load donor responses', 'error');
      return;
    }

    const data = await res.json();
    const attempts = data.attempts || [];

    // Create modal
    const overlay = document.createElement('div');
    overlay.className = 'donor-response-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 1rem;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 2rem;
      max-width: 600px;
      width: 100%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    `;

    let content = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <div>
          <h2 style="margin: 0; font-size: 1.5rem; color: #1e293b;">Donor Responses</h2>
          <p style="margin: 0.5rem 0 0 0; color: #64748b; font-size: 0.9rem;">${request.hospital_name || 'Blood Request'}</p>
        </div>
        <button type="button" class="close-modal-btn" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b;">&times;</button>
      </div>

      <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div>
            <p style="margin: 0; font-size: 0.85rem; color: #64748b;">Blood Type Needed</p>
            <p style="margin: 0.5rem 0 0 0; font-weight: 700; color: #1e293b; font-size: 1.1rem;">${request.blood_type}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 0.85rem; color: #64748b;">Total Responses</p>
            <p style="margin: 0.5rem 0 0 0; font-weight: 700; color: #1e293b; font-size: 1.1rem;">${attempts.length}</p>
          </div>
        </div>
      </div>
    `;

    if (attempts.length === 0) {
      content += `
        <div style="text-align: center; padding: 2rem; color: #64748b;">
          <p style="font-size: 0.95rem;">No donors have responded to this request yet.</p>
        </div>
      `;
    } else {
      content += `<div style="display: flex; flex-direction: column; gap: 1rem;">`;
      attempts.forEach((attempt, idx) => {
        const attemptDate = new Date(attempt.created_at || attempt.attempted_at);
        const timeAgo = brTimeAgo(attempt.created_at || attempt.attempted_at);
        const isAccepted = attempt.status === 'accepted';
        const isDeclined = attempt.status === 'declined';

        content += `
          <div class="donor-response-card" data-attempt-id="${attempt.id}" style="
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 1.25rem;
            transition: all 0.2s;
            ${isAccepted ? 'background: #f0fdf4; border-color: #86efac;' : isDeclined ? 'background: #fef2f2; border-color: #fca5a5;' : ''}
          ">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
              <div>
                <p style="margin: 0; font-weight: 700; color: #1e293b; font-size: 1rem;">${attempt.donor_name || 'Unknown Donor'}</p>
                <p style="margin: 0.25rem 0 0 0; color: #64748b; font-size: 0.85rem;">${timeAgo}</p>
              </div>
              <span style="background: #C0281C; color: white; padding: 0.4rem 0.75rem; border-radius: 6px; font-weight: 600; font-size: 0.85rem;">Offered to donate</span>
            </div>

            <div style="background: #f9fafb; padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
                <span style="color: #64748b; font-size: 0.9rem;">Phone:</span>
                <span style="color: #1e293b; font-weight: 500;">${attempt.donor_phone || 'N/A'}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b; font-size: 0.9rem;">Email:</span>
                <span style="color: #1e293b; font-weight: 500;">${attempt.donor_email || 'N/A'}</span>
              </div>
            </div>
        `;

        if (isAccepted) {
          content += `
            <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 0.75rem; text-align: center; color: #16A34A; font-weight: 600; font-size: 0.95rem;">
              ✓ Accepted
            </div>
          `;
        } else if (isDeclined) {
          content += `
            <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 0.75rem; text-align: center; color: #C0281C; font-weight: 600; font-size: 0.95rem;">
              ✕ Declined
            </div>
          `;
        } else {
          content += `
            <div style="display: flex; gap: 0.75rem;">
              <button class="accept-donor-btn" data-attempt-id="${attempt.id}" style="
                flex: 1;
                background: #16A34A;
                color: white;
                border: none;
                padding: 0.65rem;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.2s;
              ">Accept</button>
              <button class="decline-donor-btn" data-attempt-id="${attempt.id}" style="
                flex: 1;
                background: #e2e8f0;
                color: #1e293b;
                border: 1px solid #cbd5e1;
                padding: 0.65rem;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.2s;
              ">Decline</button>
            </div>
          `;
        }

        content += `</div>`;
      });
      content += `</div>`;
    }

    content += `
      <div style="display: flex; gap: 1rem; margin-top: 2rem;">
        <button class="close-modal-btn" style="
          flex: 1;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          background: white;
          color: #1e293b;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        ">Close</button>
      </div>
    `;

    modal.innerHTML = content;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Event listeners
    overlay.querySelector('.close-modal-btn')?.addEventListener('click', () => overlay.remove());
    
    const acceptBtns = modal.querySelectorAll('.accept-donor-btn');
    const declineBtns = modal.querySelectorAll('.decline-donor-btn');

    acceptBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const attemptId = btn.dataset.attemptId;
        await handleDonorResponse(attemptId, 'accepted', overlay, request.id);
      });
    });

    declineBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const attemptId = btn.dataset.attemptId;
        await handleDonorResponse(attemptId, 'declined', overlay, request.id);
      });
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

  } catch (error) {
    console.error('Error opening donor response modal:', error);
    showToast('Error loading responses', 'error');
  }
}

async function handleDonorResponse(attemptId, status, overlay, requestId) {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch(`/api/donation-attempts/${attemptId}/${status}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      showToast(`Failed to ${status === 'accepted' ? 'accept' : 'decline'} donor`, 'error');
      return;
    }

    showToast(`Donor ${status} successfully`, 'success');

    // Refresh the modal
    overlay.remove();
    const req = cachedRequests.find(r => String(r.id) === String(requestId));
    if (req) {
      setTimeout(() => brOpenDonorResponseModal(req), 300);
    }
  } catch (error) {
    console.error('Error handling donor response:', error);
    showToast('Error processing response', 'error');
  }
}