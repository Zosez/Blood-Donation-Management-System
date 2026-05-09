/* ─── TOAST UTILITY ─── */
let toastTimeout = null;
let activeToast = null;

window.showToast = function showToast(message, type = 'default') {
  const colors = {
    default: { bg: '#ffffff', border: '#e2e8f0', text: '#1e293b' },
    success: { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
    warning: { bg: '#fff7ed', border: '#fdba74', text: '#92400e' },
    danger:  { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
    info:    { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' }
  };

  const c = colors[type] || colors.default;

  if (toastTimeout) clearTimeout(toastTimeout);

  if (activeToast) {
    activeToast.remove();
    activeToast = null;
  }

  const toast = document.createElement('div');

  toast.innerHTML = `
    <span style="flex:1;">${message}</span>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;font-size:1rem;color:${c.text};opacity:0.6;padding:0;line-height:1;">&#x2715;</button>
  `;

  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '1.5rem',
    right: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    background: c.bg,
    border: `1px solid ${c.border}`,
    color: c.text,
    borderRadius: '12px',
    padding: '.85rem 1.1rem',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    fontSize: '.88rem',
    boxShadow: '0 8px 32px rgba(0,0,0,.14)',
    zIndex: '9999',
    opacity: '0',
    transform: 'translateY(20px)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    maxWidth: '380px',
    minWidth: '220px'
  });

  document.body.appendChild(toast);
  activeToast = toast;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });
  });

  toastTimeout = setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => toast.remove(), 320);
    }
  }, 3500);
};

/* ─── AUTH HELPERS ─── */
function isLoggedIn() {
  return Boolean(
    localStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('user') ||
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('authToken')
  );
}

function getAuthToken() {
  return localStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('authToken') ||
    '';
}

/* ─── DATE FILTER HELPER ─── */
function getDateFilterRange(filterValue) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!filterValue) return null;

  const start = new Date(today);
  const end = new Date(today);

  if (filterValue === 'this-week') {
    end.setDate(start.getDate() + 7);
  }

  if (filterValue === 'this-month') {
    end.setMonth(start.getMonth() + 1);
  }

  if (filterValue === 'next-month') {
    start.setMonth(start.getMonth() + 1);
    start.setDate(1);

    end.setTime(start.getTime());
    end.setMonth(start.getMonth() + 1);
  }

  return { start, end };
}

/* ─── UPDATE CARD AFTER DEMO/SUCCESS REGISTRATION ─── */
function updateRegisteredCount(card) {
  const chip = card.querySelector('.event-donor-chip');
  const label = card.querySelector('.spots-label');
  const fill = card.querySelector('.spots-fill');

  if (chip) {
    const current = parseInt(chip.textContent.match(/\d+/)?.[0] || '0', 10);
    chip.innerHTML = `<i class="fas fa-heart"></i> ${current + 1} Registered`;
  }

  if (label) {
    const match = label.textContent.match(/(\d+)\s*\/\s*(\d+)/);

    if (match) {
      const next = parseInt(match[1], 10) + 1;
      const total = parseInt(match[2], 10);

      label.textContent = `${next} / ${total} target quota registered`;

      if (fill) {
        fill.style.width = `${Math.min((next / total) * 100, 100)}%`;
      }
    }
  }
}

