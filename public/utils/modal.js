/* ============================================================
   LifeLink – Premium Modal Notification System
   A drop-in replacement for native alert() / confirm() dialogs.
   ============================================================

   Usage:
     showModal('Your message here');                        // info (default)
     showModal('Saved!', { type: 'success' });              // success
     showModal('Something went wrong', { type: 'error' });  // error
     showModal('Are you sure?', { type: 'warning' });       // warning

     // With a callback when "OK" is clicked:
     showModal('Are you sure?', {
       type: 'warning',
       confirmText: 'Yes, do it',
       onConfirm: () => { ... }
     });
   ============================================================ */

(function () {
  'use strict';

  // ── Prevent double-init ──
  if (window.__lifelinkModalReady) return;
  window.__lifelinkModalReady = true;

  // ── Inject styles once ──
  const css = document.createElement('style');
  css.textContent = `
    /* ── OVERLAY ── */
    .ll-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(0, 0, 0, 0);
      backdrop-filter: blur(0px);
      -webkit-backdrop-filter: blur(0px);
      transition: background 0.35s ease, backdrop-filter 0.35s ease;
    }
    .ll-modal-overlay.ll-visible {
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }

    /* ── CARD ── */
    .ll-modal-card {
      position: relative;
      width: 100%;
      max-width: 420px;
      background: #ffffff;
      border-radius: 20px;
      box-shadow:
        0 25px 60px rgba(0, 0, 0, 0.18),
        0 0 0 1px rgba(0, 0, 0, 0.04);
      overflow: hidden;
      opacity: 0;
      transform: translateY(24px) scale(0.96);
      transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                  transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ll-modal-overlay.ll-visible .ll-modal-card {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    /* ── ACCENT BAR ── */
    .ll-modal-accent {
      height: 4px;
      width: 100%;
    }
    .ll-modal-accent.ll-info    { background: linear-gradient(90deg, #3B82F6, #60A5FA); }
    .ll-modal-accent.ll-success { background: linear-gradient(90deg, #10B981, #34D399); }
    .ll-modal-accent.ll-warning { background: linear-gradient(90deg, #F59E0B, #FBBF24); }
    .ll-modal-accent.ll-error   { background: linear-gradient(90deg, #EF4444, #F87171); }

    /* ── BODY ── */
    .ll-modal-body {
      padding: 32px 28px 28px;
      text-align: center;
    }

    /* ── ICON RING ── */
    .ll-modal-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      position: relative;
    }
    .ll-modal-icon::before {
      content: '';
      position: absolute;
      inset: -6px;
      border-radius: 50%;
      opacity: 0.12;
    }

    /* icon colors */
    .ll-modal-icon.ll-info    { background: #EFF6FF; color: #3B82F6; }
    .ll-modal-icon.ll-info::before    { background: #3B82F6; }
    .ll-modal-icon.ll-success { background: #ECFDF5; color: #10B981; }
    .ll-modal-icon.ll-success::before { background: #10B981; }
    .ll-modal-icon.ll-warning { background: #FFFBEB; color: #F59E0B; }
    .ll-modal-icon.ll-warning::before { background: #F59E0B; }
    .ll-modal-icon.ll-error   { background: #FEF2F2; color: #EF4444; }
    .ll-modal-icon.ll-error::before   { background: #EF4444; }

    .ll-modal-icon svg {
      width: 26px;
      height: 26px;
      stroke-width: 2;
      fill: none;
      stroke: currentColor;
    }

    /* ── TITLE ── */
    .ll-modal-title {
      font-family: 'Sora', 'Inter', system-ui, sans-serif;
      font-size: 17px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 8px;
      letter-spacing: -0.3px;
    }

    /* ── MESSAGE ── */
    .ll-modal-msg {
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #6B7280;
      margin: 0;
      word-break: break-word;
    }

    /* ── ACTIONS ── */
    .ll-modal-actions {
      display: flex;
      gap: 10px;
      padding: 0 28px 24px;
      justify-content: center;
    }

    .ll-modal-btn {
      flex: 1;
      max-width: 180px;
      padding: 11px 20px;
      border: none;
      border-radius: 12px;
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      letter-spacing: 0.2px;
    }
    .ll-modal-btn:active {
      transform: scale(0.97);
    }

    /* primary */
    .ll-modal-btn-primary.ll-info    { background: #3B82F6; color: #fff; }
    .ll-modal-btn-primary.ll-info:hover    { background: #2563EB; box-shadow: 0 4px 14px rgba(59,130,246,0.35); }
    .ll-modal-btn-primary.ll-success { background: #10B981; color: #fff; }
    .ll-modal-btn-primary.ll-success:hover { background: #059669; box-shadow: 0 4px 14px rgba(16,185,129,0.35); }
    .ll-modal-btn-primary.ll-warning { background: #F59E0B; color: #fff; }
    .ll-modal-btn-primary.ll-warning:hover { background: #D97706; box-shadow: 0 4px 14px rgba(245,158,11,0.35); }
    .ll-modal-btn-primary.ll-error   { background: #EF4444; color: #fff; }
    .ll-modal-btn-primary.ll-error:hover   { background: #DC2626; box-shadow: 0 4px 14px rgba(239,68,68,0.35); }

    /* secondary (cancel) */
    .ll-modal-btn-secondary {
      background: #F3F4F6;
      color: #374151;
    }
    .ll-modal-btn-secondary:hover {
      background: #E5E7EB;
    }

    /* ── DARK MODE ── */
    body.dark .ll-modal-card {
      background: #1F2937;
      box-shadow:
        0 25px 60px rgba(0, 0, 0, 0.45),
        0 0 0 1px rgba(255, 255, 255, 0.06);
    }
    body.dark .ll-modal-title { color: #F9FAFB; }
    body.dark .ll-modal-msg   { color: #9CA3AF; }
    body.dark .ll-modal-icon.ll-info    { background: rgba(59,130,246,0.15); }
    body.dark .ll-modal-icon.ll-success { background: rgba(16,185,129,0.15); }
    body.dark .ll-modal-icon.ll-warning { background: rgba(245,158,11,0.15); }
    body.dark .ll-modal-icon.ll-error   { background: rgba(239,68,68,0.15); }
    body.dark .ll-modal-btn-secondary {
      background: #374151;
      color: #D1D5DB;
    }
    body.dark .ll-modal-btn-secondary:hover {
      background: #4B5563;
    }

    /* ── ENTRANCE KEYFRAMES ── */
    @keyframes ll-icon-pop {
      0%   { transform: scale(0); opacity: 0; }
      50%  { transform: scale(1.15); }
      100% { transform: scale(1); opacity: 1; }
    }
    .ll-modal-overlay.ll-visible .ll-modal-icon {
      animation: ll-icon-pop 0.45s 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }

    /* ── RESPONSIVE ── */
    @media (max-width: 480px) {
      .ll-modal-card { max-width: 92vw; border-radius: 16px; }
      .ll-modal-body { padding: 24px 20px 20px; }
      .ll-modal-actions { padding: 0 20px 20px; }
    }
  `;
  document.head.appendChild(css);

  // ── SVG icon paths per type ──
  const ICONS = {
    info:    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    success: '<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    warning: '<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    error:   '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
  };

  const TITLES = {
    info:    'Information',
    success: 'Success',
    warning: 'Attention',
    error:   'Error'
  };

  /**
   * Show a premium modal notification.
   *
   * @param {string} message          – The message body.
   * @param {object} [opts]           – Options.
   * @param {'info'|'success'|'warning'|'error'} [opts.type='info']
   * @param {string}   [opts.title]        – Custom title (auto-derived from type if omitted).
   * @param {string}   [opts.confirmText]  – Button label (default "OK").
   * @param {string}   [opts.cancelText]   – If provided, a second cancel button is shown.
   * @param {function} [opts.onConfirm]    – Fires when primary button is clicked.
   * @param {function} [opts.onCancel]     – Fires when cancel / overlay is clicked.
   * @returns {Promise<boolean>} resolves true (confirm) or false (cancel).
   */
  function showModal(message, opts = {}) {
    const type        = opts.type || 'info';
    const title       = opts.title ?? TITLES[type];
    const confirmText = opts.confirmText || 'OK';
    const cancelText  = opts.cancelText || null;

    return new Promise((resolve) => {
      // ── Build DOM ──
      const overlay = document.createElement('div');
      overlay.className = 'll-modal-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');

      const card = document.createElement('div');
      card.className = 'll-modal-card';

      // Accent bar
      const accent = document.createElement('div');
      accent.className = `ll-modal-accent ll-${type}`;

      // Body
      const body = document.createElement('div');
      body.className = 'll-modal-body';

      // Icon
      const icon = document.createElement('div');
      icon.className = `ll-modal-icon ll-${type}`;
      icon.innerHTML = ICONS[type];

      // Title
      const h3 = document.createElement('h3');
      h3.className = 'll-modal-title';
      h3.textContent = title;

      // Message
      const p = document.createElement('p');
      p.className = 'll-modal-msg';
      p.textContent = message;

      body.append(icon, h3, p);

      // Actions
      const actions = document.createElement('div');
      actions.className = 'll-modal-actions';

      if (cancelText) {
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'll-modal-btn ll-modal-btn-secondary';
        cancelBtn.textContent = cancelText;
        cancelBtn.addEventListener('click', () => close(false));
        actions.appendChild(cancelBtn);
      }

      const confirmBtn = document.createElement('button');
      confirmBtn.className = `ll-modal-btn ll-modal-btn-primary ll-${type}`;
      confirmBtn.textContent = confirmText;
      confirmBtn.addEventListener('click', () => close(true));
      actions.appendChild(confirmBtn);

      card.append(accent, body, actions);
      overlay.appendChild(card);
      document.body.appendChild(overlay);

      // Focus the confirm button
      requestAnimationFrame(() => {
        confirmBtn.focus();
      });

      // ── Animate in ──
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          overlay.classList.add('ll-visible');
        });
      });

      // ── Close helper ──
      function close(confirmed) {
        overlay.classList.remove('ll-visible');
        overlay.addEventListener('transitionend', () => {
          overlay.remove();
        }, { once: true });

        // Safety fallback in case transitionend doesn't fire
        setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 500);

        if (confirmed) {
          if (typeof opts.onConfirm === 'function') opts.onConfirm();
        } else {
          if (typeof opts.onCancel === 'function') opts.onCancel();
        }
        resolve(confirmed);
      }

      // ── Close on overlay click ──
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(false);
      });

      // ── Close on Escape ──
      function onKey(e) {
        if (e.key === 'Escape') {
          document.removeEventListener('keydown', onKey);
          close(false);
        }
      }
      document.addEventListener('keydown', onKey);
    });
  }

  // ── Expose globally ──
  window.showModal = showModal;

})();
