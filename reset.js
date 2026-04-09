// LifeLink – Password Reset Script with Backend Integration

const API_URL = 'http://localhost:5000/api';

// Get token from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const resetToken = urlParams.get('token');

// DOM Elements
const emailInput = document.getElementById('email');
const sendBtn = document.getElementById('sendBtn');
const successWrap = document.getElementById('successWrap');
const cardTitle = document.querySelector('.card-title');
const cardDesc = document.querySelector('.card-desc');

// Check if this is a password reset page (with token)
if (resetToken) {
    // This is the reset password page (user clicked reset link)
    setupResetPasswordMode();
} else {
    // This is the request reset page
    setupRequestResetMode();
}

function setupRequestResetMode() {
    if (sendBtn) {
        sendBtn.textContent = 'Send Reset Link';
        sendBtn.onclick = handleSendResetLink;
    }
    
    if (emailInput) {
        emailInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSendResetLink();
        });
    }
}

function setupResetPasswordMode() {
    // Change UI for password reset
    if (cardTitle) cardTitle.textContent = 'Create New Password';
    if (cardDesc) cardDesc.textContent = 'Please enter your new password below.';
    
    // Change email field to password field
    const fieldLabel = document.querySelector('.field-label');
    if (fieldLabel) fieldLabel.textContent = 'NEW PASSWORD';
    
    if (emailInput) {
        emailInput.type = 'password';
        emailInput.placeholder = 'Enter your new password';
        emailInput.autocomplete = 'new-password';
        
        // Add confirm password field
        const inputWrap = emailInput.closest('.input-wrap');
        if (inputWrap && !document.getElementById('confirmPassword')) {
            const confirmWrap = document.createElement('div');
            confirmWrap.className = 'input-wrap';
            confirmWrap.style.marginTop = '15px';
            confirmWrap.style.marginBottom = '20px';
            
            const confirmLabel = document.createElement('label');
            confirmLabel.className = 'field-label';
            confirmLabel.textContent = 'CONFIRM PASSWORD';
            confirmLabel.htmlFor = 'confirmPassword';
            
            const confirmInput = document.createElement('input');
            confirmInput.type = 'password';
            confirmInput.id = 'confirmPassword';
            confirmInput.placeholder = 'Confirm your new password';
            confirmInput.autocomplete = 'new-password';
            
            const confirmIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            confirmIcon.setAttribute('width', '18');
            confirmIcon.setAttribute('height', '18');
            confirmIcon.setAttribute('viewBox', '0 0 24 24');
            confirmIcon.setAttribute('fill', 'none');
            confirmIcon.setAttribute('stroke', 'currentColor');
            confirmIcon.setAttribute('stroke-width', '1.8');
            confirmIcon.innerHTML = '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>';
            
            confirmWrap.appendChild(confirmIcon);
            confirmWrap.appendChild(confirmInput);
            
            // Insert after the input wrap
            inputWrap.parentNode.insertBefore(confirmLabel, inputWrap.nextSibling);
            inputWrap.parentNode.insertBefore(confirmWrap, inputWrap.nextSibling);
        }
    }
    
    if (sendBtn) {
        sendBtn.textContent = 'Reset Password';
        sendBtn.onclick = handleResetPassword;
    }
}

async function handleSendResetLink() {
    if (!emailInput) return;
    
    const email = emailInput.value.trim();
    
    // Validate email
    if (!email) {
        showError(emailInput, 'Please enter your email address.');
        emailInput.focus();
        return;
    }
    
    if (!isValidEmail(email)) {
        showError(emailInput, 'Please enter a valid email address.');
        emailInput.focus();
        return;
    }
    
    // Clear error
    clearError(emailInput);
    
    // Show loading state
    const originalText = sendBtn.textContent;
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';
    
    try {
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        sendBtn.disabled = false;
        sendBtn.textContent = originalText;
        
        if (response.ok) {
            // Show success message
            if (successWrap) {
                successWrap.classList.add('visible');
            }
            
            // Store email for reference
            sessionStorage.setItem('resetEmail', email);
            
            // In development, show reset token
            if (data.resetToken) {
                console.log('Reset token (development):', data.resetToken);
                const useToken = confirm('Development Mode: Reset link sent!\n\nWould you like to reset your password now?');
                if (useToken) {
                    window.location.href = `reset.html?token=${data.resetToken}`;
                }
            } else {
                // Show additional message
                setTimeout(() => {
                    alert('Password reset link has been sent to your email address.\n\nPlease check your inbox and follow the instructions to reset your password.');
                }, 500);
            }
        } else {
            // Show error message
            if (data.message) {
                alert(data.message);
            } else {
                alert('Failed to send reset link. Please try again.');
            }
        }
    } catch (error) {
        console.error('Reset request error:', error);
        sendBtn.disabled = false;
        sendBtn.textContent = originalText;
        alert('Network error. Please make sure the backend server is running on port 5000.');
    }
}

