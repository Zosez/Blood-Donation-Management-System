document.addEventListener('DOMContentLoaded', function () {

  // ──────────────────────────────────────────────
  // Authorization Check
  // ──────────────────────────────────────────────
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login';
    return;
  }

  const form      = document.getElementById('donorForm');
  const btnSubmit = document.querySelector('.btn-submit');
  const btnCancel = document.querySelector('.btn-cancel');

  /* ── Toast ── */
  function showToast(msg, type = 'info', duration = 3500) {
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      Object.assign(t.style, {
        position: 'fixed', bottom: '1.5rem', right: '1.5rem',
        padding: '.8rem 1.1rem', borderRadius: '10px',
        fontFamily: "'Inter', sans-serif", fontWeight: '600',
        fontSize: '.85rem', zIndex: '9999',
        boxShadow: '0 8px 24px rgba(0,0,0,.15)',
        opacity: '0', transition: '.3s', maxWidth: '360px'
      });
      document.body.appendChild(t);
    }
    const colors = {
      success: { bg: '#f0fdf4', border: '#86efac', color: '#166534' },
      danger:  { bg: '#fef2f2', border: '#fca5a5', color: '#991b1b' },
      warning: { bg: '#fff7ed', border: '#fdba74', color: '#92400e' },
      info:    { bg: '#eff6ff', border: '#93c5fd', color: '#1e40af' },
    };
    const c = colors[type] || colors.info;
    Object.assign(t.style, {
      background: c.bg, border: `1px solid ${c.border}`, color: c.color, opacity: '0'
    });
    t.textContent = msg;
    requestAnimationFrame(() => { t.style.opacity = '1'; });
    clearTimeout(t._hide);
    t._hide = setTimeout(() => { t.style.opacity = '0'; }, duration);
  }

  /* ── Field errors ── */
  function setError(el, msg) {
    el.classList.add('error');
    let e = el.parentElement.querySelector('.error-msg');
    if (!e) { e = document.createElement('span'); e.className = 'error-msg'; el.parentElement.appendChild(e); }
    e.textContent = msg; e.classList.add('show');
  }
  function clearError(el) {
    el.classList.remove('error');
    const e = el.parentElement.querySelector('.error-msg');
    if (e) e.classList.remove('show');
  }
  document.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('input',  () => clearError(el));
    el.addEventListener('change', () => clearError(el));
  });

  /* ── Validate ── */
  function validate() {
    let ok = true;

    // Blood type
    const btEl = document.getElementById('bloodType');
    if (!btEl.value) { setError(btEl, 'Blood type is required.'); ok = false; }

    // Phone
    const phoneEl = document.getElementById('phone');
    if (!phoneEl.value.trim()) { setError(phoneEl, 'Phone number is required.'); ok = false; }

    // Province
    const provEl = document.getElementById('province');
    if (!provEl.value) { setError(provEl, 'Province is required.'); ok = false; }

    // District / city
    const distEl = document.getElementById('district');
    if (!distEl.value) { setError(distEl, 'District / City is required.'); ok = false; }

    return ok;
  }

  /* ── Pre-fill user data from localStorage ── */
  try {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const phoneEl = document.getElementById('phone');
    const emailEl = document.getElementById('email');
    if (phoneEl && userData.phone) phoneEl.value = userData.phone;
    if (emailEl && userData.email) emailEl.value = userData.email;

    // Pre-select blood type
    const btEl = document.getElementById('bloodType');
    if (btEl && userData.blood_type) {
      [...btEl.options].forEach(opt => {
        if (opt.text.replace('−', '-') === userData.blood_type ||
            opt.text === userData.blood_type) {
          opt.selected = true;
        }
      });
    }
  } catch (_) {}

  /* ── Lock form when user is unavailable ── */
  function lockFormUnavailable(msg) {
    btnSubmit.textContent  = '🚫 Availability Required';
    btnSubmit.disabled     = true;
    btnSubmit.style.background     = 'linear-gradient(135deg,#6B7280,#4B5563)';
    btnSubmit.style.cursor         = 'not-allowed';

    // Show a prominent banner at top of form
    const existing = document.getElementById('unavail-banner');
    if (existing) return; // already shown
    const banner = document.createElement('div');
    banner.id = 'unavail-banner';
    Object.assign(banner.style, {
      background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '10px',
      padding: '.85rem 1.1rem', marginBottom: '1.2rem', color: '#92400e',
      fontSize: '.85rem', fontWeight: '600', fontFamily: "'Inter', sans-serif",
      lineHeight: '1.5', display: 'flex', alignItems: 'flex-start', gap: '8px'
    });
    banner.innerHTML = `<span style="font-size:1.1rem;flex-shrink:0;">⚠️</span><span>${msg}</span>`;
    const firstField = form?.firstElementChild;
    if (firstField) form.insertBefore(banner, firstField);
    else document.querySelector('.form-card')?.prepend(banner);
  }

  /* ── Check user availability then duplicate registrations ── */
  async function checkUserStatus() {
    try {
      // 1. Fetch live user data from /api/auth/me
      const meRes = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (meRes.ok) {
        const { user } = await meRes.json();

        if (user.on_cooldown && user.cooldown_days_remaining > 0) {
          lockFormUnavailable(
            `You are in a post-donation cooldown period. You can register again in <strong>${user.cooldown_days_remaining} day${user.cooldown_days_remaining === 1 ? '' : 's'}</strong>.`
          );
          return; // stop further checks
        }

        if (!user.is_available_donor) {
          lockFormUnavailable(
            'Your availability is currently set to <strong>OFF</strong>. Please enable your availability from your dashboard before registering as a donor.'
          );
          return; // stop further checks
        }
      }

      // 2. Check for existing pending/approved registration
      const regRes = await fetch('/api/donor-registrations/my', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!regRes.ok) return;
      const { registrations } = await regRes.json();

      const pending  = registrations?.find(r => r.status === 'pending');
      const approved = registrations?.find(r => r.status === 'approved');

      if (approved) {
        btnSubmit.textContent  = '✓ Already a Registered Donor';
        btnSubmit.disabled     = true;
        btnSubmit.style.background = 'linear-gradient(135deg,#16a34a,#15803d)';
        showToast('Your donor registration is already approved!', 'success', 4000);
      } else if (pending) {
        btnSubmit.textContent  = 'Registration Pending Review';
        btnSubmit.disabled     = true;
        btnSubmit.style.background = 'linear-gradient(135deg,#D97706,#B45309)';
        showToast('You already have a pending donor registration awaiting admin review.', 'warning', 5000);
      }
    } catch (err) {
      console.warn('Could not check user status:', err);
    }
  }
  checkUserStatus();

  /* ── Submit ── */
  btnSubmit.addEventListener('click', async () => {
    if (!validate()) return;

    const bloodTypeEl  = document.getElementById('bloodType');
    const donationTypeEl = document.getElementById('donationType');
    const availLevel   = document.querySelector('input[name="avail"]:checked')?.value || 'normal';
    const phoneEl      = document.getElementById('phone');
    const emailEl      = document.getElementById('email');
    const hospitalEl   = document.getElementById('hospital');
    const provinceEl   = document.getElementById('province');
    const districtEl   = document.getElementById('district');
    const lastDonEl    = document.getElementById('lastDonated');
    const relEl        = document.getElementById('relationship');
    const notesEl      = document.getElementById('notes');

    // Normalize blood type (replace − with -)
    const bloodType = bloodTypeEl.value.replace('−', '-');

    // Parse last donated mm/dd/yyyy → ISO
    let lastDonated = null;
    if (lastDonEl?.value?.trim()) {
      const parts = lastDonEl.value.split('/');
      if (parts.length === 3) {
        lastDonated = `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`;
      }
    }

    const payload = {
      blood_type:         bloodType,
      donation_type:      donationTypeEl?.value || 'Whole Blood',
      availability_level: availLevel,
      phone:              phoneEl?.value?.trim() || '',
      email:              emailEl?.value?.trim() || '',
      hospital:           hospitalEl?.value?.trim() || '',
      province:           provinceEl?.value || '',
      city:               districtEl?.value || '',
      last_donated:       lastDonated,
      relationship:       relEl?.value || '',
      notes:              notesEl?.value?.trim() || ''
    };

    btnSubmit.textContent = 'Submitting…';
    btnSubmit.disabled    = true;

    try {
      const res = await fetch('/api/donor-registrations', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        btnSubmit.textContent  = '✓ Submitted for Review!';
        btnSubmit.style.background = 'linear-gradient(135deg,#16a34a,#15803d)';
        showToast('Registration submitted! An admin will review your request.', 'success', 5000);
        form.reset();
        // Keep button disabled to prevent re-submit
        setTimeout(() => {
          btnSubmit.textContent = 'Registration Pending Review';
          btnSubmit.style.background = 'linear-gradient(135deg,#D97706,#B45309)';
        }, 3000);
      } else if (res.status === 409) {
        // Duplicate pending
        btnSubmit.textContent  = 'Registration Pending Review';
        btnSubmit.style.background = 'linear-gradient(135deg,#D97706,#B45309)';
        showToast(data.message || 'You already have a pending registration.', 'warning', 5000);
      } else {
        btnSubmit.textContent = 'Register as Donor';
        btnSubmit.disabled    = false;
        btnSubmit.style.background = '';
        const errMsg = data.errors
          ? data.errors.map(e => e.msg).join(', ')
          : (data.message || 'Submission failed. Please try again.');
        showToast(errMsg, 'danger');
      }
    } catch (err) {
      console.error('Donor registration error:', err);
      btnSubmit.textContent = 'Register as Donor';
      btnSubmit.disabled    = false;
      btnSubmit.style.background = '';
      showToast('Network error. Please check your connection and try again.', 'danger');
    }
  });

  /* ── Cancel ── */
  btnCancel.addEventListener('click', () => {
    if (confirm('Cancel registration? All entered data will be lost.')) {
      form.reset();
      document.querySelectorAll('input,select,textarea').forEach(clearError);
      showToast('Form cleared.', 'info');
    }
  });

  /* ── Auto date format mm/dd/yyyy ── */
  document.querySelectorAll('input[data-date]').forEach(inp => {
    inp.addEventListener('input', function () {
      let v = this.value.replace(/\D/g, '');
      if (v.length >= 3) v = v.slice(0,2) + '/' + v.slice(2);
      if (v.length >= 6) v = v.slice(0,5) + '/' + v.slice(5,9);
      this.value = v;
    });
  });
});

