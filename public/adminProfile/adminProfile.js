document.addEventListener('DOMContentLoaded', () => {
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
    toast.className = 'll-toast';
    toast.textContent = message;

    Object.assign(toast.style, {
      background: c.bg,
      border: `1px solid ${c.border}`,
      color: c.text,
      opacity: '0',
      transform: 'translateY(20px)'
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

  const navAvatar = document.getElementById('navAvatar');
  const avatarDropdown = document.getElementById('avatarDropdown');

  if (navAvatar && avatarDropdown) {
    navAvatar.addEventListener('click', (e) => {
      e.stopPropagation();
      avatarDropdown.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!navAvatar.contains(e.target) && !avatarDropdown.contains(e.target)) {
        avatarDropdown.classList.remove('show');
      }
    });
  }

  function handleLogout(e) {
    if (e) e.preventDefault();

    if (avatarDropdown) avatarDropdown.classList.remove('show');

    showToast('Logging out… Goodbye, Admin User!', 'warning');

    setTimeout(() => {
      showToast('Session ended. Redirecting…', 'danger');
    }, 1800);

    setTimeout(() => {
      window.location.href = '../login/login.html';
    }, 3000);
  }

  document.getElementById('dropdownLogoutBtn')?.addEventListener('click', handleLogout);
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

  document.getElementById('notifBtn')?.addEventListener('click', () => {
    showToast('You have 2 unread notifications.', 'info');
  });

  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  if (mobileMenuBtn && sidebar && sidebarOverlay) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.add('open');
      sidebarOverlay.classList.add('active');
    });

    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('active');
    });
  }

  const profileModal = document.getElementById('profileModal');
  const editProfileBtn = document.getElementById('editProfileBtn');
  const modalClose = document.getElementById('modalClose');
  const cancelProfileBtn = document.getElementById('cancelProfileBtn');
  const profileForm = document.getElementById('profileForm');

  const profileName = document.getElementById('profileName');
  const profileRole = document.getElementById('profileRole');
  const profileAdminId = document.getElementById('profileAdminId');
  const profileClearance = document.getElementById('profileClearance');
  const profileEmail = document.getElementById('profileEmail');
  const profilePhone = document.getElementById('profilePhone');
  const profileDepartment = document.getElementById('profileDepartment');

  function getDefaultProfile() {
    return {
      name: 'Admin User',
      role: 'Hematology Lead',
      adminId: 'ADM-7842',
      clearance: 'Level 5',
      email: 'admin@lifelink.com',
      phone: '+977 9800000000',
      department: 'Blood Operations'
    };
  }

  function saveProfile(profile) {
    localStorage.setItem('adminProfile', JSON.stringify(profile));
  }

  function loadProfile() {
    return JSON.parse(localStorage.getItem('adminProfile') || 'null') || getDefaultProfile();
  }

  function renderProfile(profile) {
    document.getElementById('displayName').textContent = profile.name;
    document.getElementById('displayRole').textContent = profile.role;
    document.getElementById('displayAdminId').textContent = profile.adminId;
    document.getElementById('displayClearance').textContent = profile.clearance;
    document.getElementById('displayDepartment').textContent = profile.department;

    document.getElementById('infoName').textContent = profile.name;
    document.getElementById('infoEmail').textContent = profile.email;
    document.getElementById('infoPhone').textContent = profile.phone;
    document.getElementById('infoRole').textContent = profile.role;

    document.querySelector('.dropdown-name').textContent = profile.name;
    document.querySelector('.dropdown-role').textContent = profile.role;

    const dropdownStrong = document.querySelectorAll('.dropdown-item strong');
    if (dropdownStrong[0]) dropdownStrong[0].textContent = profile.adminId;
    if (dropdownStrong[1]) dropdownStrong[1].textContent = profile.clearance;
  }

  function fillForm(profile) {
    profileName.value = profile.name;
    profileRole.value = profile.role;
    profileAdminId.value = profile.adminId;
    profileClearance.value = profile.clearance;
    profileEmail.value = profile.email;
    profilePhone.value = profile.phone;
    profileDepartment.value = profile.department;
  }

  function openModal() {
    fillForm(loadProfile());
    profileModal.classList.add('show');
  }

  function closeModal() {
    profileModal.classList.remove('show');
  }

  editProfileBtn?.addEventListener('click', openModal);
  modalClose?.addEventListener('click', closeModal);
  cancelProfileBtn?.addEventListener('click', closeModal);

  profileModal?.addEventListener('click', (e) => {
    if (e.target === profileModal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && profileModal?.classList.contains('show')) {
      closeModal();
    }
  });

  profileForm?.addEventListener('submit', (e) => {
    e.preventDefault();

    const profile = {
      name: profileName.value.trim(),
      role: profileRole.value.trim(),
      adminId: profileAdminId.value.trim(),
      clearance: profileClearance.value.trim(),
      email: profileEmail.value.trim(),
      phone: profilePhone.value.trim(),
      department: profileDepartment.value.trim()
    };

    if (!profile.name || !profile.role || !profile.adminId || !profile.clearance || !profile.email || !profile.phone || !profile.department) {
      showToast('Please fill all profile fields.', 'warning');
      return;
    }

    saveProfile(profile);
    renderProfile(profile);
    closeModal();

    showToast('Profile updated successfully.', 'success');
  });

  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');

      if (href && href !== '#') return;

      e.preventDefault();

      document.querySelectorAll('.sidebar-link').forEach(item => {
        item.classList.remove('active');
      });

      link.classList.add('active');

      const label = link.textContent.trim();
      showToast(`${label} — coming soon!`, 'info');
    });
  });

  renderProfile(loadProfile());
});