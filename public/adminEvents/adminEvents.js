document.addEventListener('DOMContentLoaded', () => {
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

  function showConfirm(message, onConfirm, title = 'Confirm Action') {
    const confirmModal = document.getElementById('confirmModal');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmOkBtn = document.getElementById('confirmOkBtn');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');

    if (!confirmModal || !confirmOkBtn || !confirmCancelBtn) return;

    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmModal.classList.add('show');

    const closeConfirm = () => {
      confirmModal.classList.remove('show');
      confirmOkBtn.onclick = null;
      confirmCancelBtn.onclick = null;
      confirmModal.onclick = null;
    };

    confirmCancelBtn.onclick = closeConfirm;

    confirmOkBtn.onclick = () => {
      closeConfirm();
      onConfirm();
    };

    confirmModal.onclick = (event) => {
      if (event.target === confirmModal) closeConfirm();
    };
  }

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

  function handleLogout(e) {
    if (e) e.preventDefault();

    if (avatarDropdown) avatarDropdown.classList.remove('show');

    showToast('Logging out… Goodbye, Admin User!', 'warning');

    setTimeout(() => {
      showToast('Session ended. Redirecting…', 'danger');
    }, 1800);

    setTimeout(() => {
      window.location.href = '../login/login.html';
    }, 3000);
  }

  document.getElementById('dropdownLogoutBtn')?.addEventListener('click', handleLogout);
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

  document.getElementById('notifBtn')?.addEventListener('click', () => {
    showToast('You have 2 unread notifications.', 'info');
  });

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

  const eventModal = document.getElementById('eventModal');
  const createEventBtn = document.getElementById('createEventBtn');
  const modalClose = document.getElementById('modalClose');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const eventForm = document.getElementById('eventForm');
  const modalTitle = document.getElementById('modalTitle');

  const eventTitle = document.getElementById('eventTitle');
  const eventDate = document.getElementById('eventDate');
  const eventTime = document.getElementById('eventTime');
  const eventQuota = document.getElementById('eventQuota');
  const eventLocation = document.getElementById('eventLocation');
  const eventBloodTypes = document.getElementById('eventBloodTypes');
  const eventDescription = document.getElementById('eventDescription');

  const tableBody = document.getElementById('eventsTableBody');
  const eventSearch = document.getElementById('eventSearch');
  const statusFilter = document.getElementById('statusFilter');

  const totalEventsEl = document.getElementById('totalEvents');
  const upcomingEventsEl = document.getElementById('upcomingEvents');
  const registeredUsersEl = document.getElementById('registeredUsers');
  const targetUnitsEl = document.getElementById('targetUnits');

  const viewEventModal = document.getElementById('viewEventModal');
  const viewModalClose = document.getElementById('viewModalClose');
  const viewModalDoneBtn = document.getElementById('viewModalDoneBtn');

  const reportModal = document.getElementById('reportModal');
  const reportModalClose = document.getElementById('reportModalClose');
  const reportModalDoneBtn = document.getElementById('reportModalDoneBtn');

  let editRow = null;

  function formatDate(dateValue) {
    if (!dateValue) return '';

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return dateValue;
    }

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function makeEventId() {
    return `EVT-${Date.now().toString().slice(-5)}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function bloodTypeChips(typesText) {
    return typesText
      .split(',')
      .map(type => type.trim())
      .filter(Boolean)
      .map(type => `<span class="mini-chip">${escapeHtml(type)}</span>`)
      .join('');
  }

  function getQuotaNumbers(row) {
    const quotaText = row.children[4]?.textContent || '0 / 0';
    const match = quotaText.match(/(\d+)\s*\/\s*(\d+)/);

    return {
      registered: match ? parseInt(match[1], 10) : 0,
      target: match ? parseInt(match[2], 10) : 0
    };
  }

  function getRowData(row) {
    return {
      title: row.querySelector('.patient-name')?.textContent.trim() || '',
      id: row.querySelector('.patient-req')?.textContent.trim() || '',
      location: row.children[2]?.textContent.trim() || '',
      bloodTypes: Array.from(row.querySelectorAll('.mini-chip')).map(chip => chip.textContent.trim()).join(', '),
      status: row.dataset.status || 'Upcoming',
      date: row.dataset.date || '',
      time: row.dataset.time || '',
      description: row.dataset.description || '',
      registered: getQuotaNumbers(row).registered,
      quota: getQuotaNumbers(row).target
    };
  }

  function updateStats() {
    const rows = Array.from(document.querySelectorAll('#eventsTableBody tr'));

    const totalEvents = rows.length;
    const upcomingEvents = rows.filter(row => row.dataset.status === 'Upcoming').length;

    let totalRegistered = 0;
    let totalTarget = 0;

    rows.forEach(row => {
      const quota = getQuotaNumbers(row);
      totalRegistered += quota.registered;
      totalTarget += quota.target;
    });

    if (totalEventsEl) totalEventsEl.textContent = totalEvents;
    if (upcomingEventsEl) upcomingEventsEl.textContent = upcomingEvents;
    if (registeredUsersEl) registeredUsersEl.textContent = totalRegistered;
    if (targetUnitsEl) targetUnitsEl.textContent = totalTarget;
  }

  function saveEventsToLocalStorage() {
    const rows = Array.from(document.querySelectorAll('#eventsTableBody tr'));
    const events = rows.map(row => getRowData(row));
    localStorage.setItem('adminEvents', JSON.stringify(events));
  }

  function createEventRow(data) {
    const row = document.createElement('tr');

    row.dataset.status = data.status || 'Upcoming';
    row.dataset.date = data.date;
    row.dataset.time = data.time;
    row.dataset.description = data.description || '';

    const statusClass = (data.status || 'Upcoming').toLowerCase();

    let actionButtons = `
      <button class="icon-btn view-btn" type="button">View</button>
      <button class="icon-btn edit-btn" type="button">Edit</button>
      <button class="icon-btn close-btn" type="button">Close</button>
      <button class="icon-btn danger-btn" type="button">Cancel</button>
    `;

    if (data.status === 'Closed') {
      actionButtons = `
        <button class="icon-btn view-btn" type="button">View</button>
        <button class="icon-btn report-btn" type="button">Report</button>
      `;
    }

    if (data.status === 'Cancelled') {
      actionButtons = `
        <button class="icon-btn view-btn" type="button">View</button>
      `;
    }

    row.innerHTML = `
      <td>
        <div class="patient-name">${escapeHtml(data.title)}</div>
        <div class="patient-req">${escapeHtml(data.id)}</div>
      </td>
      <td>
        ${escapeHtml(formatDate(data.date))}<br>
        <span class="muted">${escapeHtml(data.time)}</span>
      </td>
      <td>${escapeHtml(data.location)}</td>
      <td>${bloodTypeChips(data.bloodTypes)}</td>
      <td><strong>${data.registered || 0} / ${escapeHtml(data.quota)}</strong></td>
      <td><span class="status-pill ${statusClass}">${escapeHtml(data.status || 'Upcoming')}</span></td>
      <td>
        <div class="action-row">
          ${actionButtons}
        </div>
      </td>
    `;

    attachRowActions(row);
    return row;
  }

  function loadEventsFromLocalStorage() {
    const savedEvents = JSON.parse(localStorage.getItem('adminEvents') || '[]');

    if (!savedEvents.length) {
      saveEventsToLocalStorage();
      return;
    }

    tableBody.innerHTML = '';

    savedEvents.forEach(event => {
      const row = createEventRow({
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        quota: event.quota,
        location: event.location,
        bloodTypes: event.bloodTypes,
        description: event.description,
        status: event.status,
        registered: event.registered
      });

      tableBody.appendChild(row);
    });

    updateStats();
  }

  function openModal(mode = 'create', row = null) {
    editRow = mode === 'edit' ? row : null;

    if (modalTitle) {
      modalTitle.textContent = mode === 'edit' ? 'Edit Event' : 'Create Event';
    }

    if (mode === 'create') {
      eventForm.reset();
    }

    if (mode === 'edit' && row) {
      const data = getRowData(row);

      eventTitle.value = data.title;
      eventDate.value = data.date;
      eventTime.value = data.time;
      eventLocation.value = data.location;
      eventQuota.value = data.quota || '';
      eventBloodTypes.value = data.bloodTypes;
      eventDescription.value = data.description || '';
    }

    eventModal.classList.add('show');
  }

  function closeModal() {
    eventModal.classList.remove('show');
    eventForm.reset();
    editRow = null;
  }

  function openViewModal(row) {
    const data = getRowData(row);
    const quota = getQuotaNumbers(row);

    document.getElementById('viewEventTitle').textContent = data.title;
    document.getElementById('viewEventId').textContent = data.id;
    document.getElementById('viewEventDate').textContent = formatDate(data.date);
    document.getElementById('viewEventTime').textContent = data.time || '-';
    document.getElementById('viewEventLocation').textContent = data.location || '-';
    document.getElementById('viewEventQuota').textContent = `${quota.registered} / ${quota.target}`;
    document.getElementById('viewEventStatus').textContent = data.status;
    document.getElementById('viewEventBloodTypes').textContent = data.bloodTypes || '-';
    document.getElementById('viewEventDescription').textContent = data.description || 'No description added.';

    viewEventModal.classList.add('show');
  }

  function closeViewModal() {
    viewEventModal?.classList.remove('show');
  }

  function openReportModal(row) {
    const data = getRowData(row);
    const quota = getQuotaNumbers(row);

    const registered = quota.registered;
    const target = quota.target;
    const collected = Math.min(registered, target);

    document.getElementById('reportEventTitle').textContent = `${data.title} Report`;
    document.getElementById('reportEventId').textContent = data.id;
    document.getElementById('reportStatus').textContent = data.status;
    document.getElementById('reportDate').textContent = formatDate(data.date);
    document.getElementById('reportRegistered').textContent = registered;
    document.getElementById('reportTarget').textContent = target;
    document.getElementById('reportCollected').textContent = `${collected} units`;
    document.getElementById('reportBloodTypes').textContent = data.bloodTypes || '-';

    document.getElementById('reportSummary').textContent =
      `${data.title} was closed after receiving ${registered} registrations out of a target quota of ${target}. This frontend report represents the post-event summary for admin review.`;

    reportModal?.classList.add('show');
  }

  function closeReportModal() {
    reportModal?.classList.remove('show');
  }

  function updateExistingRow(row, data) {
    row.dataset.date = data.date;
    row.dataset.time = data.time;
    row.dataset.description = data.description || '';

    row.querySelector('.patient-name').textContent = data.title;

    row.children[1].innerHTML = `
      ${escapeHtml(formatDate(data.date))}<br>
      <span class="muted">${escapeHtml(data.time)}</span>
    `;

    row.children[2].textContent = data.location;
    row.children[3].innerHTML = bloodTypeChips(data.bloodTypes);

    const currentRegistered = getQuotaNumbers(row).registered;
    row.children[4].innerHTML = `<strong>${currentRegistered} / ${escapeHtml(data.quota)}</strong>`;
  }

  function setRowStatus(row, status) {
    row.dataset.status = status;

    const statusPill = row.querySelector('.status-pill');
    statusPill.textContent = status;
    statusPill.className = `status-pill ${status.toLowerCase()}`;

    const actionCell = row.querySelector('.action-row');

    if (status === 'Cancelled') {
      actionCell.innerHTML = `
        <button class="icon-btn view-btn" type="button">View</button>
      `;
    }

    if (status === 'Closed') {
      actionCell.innerHTML = `
        <button class="icon-btn view-btn" type="button">View</button>
        <button class="icon-btn report-btn" type="button">Report</button>
      `;
    }

    attachRowActions(row);
    updateStats();
    applyFilters(false);
    saveEventsToLocalStorage();
  }

  function attachRowActions(row) {
    const viewBtn = row.querySelector('.view-btn');
    const editBtn = row.querySelector('.edit-btn');
    const cancelBtn = row.querySelector('.danger-btn');
    const closeBtn = row.querySelector('.close-btn');
    const reportBtn = row.querySelector('.report-btn');

    viewBtn?.addEventListener('click', () => {
      openViewModal(row);
    });

    editBtn?.addEventListener('click', () => {
      openModal('edit', row);
    });

    closeBtn?.addEventListener('click', () => {
      const title = row.querySelector('.patient-name')?.textContent.trim();

      showConfirm(
        `Close "${title}" and generate post-event report option?`,
        () => {
          setRowStatus(row, 'Closed');
          showToast('Event closed successfully.', 'success');
        },
        'Close Event'
      );
    });

    cancelBtn?.addEventListener('click', () => {
      const title = row.querySelector('.patient-name')?.textContent.trim();

      showConfirm(
        `Cancel "${title}"? Registered users should be notified.`,
        () => {
          setRowStatus(row, 'Cancelled');
          showToast('Event cancelled successfully.', 'danger');
        },
        'Cancel Event'
      );
    });

    reportBtn?.addEventListener('click', () => {
      openReportModal(row);
    });
  }

  createEventBtn?.addEventListener('click', () => {
    openModal('create');
  });

  modalClose?.addEventListener('click', closeModal);
  cancelModalBtn?.addEventListener('click', closeModal);

  eventModal?.addEventListener('click', (e) => {
    if (e.target === eventModal) closeModal();
  });

  viewModalClose?.addEventListener('click', closeViewModal);
  viewModalDoneBtn?.addEventListener('click', closeViewModal);

  viewEventModal?.addEventListener('click', (e) => {
    if (e.target === viewEventModal) closeViewModal();
  });

  reportModalClose?.addEventListener('click', closeReportModal);
  reportModalDoneBtn?.addEventListener('click', closeReportModal);

  reportModal?.addEventListener('click', (e) => {
    if (e.target === reportModal) closeReportModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (eventModal?.classList.contains('show')) closeModal();
      if (viewEventModal?.classList.contains('show')) closeViewModal();
      if (reportModal?.classList.contains('show')) closeReportModal();

      const confirmModal = document.getElementById('confirmModal');
      if (confirmModal?.classList.contains('show')) {
        confirmModal.classList.remove('show');
      }
    }
  });

  /* ──────────────────────────────────────────────────────────
     API HELPERS
  ────────────────────────────────────────────────────────── */
  const API = '/api/events';
  const token = localStorage.getItem('token') || '';

  function apiFetch(url, options = {}) {
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options.headers || {})
      }
    });
  }

  /* ──────────────────────────────────────────────────────────
     LOAD EVENTS FROM BACKEND  (replaces loadEventsFromLocalStorage)
  ────────────────────────────────────────────────────────── */
  async function loadEventsFromAPI() {
    try {
      const res = await apiFetch(`${API}?all=1`);
      if (!res.ok) throw new Error('Failed to load events');
      const { events } = await res.json();

      tableBody.innerHTML = '';

      if (!events || events.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:#9CA3AF;">No events yet. Click "Create Event" to add one.</td></tr>`;
        updateStats();
        return;
      }

      events.forEach(event => {
        const row = createEventRow({
          dbId:        event.id,
          id:          `EVT-${String(event.id).padStart(3, '0')}`,
          title:       event.title,
          date:        event.event_date,
          time:        event.event_time,
          quota:       event.quota,
          location:    event.location,
          bloodTypes:  event.blood_types,
          description: event.description,
          status:      event.status,
          registered:  event.registered
        });
        tableBody.appendChild(row);
      });

      updateStats();
    } catch (err) {
      console.error('[EVENTS] Load failed:', err.message);
      showToast('Failed to load events from server.', 'danger');
    }
  }

  /* ──────────────────────────────────────────────────────────
     FORM SUBMIT — Create or Update via API
  ────────────────────────────────────────────────────────── */
  eventForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title       = eventTitle.value.trim();
    const date        = eventDate.value;
    const time        = eventTime.value.trim();
    const quota       = eventQuota.value.trim();
    const location    = eventLocation.value.trim();
    const bloodTypes  = eventBloodTypes.value.trim();
    const description = eventDescription.value.trim();

    if (!title || !date || !time || !quota || !location || !bloodTypes) {
      showToast('Please fill all required event fields.', 'warning');
      return;
    }
    if (Number(quota) <= 0) {
      showToast('Target quota must be greater than 0.', 'warning');
      return;
    }

    const body = {
      title,
      event_date:  date,
      event_time:  time,
      location,
      blood_types: bloodTypes,
      quota:       Number(quota),
      description
    };

    try {
      let res;
      if (editRow) {
        const dbId = editRow.dataset.dbId;
        res = await apiFetch(`${API}/${dbId}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        res = await apiFetch(API, { method: 'POST', body: JSON.stringify(body) });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save event');
      }

      showToast(editRow ? 'Event updated successfully.' : 'Event created successfully.', 'success');
      closeModal();
      await loadEventsFromAPI();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  /* ──────────────────────────────────────────────────────────
     STATUS CHANGE via API  (Close / Cancel)
  ────────────────────────────────────────────────────────── */
  async function apiSetStatus(row, status) {
    const dbId = row.dataset.dbId;
    try {
      const res = await apiFetch(`${API}/${dbId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed');
      showToast(`Event ${status.toLowerCase()} successfully.`, status === 'Cancelled' ? 'danger' : 'success');
      await loadEventsFromAPI();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  /* ──────────────────────────────────────────────────────────
     OVERRIDDEN: attachRowActions — use apiSetStatus for Close/Cancel
  ────────────────────────────────────────────────────────── */
  function attachRowActionsAPI(row) {
    row.querySelector('.view-btn')?.addEventListener('click', () => openViewModal(row));
    row.querySelector('.edit-btn')?.addEventListener('click', () => openModal('edit', row));
    row.querySelector('.report-btn')?.addEventListener('click', () => openReportModal(row));

    row.querySelector('.close-btn')?.addEventListener('click', () => {
      const title = row.querySelector('.patient-name')?.textContent.trim();
      showConfirm(
        `Close "${title}" and generate post-event report option?`,
        () => apiSetStatus(row, 'Closed'),
        'Close Event'
      );
    });

    row.querySelector('.danger-btn')?.addEventListener('click', () => {
      const title = row.querySelector('.patient-name')?.textContent.trim();
      showConfirm(
        `Cancel "${title}"? Registered users should be notified.`,
        () => apiSetStatus(row, 'Cancelled'),
        'Cancel Event'
      );
    });
  }

  /* ──────────────────────────────────────────────────────────
     PATCH createEventRow to also store dbId and use API handlers
  ────────────────────────────────────────────────────────── */
  const _origCreate = createEventRow;
  // Monkey-patch: after the original creates the row, store dbId + re-attach API listeners
  // (original createEventRow still handles rendering — we just swap the listeners)

  /* ──────────────────────────────────────────────────────────
     FILTER
  ────────────────────────────────────────────────────────── */
  function applyFilters(showNoResultToast = true) {
    const search = eventSearch ? eventSearch.value.toLowerCase().trim() : '';
    const status = statusFilter ? statusFilter.value : '';
    const rows = Array.from(document.querySelectorAll('#eventsTableBody tr'));
    let visible = 0;
    rows.forEach(row => {
      const text      = row.textContent.toLowerCase();
      const rowStatus = row.dataset.status;
      const searchMatch = !search || text.includes(search);
      const statusMatch = !status || rowStatus === status;
      const shouldShow  = searchMatch && statusMatch;
      row.style.display = shouldShow ? '' : 'none';
      if (shouldShow) visible++;
    });
    if (visible === 0 && showNoResultToast) showToast('No matching events found.', 'info');
  }

  eventSearch?.addEventListener('input',  () => applyFilters(false));
  statusFilter?.addEventListener('change', () => applyFilters(false));

  /* ──────────────────────────────────────────────────────────
     BOOT
  ────────────────────────────────────────────────────────── */
  // Override createEventRow to store dbId and use API-aware action listeners
  const origCreateEventRow = createEventRow;
  window._createEventRow = function(data) {
    const row = origCreateEventRow(data);
    if (data.dbId) row.dataset.dbId = data.dbId;
    // Remove old listeners by cloning action buttons, then reattach with API versions
    const actionRow = row.querySelector('.action-row');
    if (actionRow) {
      const newActionRow = actionRow.cloneNode(true);
      actionRow.replaceWith(newActionRow);
    }
    attachRowActionsAPI(row);
    return row;
  };

  // Swap createEventRow globally so loadEventsFromAPI uses the API version
  window.createEventRow = window._createEventRow;

  loadEventsFromAPI();
});

document.getElementById('admin-dashboard').addEventListener('click', () => {
  window.location.href = '/adminDashboard';
});

document.getElementById('pending-requests').addEventListener('click', () => {
  window.location.href = '/pendingRequests';
});

document.getElementById('admin-notifications').addEventListener('click', () => {
  window.location.href = '/adminNotification';
});

document.getElementById('user-management').addEventListener('click', () => {
  window.location.href = '/adminUserManagement';
});

document.getElementById('admin-profile').addEventListener('click', () => {
  window.location.href = '/adminProfile';
});