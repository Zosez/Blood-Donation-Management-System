/**
 * public/utils/avatarWidget.js
 *
 * Self-contained avatar sync utility.
 * Reads the logged-in user's name from localStorage and updates ALL
 * avatar elements on any page it is included on — using the SAME URL
 * so nav icon and profile sidebar always show identical characters.
 *
 * Targets:
 *   #navAvatar img          → nav bar avatar (all pages)
 *   #profile-avatar-img     → large sidebar avatar (userProfile page)
 *   .nav-avatar-name / #nav-user-name / #nav-avatar-name → first name text
 *   .profile-avatar         → legacy selector (admin profile page)
 *   .sidebar-avatar         → admin notification sidebar
 */
(function () {
  'use strict';

  const DICEBEAR_BASE = 'https://api.dicebear.com/7.x/avataaars/svg';
  const BG_COLOR      = 'b6e3f4';

  function buildAvatarUrl(seed) {
    return `${DICEBEAR_BASE}?seed=${encodeURIComponent(seed)}&backgroundColor=${BG_COLOR}`;
  }

  function syncAvatar() {
    /* 1. Read user from localStorage */
    let name = 'User';
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        name = u.fullname || u.name || u.email || 'User';
      }
    } catch (_) {}

    const firstName  = name.split(' ')[0];
    const avatarUrl  = buildAvatarUrl(name); // same seed → same character everywhere

    /* 2. Nav bar avatar image */
    const navImg = document.querySelector('#navAvatar img');
    if (navImg) navImg.src = avatarUrl;

    /* 3. Large profile sidebar avatar (userProfile page) */
    const profileImg = document.getElementById('profile-avatar-img');
    if (profileImg) profileImg.src = avatarUrl;

    /* 4. Legacy selectors */
    const legacyProfile  = document.querySelector('.profile-avatar');
    if (legacyProfile)   legacyProfile.src = avatarUrl;
    const sidebarAvatar  = document.querySelector('.sidebar-avatar');
    if (sidebarAvatar)   sidebarAvatar.src = avatarUrl;

    /* 5. Name spans (all variants used across pages) */
    ['#nav-user-name', '#nav-avatar-name', '.nav-avatar-name'].forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.textContent = firstName;
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncAvatar);
  } else {
    syncAvatar();
  }
})();