async function handleResetPassword() {
    const passwordInput = document.getElementById('email');
    const confirmInput = document.getElementById('confirmPassword');
    
    if (!passwordInput || !confirmInput) return;
    
    const newPassword = passwordInput.value;
    const confirmPassword = confirmInput.value;
    
    // Validate password
    if (!newPassword) {
        showError(passwordInput, 'Please enter a new password.');
        passwordInput.focus();
        return;
    }
    
    if (newPassword.length < 8) {
        showError(passwordInput, 'Password must be at least 8 characters.');
        passwordInput.focus();
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showError(confirmInput, 'Passwords do not match.');
        confirmInput.focus();
        return;
    }
    
    // Clear errors
    clearError(passwordInput);
    clearError(confirmInput);
    
    // Show loading state
    const originalText = sendBtn.textContent;
    sendBtn.disabled = true;
    sendBtn.textContent = 'Resetting...';
    
    try {
        const response = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: resetToken,
                newPassword: newPassword
            })
        });
        
        const data = await response.json();
        
        sendBtn.disabled = false;
        sendBtn.textContent = originalText;
        
        if (response.ok) {
            alert('Password reset successful! You can now login with your new password.');
            
            // Clear any stored reset data
            sessionStorage.removeItem('resetEmail');
            
            // Redirect to login page
            window.location.href = 'login.html';
        } else {
            alert(data.message || 'Failed to reset password. The link may have expired.');
        }
    } catch (error) {
        console.error('Password reset error:', error);
        sendBtn.disabled = false;
        sendBtn.textContent = originalText;
        alert('Network error. Please make sure the backend server is running.');
    }
}

// Helper Functions
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function showError(input, message) {
    input.style.borderColor = '#b92020';
    
    // Remove existing error message
    clearError(input);
    
    // Add error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.color = '#b92020';
    errorDiv.style.fontSize = '0.75rem';
    errorDiv.style.marginTop = '5px';
    errorDiv.textContent = message;
    
    input.parentNode.appendChild(errorDiv);
}

function clearError(input) {
    input.style.borderColor = '';
    
    // Remove existing error messages
    const errorDivs = input.parentNode.querySelectorAll('.error-message');
    errorDivs.forEach(div => div.remove());
}

// Add password strength meter for reset page
if (resetToken && emailInput) {
    emailInput.addEventListener('input', function() {
        const password = this.value;
        if (password) {
            checkStrength(password);
        } else {
            const strengthDiv = document.getElementById('strengthIndicator');
            if (strengthDiv) strengthDiv.remove();
        }
    });
}

function checkStrength(password) {
    let strengthDiv = document.getElementById('strengthIndicator');
    
    if (!strengthDiv) {
        strengthDiv = document.createElement('div');
        strengthDiv.id = 'strengthIndicator';
        strengthDiv.style.marginTop = '8px';
        strengthDiv.style.fontSize = '0.7rem';
        strengthDiv.style.fontWeight = 'bold';
        emailInput.parentNode.appendChild(strengthDiv);
    }
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    const strengthMap = {
        0: { text: 'VERY WEAK', color: '#EF4444' },
        1: { text: 'WEAK', color: '#EF4444' },
        2: { text: 'FAIR', color: '#F97316' },
        3: { text: 'GOOD', color: '#EAB308' },
        4: { text: 'STRONG', color: '#16A34A' }
    };
    
    const info = strengthMap[strength];
    strengthDiv.textContent = `Password Strength: ${info.text}`;
    strengthDiv.style.color = info.color;
}