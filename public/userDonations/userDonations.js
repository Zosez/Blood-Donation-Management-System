// ──────────────────────────────────────────────
// Authorization Check & Token Management
// ──────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('token');
}

function redirectToLogin() {
  localStorage.removeItem('token');
  window.location.href = '/login';
}

function checkAuthorization() {
  const token = getToken();
  if (!token) {
    redirectToLogin();
  }
  return token;
}

// ──────────────────────────────────────────────
// API Calls with Authorization
// ──────────────────────────────────────────────
async function fetchBloodRequests() {
  try {
    const response = await fetch('/api/blood-requests', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch blood requests: ${response.statusText}`);
    }

    const data = await response.json();
    let requests = data.requests || [];
    
    // Get current user to filter requests appropriately
    let currentUserId = null;
    try {
      let userData = localStorage.getItem('user');
      if (!userData) userData = localStorage.getItem('userInfo');
      if (userData) {
        const user = JSON.parse(userData);
        currentUserId = user.id;
      }
    } catch (e) {
      console.warn('Could not get current user ID:', e);
    }

    // Filter out completed requests (as requested by user)
    requests = requests.filter(req => {
      const status = (req.status || '').toLowerCase();
      return status !== 'completed';
    });
    
    // Store for later filtering of 'ongoing' requests
    window.currentUserId = currentUserId;
    window.allRequests = requests;
    
    console.log('[DONATIONS PAGE] Loaded', requests.length, 'available requests (filtered out fulfilled/cancelled)');
    return requests;
  } catch (error) {
    console.error('Error fetching blood requests:', error);
    return [];
  }
}

async function fetchUserDonations() {
  const token = getToken();
  try {
    const response = await fetch('/api/donations', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401 || response.status === 403) {
      redirectToLogin();
      return [];
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch donations: ${response.statusText}`);
    }

    const data = await response.json();
    return data.donations || [];
  } catch (error) {
    console.error('Error fetching user donations:', error);
    return [];
  }
}

