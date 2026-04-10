// ─── Nepal Province → City Data ────────────────────────────────────────────

const nepalCities = {
  koshi: [
    'Biratnagar', 'Dharan', 'Itahari', 'Birtamod', 'Damak', 'Mechinagar',
    'Inaruwa', 'Rajbiraj', 'Lahan', 'Siraha', 'Triyuga', 'Diktel',
    'Phidim', 'Taplejung', 'Ilam', 'Bhojpur', 'Khotang', 'Udayapur'
  ],
  madhesh: [
    'Janakpur', 'Birgunj', 'Kalaiya', 'Gaur', 'Malangwa', 'Jaleshwar',
    'Bardibas', 'Lalbandi', 'Sarlahi', 'Mahottari', 'Dhanusha', 'Rautahat',
    'Parsa', 'Bara'
  ],
  bagmati: [
    'Kathmandu', 'Lalitpur', 'Bhaktapur', 'Kirtipur', 'Madhyapur Thimi',
    'Hetauda', 'Bharatpur', 'Bidur', 'Dhulikhel', 'Panauti', 'Banepa',
    'Charikot', 'Sindhuli', 'Ramechhap', 'Dolakha', 'Nuwakot', 'Rasuwa',
    'Dhading', 'Makwanpur', 'Chitwan'
  ],
  gandaki: [
    'Pokhara', 'Damauli', 'Baglung', 'Beni', 'Gorkha', 'Besisahar',
    'Chame', 'Manang', 'Mustang', 'Myagdi', 'Nawalpur', 'Kaski',
    'Syangja', 'Parbat', 'Lamjung', 'Tanahun'
  ],
  lumbini: [
    'Butwal', 'Bhairahawa (Siddharthanagar)', 'Tansen', 'Tulsipur',
    'Ghorahi', 'Kapilvastu', 'Arghakhanchi', 'Gulmi', 'Palpa', 'Rupandehi',
    'Nawalparasi', 'Pyuthan', 'Rolpa', 'Rukum East', 'Dang'
  ],
  karnali: [
    'Birendranagar (Surkhet)', 'Jumla', 'Dailekh', 'Dolpa', 'Humla',
    'Jajarkot', 'Kalikot', 'Mugu', 'Salyan', 'Rukum West'
  ],
  sudurpashchim: [
    'Dhangadhi', 'Mahendranagar', 'Dipayal-Silgadhi', 'Mangalsen',
    'Martadi', 'Chainpur', 'Bajhang', 'Bajura', 'Baitadi', 'Darchula',
    'Dadeldhura', 'Kanchanpur', 'Kailali'
  ]
};

function updateCities() {
  const province = document.getElementById('province').value;
  const citySelect = document.getElementById('city');

  citySelect.innerHTML = '';
  citySelect.disabled = false;

  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.disabled = true;
  defaultOpt.selected = true;
  defaultOpt.textContent = 'Select City / District';
  citySelect.appendChild(defaultOpt);

  (nepalCities[province] || []).forEach(city => {
    const opt = document.createElement('option');
    opt.value = city;
    opt.textContent = city;
    citySelect.appendChild(opt);
  });
}



const urgencyConfig = {
  normal:   { bg: '#EEF2FF', border: '#C7D2FE', color: '#374151', shadow: 'rgba(199,210,254,0.6)' },
  urgent:   { bg: '#FEFCE8', border: '#FCD34D', color: '#D97706', shadow: 'rgba(252,211,77,0.5)'  },
  critical: { bg: '#FEF2F2', border: '#FECACA', color: '#C0392B', shadow: 'rgba(254,202,202,0.6)' }
};

const inactive = { bg: '#EEF2FF', border: '#D8DEF0', color: '#94A3B8', shadow: 'none' };

function selectUrgency(level) {
  ['normal', 'urgent', 'critical'].forEach(l => {
    const el  = document.getElementById('urg-' + l);
    const cfg = l === level ? urgencyConfig[l] : inactive;
    el.style.background  = cfg.bg;
    el.style.borderColor = cfg.border;
    el.style.color       = cfg.color;
    el.style.boxShadow   = l === level ? `0 0 0 3px ${cfg.shadow}` : 'none';
  });
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

function handleSubmit() {
  const bloodType = document.getElementById('blood-type').value;
  const units     = document.getElementById('units').value;
  const hospital  = document.getElementById('hospital').value;
  const province  = document.getElementById('province').value;
  const city      = document.getElementById('city').value;

  if (!bloodType || !units || !hospital || !province || !city) {
    alert('Please fill in all required fields: Blood Type, Units, Hospital Name, Province, and City.');
    return;
  }

  alert('Blood request submitted!\nAn admin will review it within 15 minutes.');
}