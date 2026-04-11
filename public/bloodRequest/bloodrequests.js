document.addEventListener('DOMContentLoaded', () => {

  /* ─── 0.5. HAMBURGER MENU TOGGLE ─── */
  const hamburger = document.getElementById('navHamburger');
  const navLinks = document.querySelector('.nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  /* ─── 0.6. AVATAR DROPDOWN AND LOGOUT ─── */
  const navAvatar = document.getElementById('navAvatar');
  const avatarDropdown = document.getElementById('avatarDropdown');
  const logoutBtn = document.getElementById('logoutBtn');

  if (navAvatar && avatarDropdown) {
    navAvatar.addEventListener('click', (e) => {
      e.stopPropagation();
      avatarDropdown.classList.toggle('show');
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!navAvatar.contains(e.target) && !avatarDropdown.contains(e.target)) {
        avatarDropdown.classList.remove('show');
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      avatarDropdown.classList.remove('show');
      if (typeof showToast === 'function') {
        showToast('Successfully logged out.', 'info');
      }
    });
  }

  /* ─── 1. STATUS FILTER PILLS ─── */
  const pills = document.querySelectorAll('.pill');
  const rows  = document.querySelectorAll('#requestsBody tr');

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const filter = pill.dataset.filter;

      rows.forEach(row => {
        if (filter === 'all' || row.dataset.status === filter) {
          row.classList.remove('hidden');
        } else {
          row.classList.add('hidden');
        }
      });

      // Show empty state if no rows visible
      const visibleRows = [...rows].filter(r => !r.classList.contains('hidden'));
      const existingEmpty = document.getElementById('emptyState');
      if (visibleRows.length === 0) {
        if (!existingEmpty) {
          const empty = document.createElement('tr');
          empty.id = 'emptyState';
          empty.innerHTML = `<td colspan="8" style="text-align:center; padding: 48px 20px; color: #9CA3AF; font-size: 0.9rem; font-weight: 500;">No requests found for this status.</td>`;
          document.getElementById('requestsBody').appendChild(empty);
        }
      } else {
        if (existingEmpty) existingEmpty.remove();
      }
    });
  });


  /* ─── 2. NEW REQUEST BUTTON ─── */
  const newRequestBtn = document.getElementById('newRequestBtn');
  if (newRequestBtn) {
    newRequestBtn.addEventListener('click', () => {
      showToast(' New request form coming soon!', 'info');
    });
  }


  /* ─── 3. VIEW DETAILS LINKS ─── */
  document.querySelectorAll('.view-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showToast(' Request details coming soon!', 'info');
    });
  });


  /* ─── 4. SORT WRAP ─── */
  const sortWrap = document.querySelector('.sort-wrap');
  const sortOrders = ['Date: Newest first', 'Date: Oldest first'];
  let sortIdx = 0;

  if (sortWrap) {
    sortWrap.addEventListener('click', () => {
      sortIdx = (sortIdx + 1) % sortOrders.length;
      sortWrap.querySelector('span').textContent = sortOrders[sortIdx];

      const tbody = document.getElementById('requestsBody');
      const rowsArr = [...tbody.querySelectorAll('tr:not(#emptyState)')];

      rowsArr.reverse().forEach(row => tbody.appendChild(row));
    });
  }


  /* ─── 5. SEARCH ─── */
  const searchInput = document.querySelector('.search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase().trim();
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (query === '' || text.includes(query)) {
          row.classList.remove('hidden');
        } else {
          row.classList.add('hidden');
        }
      });
      // Reset active pill to 'all' when searching
      if (query !== '') {
        pills.forEach(p => p.classList.remove('active'));
        document.querySelector('.pill[data-filter="all"]').classList.add('active');
      }
    });
  }


  /* ─── 6. ROW ANIMATION ON LOAD ─── */
  rows.forEach((row, i) => {
    row.style.opacity = '0';
    row.style.transform = 'translateY(10px)';
    row.style.transition = `opacity 0.3s ease ${i * 60}ms, transform 0.3s ease ${i * 60}ms`;
    setTimeout(() => {
      row.style.opacity = '1';
      row.style.transform = 'translateY(0)';
    }, 80 + i * 60);
  });


  /* ─── 7. TOAST NOTIFICATION ─── */
  let toastTimeout = null;
  let activeToast  = null;

  function showToast(message, type = 'success') {
    const colors = {
      success: { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
      warn:    { bg: '#fff7ed', border: '#fdba74', text: '#92400e' },
      error:   { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
      info:    { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
    };

    const c = colors[type] || colors.info;

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

});