/* ─── REGISTER FOR EVENT — SRS FLOW ─── */
async function registerForEvent(card, button) {
  const eventId = card.dataset.eventId;
  const eventName = card.querySelector('.event-title')?.textContent || 'this event';

  if (!isLoggedIn()) {
    window.showToast('Please log in before registering for an event.', 'warning');

    setTimeout(() => {
      window.location.href = '../login/login.html';
    }, 800);

    return;
  }

  button.disabled = true;
  button.textContent = 'Registering...';

  try {
    const response = await fetch(`/api/events/${eventId}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {})
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Unable to register for this event.');
    }

    button.textContent = '✓ Registered';
    button.classList.add('registered');
    updateRegisteredCount(card);

    window.showToast(`You are registered for "${eventName}". Confirmation email will be sent.`, 'success');
  } catch (error) {
    /*
      For local demo without backend:
      This keeps your frontend working when opened in browser or localhost.
      Remove this block after your backend route is connected.
    */
    if (
      window.location.protocol === 'file:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    ) {
      button.textContent = '✓ Registered';
      button.classList.add('registered');
      updateRegisteredCount(card);

      window.showToast(`Demo: registered for "${eventName}". Backend route: POST /api/events/:id/register`, 'success');
      return;
    }

    button.disabled = false;
    button.textContent = 'Register for Event';
    window.showToast(error.message, 'danger');
  }
}

/* ─── MAIN ─── */
document.addEventListener('DOMContentLoaded', () => {
  const showToast = window.showToast;

  /* ─── NAVBAR SCROLL SHADOW ─── */
  const navbar = document.getElementById('navbar');

  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.style.boxShadow = window.scrollY > 10
        ? '0 2px 16px rgba(0,0,0,.10)'
        : '';
    });
  }

  /* ─── HAMBURGER / MOBILE MENU ─── */
  const hamburger = document.getElementById('navHamburger');
  const navLinks = document.querySelector('.nav-links');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', event => {
      event.stopPropagation();
      navLinks.classList.toggle('mobile-open');
    });

    document.addEventListener('click', event => {
      if (!navLinks.contains(event.target) && event.target !== hamburger) {
        navLinks.classList.remove('mobile-open');
      }
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('mobile-open');
      });
    });
  }

  /* ─── SCROLL REVEAL ─── */
  const revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.10 });

    revealEls.forEach(el => revealObserver.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('visible'));
  }

  /* ─── SETTINGS PANEL ─── */
  const settingsBtn = document.getElementById('settingsBtn');
  const themeSelect = document.getElementById('themeSelect');
  const langSelect = document.getElementById('languageSelect');

  if (settingsBtn) {
    const settingsWrap = settingsBtn.closest('.settings-wrap');

    settingsBtn.addEventListener('click', event => {
      event.stopPropagation();
      settingsWrap.classList.toggle('open');
    });

    document.addEventListener('click', event => {
      if (!settingsWrap.contains(event.target)) {
        settingsWrap.classList.remove('open');
      }
    });
  }

  const savedTheme = localStorage.getItem('theme') || 'light';
  const savedLang = localStorage.getItem('language') || 'en';

  if (themeSelect) themeSelect.value = savedTheme;
  if (langSelect) langSelect.value = savedLang;

  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
  }

  if (themeSelect) {
    themeSelect.addEventListener('change', () => {
      const theme = themeSelect.value;
      localStorage.setItem('theme', theme);

      if (theme === 'dark') {
        document.body.classList.add('dark');
        showToast('Dark mode enabled', 'info');
      } else {
        document.body.classList.remove('dark');
        showToast('Light mode enabled', 'info');
      }
    });
  }

  if (langSelect) {
    langSelect.addEventListener('change', () => {
      const lang = langSelect.value;
      localStorage.setItem('language', lang);

      if (typeof applyLanguage === 'function') {
        applyLanguage(lang);
      }

      showToast(lang === 'np' ? 'भाषा नेपालीमा परिवर्तन गरियो' : 'Language changed to English', 'info');
    });
  }

  /* ─── FILTER LOGIC ─── */
  const searchInput = document.getElementById('filterSearch');
  const bloodFilter = document.getElementById('filterBlood');
  const dateFilter = document.getElementById('filterDate');
  const clearFiltersBtn = document.getElementById('clearFilters');
  const resultsInfo = document.getElementById('resultsInfo');
  const emptyState = document.getElementById('emptyState');
  const cards = Array.from(document.querySelectorAll('.event-card'));

  function applyFilters() {
    const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const blood = bloodFilter ? bloodFilter.value : '';
    const dateRange = dateFilter ? getDateFilterRange(dateFilter.value) : null;

    let visible = 0;

    cards.forEach(card => {
      const title = card.querySelector('.event-title')?.textContent.toLowerCase() || '';
      const location = card.querySelector('.event-detail')?.textContent.toLowerCase() || '';
      const description = card.querySelector('.event-description')?.textContent.toLowerCase() || '';
      const cardBlood = card.dataset.blood || '';
      const eventDate = new Date(card.dataset.date);

      const searchMatch =
        !search ||
        title.includes(search) ||
        location.includes(search) ||
        description.includes(search);

      const bloodMatch =
        !blood ||
        cardBlood.split(',').map(item => item.trim()).includes(blood);

      const dateMatch =
        !dateRange ||
        (eventDate >= dateRange.start && eventDate < dateRange.end);

      const shouldShow = searchMatch && bloodMatch && dateMatch;

      card.style.display = shouldShow ? '' : 'none';

      if (shouldShow) visible++;
    });

    if (resultsInfo) {
      resultsInfo.innerHTML = `Showing <strong>${visible}</strong> event${visible !== 1 ? 's' : ''}`;
    }

    if (emptyState) {
      emptyState.style.display = visible === 0 ? 'block' : 'none';
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  if (bloodFilter) {
    bloodFilter.addEventListener('change', applyFilters);
  }

  if (dateFilter) {
    dateFilter.addEventListener('change', applyFilters);
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (bloodFilter) bloodFilter.value = '';
      if (dateFilter) dateFilter.value = '';

      applyFilters();
      showToast('Filters cleared', 'success');
    });
  }

  /* ─── EVENT REGISTER BUTTONS ─── */
  document.querySelectorAll('.btn-register-event').forEach(button => {
    button.addEventListener('click', () => {
      const card = button.closest('.event-card');

      if (!card || button.disabled) return;

      registerForEvent(card, button);
    });
  });

  /* ─── NAV AUTH BUTTONS ─── */
  const loginBtn = document.getElementById('btn-login');
  const registerBtn = document.getElementById('btn-register');

  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      window.location.href = '../login/login.html';
    });
  }

  if (registerBtn) {
    registerBtn.addEventListener('click', () => {
      window.location.href = '../register/register.html';
    });
  }

  /* ─── FOOTER NEWSLETTER — ORIGINAL FOOTER SUPPORT ─── */
  const newsletterBtn = document.getElementById('newsletterBtn');
  const newsletterEmail = document.getElementById('newsletterEmail');

  if (newsletterBtn && newsletterEmail) {
    newsletterBtn.addEventListener('click', () => {
      const email = newsletterEmail.value.trim();

      if (!email) {
        showToast('Please enter your email address.', 'warning');
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Enter a valid email address.', 'warning');
        return;
      }

      newsletterEmail.value = '';
      showToast('Subscribed for emergency alerts!', 'success');
    });

    newsletterEmail.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        newsletterBtn.click();
      }
    });
  }

  /* ─── FOOTER SOCIAL BUTTONS ─── */
  const socialLabels = {
    'fa-linkedin': 'LinkedIn',
    'fa-instagram': 'Instagram',
    'fa-youtube': 'YouTube'
  };

  document.querySelectorAll('.social-btn').forEach(button => {
    button.addEventListener('click', () => {
      const icon = button.querySelector('i');
      const iconClass = icon
        ? Array.from(icon.classList).find(className => className.startsWith('fa-'))
        : null;

      const label = socialLabels[iconClass] || 'social media';

      showToast(`Opening LifeLink on ${label}…`, 'info');
    });
  });

  /* ─── FOOTER PLACEHOLDER LINKS ─── */
  document.querySelectorAll('footer a[href="#"]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();

      const label = link.textContent.trim();
      showToast(`"${label}" — coming soon!`, 'info');
    });
  });

  applyFilters();
});