document.addEventListener('DOMContentLoaded', async () => {
  const API_URL = 'http://localhost:5000/api';
  const token = localStorage.getItem('token');

  /* ─── HELPER: Format location from city and province ─── */
  function formatLocation(city, province) {
    if (city && province) return `${city}, ${province}`;
    if (city) return city;
    if (province) return province;
    return 'Not Set';
  }

  /* ─── HELPER: Format date (Mon YYYY) ─── */
  function formatMemberDate(createdAt) {
    if (!createdAt) return 'N/A';
    const date = new Date(createdAt);
    const options = { month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-US', options); // e.g., "Jan 2022"
  }

  /* ─── HELPER: Determine donation status ─── */
  function determineDonationStatus(isAvailableDonor, nextEligibleDate) {
    if (!isAvailableDonor) return { status: 'Not Available', class: 'status-unavailable' };
    
    if (nextEligibleDate) {
      const eligible = new Date(nextEligibleDate);
      const today = new Date();
      if (today >= eligible) {
        return { status: 'Eligible', class: 'status-eligible' };
      } else {
        const daysLeft = Math.ceil((eligible - today) / (1000 * 60 * 60 * 24));
        return { status: `In ${daysLeft}d`, class: 'status-pending' };
      }
    }
    return { status: 'Eligible', class: 'status-eligible' };
  }

  /* ─── UPDATE META LIST ─── */
  function updateMetaList(user) {
    // Location
    const locEl = document.getElementById('metaLocation');
    if (locEl) {
      locEl.textContent = formatLocation(user.city, user.province);
    }

    // Member Since
    const memberEl = document.getElementById('metaMemberSince');
    if (memberEl) {
      memberEl.textContent = formatMemberDate(user.created_at);
    }

    // Status
    const statusEl = document.getElementById('metaStatus');
    const statusTextEl = document.getElementById('statusText');
    if (statusEl && statusTextEl) {
      const { status, class: statusClass } = determineDonationStatus(user.is_available_donor, user.next_eligible_date);
      statusTextEl.textContent = status;
      
      // Update class for styling
      statusEl.className = `meta-val ${statusClass}`;
      // Re-add the status-dot span
      const dot = document.createElement('span');
      dot.className = 'status-dot';
      statusEl.innerHTML = '';
      statusEl.appendChild(dot);
      statusEl.appendChild(statusTextEl);
    }

    // ─── Update Donation Window Card ───
    const daysEl = document.getElementById('daysUntilEligible');
    const dateEl = document.getElementById('nextEligibleDateDisplay');
    
    if (daysEl) {
      const daysUntil = user.days_until_eligible || 0;
      daysEl.textContent = daysUntil;
    }

    if (dateEl && user.next_eligible_date) {
      const eligibleDate = new Date(user.next_eligible_date);
      const options = { month: 'short', day: 'numeric', year: 'numeric' };
      dateEl.textContent = eligibleDate.toLocaleDateString('en-US', options); // e.g., "Mar 28, 2024"
    } else if (dateEl) {
      dateEl.textContent = 'Not Set';
    }
  }

  /* ─── 0. LOAD USER DATA FROM API ─── */
  async function loadUserData() {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to load user data');
      
      const data = await res.json();
      const user = data.user;
      
      // Update sidebar profile
      const userNameEl = document.querySelector('.user-name');
      const userEmailEl = document.querySelector('.user-email');
      const bloodTagEl = document.querySelector('.tag-val');
      const navAvatarName = document.querySelector('.nav-avatar-name');
      
      if (userNameEl) userNameEl.textContent = user.fullname || 'User';
      if (userEmailEl) userEmailEl.textContent = user.email || '';
      if (bloodTagEl) bloodTagEl.textContent = user.blood_type || 'Not Set';
      if (navAvatarName) navAvatarName.textContent = user.fullname?.split(' ')[0] || user.fullname || 'User';
      
      // Fill in form fields
      const fullNameEl = document.getElementById('fullName');
      const emailEl = document.getElementById('email');
      const phoneEl = document.getElementById('phone');
      const cityEl = document.getElementById('city');
      const dobEl = document.getElementById('dob');
      
      if (fullNameEl) fullNameEl.value = user.fullname || '';
      if (emailEl) emailEl.value = user.email || '';
      if (phoneEl) phoneEl.value = user.phone || '';
      if (cityEl) cityEl.value = user.city || '';
      if (dobEl && user.date_of_birth) {
        dobEl.value = user.date_of_birth.split('T')[0]; // Format for date input
      }

      // ─── Populate Meta List (Location, Member Since, Status) ───
      updateMetaList(user);

      return user;
    } catch (error) {
      console.error('Load user data error:', error);
      showToast('Failed to load user data', 'error');
    }
  }

  const userData = await loadUserData();

  /* ─── 1. TAB SWITCHING ─── */
  const tabs      = document.querySelectorAll('.tab');
  const panels    = document.querySelectorAll('.tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById('tab-' + target).classList.add('active');
    });
  });


  /* ─── 2. SAVE CHANGES ─── */
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const name  = document.getElementById('fullName')?.value?.trim();
      const phone = document.getElementById('phone')?.value?.trim();
      const city  = document.getElementById('city')?.value?.trim();
      const dob   = document.getElementById('dob')?.value?.trim();

      if (!name || !phone || !city) {
        showToast('Please fill in all required fields.', 'warn');
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      try {
        const res = await fetch(`${API_URL}/auth/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            fullname: name,
            phone: phone,
            city: city,
            date_of_birth: dob || null
          })
        });

        const data = await res.json();

        if (res.ok) {
          // Update sidebar name
          const userNameEl = document.querySelector('.user-name');
          if (userNameEl) userNameEl.textContent = name;

          saveBtn.textContent = '✓ Saved!';
          saveBtn.style.background = '#16A34A';
          setTimeout(() => {
            saveBtn.textContent = 'Save Changes';
            saveBtn.style.background = '';
            saveBtn.disabled = false;
          }, 2200);

          showToast('Profile updated successfully!');
        } else {
          showToast(data.message || 'Failed to update profile', 'error');
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Changes';
        }
      } catch (error) {
        console.error('Save profile error:', error);
        showToast('Server error occurred', 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
      }
    });
  }


  /* ─── 3. DISCARD CHANGES ─── */
  const discardBtn = document.getElementById('discardBtn');
  const origValues = {};

  // Store original values on load
  ['fullName', 'phone', 'city', 'email', 'dob'].forEach(id => {
    const el = document.getElementById(id);
    if (el) origValues[id] = el.value;
  });

  if (discardBtn) {
    discardBtn.addEventListener('click', () => {
      Object.entries(origValues).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
      });
      showToast(' Changes discarded.', 'info');
    });
  }


  /* ─── 4. PASSWORD UPDATE ─── */
  const pwdSaveBtn = document.getElementById('pwdSaveBtn');
  if (pwdSaveBtn) {
    pwdSaveBtn.addEventListener('click', async () => {
      const current = document.getElementById('currentPwd')?.value;
      const next    = document.getElementById('newPwd')?.value;
      const confirm = document.getElementById('confirmPwd')?.value;

      if (!current || !next || !confirm) {
        showToast('Please fill in all password fields.', 'warn');
        return;
      }
      if (next.length < 8) {
        showToast('New password must be at least 8 characters.', 'warn');
        return;
      }
      if (next !== confirm) {
        showToast('Passwords do not match.', 'error');
        highlightError('confirmPwd');
        return;
      }

      pwdSaveBtn.disabled = true;
      pwdSaveBtn.textContent = 'Updating...';

      try {
        const res = await fetch(`${API_URL}/auth/change-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            currentPassword: current,
            newPassword: next,
            confirmPassword: confirm
          })
        });

        const data = await res.json();

        if (res.ok) {
          ['currentPwd', 'newPwd', 'confirmPwd'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
          });

          pwdSaveBtn.textContent = '✓ Updated!';
          pwdSaveBtn.style.background = '#16A34A';
          setTimeout(() => {
            pwdSaveBtn.textContent = 'Update Password';
            pwdSaveBtn.style.background = '';
            pwdSaveBtn.disabled = false;
          }, 2200);

          showToast('Password updated successfully!');
        } else {
          showToast(data.message || 'Failed to update password', 'error');
          pwdSaveBtn.disabled = false;
          pwdSaveBtn.textContent = 'Update Password';
        }
      } catch (error) {
        console.error('Change password error:', error);
        showToast('Server error occurred', 'error');
        pwdSaveBtn.disabled = false;
        pwdSaveBtn.textContent = 'Update Password';
      }
    });
  }


  /* ─── 6. AVATAR EDIT ─── */
  const avatarEdit = document.querySelector('.avatar-edit');
  if (avatarEdit) {
    avatarEdit.addEventListener('click', () => {
      showToast('📷 Photo upload coming soon!', 'info');
    });
  }


  /* ─── 7. PROGRESS BAR ANIMATION ─── */
  const bar = document.querySelector('.progress-bar-fill');
  if (bar) {
    const targetW = bar.style.width;
    bar.style.width = '0%';
    setTimeout(() => { bar.style.width = targetW; }, 400);
  }


  /* ─── 8. HIGHLIGHT ERROR INPUT ─── */
  function highlightError(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.borderColor = '#C0281C';
    el.style.boxShadow   = '0 0 0 3px rgba(192,40,28,0.12)';
    el.focus();
    setTimeout(() => {
      el.style.borderColor = '';
      el.style.boxShadow   = '';
    }, 2500);
  }


  /* ─── 9. TOAST NOTIFICATION ─── */
  let toastTimeout = null;
  let activeToast  = null;

  function showToast(message, type = 'success') {
    const colors = {
      success: { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
      warn:    { bg: '#fff7ed', border: '#fdba74', text: '#92400e' },
      error:   { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
      info:    { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
      default: { bg: '#ffffff', border: '#e2e8f0', text: '#1e293b' },
    };

    const c = colors[type] || colors.default;

    if (toastTimeout) clearTimeout(toastTimeout);
    if (activeToast) activeToast.remove();

    const toast = document.createElement('div');
    toast.className = 'll-toast';
    toast.textContent = message;

    Object.assign(toast.style, {
      position:     'fixed',
      bottom:       '1.5rem',
      right:        '1.5rem',
      background:   c.bg,
      border:       `1px solid ${c.border}`,
      color:        c.text,
      borderRadius: '10px',
      padding:      '.85rem 1.1rem',
      fontFamily:   "'Outfit', sans-serif",
      fontWeight:   '600',
      fontSize:     '.88rem',
      boxShadow:    '0 8px 24px rgba(0,0,0,.12)',
      zIndex:       '9999',
      opacity:      '0',
      transform:    'translateY(20px)',
      transition:   '0.3s',
      maxWidth:     '420px',
      pointerEvents:'none',
    });

    document.body.appendChild(toast);
    activeToast = toast;

    requestAnimationFrame(() => {
      toast.style.opacity   = '1';
      toast.style.transform = 'translateY(0)';
    });

    toastTimeout = setTimeout(() => {
      toast.style.opacity   = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /* ─── AVATAR DROPDOWN ─── */
  const navAvatar      = document.getElementById('navAvatar');
  const avatarDropdown = document.getElementById('avatarDropdown');
  const logoutBtn      = document.getElementById('logoutBtn');
  const nameEl         = document.getElementById('nav-user-name');

  // Populate name from localStorage
  const userDataLocal = localStorage.getItem('user');
  if (userDataLocal && nameEl) {
    const user = JSON.parse(userDataLocal);
    nameEl.textContent = user.fullname?.split(' ')[0] || user.fullname || 'User';
  }

  navAvatar?.addEventListener('click', (e) => {
    e.stopPropagation();
    avatarDropdown?.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (navAvatar && avatarDropdown) {
      if (!navAvatar.contains(e.target) && !avatarDropdown.contains(e.target)) {
        avatarDropdown.classList.remove('show');
      }
    }
  });

  logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    avatarDropdown?.classList.remove('show');
    showToast('Signed out successfully.', 'success');
    setTimeout(() => { window.location.href = '/'; }, 1000);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') avatarDropdown?.classList.remove('show');
  });

});

// ───────── Home REDIRECT ─────────
document.getElementById("home-logo").addEventListener("click", () => {
    window.location.href = "/";
});

// ───────── bloodRequest REDIRECT ─────────
document.getElementById("blood-request").addEventListener("click", () => {
    window.location.href = "/bloodRequest";
});

// ───────── userProfile REDIRECT ─────────
document.getElementById("dashboard").addEventListener("click", () => {
    window.location.href = "/userDashboard";
});

document.getElementById("donations").addEventListener("click", () => {
    window.location.href = "/userDonations";
});
