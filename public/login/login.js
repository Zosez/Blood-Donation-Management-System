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
  window.location.href = 'dashboard.html';
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

      loginBtn.textContent = "✓ Success!";

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
    } else {
      passwordError.textContent =
        data.message ||
        (data.errors?.[0]?.msg) ||
        "Login failed.";

      passwordInput.classList.add("is-error");
      loginBtn.textContent = "Log In →";
      loginBtn.disabled = false;
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
forgotLink.addEventListener("click", async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();

  if (!email) {
    emailError.textContent = "Enter your email first.";
    return;
  }

  try {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await res.json();
    alert(data.message || "Reset link sent.");
  } catch {
    alert("Network error.");
  }
});

// Home redirect
document.getElementById("home-logo").addEventListener("click", () => {
  window.location.href = "/";
});

// Signup redirect
document.getElementById("btn-register").addEventListener("click", () => {
  window.location.href = "/signup";
});