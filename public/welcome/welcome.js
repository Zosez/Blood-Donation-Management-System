// ── Onboarding interactions ─────────────────────────────────────

// Load user data and personalize welcome
function loadUserData() {
  const userData = JSON.parse(localStorage.getItem('user'));
  if (userData) {
    const firstName = userData.first_name || 'User';
    document.querySelectorAll('.welcome-title').forEach(el => {
      if (el.textContent.includes('Welcome')) {
        el.innerHTML = `Welcome to <span class="brand">LifeLink</span>,<br/>${firstName}!`;
      }
    });
  }
}

// Mark user as onboarded and redirect
async function markOnboardedAndRedirect(redirectPath) {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('[WELCOME] ERROR: No token found in localStorage!');
      showToast('Session error: No authentication token. Please log in again.', 'error');
      setTimeout(() => window.location.href = '/login', 2000);
      return;
    }
    
    console.log('[WELCOME] Token found, length:', token.length, 'First 20 chars:', token.substring(0, 20));
    
    const response = await fetch('/api/auth/mark-onboarded', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('[WELCOME] Mark-onboarded response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[WELCOME] Error marking onboarded:', errorData.message);
      showToast('Failed to complete onboarding. ' + (errorData.message || 'Please try again.'), 'error');
      return;
    }

    console.log('[WELCOME] Successfully marked as onboarded, redirecting to:', redirectPath);
    // Redirect to the specified path
    window.location.href = redirectPath;
  } catch (error) {
    console.error('[WELCOME] Catch error:', error);
    showToast('An error occurred. Please try again.', 'error');
  }
}

// Toast notification function
function showToast(message, type = 'success') {
  const toastDiv = document.createElement('div');
  toastDiv.textContent = message;
  toastDiv.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: ${type === 'error' ? '#E74C3C' : '#27AE60'};
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    animation: slideIn 0.3s ease-in-out;
  `;
  document.body.appendChild(toastDiv);
  
  setTimeout(() => {
    toastDiv.style.animation = 'slideOut 0.3s ease-in-out';
    setTimeout(() => toastDiv.remove(), 300);
  }, 3000);
}

// Next button: Go to dashboard
document.querySelector('.next-btn').addEventListener('click', function () {
  markOnboardedAndRedirect('/userdashboard');
});

// Action cards: Donate Blood (first) and Request Blood (second)
const actionCards = document.querySelectorAll('.action-card');
if (actionCards[0]) {
  actionCards[0].addEventListener('click', function () {
    // Donate Blood → Dashboard
    markOnboardedAndRedirect('/userdashboard');
  });
}
if (actionCards[1]) {
  actionCards[1].addEventListener('click', function () {
    // Request Blood → Request Blood Page
    markOnboardedAndRedirect('/requestBlood');
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
  loadUserData();
});
