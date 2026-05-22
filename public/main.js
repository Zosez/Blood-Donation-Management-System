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

  /* ─── 3.5. FETCH DYNAMIC STATS & COOPERATE WITH COUNTERS ─── */
  async function fetchStats() {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();

      if (data.success) {
        const { donors, livesHelped, typesSupported } = data.stats;

        // Update data-target attributes with fetched values
        const statItems = document.querySelectorAll('.stat-item');
        if (statItems[0]) {
          const donorElement = statItems[0].querySelector('.stat-num');
          if (donorElement) donorElement.dataset.target = donors;
        }
        if (statItems[1]) {
          const livesElement = statItems[1].querySelector('.stat-num');
          if (livesElement) livesElement.dataset.target = livesHelped;
        }
        if (statItems[2]) {
          const typesElement = statItems[2].querySelector('.stat-num');
          if (typesElement) typesElement.dataset.target = typesSupported;
        }
      }
    } catch (error) {
      console.warn('[STATS] Failed to fetch dynamic stats:', error);
      // Fall back to static values in HTML
    } finally {
      initCounters();
    }
  }

  // Fetch stats on page load
  fetchStats();

  /* ─── 4. COUNTER ─── */
  function animateCounter(el) {
    const target = parseInt(el.dataset.target) || 0;
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

  function initCounters() {
    const statNums = document.querySelectorAll('.stat-num[data-target]');
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
    } else {
      statNums.forEach(el => animateCounter(el));
    }
  }

  /* ─── 4.5. FETCH DYNAMIC ACTIVE BLOOD REQUESTS ─── */
  async function fetchActiveRequests() {
    const container = document.querySelector('.request-cards');
    if (!container) return;

    try {
      const response = await fetch('/api/blood-requests');
      if (!response.ok) throw new Error('Failed to fetch requests');
      const data = await response.json();

      // Show ONLY active/approved requests (up to top 3 for aesthetic parity)
      const activeReqs = (data.requests || [])
        .filter(r => r.status === 'approved' || r.status === 'ongoing')
        .slice(0, 3);

      if (activeReqs.length === 0) {
        renderNoRequestsPlaceholder(container);
        return;
      }

      container.innerHTML = activeReqs.map((req, idx) => {
        // Map urgency level ENUM to corresponding CSS badge classes & translations
        let urgencyBadge = '';
        if (req.urgency_level === 'critical') {
          urgencyBadge = `<span class="urgency-badge emergency" data-key="emergency">Emergency</span>`;
        } else if (req.urgency_level === 'urgent') {
          urgencyBadge = `<span class="urgency-badge urgent" data-key="urgent">Urgent</span>`;
        }

        const transitionDelay = `${idx * 0.1}s`;

        return `
          <div class="request-card reveal visible" style="transition-delay: ${transitionDelay}">
            <div class="card-top">
              <span class="hospital-name">${req.hospital_name}</span>
              ${urgencyBadge}
            </div>
            <div class="location">&#128205; ${req.city || 'Location not specified'}</div>
            <div class="blood-info">
              <div>
                <div class="blood-label" data-key="bloodType">Blood Type</div>
                <div class="blood-type-large">${req.blood_type}</div>
              </div>
              <button class="btn-respond" data-key="respond" 
                      data-id="${req.id}" 
                      data-hospital="${req.hospital_name}" 
                      data-blood="${req.blood_type}">
                Respond
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Instantly apply translation to dynamically rendered cards
      if (typeof applyLanguage === 'function') {
        const currentLang = localStorage.getItem('language') || 'en';
        applyLanguage(currentLang);
      }

    } catch (error) {
      console.warn('[REQUESTS] Failed to fetch dynamic blood requests:', error);
      // Keep/fall back to hardcoded mock cards if fetch completely errors out
    }
  }

  function renderNoRequestsPlaceholder(container) {
    container.innerHTML = `
      <div class="no-requests-card" style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--color-card-bg, rgba(255,255,255,0.02)); border: 1.5px dashed var(--color-border, rgba(255, 255, 255, 0.1)); border-radius: 20px; margin: 1rem 0;">
        <div style="font-size: 3.5rem; margin-bottom: 1.2rem; filter: drop-shadow(0 4px 10px rgba(192, 40, 28, 0.2));">❤️</div>
        <h3 style="font-family: 'Sora', sans-serif; font-size: 1.4rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--color-text-main, #ffffff);">No Active Requests</h3>
        <p style="font-family: 'Inter', sans-serif; font-size: 0.95rem; color: var(--color-text-muted, #94a3b8); max-width: 480px; margin: 0 auto 1.5rem; line-height: 1.6;">There are currently no urgent active blood requests. Thank you for your incredible willingness to help save lives!</p>
        <button class="btn-primary" onclick="window.location.href='/requestBlood'" style="padding: 0.8rem 1.6rem; border-radius: 12px; font-weight: 600; font-family: 'Inter', sans-serif; cursor: pointer; border: none; background: #C0281C; color: #fff; transition: background 0.2s;">
          Request Blood
        </button>
      </div>
    `;
  }

  // Fetch active requests on page load
  fetchActiveRequests();

  /* ─── 5. BLOOD TYPE BADGE ─── */
  document.querySelectorAll('.blood-badge').forEach(b => {
    b.addEventListener('click', () => b.classList.toggle('active'));
  });

  /* ─── 6. DYNAMIC RESPOND BUTTONS & OFFER SUBMISSION ─── */
  const requestCardsContainer = document.querySelector('.request-cards');
  if (requestCardsContainer) {
    requestCardsContainer.addEventListener('click', async (e) => {
      if (e.target.classList.contains('btn-respond')) {
        const btn = e.target;
        const requestId = btn.dataset.id;
        const hospitalName = btn.dataset.hospital;
        const bloodType = btn.dataset.blood;

        const token = localStorage.getItem('token');
        if (!token) {
          showToast('Please log in or register to submit a donation offer.', 'warning');
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
          return;
        }

        try {
          btn.disabled = true;
          btn.textContent = 'Sending...';

          // Fetch currently logged-in user profile
          const meResponse = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const meData = await meResponse.json();

          if (!meResponse.ok || !meData.user) {
            showToast('Session expired. Please log in again.', 'danger');
            setTimeout(() => { window.location.href = '/login'; }, 1500);
            return;
          }

          const user = meData.user;

          // Submit donation offer attempt
          const attemptResponse = await fetch('/api/donation-attempts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              request_id: parseInt(requestId),
              donor_id: user.id,
              donor_name: user.fullname,
              donor_phone: user.phone || '',
              donor_email: user.email,
              questionnaire_passed: true
            })
          });

          const attemptData = await attemptResponse.json();

          if (attemptResponse.status === 409) {
            showToast('You have already submitted an offer for this request.', 'warning');
            btn.textContent = 'Offered';
            btn.style.background = '#16A34A';
            return;
          }

          if (!attemptResponse.ok) {
            throw new Error(attemptData.message || 'Failed to submit response');
          }

          btn.textContent = 'Sent';
          btn.style.background = '#16A34A';
          showToast(`Offer successfully sent to ${hospitalName} (${bloodType})`, 'success');

        } catch (error) {
          console.error('[RESPOND] Error submitting offer:', error);
          showToast(error.message || 'Error sending response. Please try again.', 'danger');
          btn.disabled = false;
          btn.textContent = 'Respond';
        }
      }
    });
  }

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


//Login Redirection 

document.getElementById("btn-login").addEventListener("click", function () {
  window.location.href = "/login";
});

//Signup Redirection
document.getElementById("btn-register").addEventListener("click", function () {
  window.location.href = "/signup";
});

//AboutUS Redirection
document.getElementById("about-us").addEventListener("click", function () {
  window.location.href = "/aboutUs";
});

document.getElementById("events").addEventListener("click", function () {
  window.location.href = "/events";
});


//ActiveRequest Redirection
document.getElementById("active-request").addEventListener("click", function () {
  window.location.href = "/activeRequests";
});