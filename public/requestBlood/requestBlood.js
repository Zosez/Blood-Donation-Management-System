// ─── Urgency Level Selection ───────────────────────────────────────────────

const urgencyConfig = {
  normal:   { bg: '#EEF2FF', border: '#C7D2FE', color: '#374151', shadow: 'rgba(199,210,254,0.6)' },
  urgent:   { bg: '#FEFCE8', border: '#FCD34D', color: '#D97706', shadow: 'rgba(252,211,77,0.5)'  },
  critical: { bg: '#FEF2F2', border: '#FECACA', color: '#C0392B', shadow: 'rgba(254,202,202,0.6)' }
};

const inactive = { bg: '#EEF2FF', border: '#D8DEF0', color: '#94A3B8', shadow: 'none' };

let currentUrgency = 'normal';

function selectUrgency(level) {
  selectedUrgency = level;
  ['normal', 'urgent', 'critical'].forEach(l => {
    const el  = document.getElementById('urg-' + l);
    const cfg = l === level ? urgencyConfig[l] : inactive;
    el.style.background  = cfg.bg;
    el.style.borderColor = cfg.border;
    el.style.color       = cfg.color;
    el.style.boxShadow   = l === level ? `0 0 0 3px ${cfg.shadow}` : 'none';
  });
  currentUrgency = level;
}

// ─── Init: Normal selected by default, others shown in their tinted colours ─

(function init() {
  const el = document.getElementById('urg-normal');
  el.style.background  = urgencyConfig.normal.bg;
  el.style.borderColor = urgencyConfig.normal.border;
  el.style.color       = urgencyConfig.normal.color;
  el.style.boxShadow   = `0 0 0 3px ${urgencyConfig.normal.shadow}`;

  ['urgent', 'critical'].forEach(l => {
    const e = document.getElementById('urg-' + l);
    e.style.background  = urgencyConfig[l].bg;
    e.style.borderColor = urgencyConfig[l].border;
    e.style.color       = urgencyConfig[l].color;
  });
})();

// ─── Toast Notification ────────────────────────────────────────────────────

function showToast(message, type = 'success') {
  const colors = {
    success: { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
    error:   { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
    info:    { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
  };
  const c = colors[type] || colors.info;

async function handleSubmit() {
  const bloodType = document.getElementById('blood-type').value;
  const units     = document.getElementById('units').value;
  const hospital  = document.getElementById('hospital').value;
  const city      = document.getElementById('city').value;
  const toast = document.createElement('div');
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed', bottom: '1.5rem', right: '1.5rem',
    background: c.bg, border: `1px solid ${c.border}`, color: c.text,
    borderRadius: '10px', padding: '.85rem 1.1rem',
    fontFamily: "'Outfit', sans-serif", fontWeight: '600', fontSize: '.88rem',
    boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: '9999',
    opacity: '0', transform: 'translateY(20px)', transition: '0.3s',
    maxWidth: '420px',
  });
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });
  setTimeout(() => {
    toast.style.opacity = '0'; toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ─── Form Submit — POST to API ─────────────────────────────────────────────

async function handleSubmit() {
  const bloodType    = document.getElementById('blood-type').value;
  const units        = document.getElementById('units').value;
  const hospital     = document.getElementById('hospital').value;
  const city         = document.getElementById('city').value;
  const dateNeeded   = document.getElementById('date') ? document.getElementById('date').value : null;
  const relationship = document.getElementById('relationship') ? document.getElementById('relationship').value : null;
  const donationType = document.getElementById('donation-type') ? document.getElementById('donation-type').value : null;
  const notes        = document.getElementById('notes') ? document.getElementById('notes').value : null;

  // Client-side validation
  if (!bloodType || !units || !hospital || !city) {
    showToast('Please fill in all required fields: Blood Type, Units, Hospital Name, and City.', 'error');
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    showToast('You must be logged in to submit a blood request.', 'error');
    setTimeout(() => { window.location.href = '/login'; }, 1500);
    return;
  }

  // Disable button while submitting
  const submitBtn = document.querySelector('.btn-submit');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Submitting…';
  submitBtn.disabled = true;

  try {
    const res = await fetch('/api/blood-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        blood_type: bloodType,
        units_required: parseInt(units, 10),
        urgency_level: selectedUrgency,
        hospital_name: hospital,
        city: city,
        date_needed: dateNeeded || null,
        relationship: relationship || null,
        donation_type: donationType || null,
        notes: notes || null
      })
    });

    const data = await res.json();

    if (res.ok) {
      showToast('✅ Blood request submitted successfully!', 'success');
      setTimeout(() => { window.location.href = '/bloodRequest'; }, 1500);
    } else if (res.status === 401 || res.status === 403) {
      showToast('Session expired. Please log in again.', 'error');
      setTimeout(() => { window.location.href = '/login'; }, 1500);
    } else {
      const msg = data.errors ? data.errors.map(e => e.msg).join(', ') : data.message;
      showToast(msg || 'Failed to submit request.', 'error');
    }
  } catch (err) {
    console.error('Submit error:', err);
    showToast('Network error. Please try again.', 'error');
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

// ───────── userDashboard REDIRECT ─────────
document.getElementById("back-dashboard").addEventListener("click", () => {
    window.location.href = "/userDashboard";
});