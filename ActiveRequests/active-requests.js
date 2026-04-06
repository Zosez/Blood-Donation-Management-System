document.addEventListener('DOMContentLoaded', () => {

  /* ─── DATA ─── */
 const allRequests = [
  { blood: 'O-',  badgeClass: 'type-o',  hospitalKey: 'hospitalStJude',         cityKey: 'cityChicago',     units: 4, urgency: 'critical', expires: '09h : 24m : 11s' },
  { blood: 'A+',  badgeClass: 'type-a',  hospitalKey: 'hospitalMercyGeneral',   cityKey: 'citySeattle',     units: 2, urgency: 'urgent',   expires: '10h : 05m : 42s' },
  { blood: 'B-',  badgeClass: 'type-b',  hospitalKey: 'hospitalCityHope',       cityKey: 'cityAustin',      units: 6, urgency: 'critical', expires: '02h : 18m : 05s' },
  { blood: 'AB+', badgeClass: 'type-ab', hospitalKey: 'hospitalNorthside',      cityKey: 'cityDenver',      units: 3, urgency: 'standard', expires: '43h : 51m : 20s' },
  { blood: 'O+',  badgeClass: 'type-o',  hospitalKey: 'hospitalValleyMedical',  cityKey: 'cityPhoenix',     units: 5, urgency: 'urgent',   expires: '14h : 30m : 00s' },
  { blood: 'A-',  badgeClass: 'type-a',  hospitalKey: 'hospitalStMarys',        cityKey: 'cityBoston',      units: 2, urgency: 'critical', expires: '03h : 45m : 22s' },
  { blood: 'B+',  badgeClass: 'type-b',  hospitalKey: 'hospitalCentralCommunity', cityKey: 'cityPortland',  units: 3, urgency: 'standard', expires: '36h : 12m : 05s' },
  { blood: 'AB-', badgeClass: 'type-ab', hospitalKey: 'hospitalLakeview',       cityKey: 'cityMinneapolis', units: 1, urgency: 'urgent',   expires: '08h : 57m : 44s' },
];

  const ITEMS_PER_PAGE = 8;
  let currentPage = 1;
  let filtered = [...allRequests];

  /* ─── TOAST ─── */
  let toastTimeout = null;
  let activeToast = null;

  function showToast(message, type = 'default') {
    const colors = {
      default: { bg: '#ffffff', border: '#e2e8f0', text: '#1e293b' },
      success: { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
      warning: { bg: '#fff7ed', border: '#fdba74', text: '#92400e' },
      danger:  { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
      info:    { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' }
    };

    const c = colors[type] || colors.default;

    if (toastTimeout) clearTimeout(toastTimeout);
    if (activeToast) activeToast.remove();

    const toast = document.createElement('div');
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
      fontFamily: "'Inter', sans-serif",
      fontWeight: '600',
      fontSize: '.88rem',
      boxShadow: '0 8px 24px rgba(0,0,0,.12)',
      zIndex: '9999',
      opacity: '0',
      transform: 'translateY(20px)',
      transition: '0.3s',
      maxWidth: '420px'
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

  window.showToast = showToast;

  /* ─── TRANSLATION HELPERS ─── */
  function getCurrentLang() {
    return localStorage.getItem('language') || 'en';
  }

  function t(key, fallback = '') {
    const lang = getCurrentLang();

    if (window.currentTranslations && window.currentTranslations[key]) {
      return window.currentTranslations[key];
    }

    if (window.translations && window.translations[lang] && window.translations[lang][key]) {
      return window.translations[lang][key];
    }

    return fallback;
  }

  function updatePlaceholderTranslations() {
    const locationInput = document.getElementById('filterLocation');
    const lang = getCurrentLang();

    if (!locationInput) return;

    const placeholderMap = {
      en: 'Search for a city or hospital...',
      np: 'शहर वा अस्पताल खोज्नुहोस्...'
    };

    if (window.currentTranslations && window.currentTranslations.searchHospital) {
      locationInput.placeholder = window.currentTranslations.searchHospital;
      return;
    }

    if (window.translations && window.translations[lang] && window.translations[lang].searchHospital) {
      locationInput.placeholder = window.translations[lang].searchHospital;
      return;
    }

    locationInput.placeholder = placeholderMap[lang] || placeholderMap.en;
  }

  /* ─── RENDER HELPERS ─── */
  function urgencyLabel(u) {
    return {
      critical: t('critical', 'Critical'),
      urgent: t('urgent', 'Urgent'),
      standard: t('standard', 'Standard')
    }[u] || u;
  }

  function urgencyIcon(u) {
    return {
      critical: 'fas fa-fire',
      urgent: 'fas fa-exclamation-triangle',
      standard: 'fas fa-check-circle'
    }[u] || '';
  }

  /* ─── RENDER CARDS ─── */
  function renderCards() {
    const grid = document.getElementById('requestsGrid');
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const page = filtered.slice(start, start + ITEMS_PER_PAGE);

    if (!grid) return;

    grid.innerHTML = page.map(r => `
      <div class="request-card">
        <div class="card-top">
          <div class="blood-badge ${r.badgeClass}">${r.blood}</div>

          <div class="card-info">
            <h3>${t(r.hospitalKey, r.hospitalKey)}</h3>
            <span class="card-location">
              <i class="fas fa-map-marker-alt"></i>${t(r.cityKey, r.cityKey)}
            </span>
          </div>

          <div class="units-badge">
            <div class="units-count">${r.units}</div>
            <div class="units-label">${t('unitsNeeded', 'Units Needed')}</div>
          </div>
        </div>

        <div class="card-tags">
          <span class="urgency-tag ${r.urgency}">
            <i class="${urgencyIcon(r.urgency)}"></i>${urgencyLabel(r.urgency)}
          </span>
        </div>

        <div class="card-expiry">
          <i class="far fa-clock"></i>
          ${t('expiresIn', 'Expires in')}&nbsp;<span class="expiry-time">${r.expires}</span>
        </div>

        <button
          class="btn-respond"
          onclick="showToast('${t('respondNow', 'Register to Respond')}', 'info')"
        >
          ${t('respondNow', 'Register to Respond')}
        </button>
      </div>
    `).join('');

    const showCount = document.getElementById('showCount');
    const totalCount = document.getElementById('totalCount');

    if (showCount) {
      showCount.textContent = Math.min(ITEMS_PER_PAGE, filtered.length);
    }

    if (totalCount) {
      totalCount.textContent = filtered.length;
    }

    renderPagination();
  }

  window.renderCards = renderCards;

  /* ─── RENDER PAGINATION ─── */
  function renderPagination() {
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const wrap = document.getElementById('paginationBtns');
    if (!wrap) return;

    let html = '';

    html += `<button class="page-btn" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>&#8592;</button>`;

    for (let i = 1; i <= Math.min(totalPages, 3); i++) {
      html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
    }

    if (totalPages > 4) {
      html += `<button class="page-btn dots">...</button>`;
    }

    if (totalPages > 3) {
      html += `<button class="page-btn" onclick="goPage(${totalPages})">${totalPages}</button>`;
    }

    html += `<button class="page-btn" onclick="goPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>&#8594;</button>`;

    wrap.innerHTML = html;
  }

  function goPage(n) {
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    if (n < 1 || n > totalPages) return;

    currentPage = n;
    renderCards();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  window.goPage = goPage;

  /* ─── FILTERS ─── */
  function applyFilters() {
    const blood = document.getElementById('filterBlood')?.value || '';
    const urgency = document.getElementById('filterUrgency')?.value || '';
    const loc = document.getElementById('filterLocation')?.value.toLowerCase() || '';

    filtered = allRequests.filter(r => {
      const hospitalText = t(r.hospitalKey, '').toLowerCase();
      const cityText = t(r.cityKey, '').toLowerCase();

      return (
        (!blood || r.blood === blood) &&
        (!urgency || r.urgency === urgency) &&
        (!loc || hospitalText.includes(loc) || cityText.includes(loc))
      );
    });

    currentPage = 1;
    renderCards();
  }

  document.getElementById('filterBlood')?.addEventListener('change', applyFilters);
  document.getElementById('filterUrgency')?.addEventListener('change', applyFilters);
  document.getElementById('filterLocation')?.addEventListener('input', applyFilters);

  /* ─── SETTINGS MENU ─── */
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsWrap = document.querySelector('.settings-wrap');

  settingsBtn?.addEventListener('click', e => {
    e.stopPropagation();
    settingsWrap?.classList.toggle('open');
  });

  document.addEventListener('click', e => {
    if (!settingsWrap?.contains(e.target)) {
      settingsWrap?.classList.remove('open');
    }
  });

  /* ─── THEME ─── */
  const themeSelect = document.getElementById('themeSelect');
  const savedTheme = localStorage.getItem('theme') || 'light';

  if (savedTheme === 'dark') document.body.classList.add('dark');
  if (themeSelect) themeSelect.value = savedTheme;

  themeSelect?.addEventListener('change', e => {
    const theme = e.target.value;
    document.body.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);

    showToast(
      theme === 'dark'
        ? 'Dark mode enabled'
        : 'Light mode enabled',
      'info'
    );
  });

  /* ─── LANGUAGE ─── */
  const languageSelect = document.getElementById('languageSelect');
  const savedLanguage = localStorage.getItem('language') || 'en';

  if (languageSelect) languageSelect.value = savedLanguage;

  if (typeof applyLanguage === 'function') {
    applyLanguage(savedLanguage);
  }

  updatePlaceholderTranslations();
  renderCards();

  languageSelect?.addEventListener('change', e => {
    const lang = e.target.value;
    localStorage.setItem('language', lang);

    if (typeof applyLanguage === 'function') {
      applyLanguage(lang);
    }

    updatePlaceholderTranslations();
    renderCards();

    showToast(
      lang === 'np'
        ? 'भाषा नेपालीमा परिवर्तन गरियो'
        : 'Language set to English',
      'info'
    );
  });

  /* ─── HAMBURGER ─── */
  document.getElementById('hamburger')?.addEventListener('click', () => {
    document.getElementById('mobileMenu')?.classList.toggle('open');
  });

  /* ─── NAVBAR SCROLL EFFECT ─── */
  const navbar = document.getElementById('navbar');

  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 60) {
      navbar?.classList.add('scrolled');
      if (navbar) navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
    } else {
      navbar?.classList.remove('scrolled');
      if (navbar) navbar.style.boxShadow = 'none';
    }
  });
});