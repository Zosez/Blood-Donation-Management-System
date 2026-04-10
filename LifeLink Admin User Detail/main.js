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
      const confirmed = confirm(
        "Suspend Julian Thorne's account?\n\nThey will not be able to request or donate blood until the account is reinstated."
      );
      if (confirmed) {
        alert('Account has been suspended. A notification email has been sent to julian.thorne@healthlink.org.');
      }
    });
  }

  /* ── DANGER ZONE: RESET PASSWORD ─────────────────────── */
  const resetBtn = document.querySelector('.btn-reset');

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const confirmed = confirm(
        'Send a password reset email to julian.thorne@healthlink.org?'
      );
      if (confirmed) {
        alert('Password reset link sent to julian.thorne@healthlink.org.');
      }
    });
  }

  /* ── DOWNLOAD REPORT ─────────────────────────────────── */
  const downloadBtn = document.querySelector('.btn-outline');

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      alert('Generating report for Julian Thorne… Download will begin shortly.');
    });
  }

  /* ── BACK BUTTON ─────────────────────────────────────── */
  const backBtn = document.querySelector('.back-btn');

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      // In a real app: history.back() or router.push('/user-management')
      alert('Navigating back to User Management…');
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
