// LifeLink – Password Reset Script (FIXED)

const API_URL = '/api';
// Password regex pattern: requires uppercase, lowercase, digit, and special character
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Get token from URL
const urlParams = new URLSearchParams(window.location.search);
const resetToken = urlParams.get('token');

// Initialize elements when DOM is ready
let emailInput, sendBtn, successWrap, errorMsg, cardTitle, cardDesc, backLink, emailLabel, passwordFormContainer, newPasswordInput, confirmPasswordInput;

function initializeElements() {
    emailInput = document.getElementById('email');
    sendBtn = document.getElementById('sendBtn');
    successWrap = document.getElementById('successWrap');
    errorMsg = document.getElementById('errorMsg');
    cardTitle = document.querySelector('.card-title');
    cardDesc = document.querySelector('.card-desc');
    backLink = document.getElementById('btn-login');
    emailLabel = document.querySelector('label[for="email"]');
    passwordFormContainer = document.getElementById('passwordFormContainer');
    newPasswordInput = document.getElementById('newPasswordInput');
    confirmPasswordInput = document.getElementById('confirmPasswordInput');
}

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    try {
        initializeElements();

        // Back to login
        if (backLink) {
            backLink.onclick = (e) => {
                e.preventDefault();
                window.location.href = '/login';
            };
        }

        // Mode check
        if (resetToken) {
            switchToResetPasswordMode();
        } else {
            switchToEmailRequestMode();
        }
    } catch (error) {
        console.error('Initialization error:', error);
    }
});

// ═══════════════════════════════════════════════════════
// EMAIL REQUEST MODE (Initial state)
// ═══════════════════════════════════════════════════════
function switchToEmailRequestMode() {
    if (cardTitle) cardTitle.textContent = 'Reset your password';
    if (cardDesc) cardDesc.textContent = 'Enter your email address and we\'ll send you a reset link.';
    
    if (emailLabel) emailLabel.textContent = 'Email Address';
    if (passwordFormContainer) passwordFormContainer.style.display = 'none';
    
    if (sendBtn) {
        sendBtn.textContent = 'Send Reset Link';
        sendBtn.onclick = handleSendResetLink;

        // Enter key support
        if (emailInput) {
            emailInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendResetLink();
                }
            });
        }
    }
}

// ═══════════════════════════════════════════════════════
// RESET PASSWORD MODE (When token present)
// ═══════════════════════════════════════════════════════
function switchToResetPasswordMode() {
    if (cardTitle) cardTitle.textContent = 'Create New Password';
    if (cardDesc) cardDesc.textContent = 'Enter your new password below to regain access to your account.';
    
    // Hide email input
    if (emailInput) emailInput.parentNode.style.display = 'none';
    if (emailLabel) emailLabel.style.display = 'none';
    
    // Show password form
    if (passwordFormContainer) passwordFormContainer.style.display = 'block';
    
    // Hide success wrap (not needed for reset)
    if (successWrap) successWrap.style.display = 'none';
    
    if (sendBtn) {
        sendBtn.textContent = 'Reset Password';
        sendBtn.onclick = handleResetPassword;

        // Enter key support
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && (document.activeElement === newPasswordInput || document.activeElement === confirmPasswordInput)) {
                e.preventDefault();
                handleResetPassword();
            }
        });
    }
}

// ═══════════════════════════════════════════════════════
// HANDLE SEND RESET LINK
// ═══════════════════════════════════════════════════════
async function handleSendResetLink() {
    try {
        // Safely get fresh references
        const emailEl = document.getElementById('email');
        const btn = document.getElementById('sendBtn');

        console.log('[Email] Email input:', emailEl ? 'found' : 'NULL');
        console.log('[Email] Button:', btn ? 'found' : 'NULL');

        if (!emailEl) {
            console.error('Email input not found in DOM');
            showError('Email input error. Please refresh the page.');
            return;
        }

        const email = emailEl.value ? emailEl.value.trim() : '';

        // Validation
        if (!email) {
            showError('Please enter your email address');
            return;
        }

        if (!email.includes('@') || !email.includes('.')) {
            showError('Please enter a valid email address');
            return;
        }

        // Clear any previous errors
        hideError();

        // Disable button
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Sending...';
        }

        console.log('[Email] Sending to:', email);

        try {
            const res = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();

            // Re-enable button
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Send Reset Link';
            }

            if (res.ok) {
                console.log('[Email] Success - showing modal');
                // Show success modal dialog
                showSuccessModal(email);

                // Store email for reference
                sessionStorage.setItem('resetEmail', email);

                // Dev helper - log token
                if (data.resetToken) {
                    console.log('[DEV] Reset token:', data.resetToken);
                    console.log('[DEV] Full reset link: ' + API_URL.replace('/api', '') + '/passwordReset?token=' + data.resetToken);
                }
            } else {
                console.error('[Email] API Error:', data.message);
                showError(data.message || 'Failed to send reset link');
            }
        } catch (fetchErr) {
            console.error('[Email] Fetch error:', fetchErr);
            showError('Server error. Please try again.');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Send Reset Link';
            }
        }
    } catch (err) {
        console.error('[Email] Unexpected error:', err);
        showError('An unexpected error occurred. Please try again.');
    }
}

