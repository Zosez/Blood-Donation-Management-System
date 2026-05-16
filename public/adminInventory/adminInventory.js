/* ═══════════════════════════════════════════
   LIFELINK ADMIN — adminInventory.js
   Design system aligned with adminDashboard
═══════════════════════════════════════════ */

const statsData = [
  {
    id: "urgent-requests",
    label: "URGENT REQUESTS",
    value: 24,
    chip: "+12% VS LAST HR",
    chipClass: "stat-chip--red",
    iconClass: "stat-icon--red",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  },
  {
    id: "waiting-period",
    label: "WAITING PERIOD",
    value: "08:42",
    chip: "AVG 14M",
    chipClass: "stat-chip--amber",
    iconClass: "stat-icon--amber",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  },
  {
    id: "hospital-hubs",
    label: "HOSPITAL HUBS",
    value: 42,
    chip: "9 ACTIVE",
    chipClass: "stat-chip--grey",
    iconClass: "stat-icon--blue",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
  },
  {
    id: "fulfillment-rate",
    label: "FULFILLMENT RATE",
    value: 112,
    chip: "98.2%",
    chipClass: "stat-chip--green",
    iconClass: "stat-icon--green",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  },
];

const initialRequests = [
  {
    reqId: "DON-8821", facility: "John Doe", facilitySub: "First-time Donor", bloodType: "O+",
    status: "PENDING", statusClass: "status-high", time: "Oct 24, 2026"
  },
  {
    reqId: "DON-8820", facility: "Sarah Connor", facilitySub: "Regular Donor", bloodType: "A-",
    status: "SCHEDULED", statusClass: "status-routine", time: "Oct 24, 2026"
  },
  {
    reqId: "DON-8819", facility: "Michael Smith", facilitySub: "O- Universal", bloodType: "O-",
    status: "URGENT NEED", statusClass: "status-critical", time: "Oct 25, 2026"
  },
  {
    reqId: "DON-8818", facility: "Emily Davis", facilitySub: "Regular Donor", bloodType: "AB+",
    status: "PENDING", statusClass: "status-high", time: "Oct 25, 2026"
  },
  {
    reqId: "DON-8817", facility: "David Wilson", facilitySub: "First-time Donor", bloodType: "A+",
    status: "SCHEDULED", statusClass: "status-routine", time: "Oct 26, 2026"
  },
  {
    reqId: "DON-8816", facility: "Jessica Brown", facilitySub: "Regular Donor", bloodType: "B-",
    status: "SCHEDULED", statusClass: "status-routine", time: "Oct 26, 2026"
  },
  {
    reqId: "DON-8815", facility: "Daniel Johnson", facilitySub: "AB- Rare", bloodType: "AB-",
    status: "URGENT NEED", statusClass: "status-critical", time: "Oct 27, 2026"
  },
  {
    reqId: "DON-8814", facility: "Ashley Williams", facilitySub: "Regular Donor", bloodType: "B+",
    status: "PENDING", statusClass: "status-high", time: "Oct 27, 2026"
  }
];

const inventoryData = [
  { type: "A+", units: 145 },
  { type: "A-", units: 24 },
  { type: "B+", units: 89 },
  { type: "B-", units: 12 },
  { type: "AB+", units: 56 },
  { type: "AB-", units: 8 },
  { type: "O+", units: 210 },
  { type: "O-", units: 45 }
];

