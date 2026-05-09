// LifeLink – Login Script (FINAL MERGED)

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

// Redirect if already logged in
if (localStorage.getItem('token')) {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    const redirectUrl = user?.role === 'admin' ? '/adminDashboard' : '/userdashboard';
    window.location.href = redirectUrl;
  } catch {
    window.location.href = '/userdashboard';
  }
}

// Toggle password
toggleBtn.addEventListener("click", () => {
  const show = passwordInput.type === "password";
  passwordInput.type = show ? "text" : "password";
  eyeShow.style.display = show ? "none" : "block";
  eyeHide.style.display = show ? "block" : "none";
});

// Validation
function validate() {
  let valid = true;

  if (!emailInput.value.trim()) {
    emailError.textContent = "Email is required.";
    emailInput.classList.add("is-error");
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
    emailError.textContent = "Enter a valid email.";
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

// Login
async function handleLogin() {
  if (!validate()) return;

  loginBtn.textContent = "Logging in…";
  loginBtn.disabled = true;

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailInput.value.trim(),
        password: passwordInput.value
      })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      console.log('[LOGIN RESPONSE]', {
        redirectUrl: data.redirectUrl,
        isNewUser: data.isNewUser,
        onboarded: data.user?.onboarded
      });

      loginBtn.textContent = "✓ Success!";

      // Redirect immediately without delay
      const finalUrl = data.redirectUrl || '/userdashboard';
      console.log('[LOGIN REDIRECT] Going to:', finalUrl);
      window.location.href = finalUrl;
    } else {
      // Check if email is not verified (403)
      if (data.requiresVerification && data.email) {
        passwordError.textContent = data.message || "Please verify your email first.";
        passwordInput.classList.add("is-error");
        loginBtn.textContent = "Log In →";
        loginBtn.disabled = false;

        // Redirect to check-email page after a short delay
        setTimeout(() => {
          window.location.href = `/check-email?email=${encodeURIComponent(data.email)}`;
        }, 2000);
      } else {
        passwordError.textContent =
          data.message ||
          (data.errors?.[0]?.msg) ||
          "Login failed.";

        passwordInput.classList.add("is-error");
        loginBtn.textContent = "Log In →";
        loginBtn.disabled = false;
      }
    }
  } catch (error) {
    passwordError.textContent = "Server error.";
    loginBtn.textContent = "Log In →";
    loginBtn.disabled = false;
  }
}

// Events
loginBtn.addEventListener("click", handleLogin);

[emailInput, passwordInput].forEach(el => {
  el.addEventListener("keydown", e => {
    if (e.key === "Enter") handleLogin();
  });
});

// Forgot password (REAL)
forgotLink.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.href = "/passwordReset";
});

// Home redirect
document.getElementById("home-logo").addEventListener("click", () => {
  window.location.href = "/";
});

// Signup redirect
const btnRegister = document.getElementById("btn-register");
if (btnRegister) {
  btnRegister.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "/signup";
  });
}
document.getElementById("btn-register").addEventListener("click", () => {
  window.location.href = "/signup";
});