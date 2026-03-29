document.addEventListener('DOMContentLoaded', () => {

  /* ─── 1. MOBILE HAMBURGER MENU ─── */
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
    // Animate the three bars into an X
    const spans = hamburger.querySelectorAll('span');
    hamburger.classList.toggle('is-open');
    if (hamburger.classList.contains('is-open')) {
      spans[0].style.transform = 'translateY(7px) rotate(45deg)';
      spans[1].style.opacity   = '0';
      spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
    } else {
      spans[0].style.transform = '';
      spans[1].style.opacity   = '';
      spans[2].style.transform = '';
    }
  });

  // Close mobile menu when a link is clicked
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('is-open');
      hamburger.querySelectorAll('span').forEach(s => {
        s.style.transform = '';
        s.style.opacity   = '';
      });
    });
  });


  /* ─── 2. NAVBAR ACTIVE LINK ON SCROLL ─── */
  const sections = document.querySelectorAll('section[id]');
  const navLinks  = document.querySelectorAll('.nav-links a');

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

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target); // fire once
      }
    });
  }, { threshold: 0.12 });

  revealEls.forEach(el => revealObserver.observe(el));


  /* ─── 4. ANIMATED COUNTER ─── */
  const statNums = document.querySelectorAll('.stat-num[data-target]');

  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.dataset.suffix || '';
    const duration = 1800; // ms
    const start = performance.now();

    function tick(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      const value    = Math.floor(eased * target);
      el.textContent = value.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  statNums.forEach(el => counterObserver.observe(el));


  /* ─── 5. BLOOD TYPE BADGE TOGGLE ─── */
  const bloodBadges = document.querySelectorAll('.blood-badge');

  bloodBadges.forEach(badge => {
    badge.addEventListener('click', () => {
      badge.classList.toggle('active');
    });
  });


  /* ─── 6. RESPOND BUTTON FEEDBACK ─── */
  const respondBtns = document.querySelectorAll('.btn-respond');

  respondBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      const card = this.closest('.request-card');
      const type = card.querySelector('.blood-type-large').textContent;
      const hosp = card.querySelector('.hospital-name').textContent;

      this.textContent = 'Sent';
      this.style.background = '#16A34A';
      this.disabled = true;

      // Show a small toast
      showToast(`Response sent for ${hosp} — Blood type ${type}`);
    });
  });


  /* ─── 7. TOAST NOTIFICATION ─── */
  function showToast(message) {
    // Remove any existing toast
    const existing = document.querySelector('.ll-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'll-toast';
    toast.textContent = message;

    Object.assign(toast.style, {
      position:     'fixed',
      bottom:       '28px',
      left:         '50%',
      transform:    'translateX(-50%) translateY(20px)',
      background:   '#111827',
      color:        '#fff',
      padding:      '14px 24px',
      borderRadius: '50px',
      fontSize:     '0.9rem',
      fontWeight:   '600',
      fontFamily:   "'Sora', sans-serif",
      boxShadow:    '0 8px 32px rgba(0,0,0,0.2)',
      zIndex:       '9999',
      opacity:      '0',
      transition:   'all 0.4s ease',
      whiteSpace:   'nowrap',
    });

    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.opacity   = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
      });
    });

    // Auto-dismiss after 3 s
    setTimeout(() => {
      toast.style.opacity   = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }


  /* ─── 8. NEWSLETTER FORM ─── */
const newsletterBtn   = document.getElementById('newsletterBtn');
const newsletterEmail = document.getElementById('newsletterEmail');

if (newsletterBtn && newsletterEmail) {
  newsletterBtn.addEventListener('click', () => {
    const email = newsletterEmail.value.trim();

    // Empty email
    if (!email) {
      showToast('Email required');
      return;
    }

    // Invalid email
    if (!email.includes('@')) {
      showToast('Enter a valid email');
      return;
    }

    // Success
    newsletterEmail.value = '';
    showToast('Subscribed for emergency alerts!');
  });

  newsletterEmail.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') newsletterBtn.click();
  });
}

  /* ─── 9. CTA BUTTON INTERACTION ─── */
  document.querySelectorAll('.btn-primary, .btn-outline').forEach(btn => {
    btn.addEventListener('click', function () {
      const label = this.textContent.trim();

      if (label === 'Donate Blood' || label === 'Become a Donor') {
        showToast(' Redirecting to Donor Registration…');
      } else if (label === 'Request Blood') {
        showToast(' Redirecting to Blood Request Form…');
      } else if (label === 'Learn More') {
        showToast('ℹOpening About page…');
      } else if (label === 'Log In') {
        showToast('Opening Login…');
      } else if (label === 'Register') {
        showToast(' Opening Registration…');
      }
  
      
    });
  });

  /* ───  SETTINGS (THEME + LANGUAGE) ─── */
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
      showToast(
        currentLanguage === 'np'
          ? 'डार्क मोड सक्रिय भयो'
          : 'Dark mode enabled'
      );
    } else {
      document.body.classList.remove('dark');
      showToast(
        currentLanguage === 'np'
          ? 'लाइट मोड सक्रिय भयो'
          : 'Light mode enabled'
      );
    }
  });

  languageSelect.addEventListener('change', () => {
    const language = languageSelect.value;

    localStorage.setItem('language', language);
    applyLanguage(language);

    showToast(
      language === 'np'
        ? 'भाषा नेपालीमा परिवर्तन गरियो'
        : 'Language changed to English'
    );
  });
}

 /* ─── NOTIFICATION BELL ─── */
  const bell = document.querySelector('.nav-bell');

  if (bell) {
    bell.addEventListener('click', (e) => {
      e.stopPropagation();
      const lang = localStorage.getItem('language') || 'en';
      showToast(translations[lang].bellNoNew);
    });
  }
  
});



