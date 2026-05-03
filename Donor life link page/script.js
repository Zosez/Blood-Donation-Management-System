document.addEventListener('DOMContentLoaded', function () {

  const form      = document.getElementById('donorForm');
  const btnSubmit = document.querySelector('.btn-submit');
  const btnCancel = document.querySelector('.btn-cancel');

  /* ── Toast ── */
  function showToast(msg, duration = 3200) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), duration);
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
    const req = [
      { id: 'firstName',    msg: 'First name is required.' },
      { id: 'lastName',     msg: 'Last name is required.' },
      { id: 'dob',          msg: 'Date of birth is required.' },
      { id: 'phone',        msg: 'Phone number is required.' },
      { id: 'province',     msg: 'Province is required.' },
      { id: 'district',     msg: 'District / City is required.' },
    ];
    req.forEach(({ id, msg }) => {
      const el = document.getElementById(id);
      if (!el.value.trim()) { setError(el, msg); ok = false; }
    });
    if (!document.getElementById('bloodType').value) {
      setError(document.getElementById('bloodType'), 'Blood type is required.');
      ok = false;
    }
    return ok;
  }

  /* ── Submit ── */
  btnSubmit.addEventListener('click', () => {
    if (!validate()) return;
    btnSubmit.textContent = 'Submitting…';
    btnSubmit.disabled = true;
    setTimeout(() => {
      btnSubmit.textContent = '✓ Registered Successfully!';
      btnSubmit.style.background = 'linear-gradient(135deg,#16a34a,#15803d)';
      showToast('You are now registered as a donor!', 4000);
      setTimeout(() => {
        btnSubmit.textContent = 'Register as Donor';
        btnSubmit.style.background = '';
        btnSubmit.disabled = false;
        form.reset();
      }, 3000);
    }, 1200);
  });

  /* ── Cancel ── */
  btnCancel.addEventListener('click', () => {
    if (confirm('Cancel registration? All entered data will be lost.')) {
      form.reset();
      document.querySelectorAll('input,select,textarea').forEach(clearError);
      showToast('Form cleared.');
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

/* ── Province → District dynamic population (injected fix) ── */
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
