// ── Nepal Province & City Data ──
const nepalData = {
  'Koshi Province': [
    'Biratnagar','Dharan','Itahari','Birtamod','Damak','Mechinagar',
    'Urlabari','Inaruwa','Triyuga','Khandbari','Bhojpur','Diktel',
    'Chainpur','Taplejung','Phidim','Ilam','Terhathum'
  ],
  'Madhesh Province': [
    'Janakpur','Birgunj','Rajbiraj','Lahan','Gaur','Malangwa',
    'Jaleshwar','Bardibas','Kalaiya','Simara','Pathlaiya',
    'Mirchaiya','Haripur','Dhangadhi (Saptari)'
  ],
  'Bagmati Province': [
    'Kathmandu','Lalitpur','Bhaktapur','Kirtipur','Madhyapur Thimi',
    'Hetauda','Bharatpur','Bidur','Dhulikhel','Banepa','Panauti',
    'Sindhuli','Ramechhap','Dolakha','Nuwakot','Rasuwa','Makwanpur'
  ],
  'Gandaki Province': [
    'Pokhara','Gorkha','Damauli','Baglung','Beni','Waling',
    'Kushma','Manang','Mustang','Myagdi','Kaski','Lamjung',
    'Syangja','Tanahu','Parbat','Nawalpur'
  ],
  'Lumbini Province': [
    'Butwal','Bhairahawa (Siddharthanagar)','Tansen','Tulsipur',
    'Ghorahi','Dang','Kapilvastu','Arghakhanchi','Gulmi',
    'Palpa','Pyuthan','Rolpa','Rukum East','Banke','Bardiya'
  ],
  'Karnali Province': [
    'Birendranagar (Surkhet)','Jumla','Dailekh','Jajarkot',
    'Dolpa','Humla','Kalikot','Mugu','Salyan','Rukum West'
  ],
  'Sudurpashchim Province': [
    'Dhangadhi','Mahendranagar','Tikapur','Dipayal-Silgadhi',
    'Dadeldhura','Darchula','Baitadi','Bajhang','Bajura',
    'Achham','Doti'
  ]
};

const provinceSelect = document.getElementById('province');
const citySelect     = document.getElementById('city');

// Populate provinces
Object.keys(nepalData).forEach(province => {
  const opt = document.createElement('option');
  opt.value = province;
  opt.textContent = province;
  provinceSelect.appendChild(opt);
});

// On province change → populate cities
provinceSelect.addEventListener('change', () => {
  const cities = nepalData[provinceSelect.value] || [];
  citySelect.innerHTML = '<option value="" disabled selected>Select city / district</option>';
  cities.sort().forEach(city => {
    const opt = document.createElement('option');
    opt.value = city;
    opt.textContent = city;
    citySelect.appendChild(opt);
  });
  citySelect.disabled = false;
});


const pwInput = document.getElementById('password');
document.getElementById('togglePw').addEventListener('click', () => {
  pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
});

// Password strength
const strengthFill  = document.getElementById('strengthFill');
const strengthLabel = document.getElementById('strengthLabel');
const levels = [
  { width: '25%',  color: '#EF4444', text: 'STRENGTH: WEAK'   },
  { width: '50%',  color: '#F97316', text: 'STRENGTH: FAIR'   },
  { width: '75%',  color: '#EAB308', text: 'STRENGTH: GOOD'   },
  { width: '100%', color: '#16A34A', text: 'STRENGTH: STRONG' },
];
pwInput.addEventListener('input', () => {
  const pw = pwInput.value;
  if (!pw) { strengthFill.style.width = '0%'; strengthLabel.style.color = 'transparent'; return; }
  let score = [pw.length >= 8, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
  const l = levels[score - 1] || levels[0];
  strengthFill.style.width = l.width;
  strengthFill.style.background = strengthLabel.style.color = l.color;
  strengthLabel.textContent = l.text;
});

// Email validation
const emailInput = document.getElementById('email');
const emailError = document.getElementById('emailError');
const isValidEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

function setEmailState(valid, msg = '') {
  emailInput.classList.toggle('input-error', !valid);
  emailInput.classList.toggle('input-valid', valid);
  emailError.textContent = msg;
  emailError.style.display = msg ? 'block' : 'none';
}

emailInput.addEventListener('blur', () => {
  if (!emailInput.value) return setEmailState(false, '');
  setEmailState(isValidEmail(emailInput.value), isValidEmail(emailInput.value) ? '' : 'Please enter a valid email (e.g. john@example.com).');
});
emailInput.addEventListener('input', () => {
  if (emailInput.classList.contains('input-error') && isValidEmail(emailInput.value)) setEmailState(true);
});

// Password match validation helpers
const confirmInput = document.getElementById('confirmPassword');

function setPasswordError(input, errorId, msg) {
  let errorEl = document.getElementById(errorId);
  if (!errorEl) {
    errorEl = document.createElement('span');
    errorEl.id = errorId;
    errorEl.className = 'field-error';
    input.closest('.form-group').appendChild(errorEl);
  }
  input.classList.toggle('input-error', !!msg);
  input.classList.toggle('input-valid', !msg && input.value.length > 0);
  errorEl.textContent = msg;
  errorEl.style.display = msg ? 'block' : 'none';
}

pwInput.addEventListener('blur', () => {
  if (!pwInput.value) {
    setPasswordError(pwInput, 'passwordError', 'Password is required.');
  } else if (pwInput.value.length < 8) {
    setPasswordError(pwInput, 'passwordError', 'Password must be at least 8 characters.');
  } else {
    setPasswordError(pwInput, 'passwordError', '');
  }
});

confirmInput.addEventListener('blur', () => {
  if (!confirmInput.value) {
    setPasswordError(confirmInput, 'confirmPasswordError', 'Please confirm your password.');
  } else if (confirmInput.value !== pwInput.value) {
    setPasswordError(confirmInput, 'confirmPasswordError', 'Passwords do not match.');
  } else {
    setPasswordError(confirmInput, 'confirmPasswordError', '');
  }
});

// ── Birth Date validation ──
const birthDateInput = document.getElementById('birthDate');
const birthDateError = document.getElementById('birthDateError');

// Set max date to today (no future births)
(function() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm   = String(today.getMonth() + 1).padStart(2, '0');
  const dd   = String(today.getDate()).padStart(2, '0');
  birthDateInput.max = `${yyyy}-${mm}-${dd}`;
})();

