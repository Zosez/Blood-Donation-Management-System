// System state (injected at runtime)
let currentUser = null;
let targetRequest = null;
let donorAttempts = [];
let sessionRole = 'donor'; // or 'requester'
let currentStep = 'eligibility'; // eligibility, questionnaire, confirmation, success, attempts

// Blood type compatibility
const bloodTypeCompatibility = {
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'O-': ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
  'A+': ['A+', 'AB+'],
  'A-': ['A+', 'A-', 'AB+', 'AB-'],
  'B+': ['B+', 'AB+'],
  'B-': ['B+', 'B-', 'AB+', 'AB-'],
  'AB+': ['AB+'],
  'AB-': ['AB+', 'AB-']
};

// Initialize module with injected system state
function initDonateFlow(systemState) {
  currentUser = systemState.currentUser;
  targetRequest = systemState.targetRequest;
  donorAttempts = systemState.donorAttempts || [];
  sessionRole = systemState.sessionRole || 'donor';

  if (sessionRole === 'donor') {
    renderDonorFlow();
  } else {
    renderRequesterFlow();
  }
}

// ──────────────────────────────────────────────
// DONOR FLOW
// ──────────────────────────────────────────────

function renderDonorFlow() {
  const container = document.getElementById('donateContent');

  if (currentStep === 'eligibility') {
    const blockReason = checkEligibility();
    if (blockReason) {
      container.innerHTML = blockReason;
      return;
    }
    currentStep = 'questionnaire';
    renderQuestionnaire();
  } else if (currentStep === 'questionnaire') {
    renderQuestionnaire();
  } else if (currentStep === 'confirmation') {
    renderConfirmation();
  } else if (currentStep === 'success') {
    renderSuccessState();
  }
}

function checkEligibility() {
  // Gate 1: Blood type compatibility
  const canDonate = bloodTypeCompatibility[currentUser.blood_type];
  if (!canDonate || !canDonate.includes(targetRequest.blood_type)) {
    return createBlockingCard(
      'Blood Type Incompatibility',
      `Your blood type (${currentUser.blood_type}) is not compatible with the requested type (${targetRequest.blood_type}). Please contact the requester if you believe this is an error.`
    );
  }

  // Gate 2: 56-day cooldown
  if (currentUser.cooldown_ends) {
    const cooldownDate = new Date(currentUser.cooldown_ends);
    const now = new Date();
    if (cooldownDate > now) {
      const daysRemaining = Math.ceil((cooldownDate - now) / (1000 * 60 * 60 * 24));
      return createBlockingCard(
        'Donation Cooldown Active',
        `You can donate again in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Donors must wait 56 days between donations.`
      );
    }
  }

  // Gate 3: Adverse reaction flag
  if (currentUser.adverse_reaction_flag) {
    return createBlockingCard(
      'Account Flagged',
      'Your account has been flagged due to a previous adverse reaction. Contact admin.'
    );
  }

  // Gate 4: City match
  if ((currentUser.city || '').toLowerCase() !== (targetRequest.city || '').toLowerCase()) {
    return createBlockingCard(
      'Location Mismatch',
      `You are in ${currentUser.city || 'Unknown'}, but the request is from ${targetRequest.city || 'Unknown'}. Donations must be made at the request location.`
    );
  }

  return null; // All gates passed
}

function createBlockingCard(title, message) {
  return `
    <div class="blocking-card">
      <div class="blocking-card-title">
        <span class="blocking-card-icon">✕</span>
        ${title}
      </div>
      <div class="blocking-card-msg">${message}</div>
    </div>
  `;
}

function renderQuestionnaire() {
  const questions = [
    { q: "Are you currently feeling well and in good health?", disqualifyOn: "No" },
    { q: "Have you donated blood in the last 56 days?", disqualifyOn: "Yes" },
    { q: "Do you weigh at least 50 kg?", disqualifyOn: "No" },
    { q: "Have you had any tattoos, piercings, or acupuncture in the last 6 months?", disqualifyOn: "Yes" },
    { q: "Are you currently taking any prescription medication?", disqualifyOn: "Yes" },
    { q: "Have you tested positive for HIV, Hepatitis B, Hepatitis C, or any blood-borne disease?", disqualifyOn: "Yes" },
    { q: "Have you travelled to a malaria-risk country in the last 12 months?", disqualifyOn: "Yes" },
    { q: "Are you pregnant or have you given birth in the last 6 months?", disqualifyOn: "Yes" },
    { q: "Have you consumed alcohol in the last 24 hours?", disqualifyOn: "Yes" },
    { q: "Have you had a major surgery in the last 12 months?", disqualifyOn: "Yes" },
    { q: "Do you have any heart, lung, liver, or kidney conditions?", disqualifyOn: "Yes" },
    { q: "Are you between 18 and 65 years of age?", disqualifyOn: "No" }
  ];

  let html = '<h2 style="margin-bottom: 1.5rem; color: #1f2937; font-size: 1.3rem;">Pre-Donation Health Screening</h2>';
  html += '<form id="questionnaireForm" class="questionnaire">';

  questions.forEach((item, idx) => {
    html += `
      <div class="question-group">
        <label class="question-label">${idx + 1}. ${item.q}</label>
        <div class="radio-group">
          <div class="radio-option">
            <input type="radio" id="q${idx}_yes" name="q${idx}" value="Yes" required>
            <label for="q${idx}_yes">Yes</label>
          </div>
          <div class="radio-option">
            <input type="radio" id="q${idx}_no" name="q${idx}" value="No" required>
            <label for="q${idx}_no">No</label>
          </div>
        </div>
      </div>
    `;
  });

  html += `
    <div class="button-group">
      <button type="submit" class="btn btn-primary">Continue to Confirmation</button>
      <button type="button" class="btn btn-secondary" onclick="location.reload()">Cancel</button>
    </div>
  </form>
  `;

  document.getElementById('donateContent').innerHTML = html;

  document.getElementById('questionnaireForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const failedQuestions = [];

    questions.forEach((item, idx) => {
      const answer = document.querySelector(`input[name="q${idx}"]:checked`)?.value;
      if (answer === item.disqualifyOn) {
        failedQuestions.push({
          question: item.q,
          disqualifyReason: `You answered "${answer}"`
        });
      }
    });

    if (failedQuestions.length > 0) {
      showFailedQuestionnaire(failedQuestions);
    } else {
      currentStep = 'confirmation';
      renderConfirmation();
    }
  });
}

