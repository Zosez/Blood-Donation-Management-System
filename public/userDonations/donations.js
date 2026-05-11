document.addEventListener('DOMContentLoaded', () => {
  let toastTimeout = null;
  let activeToast = null;

  const cards = document.querySelectorAll('.request-card');

  const emptyState = document.getElementById('emptyState');
  const resultText = document.getElementById('resultText');
  const matchCount = document.getElementById('matchCount');

  const bloodFilter = document.getElementById('bloodFilter');
  const cityFilter = document.getElementById('cityFilter');
  const urgencyFilter = document.getElementById('urgencyFilter');
  const typeFilter = document.getElementById('typeFilter');
  const clearFilters = document.getElementById('clearFilters');

  const totalRequests = document.getElementById('totalRequests');
  const criticalRequests = document.getElementById('criticalRequests');
  const urgentRequests = document.getElementById('urgentRequests');
  const nearbyRequests = document.getElementById('nearbyRequests');

  function showToast(message, type = 'default') {
    const colors = {
      default: { bg: '#ffffff', border: '#e2e8f0', text: '#1e293b' },
      success: { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
      warning: { bg: '#fff7ed', border: '#fdba74', text: '#92400e' },
      danger: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
      info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' }
    };

    const c = colors[type] || colors.default;

    if (toastTimeout) clearTimeout(toastTimeout);
    if (activeToast) activeToast.remove();

    const toast = document.createElement('div');
    toast.className = 'll-toast';
    toast.textContent = message;

    Object.assign(toast.style, {
      background: c.bg,
      border: `1px solid ${c.border}`,
      color: c.text
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

      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 300);
    }, 3000);
  }

  function updateStats() {
    const allCards = Array.from(cards);

    totalRequests.textContent = allCards.length;

    criticalRequests.textContent = allCards.filter(card => {
      return card.dataset.urgency === 'Critical';
    }).length;

    urgentRequests.textContent = allCards.filter(card => {
      return card.dataset.urgency === 'Urgent';
    }).length;

    nearbyRequests.textContent = allCards.filter(card => {
      return card.dataset.city === 'Kathmandu' || card.dataset.city === 'Lalitpur';
    }).length;
  }

  function filterRequests() {
    const selectedBlood = bloodFilter.value;
    const selectedCity = cityFilter.value;
    const selectedUrgency = urgencyFilter.value;
    const selectedType = typeFilter.value;

    let visibleCount = 0;

    cards.forEach(card => {
      const matchesBlood = !selectedBlood || card.dataset.blood === selectedBlood;
      const matchesCity = !selectedCity || card.dataset.city === selectedCity;
      const matchesUrgency = !selectedUrgency || card.dataset.urgency === selectedUrgency;
      const matchesType = !selectedType || card.dataset.type === selectedType;

      const shouldShow = matchesBlood && matchesCity && matchesUrgency && matchesType;

      card.style.display = shouldShow ? 'flex' : 'none';

      if (shouldShow) {
        visibleCount++;
      }
    });

    matchCount.textContent = `${visibleCount} Match${visibleCount === 1 ? '' : 'es'}`;

    if (visibleCount === 0) {
      emptyState.style.display = 'block';
      resultText.textContent = 'No requests match your selected filters.';
    } else {
      emptyState.style.display = 'none';

      resultText.textContent =
        visibleCount === cards.length
          ? 'Showing all active blood requests.'
          : `Showing ${visibleCount} matching request${visibleCount === 1 ? '' : 's'}.`;
    }
  }

  function clearAllFilters() {
    bloodFilter.value = '';
    cityFilter.value = '';
    urgencyFilter.value = '';
    typeFilter.value = '';

    filterRequests();
  }

  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');

      if (href && href !== '#') {
        return;
      }

      e.preventDefault();

      document.querySelectorAll('.nav-links a').forEach(item => {
        item.classList.remove('active');
      });

      link.classList.add('active');

      showToast(`${link.dataset.section || link.textContent.trim()} opened.`, 'info');
    });
  });

  const navHamburger = document.getElementById('navHamburger');
  const navLinks = document.querySelector('.nav-links');

  navHamburger?.addEventListener('click', () => {
    navLinks?.classList.toggle('active');
  });

  const notifBtn = document.getElementById('notifBtn');
  const notifPanel = document.getElementById('notifPanel');
  const notifClose = document.getElementById('notifClose');

  notifBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    notifPanel?.classList.toggle('open');
  });

  notifClose?.addEventListener('click', (e) => {
    e.stopPropagation();
    notifPanel?.classList.remove('open');
  });

  document.addEventListener('click', (e) => {
    if (notifPanel && notifBtn && !notifPanel.contains(e.target) && !notifBtn.contains(e.target)) {
      notifPanel.classList.remove('open');
    }
  });

  document.querySelectorAll('.notif-item').forEach(item => {
    item.addEventListener('click', () => {
      item.classList.remove('unread');

      const text = item.querySelector('.notif-text')?.textContent.trim() || 'Notification opened.';
      showToast(text, 'info');
    });
  });

  const navAvatar = document.getElementById('navAvatar');
  const avatarDropdown = document.getElementById('avatarDropdown');

  navAvatar?.addEventListener('click', (e) => {
    e.stopPropagation();
    avatarDropdown?.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (navAvatar && avatarDropdown && !navAvatar.contains(e.target) && !avatarDropdown.contains(e.target)) {
      avatarDropdown.classList.remove('show');
    }
  });

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    avatarDropdown?.classList.remove('show');
    showToast('Successfully logged out.', 'info');
  });

  document.getElementById('donateToLifeLinkBtn')?.addEventListener('click', () => {
    window.location.href = '/registerDonor';
  });

  document.querySelectorAll('.details-btn').forEach(button => {
    button.addEventListener('click', () => {
      const card = button.closest('.request-card');
      const hospital = card.querySelector('.req-hospital')?.textContent.trim();
      const blood = card.dataset.blood;
      const city = card.dataset.city;

      showToast(`${hospital} needs ${blood} blood in ${city}.`, 'info');
    });
  });

  document.querySelectorAll('.donate-btn').forEach(button => {
    button.addEventListener('click', () => {
      window.location.href = '/registerDonor';
    });
  });

  [bloodFilter, cityFilter, urgencyFilter, typeFilter].forEach(filter => {
    filter.addEventListener('change', filterRequests);
  });

  clearFilters?.addEventListener('click', clearAllFilters);

  updateStats();
  filterRequests();
});