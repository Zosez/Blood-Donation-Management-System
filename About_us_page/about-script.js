document.addEventListener('DOMContentLoaded', () => {
  /* ─── TOAST ─── */
  let toastTimeout = null;
  let activeToast = null;

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
      zIndex: '1000',
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

  /* ─── SETTINGS MENU ─── */
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsWrap = document.querySelector('.settings-wrap');

  settingsBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsWrap?.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!settingsWrap?.contains(e.target)) {
      settingsWrap?.classList.remove('open');
    }
  });

  /* ─── THEME + LANGUAGE ─── */
  const themeSelect = document.getElementById('themeSelect');
  const languageSelect = document.getElementById('languageSelect');

  const currentTheme = localStorage.getItem('theme') || 'light';
  const currentLanguage = localStorage.getItem('language') || 'en';

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }

  /* APPLY SAVED STATE */
  applyTheme(currentTheme);

  if (themeSelect) themeSelect.value = currentTheme;
  if (languageSelect) languageSelect.value = currentLanguage;

  if (typeof applyLanguage === 'function') {
    applyLanguage(currentLanguage);
  }

  /* THEME CHANGE */
  themeSelect?.addEventListener('change', (e) => {
    const theme = e.target.value;

    applyTheme(theme);
    localStorage.setItem('theme', theme);

    const lang = localStorage.getItem('language') || 'en';

    if (lang === 'np') {
      showToast(
        theme === 'dark'
          ? (translations?.np?.toastDark || 'डार्क मोड सक्रिय भयो')
          : (translations?.np?.toastLight || 'लाइट मोड सक्रिय भयो'),
        'info'
      );
    } else {
      showToast(
        theme === 'dark'
          ? (translations?.en?.toastDark || 'Dark mode enabled')
          : (translations?.en?.toastLight || 'Light mode enabled'),
        'info'
      );
    }
  });

  /* LANGUAGE CHANGE */
  languageSelect?.addEventListener('change', (e) => {
    const language = e.target.value;

    localStorage.setItem('language', language);

    if (typeof applyLanguage === 'function') {
      applyLanguage(language);
    }

    if (language === 'np') {
      showToast(translations?.np?.toastNepali || 'भाषा नेपालीमा परिवर्तन गरियो', 'info');
    } else {
      showToast(translations?.en?.toastEnglish || 'Language set to English', 'info');
    }
  });

  /* ─── SCROLL REVEAL ─── */
  const revealElements = document.querySelectorAll('.reveal');

  const revealOnScroll = () => {
    const windowHeight = window.innerHeight;

    revealElements.forEach((el) => {
      const elementTop = el.getBoundingClientRect().top;
      const revealPoint = 100;

      if (elementTop < windowHeight - revealPoint) {
        el.classList.add('visible');
      }
    });
  };

  window.addEventListener('load', revealOnScroll);
  window.addEventListener('scroll', revealOnScroll);
  revealOnScroll();

  /* ─── SMOOTH SCROLL FOR ANCHOR LINKS ─── */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');

      if (href !== '#') {
        const target = document.querySelector(href);

        if (target) {
          e.preventDefault();
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    });
  });

  /* ─── NAVBAR SCROLL EFFECT ─── */
  const navbar = document.getElementById('navbar');

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
      navbar?.classList.add('scrolled');
    } else {
      navbar?.classList.remove('scrolled');
    }
  });

  /* ─── ABOUT PAGE BUTTON ACTIONS + TOASTS ─── */
  document.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', function (e) {
      const action = this.dataset.action;
      const lang = localStorage.getItem('language') || 'en';

      const text = {
        en: {
          login: 'Opening Login...',
          register: 'Opening Registration...',
          alreadyAbout: 'You are already on the About page.',
          openTeam: 'Opening team section...',
          teamSoon: 'Team section coming soon.',
          donor: 'Redirecting to Donor Registration...',
          request: 'Redirecting to Blood Request Form...',
          more: 'Opening more information...'
        },
        np: {
          login: 'लगइन खुल्दैछ...',
          register: 'दर्ता पेज खुल्दैछ...',
          alreadyAbout: 'तपाईं अहिले About पेजमै हुनुहुन्छ।',
          openTeam: 'टिम सेक्सन खुल्दैछ...',
          teamSoon: 'टिम सेक्सन छिट्टै आउनेछ।',
          donor: 'रक्तदाता दर्तातर्फ लैजाँदै...',
          request: 'रक्त अनुरोध फारमतर्फ लैजाँदै...',
          more: 'थप जानकारी खुल्दैछ...'
        }
      };

      const t = text[lang] || text.en;

      if (action === 'login') {
        e.preventDefault();
        showToast(t.login, 'info');
        return;
      }

      if (action === 'register') {
        e.preventDefault();
        showToast(t.register, 'info');
        return;
      }

      if (action === 'about') {
        e.preventDefault();
        showToast(t.alreadyAbout, 'info');
        return;
      }

      if (action === 'team') {
        e.preventDefault();

        const teamSection =
          document.querySelector('.team-box') ||
          document.querySelector('.collab-section') ||
          document.querySelector('.creators-panel') ||
          document.querySelector('.team-section');

        if (teamSection) {
          teamSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
          showToast(t.openTeam, 'info');
        } else {
          showToast(t.teamSoon, 'warning');
        }
        return;
      }

      if (action === 'donate') {
        e.preventDefault();
        showToast(t.donor, 'info');
        return;
      }

      if (action === 'request') {
        e.preventDefault();
        showToast(t.request, 'info');
        return;
      }

      if (action === 'learn-more') {
        e.preventDefault();
        showToast(t.more, 'info');
      }
    });
  });
});