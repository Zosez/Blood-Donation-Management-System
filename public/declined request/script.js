// ── LifeLink – Declined Request Page ──

document.addEventListener('DOMContentLoaded', () => {

  // "Go to Dashboard" button click handler
  const btn = document.querySelector('.btn-dashboard');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      // Navigate to dashboard (update href as needed)
      window.location.href = '/dashboard';
    });
  }

  // Bell / notification button click handler
  const bellBtn = document.querySelector('.bell-btn');
  if (bellBtn) {
    bellBtn.addEventListener('click', () => {
      alert('No new notifications.');
    });
  }

  // Avatar click handler
  const avatar = document.querySelector('.avatar');
  if (avatar) {
    avatar.addEventListener('click', () => {
      // Open profile dropdown or navigate
      console.log('Avatar clicked – open profile menu');
    });
  }

});