// ──────────────────────────────────────────────
// Main Page Initialization
// ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Verify user is authenticated
  const token = checkAuthorization();

  let toastTimeout = null;
  let activeToast = null;

  const emptyState = document.getElementById('emptyState');
  const resultText = document.getElementById('resultText');
  const matchCount = document.getElementById('matchCount');
  const requestsGrid = document.getElementById('requestsGrid');

  const filterFirstMatched = document.getElementById('filterFirstMatched');
  const filterAllRequests = document.getElementById('filterAllRequests');

  const totalRequests = document.getElementById('totalRequests');
  const criticalRequests = document.getElementById('criticalRequests');
  const urgentRequests = document.getElementById('urgentRequests');
  const nearbyRequests = document.getElementById('nearbyRequests');

  // ──────────────────────────────────────────────
  // Get Current User ID
  // ──────────────────────────────────────────────
  function getCurrentUserId() {
    try {
      let userData = localStorage.getItem('user');
      if (!userData) {
        userData = localStorage.getItem('userInfo');
      }
      
      if (userData) {
        const user = JSON.parse(userData);
        return user.id;
      }
    } catch (e) {
      console.warn('Could not get current user ID:', e);
    }
    return null;
  }

  const currentUserId = getCurrentUserId();

  // ──────────────────────────────────────────────
  // Modal/Popup System
  // ──────────────────────────────────────────────
  function showDetailsModal(request) {
    const modal = document.createElement('div');
    modal.className = 'request-modal-overlay';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;

    const urgency = request.urgency_level || 'Normal';
    const bloodType = request.blood_type || 'N/A';
    const city = request.city || request.location || 'N/A';
    const units = request.units_required || 1;
    const donationType = request.donation_type || 'Whole Blood';
    const hospital = request.hospital_name || 'Hospital';
    const description = request.description || 'Blood request';
    const neededBy = request.needed_by_date ? new Date(request.needed_by_date).toLocaleDateString() : 'ASAP';
    const contactInfo = request.contact_info || 'Not provided';
    const patientName = request.patient_name || 'Patient';
    const requesterName = request.requester_name || request.user_fullname || 'Unknown Requester';

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 2rem;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    `;

    const urgencyColor = urgency.toLowerCase() === 'critical' ? '#C0281C' : urgency.toLowerCase() === 'urgent' ? '#EA580C' : '#16A34A';

    modalContent.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1.5rem;">
        <div>
          <h2 style="margin: 0; font-size: 1.5rem; color: #1e293b;">${hospital}</h2>
          <p style="margin: 0.5rem 0 0 0; color: #64748b;">${description}</p>
        </div>
        <button class="modal-close" type="button" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b;">&times;</button>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
        <div style="background: #f1f5f9; padding: 1rem; border-radius: 8px;">
          <p style="margin: 0; font-size: 0.875rem; color: #64748b;">Blood Type</p>
          <p style="margin: 0.5rem 0 0 0; font-size: 1.25rem; font-weight: 700; color: #1e293b;">${bloodType}</p>
        </div>
        <div style="background: #f1f5f9; padding: 1rem; border-radius: 8px;">
          <p style="margin: 0; font-size: 0.875rem; color: #64748b;">Units Needed</p>
          <p style="margin: 0.5rem 0 0 0; font-size: 1.25rem; font-weight: 700; color: #1e293b;">${units}</p>
        </div>
        <div style="background: #f1f5f9; padding: 1rem; border-radius: 8px;">
          <p style="margin: 0; font-size: 0.875rem; color: #64748b;">Needed By</p>
          <p style="margin: 0.5rem 0 0 0; font-size: 1.25rem; font-weight: 700; color: #1e293b;">${neededBy}</p>
        </div>
        <div style="background: #f1f5f9; padding: 1rem; border-radius: 8px;">
          <p style="margin: 0; font-size: 0.875rem; color: #64748b;">Type</p>
          <p style="margin: 0.5rem 0 0 0; font-size: 1.25rem; font-weight: 700; color: #1e293b;">${donationType}</p>
        </div>
      </div>

      <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
        <p style="margin: 0; font-size: 0.875rem; color: #64748b;">Requested By</p>
        <p style="margin: 0.5rem 0 0 0; font-weight: 600; color: #1e293b;">${requesterName}</p>
        
        <p style="margin: 1rem 0 0 0; font-size: 0.875rem; color: #64748b;">Patient Name</p>
        <p style="margin: 0.5rem 0 0 0; font-weight: 600; color: #1e293b;">${patientName}</p>
        
        <p style="margin: 1rem 0 0 0; font-size: 0.875rem; color: #64748b;">Location</p>
        <p style="margin: 0.5rem 0 0 0; font-weight: 600; color: #1e293b;">${city}</p>
        
        <p style="margin: 1rem 0 0 0; font-size: 0.875rem; color: #64748b;">Urgency Level</p>
        <div style="display: inline-block; padding: 0.35rem 0.75rem; border-radius: 20px; background: ${urgencyColor}; color: white; font-size: 0.875rem; font-weight: 600; margin-top: 0.25rem;">
          ${urgency}
        </div>
      </div>

      <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
        <button class="modal-close" type="button" style="flex: 1; padding: 0.75rem; border: 1px solid #e2e8f0; background: white; color: #1e293b; border-radius: 8px; cursor: pointer; font-weight: 600;">Close</button>
      </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    const closeButtons = modalContent.querySelectorAll('.modal-close');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        modal.remove();
      });
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // ──────────────────────────────────────────────
  // Complete Donation Form
  // ──────────────────────────────────────────────
  function showCompleteDonationForm(request, attempt) {
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('Please log in first', 'warning');
      redirectToLogin();
      return;
    }

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 2rem;
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    `;

    const donationTypes = ['Whole Blood', 'Platelets', 'Plasma', 'WBC', 'Red Blood Cells'];

    modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2 style="margin: 0; font-size: 1.5rem; color: #16A34A;">Complete Donation</h2>
        <button class="close-modal-btn" style="background: none; border: none; font-size: 2rem; cursor: pointer; color: #666;">&times;</button>
      </div>

      <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f0f9ff; border-left: 4px solid #16A34A; border-radius: 4px;">
        <p style="margin: 0 0 0.5rem 0; color: #333;"><strong>Request Details:</strong></p>
        <p style="margin: 0.25rem 0; color: #666;">Blood Type: <strong>${request.blood_type}</strong></p>
        <p style="margin: 0.25rem 0; color: #666;">Units Requested: <strong>${request.units_required || 1}</strong></p>
      </div>

      <form id="completeDonationForm">
        <div style="margin-bottom: 1.5rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">How many units did you donate?</label>
          <input type="number" id="bloodUnits" min="1" max="5" value="1" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;" required>
        </div>

        <div style="margin-bottom: 1.5rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">Donation Type</label>
          <select id="bloodTypeDonated" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;" required>
            <option value="">Select donation type...</option>
            ${donationTypes.map(type => `<option value="${type}">${type}</option>`).join('')}
          </select>
        </div>

        <div style="display: flex; gap: 1rem;">
          <button type="submit" style="flex: 1; padding: 0.75rem; background: #16A34A; color: white; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 1rem;">Submit Donation</button>
          <button type="button" class="close-modal-btn" style="flex: 1; padding: 0.75rem; background: #e5e7eb; color: #333; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 1rem;">Cancel</button>
        </div>
      </form>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close button listeners
    const closeBtns = modal.querySelectorAll('.close-modal-btn');
    closeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        overlay.remove();
      });
    });

    // Form submission
    const form = modal.querySelector('#completeDonationForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const bloodUnits = parseInt(document.getElementById('bloodUnits').value);
      const bloodTypeDonated = document.getElementById('bloodTypeDonated').value;

      if (!bloodUnits || !bloodTypeDonated) {
        showToast('Please fill all fields', 'warning');
        return;
      }

      try {
        const response = await fetch(`/api/donation-attempts/${attempt.id}/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            blood_units: bloodUnits,
            blood_type: bloodTypeDonated
          })
        });

        const data = await response.json();

        if (response.ok) {
          showToast('Donation submitted for review! Thank you for saving lives.', 'success');
          overlay.remove();
          setTimeout(() => {
            location.reload();
          }, 1500);
        } else {
          showToast(data.message || 'Error submitting donation', 'danger');
        }
      } catch (error) {
        console.error('[COMPLETE DONATION] Error:', error);
        showToast('Error submitting donation', 'danger');
      }
    });
  }

  // ──────────────────────────────────────────────
  // Donation Flow Modal
  // ──────────────────────────────────────────────
  function showDonationFlow(request, existingAttempt = null) {
    // Get current user data
    let currentUser = null;
    try {
      let userData = localStorage.getItem('user');
      if (!userData) userData = localStorage.getItem('userInfo');
      if (userData) currentUser = JSON.parse(userData);
    } catch (e) {
      console.error('Could not get user data:', e);
      showToast('Error loading user data', 'danger');
      return;
    }

    if (!currentUser) {
      showToast('Please log in to continue', 'warning');
      redirectToLogin();
      return;
    }

    // Prepare system state for donation flow
    const systemState = {
      currentUser: {
        id: currentUser.id,
        name: currentUser.fullname || currentUser.name || 'User',
        blood_type: currentUser.blood_type || 'N/A',
        city: currentUser.district || currentUser.city || 'N/A',
        cooldown_ends: currentUser.cooldown_ends || null,
        adverse_reaction_flag: currentUser.adverse_reaction_flag || false,
        phone: currentUser.phone || '',
        email: currentUser.email || ''
      },
      targetRequest: {
        id: request.id,
        requester_id: request.user_id,
        requester_name: request.requester_name || request.user_fullname || 'Unknown',
        blood_type: request.blood_type || 'N/A',
        urgency: request.urgency_level || 'Normal',
        units_needed: request.units_required || 1,
        city: request.city || request.location || 'N/A',
        location: request.hospital_name || 'Hospital',
        date_needed: request.needed_by_date || new Date().toISOString()
      },
      donorAttempts: [],
      sessionRole: 'donor',
      existingAttempt: existingAttempt || null
    };

    // Create modal for donation flow
    const modal = document.createElement('div');
    modal.className = 'donation-flow-overlay';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 1rem;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 2rem;
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      position: relative;
    `;

    modalContent.innerHTML = `<div id="donateContent"></div>`;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: none;
      border: none;
      font-size: 2rem;
      cursor: pointer;
      color: #64748b;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 0.2s;
      z-index: 10001;
    `;

    closeBtn.addEventListener('click', () => modal.remove());
    closeBtn.addEventListener('mouseover', () => {
      closeBtn.style.background = '#f1f5f9';
    });
    closeBtn.addEventListener('mouseout', () => {
      closeBtn.style.background = 'none';
    });

    modalContent.appendChild(closeBtn);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // Inject system state into window for donation flow module
    window.donateFlowState = systemState;
    window.currentDonationModal = modal;
    window.donateFlowContainer = document.getElementById('donateContent');

    // Load and run donation flow module
    if (typeof window.initDonateFlow === 'function') {
      console.log('Initializing donation flow with state:', systemState);
      window.initDonateFlow(systemState);
    } else {
      // Donation flow module not yet loaded, load it
      const script = document.createElement('script');
      script.src = '/donateFlow/donateFlow.js';
      script.onload = () => {
        console.log('Donation flow script loaded');
        if (typeof window.initDonateFlow === 'function') {
          console.log('Initializing donation flow after loading');
          window.initDonateFlow(systemState);
        } else {
          console.error('initDonateFlow not available after loading script');
          showToast('Error initializing donation flow', 'danger');
        }
      };
      script.onerror = () => {
        console.error('Failed to load donation flow script');
        showToast('Error loading donation module', 'danger');
        modal.remove();
      };
      document.head.appendChild(script);
    }
  }

  // ──────────────────────────────────────────────
  // Toast Notification System
  // ──────────────────────────────────────────────
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
      color: c.text
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

  // ──────────────────────────────────────────────
  // Dynamic Card Rendering
  // ──────────────────────────────────────────────
  function getUrgencyBadgeClass(urgency) {
    const level = (urgency || 'normal').toLowerCase();
    if (level === 'critical') return 'critical-badge';
    if (level === 'urgent') return 'urgent-badge';
    return 'normal-badge';
  }

  function getCardClass(urgency) {
    const level = (urgency || 'normal').toLowerCase();
    if (level === 'critical') return 'critical';
    if (level === 'urgent') return 'urgent';
    return 'normal';
  }

  function createRequestCard(request) {
    const card = document.createElement('article');
    const urgency = request.urgency_level || 'Normal';
    const bloodType = request.blood_type || 'N/A';
    const city = request.city || request.location || 'N/A';
    const units = request.units_required || 1;
    const donationType = request.donation_type || 'Whole Blood';
    const hospital = request.hospital_name || 'Hospital';
    const description = request.description || 'Blood request';
    const neededBy = request.needed_by_date ? new Date(request.needed_by_date).toLocaleDateString() : 'ASAP';
    const requesterName = request.requester_name || request.user_fullname || 'Unknown Requester';

    card.className = `request-card ${getCardClass(urgency)}`;
    card.dataset.blood = bloodType;
    card.dataset.city = city;
    card.dataset.urgency = urgency;
    card.dataset.type = donationType;
    card.dataset.requestId = request.id;

    card.innerHTML = `
      <div class="req-top">
        <span class="urgency-badge ${getUrgencyBadgeClass(urgency)}">${urgency}</span>
        <span class="blood-type">${bloodType}</span>
      </div>

      <p class="req-hospital">${hospital}</p>
      <p class="req-meta">${description}</p>
      <p style="font-size: 0.85rem; color: #64748b; margin: 0.5rem 0;">Requested by <strong>${requesterName}</strong></p>

      <div class="req-details">
        <div class="req-detail-box">
          <span>City</span>
          <strong>${city}</strong>
        </div>

        <div class="req-detail-box">
          <span>Units</span>
          <strong>${units} Unit${units !== 1 ? 's' : ''}</strong>
        </div>

        <div class="req-detail-box">
          <span>Needed By</span>
          <strong>${neededBy}</strong>
        </div>

        <div class="req-detail-box">
          <span>Type</span>
          <strong>${donationType}</strong>
        </div>
      </div>

      <div class="req-actions">
        <button class="req-btn btn-light details-btn" type="button">View Details</button>
        <button class="req-btn btn-red donate-btn" type="button" data-request-id="${request.id}">Donate Now</button>
      </div>
    `;

    return card;
  }

  async function renderBloodRequests(requests) {
    console.log('[RENDER] Starting render with', requests.length, 'requests');
    requestsGrid.innerHTML = '';
    
    const currentUserId = window.currentUserId;

    // Keep all requests as filtered by fetchBloodRequests (only completed are hidden)
    let filteredRequests = requests;
    
    console.log('[RENDER] Filtered to', filteredRequests.length, 'requests (excluded own + fulfilled/cancelled)');
    
    if (!filteredRequests || filteredRequests.length === 0) {
      console.log('[RENDER] No requests to display');
      emptyState.style.display = 'block';
      resultText.textContent = 'No blood requests available at this time.';
      matchCount.textContent = '0 Matches';
      return;
    }

    // Fetch current user's donation attempts
    const userAttempts = await getUserDonationAttempts();
    const attemptsByRequest = {};
    userAttempts.forEach(att => {
      attemptsByRequest[att.request_id] = att;
    });

    // Ongoing requests are now shown to everyone as requested

    filteredRequests.forEach(request => {
      const card = createRequestCard(request);
      requestsGrid.appendChild(card);

      const detailsBtn = card.querySelector('.details-btn');
      const donateBtn = card.querySelector('.donate-btn');
      const hasAttempt = attemptsByRequest[request.id];
      const isOngoing = (request.status || '').toLowerCase() === 'ongoing';

      // Store attempt info in dataset for filtering
      card.dataset.hasAttempt = hasAttempt ? 'true' : 'false';

      // For ongoing requests with no personal attempt — hide the donate button
      if (isOngoing && !hasAttempt) {
        donateBtn.style.display = 'none';
        // Add an "In Progress" badge instead
        const badge = document.createElement('span');
        badge.textContent = '🔄 In Progress';
        badge.style.cssText = 'padding: 0.5rem 1rem; background: #fef3c7; color: #92400e; border-radius: 6px; font-weight: 600; font-size: 0.85rem;';
        donateBtn.parentElement.appendChild(badge);
      } else if (hasAttempt) {
        // User has a personal attempt — update button label
        if (hasAttempt.status === 'accepted') {
          donateBtn.textContent = 'Complete Donation';
          donateBtn.classList.remove('btn-red');
          donateBtn.classList.add('btn-orange');
          donateBtn.style.background = '#16A34A';
          donateBtn.dataset.attemptId = hasAttempt.id;
        } else {
          donateBtn.textContent = 'Edit Request';
          donateBtn.classList.remove('btn-red');
          donateBtn.classList.add('btn-orange');
          donateBtn.style.background = '#EA580C';
        }
      }

      detailsBtn?.addEventListener('click', () => {
        showDetailsModal(request);
      });

      donateBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        if (hasAttempt?.status === 'accepted') {
          showCompleteDonationForm(request, hasAttempt);
        } else {
          showDonationFlow(request, hasAttempt);
        }
      });
    });

    emptyState.style.display = 'none';
    console.log('[RENDER] ✓ Rendered', filteredRequests.length, 'cards');
  }

  async function getUserDonationAttempts() {
    const token = getToken();
    if (!token) return [];

    try {
      const response = await fetch('/api/donation-attempts/my', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.warn('Could not fetch user donation attempts');
        return [];
      }

      const data = await response.json();
      return data.attempts || [];
    } catch (error) {
      console.error('Error fetching donation attempts:', error);
      return [];
    }
  }

  // ──────────────────────────────────────────────
  // Stats & Filtering
  // ──────────────────────────────────────────────
  function updateStats() {
    const cards = document.querySelectorAll('.request-card');
    const allCards = Array.from(cards);

    console.log('[STATS] Found', allCards.length, 'request cards on page');

    totalRequests.textContent = allCards.length;

    const criticalCount = allCards.filter(card => {
      const urgency = card.dataset.urgency || '';
      return urgency.toLowerCase() === 'critical';
    }).length;
    criticalRequests.textContent = criticalCount;

    const urgentCount = allCards.filter(card => {
      const urgency = card.dataset.urgency || '';
      return urgency.toLowerCase() === 'urgent';
    }).length;
    urgentRequests.textContent = urgentCount;

    const nearby = ['kathmandu', 'lalitpur'];
    const nearbyCount = allCards.filter(card => {
      return nearby.includes((card.dataset.city || '').toLowerCase());
    }).length;
    nearbyRequests.textContent = nearbyCount;

    console.log('[STATS] Updated:', { total: allCards.length, critical: criticalCount, urgent: urgentCount, nearby: nearbyCount });
  }

  function filterRequests() {
    const filterMode = document.querySelector('input[name="requestFilter"]:checked')?.value || 'matched';
    
    // Get user's blood type and location for matching
    let userBloodType = '';
    let userCity = '';
    try {
      let userData = localStorage.getItem('user');
      if (!userData) userData = localStorage.getItem('userInfo');
      if (userData) {
        const user = JSON.parse(userData);
        userBloodType = (user.blood_type || '').toLowerCase();
        userCity = (user.district || user.city || '').toLowerCase();
      }
    } catch (e) {
      console.warn('Could not get user data for filtering:', e);
    }

    const cards = document.querySelectorAll('.request-card');
    let visibleCount = 0;

    cards.forEach(card => {
      let shouldShow = false;

      if (filterMode === 'matched') {
        // Matched Requests - Blood type AND location match with user
        const cardBloodType = (card.dataset.blood || '').toLowerCase();
        const cardCity = (card.dataset.city || '').toLowerCase();
        
        shouldShow = userBloodType && userCity && 
                     cardBloodType === userBloodType && 
                     cardCity === userCity;
      } else {
        // All Requests - Show everything
        shouldShow = true;
      }

      // Always show cards where the user has an attempt (ongoing or pending)
      if (card.dataset.hasAttempt === 'true') {
        shouldShow = true;
      }

      card.style.display = shouldShow ? 'flex' : 'none';

      if (shouldShow) {
        visibleCount++;
      }
    });

    matchCount.textContent = `${visibleCount} Match${visibleCount === 1 ? '' : 'es'}`;

    if (visibleCount === 0) {
      emptyState.style.display = 'block';
      resultText.textContent = filterMode === 'matched' 
        ? `No requests matching your blood type (${userBloodType || 'N/A'}) and location (${userCity || 'N/A'}).` 
        : 'No requests available.';
    } else {
      emptyState.style.display = 'none';

      const totalCards = document.querySelectorAll('.request-card').length;
      const filterLabel = filterMode === 'matched' ? 'matched' : 'all';
      
      if (visibleCount === totalCards) {
        resultText.textContent = `Showing ${filterLabel} blood requests.`;
      } else {
        resultText.textContent = `Showing ${visibleCount} ${filterLabel} request${visibleCount === 1 ? '' : 's'}.`;
      }
    }
  }

  // ──────────────────────────────────────────────
  // User Avatar Update
  // ──────────────────────────────────────────────
  try {
    let userData = localStorage.getItem('user');
    if (!userData) {
      userData = localStorage.getItem('userInfo');
    }
    
    if (userData) {
      const user = JSON.parse(userData);
      const navAvatarName = document.getElementById('nav-avatar-name');
      const navAvatarImg = document.querySelector('.nav-avatar img');
      
      if (navAvatarName && user.fullname) {
        const firstName = user.fullname.split(' ')[0];
        navAvatarName.textContent = firstName;
      }
      
      if (navAvatarImg && user.id) {
        navAvatarImg.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}&backgroundColor=b6e3f4`;
        navAvatarImg.alt = user.fullname || 'User Avatar';
      }
    }
  } catch (e) {
    console.warn('Could not parse user data:', e);
  }

  // ──────────────────────────────────────────────
  // Navigation & Dropdowns
  // ──────────────────────────────────────────────
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');

      if (href && href !== '#') {
        return;
      }

      e.preventDefault();

      document.querySelectorAll('.nav-links a').forEach(item => {
        item.classList.remove('active');
      });

      link.classList.add('active');

      showToast(`${link.dataset.section || link.textContent.trim()} opened.`, 'info');
    });
  });

  const navHamburger = document.getElementById('navHamburger');
  const navLinks = document.querySelector('.nav-links');

  navHamburger?.addEventListener('click', () => {
    navLinks?.classList.toggle('active');
  });

  const notifBtn = document.getElementById('notifBtn');
  const notifPanel = document.getElementById('notifPanel');
  const notifClose = document.getElementById('notifClose');

  notifBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    notifPanel?.classList.toggle('open');
  });

  notifClose?.addEventListener('click', (e) => {
    e.stopPropagation();
    notifPanel?.classList.remove('open');
  });

  document.addEventListener('click', (e) => {
    if (notifPanel && notifBtn && !notifPanel.contains(e.target) && !notifBtn.contains(e.target)) {
      notifPanel.classList.remove('open');
    }
  });

  document.querySelectorAll('.notif-item').forEach(item => {
    item.addEventListener('click', () => {
      item.classList.remove('unread');

      const text = item.querySelector('.notif-text')?.textContent.trim() || 'Notification opened.';
      showToast(text, 'info');
    });
  });

  const navAvatar = document.getElementById('navAvatar');
  const avatarDropdown = document.getElementById('avatarDropdown');

  navAvatar?.addEventListener('click', (e) => {
    e.stopPropagation();
    avatarDropdown?.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (navAvatar && avatarDropdown && !navAvatar.contains(e.target) && !avatarDropdown.contains(e.target)) {
      avatarDropdown.classList.remove('show');
    }
  });

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    avatarDropdown?.classList.remove('show');
    showToast('Successfully logged out.', 'info');
    setTimeout(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      window.location.href = '/login';
    }, 500);
  });

  document.getElementById('donateToLifeLinkBtn')?.addEventListener('click', () => {
    window.location.href = '/donorRequest';
  });

  // ──────────────────────────────────────────────
  // Filter Event Listeners
  // ──────────────────────────────────────────────
  filterFirstMatched?.addEventListener('change', filterRequests);
  filterAllRequests?.addEventListener('change', filterRequests);

  // ──────────────────────────────────────────────
  // Page Navigation
  // ──────────────────────────────────────────────
  document.getElementById('dashboard')?.addEventListener('click', () => {
    window.location.href = '/userDashboard';
  });

  document.getElementById('request')?.addEventListener('click', () => {
    window.location.href = '/bloodRequest';
  }); 

  document.getElementById('profile')?.addEventListener('click', () => {
    window.location.href = '/userProfile';
  });

  // ──────────────────────────────────────────────
  // Load Data and Initialize Page
  // ──────────────────────────────────────────────
  async function initializePageData() {
    try {
      // Show loading state
      requestsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">Loading blood requests...</p>';

      // Fetch data
      const requests = await fetchBloodRequests();
      const donations = await fetchUserDonations();

      // Render blood requests (await so cards have data-has-attempt set before filtering)
      await renderBloodRequests(requests);

      // Update stats
      updateStats();
      filterRequests();

      console.log('Page initialized:', {
        bloodRequests: requests.length,
        userDonations: donations.length
      });
    } catch (error) {
      console.error('Error initializing page:', error);
      showToast('Failed to load page data', 'danger');
      emptyState.style.display = 'block';
      resultText.textContent = 'Error loading blood requests. Please try again later.';
    }
  }

  // Initialize page when DOM is ready
  initializePageData();
});
