document.addEventListener('DOMContentLoaded', () => {

  /* ─── 1. TAB SWITCHING ─── */
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById('tab-' + target).classList.add('active');
    });
  });

  /* ─── 1.5. HAMBURGER MENU TOGGLE ─── */
  const hamburger = document.getElementById('navHamburger');
  const navLinks = document.querySelector('.nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  /* ─── 1.6. AVATAR DROPDOWN AND LOGOUT ─── */
  const navAvatar = document.getElementById('navAvatar');
  const avatarDropdown = document.getElementById('avatarDropdown');
  const logoutBtn = document.getElementById('logoutBtn');

  if (navAvatar && avatarDropdown) {
    navAvatar.addEventListener('click', (e) => {
      e.stopPropagation();
      avatarDropdown.classList.toggle('show');
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!navAvatar.contains(e.target) && !avatarDropdown.contains(e.target)) {
        avatarDropdown.classList.remove('show');
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      avatarDropdown.classList.remove('show');
      // showToast function must be accessible or hoisted. We will call it.
      // Assuming showToast is hoisted or accessible.
      if (typeof showToast === 'function') {
        showToast('Successfully logged out.', 'info');
      }
    });
  }

  /* ─── 2. SAVE CHANGES ─── */
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const name = document.getElementById('fullName')?.value?.trim();
      const phone = document.getElementById('phone')?.value?.trim();
      const city = document.getElementById('city')?.value?.trim();

      if (!name || !phone || !city) {
        showToast(' Please fill in all required fields.', 'warn');
        return;
      }

      // Update sidebar name
      const userNameEl = document.querySelector('.user-name');
      if (userNameEl) userNameEl.textContent = name;

      saveBtn.textContent = ' Saved!';
      saveBtn.style.background = '#16A34A';
      setTimeout(() => {
        saveBtn.textContent = 'Save Changes';
        saveBtn.style.background = '';
      }, 2200);

      showToast('Profile updated successfully!');
    });
  }


  /* ─── 3. DISCARD CHANGES ─── */
  const discardBtn = document.getElementById('discardBtn');
  const origValues = {};

  // Store original values on load
  ['fullName', 'phone', 'city', 'email', 'dob'].forEach(id => {
    const el = document.getElementById(id);
    if (el) origValues[id] = el.value;
  });

  if (discardBtn) {
    discardBtn.addEventListener('click', () => {
      Object.entries(origValues).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
      });
      showToast(' Changes discarded.', 'info');
    });
  }


  /* ─── 4. PASSWORD UPDATE ─── */
  const pwdSaveBtn = document.getElementById('pwdSaveBtn');
  if (pwdSaveBtn) {
    pwdSaveBtn.addEventListener('click', () => {
      const current = document.getElementById('currentPwd')?.value;
      const next = document.getElementById('newPwd')?.value;
      const confirm = document.getElementById('confirmPwd')?.value;

      if (!current || !next || !confirm) {
        showToast(' Please fill in all password fields.', 'warn');
        return;
      }
      if (next.length < 8) {
        showToast(' New password must be at least 8 characters.', 'warn');
        return;
      }
      if (next !== confirm) {
        showToast(' Passwords do not match.', 'error');
        highlightError('confirmPwd');
        return;
      }

      ['currentPwd', 'newPwd', 'confirmPwd'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });

      pwdSaveBtn.textContent = ' Updated!';
      pwdSaveBtn.style.background = '#16A34A';
      setTimeout(() => {
        pwdSaveBtn.textContent = 'Update Password';
        pwdSaveBtn.style.background = '';
      }, 2200);

      showToast(' Password updated successfully!');
    });
  }


  /* ─── 6. AVATAR EDIT ─── */
  const avatarEdit = document.querySelector('.avatar-edit');
  if (avatarEdit) {
    avatarEdit.addEventListener('click', () => {
      showToast(' Photo upload coming soon!', 'info');
    });
  }


  /* ─── 7. PROGRESS BAR ANIMATION ─── */
  const bar = document.querySelector('.progress-bar-fill');
  if (bar) {
    const targetW = bar.style.width;
    bar.style.width = '0%';
    setTimeout(() => { bar.style.width = targetW; }, 400);
  }


  /* ─── 8. HIGHLIGHT ERROR INPUT ─── */
  function highlightError(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.borderColor = '#C0281C';
    el.style.boxShadow = '0 0 0 3px rgba(192,40,28,0.12)';
    el.focus();
    setTimeout(() => {
      el.style.borderColor = '';
      el.style.boxShadow = '';
    }, 2500);
  }


  /* ─── 9. TOAST NOTIFICATION ─── */
  let toastTimeout = null;
  let activeToast = null;

  function showToast(message, type = 'success') {
    const colors = {
      success: { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
      warn: { bg: '#fff7ed', border: '#fdba74', text: '#92400e' },
      error: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
      info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
      default: { bg: '#ffffff', border: '#e2e8f0', text: '#1e293b' },
    };

    const c = colors[type] || colors.default;

    if (toastTimeout) clearTimeout(toastTimeout);
    if (activeToast) activeToast.remove();

    const toast = document.createElement('div');
    toast.className = 'll-toast';
    toast.textContent = message;

    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      background: c.bg,
      border: `1px solid ${c.border}`,
      color: c.text,
      borderRadius: '10px',
      padding: '.85rem 1.1rem',
      fontFamily: "'Outfit', sans-serif",
      fontWeight: '600',
      fontSize: '.88rem',
      boxShadow: '0 8px 24px rgba(0,0,0,.12)',
      zIndex: '9999',
      opacity: '0',
      transform: 'translateY(20px)',
      transition: '0.3s',
      maxWidth: '420px',
      pointerEvents: 'none',
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
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

});

// ───────── Home REDIRECT ─────────
document.getElementById("home-logo").addEventListener("click", () => {
  window.location.href = "/";
});

// ───────── bloodRequest REDIRECT ─────────
document.getElementById("blood-request").addEventListener("click", () => {
  window.location.href = "/bloodRequest";
});

// ───────── userProfile REDIRECT ─────────
document.getElementById("dashboard").addEventListener("click", () => {
  window.location.href = "/userDashboard";
});