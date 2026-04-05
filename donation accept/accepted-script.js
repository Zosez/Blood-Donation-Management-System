// LifeLink – Donation Accepted Script

// ── Card fade-in ──
document.addEventListener('DOMContentLoaded', () => {
  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('bellWrap');
    if (wrap && !wrap.contains(e.target)) closeDropdown();
  });
});

// ── Bell dropdown ──
function toggleDropdown() {
  const dropdown = document.getElementById('notifDropdown');
  const btn = document.getElementById('bellBtn');
  const isOpen = dropdown.classList.contains('open');
  isOpen ? closeDropdown() : openDropdown();
}

function openDropdown() {
  document.getElementById('notifDropdown').classList.add('open');
  document.getElementById('bellBtn').classList.add('active');
}

function closeDropdown() {
  document.getElementById('notifDropdown').classList.remove('open');
  document.getElementById('bellBtn').classList.remove('active');
}

function markAllRead() {
  document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
  document.querySelectorAll('.notif-dot').forEach(el => el.classList.add('read'));
  const badge = document.querySelector('.bell-badge');
  if (badge) badge.style.display = 'none';
}