function showFailedQuestionnaire(failedQuestions) {
  let html = '<h2 style="margin-bottom: 1rem; color: #1f2937; font-size: 1.2rem;">Health Screening Results</h2>';
  html += '<div class="blocking-card" style="margin-bottom: 1.5rem;">';
  html += '<div class="blocking-card-title">⚠ You are not eligible to donate at this time based on your health screening.</div>';
  html += '</div>';

  failedQuestions.forEach(item => {
    html += `
      <div class="failed-question">
        <div class="failed-question-text">${item.question}</div>
        <div class="failed-question-reason">${item.disqualifyReason}</div>
      </div>
    `;
  });

  html += `
    <div class="button-group" style="margin-top: 2rem;">
      <button class="btn btn-secondary" onclick="location.reload()">Try Again Later</button>
    </div>
  `;

  document.getElementById('donateContent').innerHTML = html;
}

function renderConfirmation() {
  const urgencyClass = (targetRequest.urgency || 'normal').toLowerCase();
  const urgencyColor = {
    'critical': 'critical',
    'urgent': 'urgent',
    'normal': 'normal'
  }[urgencyClass] || 'normal';

  let html = '<h2 style="margin-bottom: 1.5rem; color: #1f2937; font-size: 1.3rem;">Confirm Your Donation</h2>';

  // Request summary
  html += `
    <div class="summary-card">
      <div class="summary-title">Request Summary</div>
      <div class="summary-item">
        <span class="summary-label">Requester</span>
        <span class="summary-value">${targetRequest.requester_name || 'N/A'}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Blood Type</span>
        <span class="summary-value">${targetRequest.blood_type || 'N/A'}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Urgency</span>
        <span class="urgency-badge ${urgencyColor}">${(targetRequest.urgency || 'Normal').toUpperCase()}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Location</span>
        <span class="summary-value">${targetRequest.location || targetRequest.city || 'N/A'}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Needed By</span>
        <span class="summary-value">${targetRequest.date_needed ? new Date(targetRequest.date_needed).toLocaleDateString() : 'ASAP'}</span>
      </div>
    </div>
  `;

  // Contact info form
  html += `
    <div class="contact-info">
      <div class="contact-info-title">Your Contact Information</div>
      <div class="contact-field">
        <label>Full Name</label>
        <input type="text" id="donorName" value="${currentUser.name || ''}" />
      </div>
      <div class="contact-field">
        <label>Phone</label>
        <input type="tel" id="donorPhone" value="${currentUser.phone || ''}" />
      </div>
      <div class="contact-field">
        <label>Email</label>
        <input type="email" id="donorEmail" value="${currentUser.email || ''}" />
      </div>
    </div>

    <div class="warning-msg">⚠ By confirming, your contact information will be shared with the requester.</div>

    <form id="confirmationForm">
      <div class="button-group">
        <button type="submit" class="btn btn-primary">Confirm Donation Request</button>
        <button type="button" class="btn btn-secondary" onclick="location.reload()">Cancel</button>
      </div>
    </form>
  `;

  document.getElementById('donateContent').innerHTML = html;

  document.getElementById('confirmationForm').addEventListener('submit', (e) => {
    e.preventDefault();
    submitDonation();
  });
}

function submitDonation() {
  const donorContact = {
    name: document.getElementById('donorName').value,
    phone: document.getElementById('donorPhone').value,
    email: document.getElementById('donorEmail').value
  };

  const response = {
    action: 'DONATION_ATTEMPT',
    donor_id: currentUser.id,
    request_id: targetRequest.id,
    questionnaire_passed: true,
    donor_contact: donorContact,
    attempted_at: new Date().toISOString()
  };

  console.log('Donation Response:', response);

  // Save to backend
  saveDonationAttempt(response);

  currentStep = 'success';
  renderSuccessState();

  // Emit event or send to parent (for integration)
  window.dispatchEvent(new CustomEvent('donationAttempt', { detail: response }));
}

