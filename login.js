// LifeLink – Login Script with Backend Integration

const API_URL = 'http://localhost:5000/api';

const emailInput    = document.getElementById("email");
const passwordInput = document.getElementById("password");
const emailError    = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");
const loginBtn      = document.getElementById("loginBtn");
const toggleBtn     = document.getElementById("togglePassword");
const eyeShow       = document.getElementById("eyeShow");
const eyeHide       = document.getElementById("eyeHide");
const forgotLink    = document.getElementById("forgotLink");

// Check if user is already logged in
if (localStorage.getItem('token')) {
    // Redirect to dashboard if already logged in
    window.location.href = 'dashboard.html';
}

// Toggle password visibility
toggleBtn.addEventListener("click", () => {
    const show = passwordInput.type === "password";
    passwordInput.type = show ? "text" : "password";
    eyeShow.style.display = show ? "none" : "block";
    eyeHide.style.display = show ? "block" : "none";
});

// Simple validation
function validate() {
    let valid = true;

    if (!emailInput.value.trim()) {
        emailError.textContent = "Email is required.";
        emailInput.classList.add("is-error");
        valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
        emailError.textContent = "Enter a valid email.";
        emailInput.classList.add("is-error");
        valid = false;
    } else {
        emailError.textContent = "";
        emailInput.classList.remove("is-error");
    }

    if (!passwordInput.value) {
        passwordError.textContent = "Password is required.";
        passwordInput.classList.add("is-error");
        valid = false;
    } else {
        passwordError.textContent = "";
        passwordInput.classList.remove("is-error");
    }

    return valid;
}

// Login function
async function handleLogin() {
    if (!validate()) return;
    
    loginBtn.textContent = "Logging in…";
    loginBtn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: emailInput.value.trim(),
                password: passwordInput.value
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Save token and user data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            loginBtn.textContent = "✓ Success!";
            loginBtn.style.background = "linear-gradient(135deg, #16A34A, #15803D)";
            
            // Redirect to dashboard after success
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1200);
        } else {
            // Show error message
            if (data.message) {
                passwordError.textContent = data.message;
            } else if (data.errors && data.errors.length > 0) {
                passwordError.textContent = data.errors[0].msg;
            } else {
                passwordError.textContent = "Email or password is incorrect.";
            }
            passwordInput.classList.add("is-error");
            loginBtn.textContent = "Log In →";
            loginBtn.disabled = false;
            loginBtn.style.background = "";
        }
    } catch (error) {
        console.error('Login error:', error);
        passwordError.textContent = "Network error. Please make sure the server is running.";
        passwordInput.classList.add("is-error");
        loginBtn.textContent = "Log In →";
        loginBtn.disabled = false;
        loginBtn.style.background = "";
    }
}

// Login button click handler
loginBtn.addEventListener("click", handleLogin);

// Enter key support
[emailInput, passwordInput].forEach(el => {
    el.addEventListener("keydown", e => {
        if (e.key === "Enter") handleLogin();
    });
});

// Forgot password handler
forgotLink.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    
    if (!email) {
        emailError.textContent = "Enter your email address first.";
        emailInput.focus();
        return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailError.textContent = "Enter a valid email address.";
        emailInput.focus();
        return;
    }

    // Show loading state on forgot link
    const originalText = forgotLink.textContent;
    forgotLink.textContent = "Sending...";
    forgotLink.style.opacity = "0.7";
    forgotLink.style.cursor = "wait";

    try {
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();
        
        if (response.ok) {
            // Store email for reset page
            sessionStorage.setItem('resetEmail', email);
            
            // Show success message
            alert("Password reset link has been sent to your email address.\n\nPlease check your inbox and follow the instructions to reset your password.");
            
            // In development, show the reset token
            if (data.resetToken) {
                console.log('Reset token (development):', data.resetToken);
                const useToken = confirm("Development Mode: Would you like to use the reset token now?");
                if (useToken) {
                    window.location.href = `reset.html?token=${data.resetToken}`;
                }
            }
        } else {
            alert(data.message || "Failed to send reset link. Please try again.");
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        alert("Network error. Please make sure the server is running.");
    } finally {
        // Reset forgot link
        forgotLink.textContent = originalText;
        forgotLink.style.opacity = "";
        forgotLink.style.cursor = "";
    }
});