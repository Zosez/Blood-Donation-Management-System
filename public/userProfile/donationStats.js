/**
 * donationStats.js
 * Self-contained gamification stats widget for the User Profile page.
 *
 * Renders a "Donation Stats" section inside #donationStatsMount.
 * Fetches GET /api/gamification/stats (JWT from localStorage).
 * Also handles ?newBadge=badge_id query-param → shows award modal.
 */

(function () {
  'use strict';

  /* ── Tier colour config ────────────────────────────────────────────────── */
  const TIER_CONFIG = {
    Bronze:   { bg: '#cd7f32', text: '#fff', shimmer: false },
    Silver:   { bg: '#c0c0c0', text: '#333', shimmer: false },
    Gold:     { bg: '#ffd700', text: '#333', shimmer: false },
    Platinum: { bg: '#e5e4e2', text: '#333', shimmer: true  },
  };

  /* ── Inject scoped CSS once ─────────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('ds-styles')) return;
    const s = document.createElement('style');
    s.id = 'ds-styles';
    s.textContent = `
      .ds-card {
        background: #fff;
        border: 1px solid #E5E7EB;
        border-radius: 16px;
        padding: 2rem;
        margin: 2rem 0;
        font-family: 'Inter', 'Sora', sans-serif;
        box-shadow: 0 2px 12px rgba(0,0,0,.06);
      }
      .ds-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 1.5rem;
      }
      .ds-header h3 {
        font-family: 'Sora', sans-serif;
        font-size: 1.1rem;
        font-weight: 700;
        color: #111827;
        margin: 0;
      }

      /* Tier badge pill */
      .ds-tier-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 16px;
        border-radius: 999px;
        font-weight: 700;
        font-size: .85rem;
        letter-spacing: .04em;
        margin-bottom: 1rem;
      }
      .ds-tier-pill.shimmer {
        background: linear-gradient(90deg, #e5e4e2 25%, #fff 50%, #e5e4e2 75%);
        background-size: 200% 100%;
        animation: ds-shimmer 2s infinite;
      }
      @keyframes ds-shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      /* Progress bar */
      .ds-progress-wrap {
        margin: .75rem 0 1.5rem;
      }
      .ds-progress-label {
        display: flex;
        justify-content: space-between;
        font-size: .78rem;
        color: #6B7280;
        margin-bottom: 5px;
      }
      .ds-progress-track {
        height: 8px;
        background: #F3F4F6;
        border-radius: 4px;
        overflow: hidden;
      }
      .ds-progress-fill {
        height: 100%;
        border-radius: 4px;
        background: linear-gradient(90deg, #C0281C, #e05555);
        transition: width .6s ease;
      }
      .ds-platinum-msg {
        text-align: center;
        font-size: .9rem;
        font-weight: 700;
        color: #6B7280;
        padding: .5rem 0 1.25rem;
        letter-spacing: .02em;
      }

      /* Key stats row */
      .ds-stats-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 1rem;
        margin-bottom: 1.75rem;
      }
      .ds-stat-box {
        background: #F9FAFB;
        border: 1px solid #E5E7EB;
        border-radius: 10px;
        padding: 1rem;
        text-align: center;
      }
      .ds-stat-num {
        font-family: 'Sora', sans-serif;
        font-size: 1.5rem;
        font-weight: 800;
        color: #C0281C;
        line-height: 1.1;
      }
      .ds-stat-lbl {
        font-size: .72rem;
        color: #6B7280;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: .05em;
        margin-top: 4px;
      }

      /* Badges grid */
      .ds-badges-title {
        font-size: .75rem;
        font-weight: 700;
        color: #9CA3AF;
        letter-spacing: .06em;
        text-transform: uppercase;
        margin-bottom: .75rem;
      }
      .ds-badges-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .ds-badge {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        width: 72px;
        position: relative;
        cursor: default;
      }
      .ds-badge-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.4rem;
        background: #FEF2F2;
        border: 2px solid #FECACA;
        transition: transform .2s;
      }
      .ds-badge:hover .ds-badge-icon { transform: scale(1.12); }
      .ds-badge.locked .ds-badge-icon {
        background: #F3F4F6;
        border-color: #E5E7EB;
        filter: grayscale(1);
        opacity: .6;
      }
      .ds-badge-name {
        font-size: .62rem;
        font-weight: 600;
        color: #374151;
        text-align: center;
        line-height: 1.25;
      }
      .ds-badge.locked .ds-badge-name { color: #9CA3AF; }

      /* Tooltip */
      .ds-badge [data-tip] {
        position: relative;
      }
      .ds-badge:hover::after {
        content: attr(data-tip);
        position: absolute;
        bottom: calc(100% + 6px);
        left: 50%;
        transform: translateX(-50%);
        background: #111827;
        color: #fff;
        font-size: .68rem;
        padding: 4px 8px;
        border-radius: 6px;
        white-space: nowrap;
        pointer-events: none;
        z-index: 100;
        font-family: 'Inter', sans-serif;
      }

      /* Badge award modal */
      .ds-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.55);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      }
      .ds-modal-card {
        background: #fff;
        border-radius: 20px;
        padding: 2.5rem 2rem;
        text-align: center;
        max-width: 340px;
        width: 90%;
        box-shadow: 0 24px 48px rgba(0,0,0,.18);
        animation: ds-pop .35s cubic-bezier(.34,1.56,.64,1);
      }
      @keyframes ds-pop {
        from { opacity: 0; transform: scale(.8); }
        to   { opacity: 1; transform: scale(1); }
      }
      .ds-modal-icon { font-size: 3.5rem; margin-bottom: .75rem; }
      .ds-modal-title {
        font-family: 'Sora', sans-serif;
        font-size: 1.2rem;
        font-weight: 800;
        color: #111827;
        margin: 0 0 .4rem;
      }
      .ds-modal-sub {
        font-size: .85rem;
        color: #6B7280;
        margin: 0 0 1.5rem;
      }
      .ds-modal-close {
        background: #C0281C;
        color: #fff;
        border: none;
        padding: .65rem 2rem;
        border-radius: 8px;
        font-weight: 700;
        font-size: .9rem;
        cursor: pointer;
        transition: background .2s;
        font-family: 'Inter', sans-serif;
      }
      .ds-modal-close:hover { background: #9b1f16; }
    `;
    document.head.appendChild(s);
  }

  /* ── Render the full stats card ─────────────────────────────────────────── */
  function render(mount, data) {
    const {
      donationCount, displayVolume, currentTier, nextTier,
      donationsToNextTier, progressPercent, earnedBadges, lockedBadges,
    } = data;

    const tierCfg = TIER_CONFIG[currentTier] || TIER_CONFIG.Bronze;
    const shimmerClass = tierCfg.shimmer ? ' shimmer' : '';

    /* Progress section */
    const progressHTML = nextTier
      ? `<div class="ds-progress-wrap">
           <div class="ds-progress-label">
             <span>${currentTier} Tier</span>
             <span>${donationsToNextTier} donation${donationsToNextTier !== 1 ? 's' : ''} to ${nextTier}</span>
           </div>
           <div class="ds-progress-track">
             <div class="ds-progress-fill" style="width:${progressPercent}%"></div>
           </div>
         </div>`
      : `<div class="ds-platinum-msg">🏆 Maximum Tier Reached — You are a Platinum Legend!</div>`;

    /* Badges */
    const badgeHTML = (badge, locked) => {
      const tip = locked
        ? `Unlocks at ${badge.unlocksAt} donations`
        : badge.description;
      return `
        <div class="ds-badge${locked ? ' locked' : ''}" data-tip="${tip}">
          <div class="ds-badge-icon">${locked ? '🔒' : badge.icon}</div>
          <div class="ds-badge-name">${badge.name}</div>
        </div>`;
    };

    const earnedHTML = earnedBadges.map(b => badgeHTML(b, false)).join('');
    const lockedHTML = lockedBadges.map(b => badgeHTML(b, true)).join('');

    mount.innerHTML = `
      <div class="ds-card">
        <div class="ds-header">
          <svg width="20" height="24" viewBox="0 0 18 22" fill="none">
            <path d="M9 1C9 1 1 9.5 1 14.5a8 8 0 0 0 16 0C17 9.5 9 1 9 1z" fill="#C0281C"/>
          </svg>
          <h3>Donation Stats</h3>
        </div>

        <div class="ds-tier-pill${shimmerClass}"
             style="background:${tierCfg.bg};color:${tierCfg.text};">
          ${currentTier.toUpperCase()} TIER
        </div>

        ${progressHTML}

        <div class="ds-stats-row">
          <div class="ds-stat-box">
            <div class="ds-stat-num">${donationCount}</div>
            <div class="ds-stat-lbl">Donations</div>
          </div>
          <div class="ds-stat-box">
            <div class="ds-stat-num">${donationCount * 3}</div>
            <div class="ds-stat-lbl">Lives Impacted</div>
          </div>
          <div class="ds-stat-box">
            <div class="ds-stat-num">${displayVolume}</div>
            <div class="ds-stat-lbl">Blood Donated</div>
          </div>
        </div>

        <div class="ds-badges-title">Your Badges</div>
        <div class="ds-badges-grid">
          ${earnedHTML}${lockedHTML}
        </div>
      </div>
    `;
  }

  /* ── Badge award modal (for ?newBadge= param) ───────────────────────────── */
  function showBadgeModal(badge) {
    const overlay = document.createElement('div');
    overlay.className = 'ds-modal-overlay';
    overlay.innerHTML = `
      <div class="ds-modal-card">
        <div class="ds-modal-icon">${badge.icon}</div>
        <div class="ds-modal-title">🎉 New Badge Earned!</div>
        <div class="ds-modal-sub">${badge.name}<br><small style="color:#9CA3AF">${badge.description}</small></div>
        <button class="ds-modal-close" id="dsBadgeDismiss">Awesome!</button>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#dsBadgeDismiss').addEventListener('click', () => {
      overlay.remove();
      // Remove query param from URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete('newBadge');
      window.history.replaceState({}, '', url);
    });
  }

  /* ── Main init ──────────────────────────────────────────────────────────── */
  async function init() {
    injectStyles();

    const mount = document.getElementById('donationStatsMount');
    if (!mount) return; // not on profile page

    const token = localStorage.getItem('token');
    if (!token) {
      mount.innerHTML = '<p style="color:#9CA3AF;font-size:.85rem;padding:1rem 0;">Log in to see your donation stats.</p>';
      return;
    }

    // Loading skeleton
    mount.innerHTML = `
      <div class="ds-card" style="text-align:center;padding:3rem;color:#9CA3AF;font-size:.85rem;">
        Loading stats…
      </div>`;


    // Resync badges first — clears stale data from the old double-count bug
    // and re-awards based on the correct authoritative donation count.
    try {
      await fetch('/api/gamification/resync', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token }
      });
    } catch (e) { /* non-fatal */ }

    try {
      const res  = await fetch('/api/gamification/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();

      if (!json.success) throw new Error(json.message || 'API error');

      render(mount, json.data);

      // Handle ?newBadge=badge_id — show award modal
      const params  = new URLSearchParams(window.location.search);
      const badgeId = params.get('newBadge');
      if (badgeId) {
        const earned = json.data.earnedBadges.find(b => b.id === badgeId);
        if (earned) showBadgeModal(earned);
      }
    } catch (err) {
      console.error('[donationStats] fetch error:', err);
      mount.innerHTML = `
        <div class="ds-card" style="text-align:center;color:#EF4444;padding:2rem;font-size:.85rem;">
          Failed to load donation stats. Please try again later.
        </div>`;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
