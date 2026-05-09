/**
 * LifeLink — Shared Notification Bell Widget
 * Works on any page that has a bell button with id="navBellBtn"
 * and a badge element with id="bellBadge".
 *
 * Usage: just include this script after your navbar HTML.
 * The bell button must exist in the DOM when this script runs.
 */
(function () {
    'use strict';

    const API_BASE = '/api';
    const POLL_INTERVAL_MS = 30000; // 30 seconds

    // ── Helpers ──────────────────────────────────────────

    function getToken() {
        return localStorage.getItem('token');
    }

    function timeAgo(dateStr) {
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHr  = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHr  / 24);

        if (diffSec < 60)  return 'Just now';
        if (diffMin < 60)  return `${diffMin}m ago`;
        if (diffHr  < 24)  return `${diffHr}h ago`;
        if (diffDay < 7)   return `${diffDay}d ago`;
        return date.toLocaleDateString();
    }

    async function apiFetch(path, options = {}) {
        const token = getToken();
        if (!token) return null;

        try {
            const res = await fetch(`${API_BASE}${path}`, {
                ...options,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    ...(options.headers || {})
                }
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            return null;
        }
    }

    // ── Badge Update ──────────────────────────────────────

    async function refreshBadge() {
        const bellBadge = document.getElementById('bellBadge');
        if (!bellBadge) return;

        const data = await apiFetch('/notifications/unread-count');
        if (!data) return;

        const count = data.count || 0;
        bellBadge.textContent = count > 99 ? '99+' : count;
        bellBadge.style.display = count > 0 ? 'flex' : 'none';
    }

    // ── Dropdown Render ───────────────────────────────────

    function buildDropdown(notifications) {
        const panel = document.createElement('div');
        panel.id = 'notifDropdown';
        panel.className = 'notif-dropdown';
        panel.innerHTML = `
            <div class="notif-dropdown-header">
                <span class="notif-dropdown-title">Notifications</span>
                <button class="notif-mark-all-btn" id="notifMarkAllBtn">Mark all read</button>
            </div>
            <div class="notif-dropdown-list" id="notifDropdownList">
                <div class="notif-dropdown-loading">
                    <div class="notif-spinner"></div>
                </div>
            </div>
        `;
        return panel;
    }

    function renderNotificationItems(notifications) {
        const list = document.getElementById('notifDropdownList');
        if (!list) return;

        if (!notifications || notifications.length === 0) {
            list.innerHTML = `
                <div class="notif-empty">
                    <span class="notif-empty-icon">🔔</span>
                    <p>No notifications yet</p>
                </div>
            `;
            return;
        }

        list.innerHTML = notifications.map(n => {
            const isUnread = !n.is_read;
            const timeStr = timeAgo(n.created_at);
            const safeMsg = (n.message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

            return `
                <div class="notif-drop-item ${isUnread ? 'notif-unread' : ''}"
                     data-id="${n.id}"
                     data-request-id="${n.blood_request_id || ''}">
                    <div class="notif-drop-dot ${isUnread ? 'dot-active' : ''}"></div>
                    <div class="notif-drop-body">
                        <div class="notif-drop-title">${(n.title || '').replace(/</g, '&lt;')}</div>
                        <div class="notif-drop-msg">${safeMsg}</div>
                        <div class="notif-drop-time">${timeStr}</div>
                    </div>
                </div>
            `;
        }).join('');

        // Attach click handlers
        list.querySelectorAll('.notif-drop-item').forEach(item => {
            item.addEventListener('click', async () => {
                const id = item.dataset.id;
                const requestId = item.dataset.requestId;

                // Mark as read
                if (item.classList.contains('notif-unread')) {
                    await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
                    item.classList.remove('notif-unread');
                    item.querySelector('.notif-drop-dot').classList.remove('dot-active');
                    refreshBadge();
                }

                // Navigate to blood requests page
                window.location.href = '/bloodRequest';
            });
        });
    }

    // ── Main Init ─────────────────────────────────────────

    function init() {
        const bellBtn = document.getElementById('navBellBtn');
        if (!bellBtn) return; // Not on a page with bell

        // Initial badge fetch
        refreshBadge();

        // Poll every 30s
        setInterval(refreshBadge, POLL_INTERVAL_MS);

        // Inject dropdown styles
        injectStyles();

        let dropdownOpen = false;

        bellBtn.addEventListener('click', async (e) => {
            e.stopPropagation();

            // Remove existing dropdown if open
            const existing = document.getElementById('notifDropdown');
            if (existing) {
                existing.remove();
                dropdownOpen = false;
                return;
            }

            dropdownOpen = true;

            // Build and show dropdown
            const dropdown = buildDropdown([]);
            bellBtn.style.position = 'relative';

            // Position dropdown below bell button
            const wrapper = bellBtn.closest('.nav-bell-wrapper') || bellBtn.parentElement;
            wrapper.style.position = 'relative';
            wrapper.appendChild(dropdown);

            // Fetch notifications
            const data = await apiFetch('/notifications');
            renderNotificationItems(data ? data.notifications : []);

            // Mark all as read via API (badge will clear)
            await apiFetch('/notifications/read-all', { method: 'PATCH' });
            refreshBadge();

            // Mark all read button
            const markAllBtn = document.getElementById('notifMarkAllBtn');
            if (markAllBtn) {
                markAllBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await apiFetch('/notifications/read-all', { method: 'PATCH' });
                    document.querySelectorAll('.notif-drop-item').forEach(el => {
                        el.classList.remove('notif-unread');
                        const dot = el.querySelector('.notif-drop-dot');
                        if (dot) dot.classList.remove('dot-active');
                    });
                    refreshBadge();
                });
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (dropdownOpen && !e.target.closest('#notifDropdown') && e.target.id !== 'navBellBtn') {
                const dd = document.getElementById('notifDropdown');
                if (dd) { dd.remove(); dropdownOpen = false; }
            }
        });
    }

    // ── Inject CSS ────────────────────────────────────────

    function injectStyles() {
        if (document.getElementById('notif-bell-styles')) return;
        const style = document.createElement('style');
        style.id = 'notif-bell-styles';
        style.textContent = `
            .notif-dropdown {
                position: absolute;
                top: calc(100% + 10px);
                right: 0;
                width: 340px;
                max-height: 420px;
                background: #fff;
                border-radius: 14px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(192,40,28,0.08);
                border: 1px solid #f0e8e8;
                z-index: 9999;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                animation: notifDropIn 0.18s ease;
            }
            @keyframes notifDropIn {
                from { opacity: 0; transform: translateY(-8px); }
                to   { opacity: 1; transform: translateY(0); }
            }
            .notif-dropdown-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 14px 16px 10px;
                border-bottom: 1px solid #f3f0f0;
                flex-shrink: 0;
            }
            .notif-dropdown-title {
                font-size: 14px;
                font-weight: 700;
                color: #1a1a2e;
                letter-spacing: 0.2px;
            }
            .notif-mark-all-btn {
                background: none;
                border: none;
                color: #C82020;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 6px;
                transition: background 0.15s;
            }
            .notif-mark-all-btn:hover {
                background: #fef2f2;
            }
            .notif-dropdown-list {
                overflow-y: auto;
                flex: 1;
                padding: 4px 0;
            }
            .notif-dropdown-loading {
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 32px;
            }
            .notif-spinner {
                width: 24px;
                height: 24px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #C82020;
                border-radius: 50%;
                animation: notifSpin 0.7s linear infinite;
            }
            @keyframes notifSpin {
                to { transform: rotate(360deg); }
            }
            .notif-empty {
                text-align: center;
                padding: 36px 16px;
                color: #9CA3AF;
            }
            .notif-empty-icon {
                font-size: 28px;
                display: block;
                margin-bottom: 8px;
            }
            .notif-empty p {
                margin: 0;
                font-size: 14px;
            }
            .notif-drop-item {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                padding: 12px 16px;
                cursor: pointer;
                transition: background 0.12s;
                border-bottom: 1px solid #fafafa;
            }
            .notif-drop-item:last-child { border-bottom: none; }
            .notif-drop-item:hover { background: #fafafa; }
            .notif-drop-item.notif-unread { background: #fff8f8; }
            .notif-drop-item.notif-unread:hover { background: #fef0f0; }
            .notif-drop-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: transparent;
                flex-shrink: 0;
                margin-top: 5px;
            }
            .notif-drop-dot.dot-active { background: #C82020; }
            .notif-drop-body { flex: 1; min-width: 0; }
            .notif-drop-title {
                font-size: 13px;
                font-weight: 600;
                color: #111827;
                margin-bottom: 3px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .notif-drop-msg {
                font-size: 12px;
                color: #6B7280;
                line-height: 1.4;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            .notif-drop-time {
                font-size: 11px;
                color: #9CA3AF;
                margin-top: 4px;
            }
        `;
        document.head.appendChild(style);
    }

    // Wait for DOM then init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
