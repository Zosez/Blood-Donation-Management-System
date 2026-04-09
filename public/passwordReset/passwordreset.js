// LifeLink – Password Reset Script (FINAL CLEAN)

const API_URL = 'http://localhost:5000/api';

// Get token from URL
const urlParams = new URLSearchParams(window.location.search);
const resetToken = urlParams.get('token');

// Elements
const emailInput = document.getElementById('email');
const sendBtn = document.getElementById('sendBtn');
const successWrap = document.getElementById('successWrap');
const cardTitle = document.querySelector('.card-title');
const cardDesc = document.querySelector('.card-desc');

// Mode check
if (resetToken) {
    setupResetPasswordMode();
} else {
    setupRequestResetMode();
}

// ───────── REQUEST RESET MODE ─────────
function setupRequestResetMode() {
    sendBtn.textContent = 'Send Reset Link';
    sendBtn.onclick = handleSendResetLink;

    emailInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSendResetLink();
    });
}

// ───────── RESET PASSWORD MODE ─────────
function setupResetPasswordMode() {
    if (cardTitle) cardTitle.textContent = 'Create New Password';
    if (cardDesc) cardDesc.textContent = 'Enter your new password';

    emailInput.type = 'password';
    emailInput.placeholder = 'New password';

    // Add confirm password field
    const confirmInput = document.createElement('input');
    confirmInput.type = 'password';
    confirmInput.id = 'confirmPassword';
    confirmInput.placeholder = 'Confirm password';
    confirmInput.style.marginTop = '10px';

    emailInput.parentNode.appendChild(confirmInput);

    sendBtn.textContent = 'Reset Password';
    sendBtn.onclick = handleResetPassword;
}

// ───────── SEND RESET LINK ─────────
async function handleSendResetLink() {
    const email = emailInput.value.trim();

    if (!email || !email.includes('@')) {
        alert("Enter a valid email");
        return;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';

    try {
        const res = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await res.json();

        sendBtn.disabled = false;
        sendBtn.textContent = 'Send Reset Link';

        if (res.ok) {
            if (successWrap) successWrap.classList.add('visible');

            sessionStorage.setItem('resetEmail', email);

            // Dev helper
            if (data.resetToken) {
                console.log('Reset token:', data.resetToken);
            }

            alert("Reset link sent to your email.");
        } else {
            alert(data.message || "Failed to send reset link");
        }

    } catch (err) {
        console.error(err);
        alert("Server error");
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send Reset Link';
    }
}

// ───────── RESET PASSWORD ─────────
async function handleResetPassword() {
    const confirmInput = document.getElementById('confirmPassword');

    const password = emailInput.value;
    const confirm = confirmInput.value;

    if (password.length < 8) {
        alert("Password must be at least 8 characters");
        return;
    }

    if (password !== confirm) {
        alert("Passwords do not match");
        return;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = 'Resetting...';

    try {
        const res = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: resetToken,
                newPassword: password
            })
        });

        const data = await res.json();

        sendBtn.disabled = false;
        sendBtn.textContent = 'Reset Password';

        if (res.ok) {
            alert("Password reset successful!");
            sessionStorage.removeItem('resetEmail');
            window.location.href = 'login.html';
        } else {
            alert(data.message || "Reset failed");
        }

    } catch (err) {
        console.error(err);
        alert("Server error");
        sendBtn.disabled = false;
        sendBtn.textContent = 'Reset Password';
    }
}

// ───────── LOGIN REDIRECT ─────────
document.getElementById("btn-login").addEventListener("click", () => {
    window.location.href = "/login";
});