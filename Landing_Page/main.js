document.addEventListener('DOMContentLoaded', () => {

  /* ─── 1. MOBILE HAMBURGER MENU ─── */
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');

      const spans = hamburger.querySelectorAll('span');
      hamburger.classList.toggle('is-open');

      if (hamburger.classList.contains('is-open')) {
        spans[0].style.transform = 'translateY(7px) rotate(45deg)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
      } else {
        spans.forEach(s => {
          s.style.transform = '';
          s.style.opacity = '';
        });
      }
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('is-open');

        hamburger.querySelectorAll('span').forEach(s => {
          s.style.transform = '';
          s.style.opacity = '';
        });
      });
    });
  }

  /* ─── 2. NAVBAR ACTIVE LINK ─── */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');

  function setActiveLink() {
    let current = '';
    sections.forEach(section => {
      const top = section.offsetTop - 80;
      if (window.scrollY >= top) current = section.id;
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + current) {
        link.classList.add('active');
      }
    });
  }

  window.addEventListener('scroll', setActiveLink, { passive: true });

  /* ─── 3. SCROLL REVEAL ─── */
  const revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealEls.forEach(el => observer.observe(el));
  }

  /* ─── 4. COUNTER ─── */
  const statNums = document.querySelectorAll('.stat-num[data-target]');

  function animateCounter(el) {
    const target = parseInt(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    const duration = 1800;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const value = Math.floor((1 - Math.pow(1 - progress, 3)) * target);
      el.textContent = value.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    });

    statNums.forEach(el => observer.observe(el));
  }

  /* ─── 5. BLOOD TYPE BADGE ─── */
  document.querySelectorAll('.blood-badge').forEach(b => {
    b.addEventListener('click', () => b.classList.toggle('active'));
  });

  /* ─── 6. RESPOND BUTTON ─── */
  document.querySelectorAll('.btn-respond').forEach(btn => {
    btn.addEventListener('click', function () {
      const card = this.closest('.request-card');
      const type = card.querySelector('.blood-type-large').textContent;
      const hosp = card.querySelector('.hospital-name').textContent;

      this.textContent = 'Sent';
      this.style.background = '#16A34A';
      this.disabled = true;

      showToast(`Response sent for ${hosp} — Blood type ${type}`, 'success');
    });
  });

  /* ─── 7. TOAST (DASHBOARD STYLE) ─── */
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
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /* ─── 8. NEWSLETTER ─── */
  const newsletterBtn = document.getElementById('newsletterBtn');
  const newsletterEmail = document.getElementById('newsletterEmail');

  if (newsletterBtn && newsletterEmail) {
    newsletterBtn.addEventListener('click', () => {
      const email = newsletterEmail.value.trim();

      if (!email) return showToast('Email required', 'warning');
      if (!email.includes('@')) return showToast('Enter a valid email', 'warning');

      newsletterEmail.value = '';
      showToast('Subscribed for emergency alerts!', 'success');
    });
  }

  /* ─── 9. CTA BUTTONS ─── */
  document.querySelectorAll('.btn-primary, .btn-outline').forEach(btn => {
    btn.addEventListener('click', function () {
      const label = this.textContent.trim();

      if (label === 'Donate Blood' || label === 'Become a Donor') {
        showToast('Redirecting to Donor Registration...', 'info');
      } else if (label === 'Request Blood') {
        showToast('Redirecting to Blood Request Form...', 'info');
      } else if (label === 'Learn More') {
        showToast('Opening About page...', 'info');
      } else if (label === 'Log In') {
        showToast('Opening Login...', 'info');
      } else if (label === 'Register') {
        showToast('Opening Registration...', 'info');
      }
    });
  });

  /* ─── SETTINGS (THEME + LANGUAGE) ─── */
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsMenu = document.getElementById('settingsMenu');
  const themeSelect = document.getElementById('themeSelect');
  const languageSelect = document.getElementById('languageSelect');

  if (settingsBtn && settingsMenu && themeSelect && languageSelect) {
    const settingsWrap = settingsBtn.closest('.settings-wrap');

    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      settingsWrap.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!settingsWrap.contains(e.target)) {
        settingsWrap.classList.remove('open');
      }
    });

    const savedTheme = localStorage.getItem('theme') || 'light';
    const savedLanguage = localStorage.getItem('language') || 'en';

    themeSelect.value = savedTheme;
    languageSelect.value = savedLanguage;

    applyLanguage(savedLanguage);

    if (savedTheme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }

    themeSelect.addEventListener('change', () => {
      const theme = themeSelect.value;
      const currentLanguage = localStorage.getItem('language') || 'en';

      localStorage.setItem('theme', theme);

      if (theme === 'dark') {
        document.body.classList.add('dark');
        showToast(currentLanguage === 'np' ? 'डार्क मोड सक्रिय भयो' : 'Dark mode enabled', 'info');
      } else {
        document.body.classList.remove('dark');
        showToast(currentLanguage === 'np' ? 'लाइट मोड सक्रिय भयो' : 'Light mode enabled', 'info');
      }
    });

    languageSelect.addEventListener('change', () => {
      const language = languageSelect.value;

      localStorage.setItem('language', language);
      applyLanguage(language);

      showToast(language === 'np' ? 'भाषा नेपालीमा परिवर्तन गरियो' : 'Language changed to English', 'info');
    });
  }

});