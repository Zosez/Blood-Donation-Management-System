// LifeLink – Login Script

const emailInput    = document.getElementById("email");
const passwordInput = document.getElementById("password");
const emailError    = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");
const loginBtn      = document.getElementById("loginBtn");
const toggleBtn     = document.getElementById("togglePassword");
const eyeShow       = document.getElementById("eyeShow");
const eyeHide       = document.getElementById("eyeHide");
const forgotLink    = document.getElementById("forgotLink");

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

// Login
loginBtn.addEventListener("click", () => {
  if (!validate()) return;
  loginBtn.textContent = "Logging in…";
  loginBtn.disabled = true;

  setTimeout(() => {
    // Replace with real API call
    if (emailInput.value === "demo@lifelink.com" && passwordInput.value === "password123") {
      loginBtn.textContent = "✓ Success!";
    } else {
      passwordError.textContent = "Email or password is incorrect.";
      passwordInput.classList.add("is-error");
      loginBtn.textContent = "Log In →";
      loginBtn.disabled = false;
    }
  }, 1200);
});

// Enter key support
[emailInput, passwordInput].forEach(el => {
  el.addEventListener("keydown", e => {
    if (e.key === "Enter") loginBtn.click();
  });
});

// Forgot password
forgotLink.addEventListener("click", e => {
  e.preventDefault();
  if (emailInput.value.trim()) {
    alert("Password reset sent to: " + emailInput.value);
  } else {
    emailError.textContent = "Enter your email first.";
    emailInput.focus();
  }
});