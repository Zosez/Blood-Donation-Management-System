/* ============================================================
   LifeLink Admin — main.js
   Handles: tab switching, nav highlighting, danger zone actions
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── NAV ITEMS ────────────────────────────────────────── */
  const navItems = document.querySelectorAll('.nav-item');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
    });
  });

  /* ── TABS ─────────────────────────────────────────────── */
  const tabs = document.querySelectorAll('.tab');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  /* ── DANGER ZONE: SUSPEND ────────────────────────────── */
  const suspendBtn = document.querySelector('.btn-suspend');

  if (suspendBtn) {
    suspendBtn.addEventListener('click', () => {
      showModal("Suspend Julian Thorne's account?\n\nThey will not be able to request or donate blood until the account is reinstated.", {
        type: 'warning',
        title: 'Suspend Account',
        confirmText: 'Yes, Suspend',
        cancelText: 'Cancel'
      }).then((confirmed) => {
        if (confirmed) {
          showModal('Account has been suspended. A notification email has been sent to julian.thorne@healthlink.org.', { type: 'success', title: 'Account Suspended' });
        }
      });
    });
  }

  /* ── DANGER ZONE: RESET PASSWORD ─────────────────────── */
  const resetBtn = document.querySelector('.btn-reset');

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      showModal('Send a password reset email to julian.thorne@healthlink.org?', {
        type: 'warning',
        title: 'Reset Password',
        confirmText: 'Send Reset Link',
        cancelText: 'Cancel'
      }).then((confirmed) => {
        if (confirmed) {
          showModal('Password reset link sent to julian.thorne@healthlink.org.', { type: 'success', title: 'Reset Link Sent' });
        }
      });
    });
  }

  /* ── DOWNLOAD REPORT ─────────────────────────────────── */
  const downloadBtn = document.querySelector('.btn-outline');

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      showModal('Generating report for Julian Thorne… Download will begin shortly.', { type: 'info', title: 'Report Generation' });
    });
  }

  /* ── BACK BUTTON ─────────────────────────────────────── */
  const backBtn = document.querySelector('.back-btn');

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      // In a real app: history.back() or router.push('/user-management')
      showModal('Navigating back to User Management…', { type: 'info', title: 'Navigation' });
    });
  }

  /* ── SEARCH (live filter stub) ───────────────────────── */
  const searchInput = document.querySelector('.search-wrap input');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      // Stub: in production, trigger API call or filter a list here
      console.log('Search query:', query);
    });
  }

});