function setBirthDateError(msg) {
  birthDateInput.classList.toggle('input-error', !!msg);
  birthDateInput.classList.toggle('input-valid', !msg && !!birthDateInput.value);
  birthDateError.textContent = msg;
  birthDateError.style.display = msg ? 'block' : 'none';
}

function validateBirthDate() {
  const val = birthDateInput.value;
  if (!val) {
    setBirthDateError('Date of Birth is required.');
    return false;
  }
  const dob   = new Date(val);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  if (age < 18) {
    setBirthDateError('You must be at least 18 years old to register.');
    return false;
  }
  setBirthDateError('');
  return true;
}

birthDateInput.addEventListener('blur',  validateBirthDate);
birthDateInput.addEventListener('change', validateBirthDate);

// ── Blood Type validation ──
const bloodTypeSelect = document.getElementById('bloodType');
const bloodTypeError  = document.getElementById('bloodTypeError');

function setBloodTypeError(msg) {
  bloodTypeSelect.classList.toggle('input-error', !!msg);
  bloodTypeSelect.classList.toggle('input-valid', !msg && !!bloodTypeSelect.value);
  bloodTypeError.textContent = msg;
  bloodTypeError.style.display = msg ? 'block' : 'none';
}

function validateBloodType() {
  if (!bloodTypeSelect.value) {
    setBloodTypeError('Please select your blood type.');
    return false;
  }
  setBloodTypeError('');
  return true;
}

bloodTypeSelect.addEventListener('change', validateBloodType);
bloodTypeSelect.addEventListener('blur',   validateBloodType);

// Form submit
document.getElementById('signupForm').addEventListener('submit', e => {
  e.preventDefault();

  let hasError = false;

  // Email validation
  if (!emailInput.value.trim()) {
    setEmailState(false, 'Email address is required.');
    if (!hasError) { emailInput.focus(); hasError = true; }
  } else if (!isValidEmail(emailInput.value)) {
    setEmailState(false, 'Please enter a valid email (e.g. john@example.com).');
    if (!hasError) { emailInput.focus(); hasError = true; }
  }

  // Password required
  if (!pwInput.value) {
    setPasswordError(pwInput, 'passwordError', 'Password is required.');
    if (!hasError) { pwInput.focus(); hasError = true; }
  } else if (pwInput.value.length < 8) {
    setPasswordError(pwInput, 'passwordError', 'Password must be at least 8 characters.');
    if (!hasError) { pwInput.focus(); hasError = true; }
  } else {
    setPasswordError(pwInput, 'passwordError', '');
  }

  // Confirm password
  if (!confirmInput.value) {
    setPasswordError(confirmInput, 'confirmPasswordError', 'Please confirm your password.');
    if (!hasError) { confirmInput.focus(); hasError = true; }
  } else if (confirmInput.value !== pwInput.value) {
    setPasswordError(confirmInput, 'confirmPasswordError', 'Passwords do not match.');
    if (!hasError) { confirmInput.focus(); hasError = true; }
  } else {
    setPasswordError(confirmInput, 'confirmPasswordError', '');
  }

  // Birth date validation
  if (!validateBirthDate()) {
    if (!hasError) { birthDateInput.focus(); hasError = true; }
  }

  // Blood type validation
  if (!validateBloodType()) {
    if (!hasError) { bloodTypeSelect.focus(); hasError = true; }
  }

  if (hasError) return;

  const btn = e.target.querySelector('.btn-submit');
  btn.textContent = 'Creating account…';
  btn.disabled = true;
  setTimeout(() => { btn.textContent = '✓ Account Created!'; btn.style.background = '#16A34A'; }, 1500);
});