async function saveDonationAttempt(response) {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No token available');
    return;
  }

  try {
    const res = await fetch('/api/donation-attempts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        request_id: response.request_id,
        donor_id: response.donor_id,
        donor_name: response.donor_contact.name,
        donor_phone: response.donor_contact.phone,
        donor_email: response.donor_contact.email,
        questionnaire_passed: response.questionnaire_passed
      })
    });

    if (!res.ok) {
      console.error('Failed to save donation attempt:', res.statusText);
    } else {
      console.log('Donation attempt saved successfully');
    }
  } catch (error) {
    console.error('Error saving donation attempt:', error);
  }
}

function renderSuccessState() {
  let html = `
    <div class="success-card">
      <div class="success-card-title">✓ Donation Request Submitted</div>
      <div class="success-card-msg">
        Your donation request has been sent. The requester will review and may accept your offer. You will be contacted directly if accepted.
      </div>
    </div>
    <div style="margin-top: 2rem; text-align: center; color: #6b7280;">
      <p>Thank you for your willingness to donate and save lives.</p>
      <button class="btn btn-secondary" onclick="location.reload()" style="margin-top: 1rem; width: 100%;">Return</button>
    </div>
  `;
  document.getElementById('donateContent').innerHTML = html;
}

// ──────────────────────────────────────────────
// REQUESTER FLOW
// ──────────────────────────────────────────────

function renderRequesterFlow() {
  const container = document.getElementById('donateContent');
  const count = donorAttempts.length;

  let html = `
    <div class="donor-attempts-panel">
      <h2 style="margin-bottom: 0.5rem; color: #1f2937; font-size: 1.3rem;">Donation Attempts</h2>
      <div class="attempts-header">${count} donor${count !== 1 ? 's have' : ' has'} offered to donate</div>
  `;

  if (count === 0) {
    html += '<div style="text-align: center; color: #9ca3af; padding: 2rem;">No donors have offered yet. Share this request to find donors.</div>';
  } else {
    donorAttempts.forEach((donor, idx) => {
      const attemptTime = getTimeAgo(donor.attempt_at);
      const isAccepted = localStorage.getItem(`accepted_donor_${targetRequest.id}`) === String(donor.id);

      html += `
        <div class="donor-card ${isAccepted ? 'accepted' : ''}" data-donor-id="${donor.id}">
          <div class="donor-header">
            <div>
              <div class="donor-name">${donor.name}</div>
              <div class="donor-attempt-time">${attemptTime}</div>
            </div>
            <div class="donor-blood">${donor.blood_type}</div>
          </div>
          <div class="donor-contact">
            <div class="donor-contact-item"><strong>Phone:</strong> ${donor.phone || 'N/A'}</div>
            <div class="donor-contact-item"><strong>Email:</strong> ${donor.email || 'N/A'}</div>
          </div>
      `;

      if (isAccepted) {
        html += '<div class="donor-accepted-badge">✓ Accepted</div>';
      } else {
        html += `
          <div class="donor-actions">
            <button class="btn-accept" onclick="acceptDonor(${donor.id})">Accept Donor</button>
            <button class="btn-decline" onclick="declineDonor(${donor.id})">Decline</button>
          </div>
        `;
      }

      html += '</div>';
    });
  }

  html += '</div>';
  container.innerHTML = html;
}

function getTimeAgo(dateString) {
  if (!dateString) return 'Recently';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function acceptDonor(donorId) {
  // Store acceptance (in real app, send to backend)
  localStorage.setItem(`accepted_donor_${targetRequest.id}`, donorId);

  const response = {
    action: 'ACCEPT_DONOR',
    request_id: targetRequest.id,
    accepted_donor_id: donorId,
    accepted_at: new Date().toISOString()
  };

  console.log('Accept Donor Response:', response);
  window.dispatchEvent(new CustomEvent('donorAccepted', { detail: response }));

  // Disable other accept buttons
  document.querySelectorAll('.donor-actions .btn-accept').forEach(btn => {
    btn.disabled = true;
  });
  document.querySelectorAll('.donor-actions .btn-decline').forEach(btn => {
    btn.disabled = true;
  });

  // Update UI
  renderRequesterFlow();
}

function declineDonor(donorId) {
  const response = {
    action: 'DECLINE_DONOR',
    request_id: targetRequest.id,
    declined_donor_id: donorId
  };

  console.log('Decline Donor Response:', response);
  window.dispatchEvent(new CustomEvent('donorDeclined', { detail: response }));

  // Remove from list
  donorAttempts = donorAttempts.filter(d => d.id !== donorId);
  renderRequesterFlow();
}

// ──────────────────────────────────────────────
// Auto-initialize on page load if data is available
// ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Check if system state is injected via window object or data attribute
  if (window.donateFlowState) {
    initDonateFlow(window.donateFlowState);
  }
});