const logsData = [
  {
    iconClass: "log-icon-red",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
    title: "Request REQ-8815 Fulfilled",
    desc: "Batch 042X (O+) delivered to City Clinic.",
    time: "2 mins ago"
  },
  {
    iconClass: "log-icon-blue",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>`,
    title: "Inventory Synced",
    desc: "Global registry updated with 12 new donations.",
    time: "14 mins ago"
  },
  {
    iconClass: "log-icon-amber",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    title: "Low Stock Alert: AB-",
    desc: "Regional reserve dropped below safety threshold.",
    time: "42 mins ago"
  }
];

/* ── STATE ── */
let currentRequests = [...initialRequests];
let currentFilter = "All Types";

/* ── TOAST ── */
let toastTimeout;
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 3000);
}

/* ── RENDER STATS ── */
function renderStats() {
  const grid = document.getElementById("statsGrid");
  if (!grid) return;
  grid.innerHTML = statsData.map((s) => `
    <div class="stat-card">
      <div class="stat-card-top">
        <div class="stat-icon ${s.iconClass}">${s.icon}</div>
        <span class="stat-chip ${s.chipClass}">${s.chip}</span>
      </div>
      <div class="stat-label">${s.label}</div>
      <div class="stat-value">${s.value}</div>
    </div>
  `).join("");

  document.querySelectorAll(".stat-card").forEach((card, i) => {
    card.addEventListener("click", () => showToast(`${statsData[i].label}: ${statsData[i].value}`));
  });
}

/* ── RENDER INVENTORY ── */
function renderInventory() {
  const grid = document.getElementById("inventoryGrid");
  if (!grid) return;
  grid.innerHTML = inventoryData.map(item => `
    <div class="inventory-item">
      <div class="inventory-item-title">${item.type}</div>
      <div class="inventory-item-count">${item.units}</div>
      <div class="inventory-item-label">Units Available</div>
    </div>
  `).join("");
}

/* ── RENDER REQUESTS ── */
function renderRequests() {
  const tbody = document.getElementById("requestsBody");
  if (!tbody) return;

  const filtered = currentRequests.filter(r =>
    currentFilter === "All Types" || r.bloodType === currentFilter
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-hint);font-family:'Inter',sans-serif;">No donor requests found matching your filters.</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map((r) => `
      <tr>
        <td class="td-req-id">${r.reqId}</td>
        <td>
          <div class="td-facility">${r.facility}</div>
          <div class="td-facility-sub">${r.facilitySub}</div>
        </td>
        <td><span class="blood-type-box">${r.bloodType}</span></td>
        <td>
          <div class="status-cell ${r.statusClass}">
            <div class="status-dot"></div>
            ${r.status}
          </div>
        </td>
        <td class="time-cell">${r.time}</td>
        <td class="action-cell">
          <button class="btn-action btn-action-green" data-id="${r.reqId}" data-action="Approve">Approve</button>
          <button class="btn-action btn-action-blue"  data-id="${r.reqId}" data-action="View">View</button>
          <button class="btn-action btn-action-red"   data-id="${r.reqId}" data-action="Reject">Reject</button>
        </td>
      </tr>
    `).join("");
  }

  document.querySelectorAll(".btn-action").forEach(btn => {
    btn.addEventListener("click", handleActionClick);
  });

  const footerInfo = document.querySelector(".table-info");
  if (footerInfo) {
    footerInfo.textContent = `Showing ${filtered.length} of ${currentRequests.length} donor requests`;
  }
}

function handleActionClick(e) {
  const reqId = e.target.getAttribute("data-id");
  const action = e.target.getAttribute("data-action");
  if (action === "View") { showToast(`Viewing details for donor ${reqId}`); return; }
  currentRequests = currentRequests.filter(r => r.reqId !== reqId);
  showToast(`${action} successful for donor ${reqId}`);
  renderRequests();
  renderStats();
}

/* ── RENDER LOGS ── */
function renderLogs() {
  const list = document.getElementById("logList");
  if (!list) return;
  list.innerHTML = logsData.map((l) => `
    <div class="log-item">
      <div class="log-icon ${l.iconClass}">${l.icon}</div>
      <div class="log-content">
        <div class="log-title">${l.title}</div>
        <div class="log-desc">${l.desc}</div>
        <div class="log-time">${l.time}</div>
      </div>
    </div>
  `).join("");
}

/* ── NAV SIDEBAR ── */
function initNav() {
  document.querySelectorAll(".sidebar-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".sidebar-link").forEach(n => n.classList.remove("active"));
      link.classList.add("active");
      // Close sidebar on mobile after navigation
      document.getElementById("sidebar")?.classList.remove("open");
      document.getElementById("sidebarOverlay")?.classList.remove("active");
    });
  });

  // Page routing — mirrors adminDashboard.js pattern
  document.getElementById("nav-dashboard")?.addEventListener("click", () => {
    window.location.href = '/adminDashboard';
  });
  document.getElementById("nav-pending")?.addEventListener("click", () => {
    window.location.href = '/pendingRequests';
  });
  document.getElementById("nav-notifications")?.addEventListener("click", () => {
    window.location.href = '/adminNotification';
  });
  document.getElementById("nav-users")?.addEventListener("click", () => {
    window.location.href = '/adminUsers';
  });
  document.getElementById("nav-events")?.addEventListener("click", () => {
    window.location.href = '/adminEvents';
  });
  document.getElementById("nav-profile")?.addEventListener("click", () => {
    window.location.href = '/adminProfile';
  });
}

/* ── MOBILE SIDEBAR ── */
function initMobileSidebar() {
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const sidebar = document.getElementById("sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");

  if (mobileMenuBtn && sidebar && sidebarOverlay) {
    mobileMenuBtn.addEventListener("click", () => {
      sidebar.classList.add("open");
      sidebarOverlay.classList.add("active");
    });
    sidebarOverlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      sidebarOverlay.classList.remove("active");
    });
  }
}

/* ── NAVBAR AVATAR DROPDOWN ── */
function initAvatarDropdown() {
  const navAvatar = document.getElementById("navAvatar");
  const avatarDropdown = document.getElementById("avatarDropdown");

  if (navAvatar && avatarDropdown) {
    navAvatar.addEventListener("click", (e) => {
      e.stopPropagation();
      avatarDropdown.classList.toggle("show");
    });
    document.addEventListener("click", (e) => {
      if (!navAvatar.contains(e.target) && !avatarDropdown.contains(e.target)) {
        avatarDropdown.classList.remove("show");
      }
    });
  }

  document.getElementById("dropdownLogoutBtn")?.addEventListener("click", () => {
    avatarDropdown?.classList.remove("show");
    showToast("Logging out…");
    setTimeout(() => { window.location.href = '/login'; }, 1500);
  });
}

/* ── INTERACTIVITY ── */
function initInteractivity() {
  // Blood group filter chips
  document.querySelectorAll(".table-tabs .chip").forEach(chip => {
    chip.addEventListener("click", (e) => {
      document.querySelectorAll(".table-tabs .chip").forEach(c => {
        c.classList.remove("chip-red-solid");
        c.classList.add("chip-grey");
      });
      e.target.classList.remove("chip-grey");
      e.target.classList.add("chip-red-solid");
      currentFilter = e.target.textContent;
      renderRequests();
    });
  });

  // Sort toggle
  const sortBtn = document.querySelector(".table-sort");
  let sortAsc = true;
  sortBtn?.addEventListener("click", () => {
    sortAsc = !sortAsc;
    currentRequests.reverse();
    renderRequests();
    showToast(sortAsc ? "Sorted: High to Low" : "Sorted: Low to High");
  });

  // Emergency modal
  const emergencyBtn = document.getElementById("emergencyAlertBtn");
  const modalOverlay = document.getElementById("emergencyModal");
  const cancelBtn = document.getElementById("cancelBroadcast");
  const confirmBtn = document.getElementById("confirmBroadcast");

  emergencyBtn?.addEventListener("click", () => modalOverlay?.classList.add("show"));
  cancelBtn?.addEventListener("click", () => modalOverlay?.classList.remove("show"));
  confirmBtn?.addEventListener("click", () => {
    modalOverlay?.classList.remove("show");
    showToast("🚨 Emergency broadcast sent to all donors!");
  });

  // Bell
  document.getElementById("navBellBtn")?.addEventListener("click", () => {
    showToast("Opening notifications…");
  });

  // Pagination
  document.querySelectorAll(".page-btn").forEach(btn => {
    btn.addEventListener("click", () => showToast(btn.textContent === "‹" ? "Previous page…" : "Next page…"));
  });

  // System history
  document.querySelector(".btn-secondary-outline")?.addEventListener("click", () => {
    showToast("Loading full system history…");
  });
}

/* ── INIT ── */
document.addEventListener("DOMContentLoaded", () => {
  renderStats();
  renderInventory();
  renderRequests();
  renderLogs();
  initNav();
  initMobileSidebar();
  initAvatarDropdown();
  initInteractivity();

  // Welcome toast — matches dashboard pattern
  setTimeout(() => showToast("Inventory data loaded successfully."), 800);
});