// ═══════════════════════════════════════════════════════
// HANDLE RESET PASSWORD
// ═══════════════════════════════════════════════════════
async function handleResetPassword() {
    try {
        // Safely get fresh references to password inputs
        const newPwd = document.getElementById('newPasswordInput');
        const confirmPwd = document.getElementById('confirmPasswordInput');
        const btn = document.getElementById('sendBtn');

        // Log for debugging
        console.log('[Reset] New Password Input:', newPwd ? 'found' : 'NULL');
        console.log('[Reset] Confirm Password Input:', confirmPwd ? 'found' : 'NULL');
        console.log('[Reset] Button:', btn ? 'found' : 'NULL');

        // Check if elements exist
        if (!newPwd) {
            console.error('New password input not found in DOM');
            showError('Password input error. Please refresh the page.');
            return;
        }

        if (!confirmPwd) {
            console.error('Confirm password input not found in DOM');
            showError('Password confirmation input error. Please refresh the page.');
            return;
        }

        // Get values
        const newPassword = newPwd.value ? newPwd.value.trim() : '';
        const confirmPassword = confirmPwd.value ? confirmPwd.value.trim() : '';

        console.log('[Reset] New password length:', newPassword.length);
        console.log('[Reset] Confirm password length:', confirmPassword.length);

        // Validation
        if (!newPassword || !confirmPassword) {
            showError('Please enter both passwords');
            return;
        }

        if (newPassword.length < 8) {
            showError('Password must be at least 8 characters long');
            return;
        }

        if (!passwordRegex.test(newPassword)) {
            showError('Password must contain uppercase, lowercase, number, and special character (@$!%*?&).');
            return;
        }

        if (newPassword !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }

        // Clear previous errors
        hideError();

        // Disable button
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Resetting...';
        }

        console.log('[Reset] Sending reset request with token:', resetToken ? 'yes' : 'NO TOKEN');

        try {
            const res = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: resetToken,
                    newPassword: newPassword
                })
            });

            const data = await res.json();

            if (res.ok) {
                console.log('[Reset] Success!');
                // Show success
                const title = document.querySelector('.card-title');
                const desc = document.querySelector('.card-desc');
                const container = document.getElementById('passwordFormContainer');

                if (title) title.textContent = '✓ Password Reset Successfully';
                if (desc) desc.textContent = 'Your password has been successfully reset. Redirecting to login...';
                if (container) container.style.display = 'none';

                if (btn) {
                    btn.textContent = 'Password Reset ✓';
                    btn.disabled = true;
                }

                // Redirect after 2 seconds
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                console.error('[Reset] API Error:', data.message);
                showError(data.message || 'Failed to reset password. Please try again.');
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Reset Password';
                }
            }
        } catch (fetchErr) {
            console.error('[Reset] Fetch error:', fetchErr);
            showError('Server error. Please try again.');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Reset Password';
            }
        }
    } catch (err) {
        console.error('[Reset] Unexpected error:', err);
        showError('An unexpected error occurred. Please try again.');
    }
}

// ═══════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════

function showError(message) {
    try {
        // Always get fresh reference
        const errorEl = document.getElementById('errorMsg');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            console.log('[Error] Showing:', message);
        } else {
            console.error('[Error] Error element not found in DOM');
            showModal(message, { type: 'error' });
        }
    } catch (err) {
        console.error('[Error] showError failed:', err);
        showModal(message, { type: 'error' });
    }
}

function hideError() {
    try {
        const errorEl = document.getElementById('errorMsg');
        if (errorEl) {
            errorEl.style.display = 'none';
        }
    } catch (err) {
        console.error('[Error] hideError failed:', err);
    }
}

function showSuccessModal(email) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'successModal';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        animation: fadeIn 0.3s ease-in-out;
    `;

    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        border-radius: 16px;
        padding: 40px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        text-align: center;
        animation: slideUp 0.4s ease-in-out;
    `;

    modal.innerHTML = `
        <div style="margin-bottom: 24px;">
            <div style="
                width: 60px;
                height: 60px;
                background: #10B981;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 16px;
            ">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            </div>
            <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin: 0 0 12px 0;">
                Reset link sent!
            </h2>
            <p style="color: #6B7280; font-size: 14px; line-height: 1.5; margin: 0;">
                We've sent a password reset link to <strong>${email}</strong>. Check your inbox (and spam folder) for the email.
            </p>
        </div>
        <p style="color: #9CA3AF; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0;">
            The reset link expires in 1 hour for security.
        </p>
        <button id="closeModal" style="
            width: 100%;
            padding: 12px 16px;
            background: #10B981;
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 24px;
            font-size: 14px;
            transition: background 0.2s;
        ">Got it!</button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Add animations to styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        #closeModal:hover {
            background: #059669 !important;
        }
    `;
    document.head.appendChild(style);

    // Close modal button
    const closeBtn = document.getElementById('closeModal');
    if (closeBtn) {
        closeBtn.onclick = () => {
            overlay.remove();
            // Clear email input
            if (emailInput) emailInput.value = '';
        };
    }

    // Close on background click
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            overlay.remove();
            if (emailInput) emailInput.value = '';
        }
    };
}
