// LifeLink – Check Your Email Script

const API_URL = '/api';

// Get email from URL query parameter
const urlParams = new URLSearchParams(window.location.search);
const email = urlParams.get('email');

// Display the email on the page
const userEmailEl = document.getElementById('userEmail');
if (email && userEmailEl) {
    // Mask the email for privacy (show first 3 chars + domain)
    const parts = email.split('@');
    if (parts.length === 2 && parts[0].length > 3) {
        const masked = parts[0].substring(0, 3) + '•••@' + parts[1];
        userEmailEl.textContent = masked;
    } else {
        userEmailEl.textContent = email;
    }
}

// Resend cooldown
let resendCooldown = 0;
let cooldownTimer = null;

function startCooldown(seconds) {
    resendCooldown = seconds;
    const btn = document.getElementById('resendBtn');
    btn.disabled = true;

    cooldownTimer = setInterval(() => {
        resendCooldown--;
        if (resendCooldown <= 0) {
            clearInterval(cooldownTimer);
            btn.disabled = false;
            btn.textContent = 'Resend Verification Email';
        } else {
            btn.textContent = `Resend in ${resendCooldown}s`;
        }
    }, 1000);
}

// Handle resend
async function handleResend() {
    if (!email) {
        showStatus('Email not found. Please sign up again.', true);
        return;
    }

    const btn = document.getElementById('resendBtn');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
        const response = await fetch(`${API_URL}/auth/resend-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            showStatus('✓ Verification email resent! Check your inbox.', false);
            startCooldown(60);
        } else {
            showStatus(data.message || 'Failed to resend. Please try again.', true);
            btn.disabled = false;
            btn.textContent = 'Resend Verification Email';
        }
    } catch (error) {
        console.error('Resend error:', error);
        showStatus('Network error. Please check your connection.', true);
        btn.disabled = false;
        btn.textContent = 'Resend Verification Email';
    }
}

function showStatus(message, isError) {
    const statusEl = document.getElementById('resendStatus');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = 'resend-status' + (isError ? ' error' : '');
    }
}