/* ── Province → District dynamic population ── */
document.addEventListener('DOMContentLoaded', function () {
  const districts = {
    koshi:         ['Bhojpur','Dhankuta','Ilam','Jhapa','Khotang','Morang','Okhaldhunga','Panchthar','Sankhuwasabha','Solukhumbu','Sunsari','Taplejung','Terhathum','Udayapur'],
    madhesh:       ['Bara','Dhanusha','Mahottari','Parsa','Rautahat','Saptari','Sarlahi','Siraha'],
    bagmati:       ['Bhaktapur','Chitwan','Dhading','Dolakha','Kathmandu','Kavrepalanchok','Lalitpur','Makwanpur','Nuwakot','Ramechhap','Rasuwa','Sindhuli','Sindhupalchok'],
    gandaki:       ['Baglung','Gorkha','Kaski','Lamjung','Manang','Mustang','Myagdi','Nawalpur','Parbat','Syangja','Tanahun'],
    lumbini:       ['Arghakhanchi','Banke','Bardiya','Dang','Eastern Rukum','Gulmi','Kapilvastu','Nawalparasi West','Palpa','Pyuthan','Rolpa','Rupandehi'],
    karnali:       ['Dailekh','Dolpa','Humla','Jajarkot','Jumla','Kalikot','Mugu','Salyan','Surkhet','Western Rukum'],
    sudurpashchim: ['Achham','Baitadi','Bajhang','Bajura','Dadeldhura','Darchula','Doti','Kailali','Kanchanpur'],
  };
  const provinceEl = document.getElementById('province');
  const districtEl = document.getElementById('district');
  if (provinceEl && districtEl) {
    provinceEl.addEventListener('change', function () {
      const opts = districts[this.value] || [];
      districtEl.innerHTML = '<option value="" disabled selected>Select District</option>';
      opts.forEach(d => {
        const o = document.createElement('option');
        o.value = d.toLowerCase().replace(/\s+/g, '-');
        o.textContent = d;
        districtEl.appendChild(o);
      });
      districtEl.disabled = false;
    });
  }
});

document.getElementById("dashboard").addEventListener("click", () => {
    window.location.href = "/userdashboard";
});
