// ─── Urgency Level Selection ───────────────────────────────────────────────

const urgencyConfig = {
  normal:   { bg: '#EEF2FF', border: '#C7D2FE', color: '#374151', shadow: 'rgba(199,210,254,0.6)' },
  urgent:   { bg: '#FEFCE8', border: '#FCD34D', color: '#D97706', shadow: 'rgba(252,211,77,0.5)'  },
  critical: { bg: '#FEF2F2', border: '#FECACA', color: '#C0392B', shadow: 'rgba(254,202,202,0.6)' }
};

const inactive = { bg: '#EEF2FF', border: '#D8DEF0', color: '#94A3B8', shadow: 'none' };

let currentUrgency = 'normal';

function selectUrgency(level) {
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

// ─── Form Submit Validation ────────────────────────────────────────────────

async function handleSubmit() {
  const bloodType = document.getElementById('blood-type').value;
  const units     = document.getElementById('units').value;
  const hospital  = document.getElementById('hospital').value;
  const city      = document.getElementById('city').value;

  if (!bloodType || !units || !hospital || !city) {
    alert('Please fill in all required fields: Blood Type, Units, Hospital Name, and City.');
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    alert('Please log in to submit a request.');
    window.location.href = '/login';
    return;
  }

  try {
    const response = await fetch('/api/blood-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        blood_type: bloodType,
        units: parseInt(units),
        hospital_name: hospital,
        city: city,
        urgency: currentUrgency
      })
    });

    if (response.ok) {
      alert('✅ Blood request submitted!');
      window.location.href = '/bloodRequest'; // Or whatever your dashboard route is
    } else {
      const data = await response.json();
      alert(`Error submitting request: ${data.message || 'Validation failed'}`);
    }
  } catch (err) {
    console.error('Submit error:', err);
    alert('Failed to submit request. Please try again.');
  }
}

// ───────── userDashboard REDIRECT ─────────
document.getElementById("back-dashboard").addEventListener("click", () => {
    window.location.href = "/userDashboard";
});