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

  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');

      if (href && href !== '#') {
        return;
      }

      e.preventDefault();

      const label = link.textContent.trim().replace(/\s+/g, ' ');
      showToast(`${label} — coming soon!`, 'info');
    });
  });

  const requestSearch = document.getElementById('requestSearch');
  const urgencyFilter = document.getElementById('urgencyFilter');
  const statusFilter = document.getElementById('statusFilter');

  const requestModal = document.getElementById('requestModal');
  const modalClose = document.getElementById('modalClose');
  const modalDoneBtn = document.getElementById('modalDoneBtn');

  function getRows() {
    return Array.from(document.querySelectorAll('#requestsBody tr'));
  }

  function getRowData(row) {
    return {
      id: row.dataset.id,
      facility: row.dataset.facility,
      type: row.dataset.type,
      urgency: row.dataset.urgency,
      units: Number(row.dataset.units),
      status: row.dataset.status
    };
  }

  function saveRequestsToLocalStorage() {
    const requests = getRows().map(row => getRowData(row));
    localStorage.setItem('adminPendingRequests', JSON.stringify(requests));
  }

  function loadRequestsFromLocalStorage() {
    const savedRequests = JSON.parse(localStorage.getItem('adminPendingRequests') || '[]');

    if (!savedRequests.length) {
      saveRequestsToLocalStorage();
      return;
    }

    savedRequests.forEach(saved => {
      const row = document.querySelector(`#requestsBody tr[data-id="${saved.id}"]`);

      if (!row) return;

      row.dataset.status = saved.status;

      const statusPill = row.querySelector('.status-pill');
      statusPill.textContent = saved.status;
      statusPill.className = `status-pill ${saved.status.toLowerCase()}`;

      updateActionButtons(row, saved.status);
    });
  }

  function updateStats() {
    const rows = getRows();

    const pending = rows.filter(row => row.dataset.status === 'Pending').length;
    const approved = rows.filter(row => row.dataset.status === 'Approved').length;
    const critical = rows.filter(row => row.dataset.urgency === 'Critical' && row.dataset.status === 'Pending').length;
    const units = rows
      .filter(row => row.dataset.status === 'Pending')
      .reduce((total, row) => total + Number(row.dataset.units), 0);

    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('approvedCount').textContent = approved;
    document.getElementById('criticalCount').textContent = critical;
    document.getElementById('unitCount').textContent = units;
    document.getElementById('pendingBadge').textContent = pending;
  }

  function updateActionButtons(row, status) {
    const actionCell = row.querySelector('.action-row');

    if (status === 'Pending') {
      actionCell.innerHTML = `
        <button class="icon-btn view-btn" type="button">View</button>
        <button class="icon-btn approve-btn" type="button">Approve</button>
        <button class="icon-btn danger-btn reject-btn" type="button">Reject</button>
      `;
    }

    if (status === 'Approved') {
      actionCell.innerHTML = `
        <button class="icon-btn view-btn" type="button">View</button>
        <button class="icon-btn fulfill-btn" type="button">Fulfill</button>
      `;
    }

    if (status === 'Rejected' || status === 'Fulfilled') {
      actionCell.innerHTML = `
        <button class="icon-btn view-btn" type="button">View</button>
      `;
    }

    attachRowActions(row);
  }

  function setStatus(row, status) {
    row.dataset.status = status;

    const statusPill = row.querySelector('.status-pill');
    statusPill.textContent = status;
    statusPill.className = `status-pill ${status.toLowerCase()}`;

    updateActionButtons(row, status);
    updateStats();
    applyFilters(false);
    saveRequestsToLocalStorage();
  }

  function openRequestModal(row) {
    const data = getRowData(row);

    document.getElementById('modalFacility').textContent = data.facility;
    document.getElementById('modalRequestId').textContent = `Request #${data.id}`;
    document.getElementById('modalBloodType').textContent = data.type;
    document.getElementById('modalUrgency').textContent = data.urgency;
    document.getElementById('modalUnits').textContent = `${data.units} Unit${data.units > 1 ? 's' : ''}`;
    document.getElementById('modalStatus').textContent = data.status;

    document.getElementById('modalNote').textContent =
      `${data.facility} has requested ${data.units} unit${data.units > 1 ? 's' : ''} of ${data.type} blood. Current urgency level is ${data.urgency}. Admin should check blood availability and update the request status accordingly.`;

    requestModal.classList.add('show');
  }

  function closeRequestModal() {
    requestModal.classList.remove('show');
  }

  function attachRowActions(row) {
    row.querySelector('.view-btn')?.addEventListener('click', () => {
      openRequestModal(row);
    });

    row.querySelector('.approve-btn')?.addEventListener('click', () => {
      setStatus(row, 'Approved');
      showToast('Request approved successfully.', 'success');
    });

    row.querySelector('.reject-btn')?.addEventListener('click', () => {
      setStatus(row, 'Rejected');
      showToast('Request rejected.', 'danger');
    });

    row.querySelector('.fulfill-btn')?.addEventListener('click', () => {
      setStatus(row, 'Fulfilled');
      showToast('Request marked as fulfilled.', 'success');
    });
  }

  function applyFilters(showToastIfEmpty = true) {
    const search = requestSearch.value.toLowerCase().trim();
    const urgency = urgencyFilter.value;
    const status = statusFilter.value;

    let visible = 0;

    getRows().forEach(row => {
      const data = getRowData(row);

      const searchMatch =
        !search ||
        data.facility.toLowerCase().includes(search) ||
        data.id.toLowerCase().includes(search) ||
        data.type.toLowerCase().includes(search);

      const urgencyMatch = !urgency || data.urgency === urgency;
      const statusMatch = !status || data.status === status;

      const shouldShow = searchMatch && urgencyMatch && statusMatch;
      row.style.display = shouldShow ? '' : 'none';

      if (shouldShow) visible++;
    });

    if (visible === 0 && showToastIfEmpty) {
      showToast('No matching requests found.', 'info');
    }
  }

  modalClose?.addEventListener('click', closeRequestModal);
  modalDoneBtn?.addEventListener('click', closeRequestModal);

  requestModal?.addEventListener('click', (e) => {
    if (e.target === requestModal) closeRequestModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && requestModal.classList.contains('show')) {
      closeRequestModal();
    }
  });

  requestSearch?.addEventListener('input', () => applyFilters(false));
  urgencyFilter?.addEventListener('change', () => applyFilters(false));
  statusFilter?.addEventListener('change', () => applyFilters(false));

  loadRequestsFromLocalStorage();

  getRows().forEach(row => {
    attachRowActions(row);
  });

  updateStats();
});