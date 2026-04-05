// LifeLink – Reset Password Script

function toggleVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  const svgs = btn.querySelectorAll('svg');
  if (svgs.length === 2) {
    svgs[0].style.display = isPassword ? 'none' : 'block';
    svgs[1].style.display = isPassword ? 'block' : 'none';
  }
}

function checkStrength(val) {
  const fill = document.getElementById('strengthFill');
  const text = document.getElementById('strengthText');
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;

  if (!val) {
    fill.style.width = '0%';
    text.textContent = '—';
    text.style.color = '#9CA3AF';
    return;
  }

  const levels = [
    { w: '25%',  label: 'Weak',   color: '#EF4444' },
    { w: '50%',  label: 'Fair',   color: '#B91C1C' },
    { w: '75%',  label: 'Good',   color: '#F59E0B' },
    { w: '100%', label: 'Strong', color: '#16A34A' },
  ];
  const lvl = levels[score - 1] || levels[0];
  fill.style.width = lvl.w;
  fill.style.background = lvl.color;
  text.textContent = lvl.label;
  text.style.color = lvl.color;
}

function handleReset() {
  const newPw     = document.getElementById('newPassword').value;
  const confirmPw = document.getElementById('confirmPassword').value;
  const newErr    = document.getElementById('newPasswordError');
  const confirmErr= document.getElementById('confirmPasswordError');
  const btn       = document.getElementById('resetBtn');
  let valid = true;

  // Clear previous errors
  newErr.textContent = '';
  confirmErr.textContent = '';
  document.getElementById('newPassword').classList.remove('is-error');
  document.getElementById('confirmPassword').classList.remove('is-error');

  // Validate new password
  if (!newPw) {
    newErr.textContent = 'Password is required.';
    document.getElementById('newPassword').classList.add('is-error');
    valid = false;
  } else if (newPw.length < 8) {
    newErr.textContent = 'Password must be at least 8 characters.';
    document.getElementById('newPassword').classList.add('is-error');
    valid = false;
  }

  // Validate confirm password
  if (!confirmPw) {
    confirmErr.textContent = 'Please confirm your password.';
    document.getElementById('confirmPassword').classList.add('is-error');
    valid = false;
  } else if (newPw !== confirmPw) {
    confirmErr.textContent = 'Passwords do not match.';
    document.getElementById('confirmPassword').classList.add('is-error');
    valid = false;
  }

  if (!valid) return;

  // Simulate API call
  btn.textContent = 'Resetting…';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = '✓ Password Reset!';
    btn.style.background = 'linear-gradient(135deg,#16A34A,#15803D)';
  }, 1200);
}
