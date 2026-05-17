/**
 * notificationWidget.js — Shared dynamic notification panel
 * Drop this script into any user-facing page that has:
 *   <div class="notif-wrapper">
 *     <button class="nav-bell" id="notifBtn">…</button>
 *   </div>
 *
 * The widget will inject the panel HTML and handle all logic.
 */

(function () {
  /* ── 1. Inject scoped CSS (once) ── */
  if (!document.getElementById('ll-notif-styles')) {
    const style = document.createElement('style');
    style.id = 'll-notif-styles';
    style.textContent = `
      .notif-wrapper { position: relative; }

      .notif-dot {
        display: none;
        position: absolute;
        top: 2px; right: 2px;
        min-width: 16px; height: 16px;
        background: #C0281C;
        color: #fff;
        font-size: 9px;
        font-weight: 700;
        font-family: 'Sora', sans-serif;
        border-radius: 50px;
        align-items: center;
        justify-content: center;
        padding: 0 3px;
        line-height: 1;
        pointer-events: none;
        z-index: 2;
      }
      .notif-dot.visible { display: flex; }

      .notif-dropdown {
        position: absolute;
        top: calc(100% + 10px);
        right: 0;
        width: 320px;
        background: #fff;
        border: 1px solid #E5E7EB;
        border-radius: 14px;
        box-shadow: 0 12px 32px rgba(0,0,0,.12);
        z-index: 1200;
        overflow: hidden;
        opacity: 0;
        pointer-events: none;
        transform: translateY(8px);
        transition: opacity .22s ease, transform .22s ease;
      }
      .notif-dropdown.open {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0);
      }

      .notif-panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 16px 12px;
        border-bottom: 1px solid #F3F4F6;
        font-family: 'Sora', sans-serif;
        font-weight: 700;
        font-size: .88rem;
        color: #111827;
      }
      .notif-panel-header-right {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .notif-mark-all-btn {
        font-size: .7rem;
        font-weight: 600;
        color: #C0281C;
        background: none;
        border: none;
        cursor: pointer;
        font-family: 'Inter', sans-serif;
        padding: 0;
        opacity: 0;
        pointer-events: none;
        transition: opacity .2s;
      }
      .notif-mark-all-btn.visible { opacity: 1; pointer-events: auto; }

      .notif-close-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: #9CA3AF;
        display: flex;
        align-items: center;
        padding: 2px;
        transition: color .15s;
      }
      .notif-close-btn:hover { color: #374151; }

      .ll-notif-list {
        list-style: none;
        margin: 0; padding: 0;
        max-height: 340px;
        overflow-y: auto;
      }
      .ll-notif-list::-webkit-scrollbar { width: 4px; }
      .ll-notif-list::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 4px; }

      .ll-notif-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 12px 16px;
        border-bottom: 1px solid #F9FAFB;
        cursor: pointer;
        transition: background .15s;
      }
      .ll-notif-item:last-child { border-bottom: none; }
      .ll-notif-item:hover { background: #F9FAFB; }
      .ll-notif-item.unread { background: #FEF9F9; }
      .ll-notif-item.unread:hover { background: #FEF2F2; }

      .ll-notif-icon {
        width: 28px; height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-top: 1px;
      }
      .ll-notif-icon.red    { background: #FEF2F2; }
      .ll-notif-icon.green  { background: #F0FDF4; }
      .ll-notif-icon.orange { background: #FFF7ED; }
      .ll-notif-icon.grey   { background: #F3F4F6; }

      .ll-notif-text {
        font-size: .8rem;
        font-weight: 500;
        color: #374151;
        line-height: 1.45;
        margin: 0 0 3px;
        font-family: 'Inter', sans-serif;
      }
      .ll-notif-item.unread .ll-notif-text { font-weight: 600; color: #111827; }

      .ll-notif-time {
        font-size: .7rem;
        color: #9CA3AF;
        margin: 0;
        font-family: 'Inter', sans-serif;
      }

      .ll-notif-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2.5rem 1rem;
        color: #9CA3AF;
        font-size: .82rem;
        font-family: 'Inter', sans-serif;
        gap: 6px;
        text-align: center;
      }
    `;
    document.head.appendChild(style);
  }

  /* ── 2. Icons & colours per notification type ── */
  const ICONS = {
    blood_request:      `<svg width="14" height="16" viewBox="0 0 18 22" fill="none"><path d="M9 1C9 1 1 9.5 1 14.5a8 8 0 0 0 16 0C17 9.5 9 1 9 1z" fill="#C0281C"/></svg>`,
    donation_completed: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    donor_approved:     `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    donor_rejected:     `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C0281C" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    donation_accepted:  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    default:            `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };
  const COLORS = {
    blood_request: 'red', donation_completed: 'green', donor_approved: 'green',
    donor_rejected: 'red', donation_accepted: 'orange', default: 'grey',
  };

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr);
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return d === 1 ? 'Yesterday' : `${d} days ago`;
  }

  /* ── 3. Build & inject panel HTML into .notif-wrapper ── */
  function initWidget() {
    const wrapper = document.querySelector('.notif-wrapper');
    const bellBtn = document.getElementById('notifBtn') || document.querySelector('.nav-bell');
    if (!wrapper || !bellBtn) return;

    // Ensure bell has id
    if (!bellBtn.id) bellBtn.id = 'notifBtn';

    // Inject unread dot into bell if not present
    if (!bellBtn.querySelector('.notif-dot')) {
      const dot = document.createElement('span');
      dot.className = 'notif-dot';
      bellBtn.appendChild(dot);
    }

    // Remove any existing static notif-dropdown (replace with dynamic one)
    const existingPanel = document.getElementById('notifPanel') || wrapper.querySelector('.notif-dropdown');
    if (existingPanel) existingPanel.remove();

    // Create panel
    const panel = document.createElement('div');
    panel.className = 'notif-dropdown';
    panel.id = 'notifPanel';
    panel.innerHTML = `
      <div class="notif-panel-header">
        <span>Notifications</span>
        <div class="notif-panel-header-right">
          <button class="notif-mark-all-btn" id="notifMarkAll">Mark all read</button>
          <button class="notif-close-btn" id="notifClose" aria-label="Close notifications">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
      <ul class="ll-notif-list" id="llNotifList">
        <li class="ll-notif-empty"><span>Loading…</span></li>
      </ul>
    `;
    wrapper.appendChild(panel);

    /* ── 4. Wire up state & logic ── */
    const notifDot   = bellBtn.querySelector('.notif-dot');
    const notifList  = panel.querySelector('#llNotifList');
    const markAllBtn = panel.querySelector('#notifMarkAll');
    const closeBtn   = panel.querySelector('#notifClose');
    let loaded       = false;

    function updateBadge(count) {
      if (count > 0) {
        notifDot.textContent = count > 9 ? '9+' : String(count);
        notifDot.classList.add('visible');
        markAllBtn?.classList.add('visible');
      } else {
        notifDot.classList.remove('visible');
        markAllBtn?.classList.remove('visible');
      }
    }

    function renderList(notifications) {
      if (!notifications.length) {
        notifList.innerHTML = `
          <li class="ll-notif-empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" stroke-width="1.5"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            No notifications yet
          </li>`;
        return;
      }
      notifList.innerHTML = notifications.map(n => {
        const type   = n.type || 'default';
        const icon   = ICONS[type] || ICONS.default;
        const color  = COLORS[type] || 'grey';
        const unread = !n.is_read ? ' unread' : '';
        return `<li class="ll-notif-item${unread}" data-id="${n.id}">
          <span class="ll-notif-icon ${color}">${icon}</span>
          <div>
            <p class="ll-notif-text">${n.message || n.title || ''}</p>
            <p class="ll-notif-time">${timeAgo(n.created_at)}</p>
          </div>
        </li>`;
      }).join('');

      notifList.querySelectorAll('.ll-notif-item[data-id]').forEach(li => {
        li.addEventListener('click', () => markOneRead(li.dataset.id, li));
      });
    }

    async function fetchNotifications() {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res  = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('failed');
        const data = await res.json();
        const list = data.notifications || [];
        renderList(list);
        updateBadge(list.filter(n => !n.is_read).length);
        loaded = true;
      } catch {
        if (!loaded) notifList.innerHTML = `<li class="ll-notif-empty" style="color:#EF4444;">Failed to load.</li>`;
      }
    }

    async function fetchBadge() {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res  = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        updateBadge((data.notifications || []).filter(n => !n.is_read).length);
      } catch {}
    }

    async function markOneRead(id, li) {
      if (!li.classList.contains('unread')) return;
      const token = localStorage.getItem('token');
      try {
        await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
        li.classList.remove('unread');
        updateBadge(notifList.querySelectorAll('.ll-notif-item.unread').length);
      } catch {}
    }

    async function markAllRead() {
      const token = localStorage.getItem('token');
      try {
        await fetch('/api/notifications/read-all', { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
        notifList.querySelectorAll('.ll-notif-item.unread').forEach(li => li.classList.remove('unread'));
        updateBadge(0);
      } catch {}
    }

    /* ── 5. Open / close ── */
    function openPanel()  { panel.classList.add('open'); fetchNotifications(); }
    function closePanel() { panel.classList.remove('open'); }

    bellBtn.addEventListener('click', e => {
      e.stopPropagation();
      // Close avatar dropdown if present
      document.getElementById('avatarDropdown')?.classList.remove('show');
      panel.classList.contains('open') ? closePanel() : openPanel();
    });
    closeBtn?.addEventListener('click',   e => { e.stopPropagation(); closePanel(); });
    markAllBtn?.addEventListener('click', e => { e.stopPropagation(); markAllRead(); });

    document.addEventListener('click', e => {
      if (!wrapper.contains(e.target)) closePanel();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

    /* ── 6. Initial badge poll + periodic refresh ── */
    fetchBadge();
    setInterval(fetchBadge, 60000);
  }

  /* ── Run after DOM is ready ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
