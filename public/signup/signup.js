// LifeLink – Signup Script with Backend Integration

const API_URL = 'http://localhost:5000/api';

// ── Nepal Province & City Data ──
const nepalData = {
    'Koshi Province': [
        'Biratnagar', 'Dharan', 'Itahari', 'Birtamod', 'Damak', 'Mechinagar',
        'Urlabari', 'Inaruwa', 'Triyuga', 'Khandbari', 'Bhojpur', 'Diktel',
        'Chainpur', 'Taplejung', 'Phidim', 'Ilam', 'Terhathum'
    ],
    'Madhesh Province': [
        'Janakpur', 'Birgunj', 'Rajbiraj', 'Lahan', 'Gaur', 'Malangwa',
        'Jaleshwar', 'Bardibas', 'Kalaiya', 'Simara', 'Pathlaiya',
        'Mirchaiya', 'Haripur', 'Dhangadhi (Saptari)'
    ],
    'Bagmati Province': [
        'Kathmandu', 'Lalitpur', 'Bhaktapur', 'Kirtipur', 'Madhyapur Thimi',
        'Hetauda', 'Bharatpur', 'Bidur', 'Dhulikhel', 'Banepa', 'Panauti',
        'Sindhuli', 'Ramechhap', 'Dolakha', 'Nuwakot', 'Rasuwa', 'Makwanpur'
    ],
    'Gandaki Province': [
        'Pokhara', 'Gorkha', 'Damauli', 'Baglung', 'Beni', 'Waling',
        'Kushma', 'Manang', 'Mustang', 'Myagdi', 'Kaski', 'Lamjung',
        'Syangja', 'Tanahu', 'Parbat', 'Nawalpur'
    ],
    'Lumbini Province': [
        'Butwal', 'Bhairahawa (Siddharthanagar)', 'Tansen', 'Tulsipur',
        'Ghorahi', 'Dang', 'Kapilvastu', 'Arghakhanchi', 'Gulmi',
        'Palpa', 'Pyuthan', 'Rolpa', 'Rukum East', 'Banke', 'Bardiya'
    ],
    'Karnali Province': [
        'Birendranagar (Surkhet)', 'Jumla', 'Dailekh', 'Jajarkot',
        'Dolpa', 'Humla', 'Kalikot', 'Mugu', 'Salyan', 'Rukum West'
    ],
    'Sudurpashchim Province': [
        'Dhangadhi', 'Mahendranagar', 'Tikapur', 'Dipayal-Silgadhi',
        'Dadeldhura', 'Darchula', 'Baitadi', 'Bajhang', 'Bajura',
        'Achham', 'Doti'
    ]
};

// Check if user is already logged in
if (localStorage.getItem('token')) {
    // Redirect to dashboard if already logged in
    window.location.href = 'dashboard.html';
}

// Populate provinces
const provinceSelect = document.getElementById('province');
const citySelect = document.getElementById('city');

Object.keys(nepalData).forEach(province => {
    const opt = document.createElement('option');
    opt.value = province;
    opt.textContent = province;
    provinceSelect.appendChild(opt);
});

// On province change → populate cities
provinceSelect.addEventListener('change', () => {
    const cities = nepalData[provinceSelect.value] || [];
    citySelect.innerHTML = '<option value="" disabled selected>Select city / district</option>';
    cities.sort().forEach(city => {
        const opt = document.createElement('option');
        opt.value = city;
        opt.textContent = city;
        citySelect.appendChild(opt);
    });
    citySelect.disabled = false;
});

// Password visibility toggle
const pwInput = document.getElementById('password');
const togglePwBtn = document.getElementById('togglePw');

if (togglePwBtn) {
    togglePwBtn.addEventListener('click', () => {
        const type = pwInput.type === 'password' ? 'text' : 'password';
        pwInput.type = type;
        togglePwBtn.textContent = type === 'password' ? '👁' : '🙈';
    });
}

// Password strength meter
const strengthFill = document.getElementById('strengthFill');
const strengthLabel = document.getElementById('strengthLabel');

const strengthLevels = [
    { width: '25%', color: '#EF4444', text: 'STRENGTH: WEAK' },
    { width: '50%', color: '#F97316', text: 'STRENGTH: FAIR' },
    { width: '75%', color: '#EAB308', text: 'STRENGTH: GOOD' },
    { width: '100%', color: '#16A34A', text: 'STRENGTH: STRONG' },
];

function checkPasswordStrength(password) {
    if (!password) {
        strengthFill.style.width = '0%';
        strengthLabel.style.color = 'transparent';
        return;
    }
    
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    const level = strengthLevels[score - 1] || strengthLevels[0];
    strengthFill.style.width = level.width;
    strengthFill.style.background = level.color;
    strengthLabel.style.color = level.color;
    strengthLabel.textContent = level.text;
}

pwInput.addEventListener('input', () => {
    checkPasswordStrength(pwInput.value);
});

// Email validation
const emailInput = document.getElementById('email');
const emailError = document.getElementById('emailError');

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function setEmailState(valid, msg = '') {
    emailInput.classList.toggle('input-error', !valid);
    emailInput.classList.toggle('input-valid', valid && emailInput.value.length > 0);
    if (emailError) {
        emailError.textContent = msg;
        emailError.style.display = msg ? 'block' : 'none';
    }
}

emailInput.addEventListener('blur', () => {
    if (!emailInput.value) {
        setEmailState(false, '');
    } else if (!isValidEmail(emailInput.value)) {
        setEmailState(false, 'Please enter a valid email (e.g., name@example.com).');
    } else {
        setEmailState(true, '');
    }
});

emailInput.addEventListener('input', () => {
    if (emailInput.classList.contains('input-error') && isValidEmail(emailInput.value)) {
        setEmailState(true, '');
    }
});

// Password match validation
const confirmInput = document.getElementById('confirmPassword');

function setFieldError(input, errorId, message) {
    let errorEl = document.getElementById(errorId);
    if (!errorEl && message) {
        errorEl = document.createElement('span');
        errorEl.id = errorId;
        errorEl.className = 'field-error';
        input.closest('.form-group').appendChild(errorEl);
    }
    
    if (errorEl) {
        input.classList.toggle('input-error', !!message);
        input.classList.toggle('input-valid', !message && input.value.length > 0);
        errorEl.textContent = message;
        errorEl.style.display = message ? 'block' : 'none';
    }
}

pwInput.addEventListener('blur', () => {
    if (!pwInput.value) {
        setFieldError(pwInput, 'passwordError', 'Password is required.');
    } else if (pwInput.value.length < 8) {
        setFieldError(pwInput, 'passwordError', 'Password must be at least 8 characters.');
    } else {
        setFieldError(pwInput, 'passwordError', '');
    }
    
    // Also check confirm password if it has value
    if (confirmInput.value) {
        if (confirmInput.value !== pwInput.value) {
            setFieldError(confirmInput, 'confirmPasswordError', 'Passwords do not match.');
        } else {
            setFieldError(confirmInput, 'confirmPasswordError', '');
        }
    }
});

confirmInput.addEventListener('blur', () => {
    if (!confirmInput.value) {
        setFieldError(confirmInput, 'confirmPasswordError', 'Please confirm your password.');
    } else if (confirmInput.value !== pwInput.value) {
        setFieldError(confirmInput, 'confirmPasswordError', 'Passwords do not match.');
    } else {
        setFieldError(confirmInput, 'confirmPasswordError', '');
    }
});

// Form submission
const signupForm = document.getElementById('signupForm');

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    let hasError = false;
    
    // Validate full name
    const fullnameInput = document.getElementById('fullname');
    if (!fullnameInput.value.trim()) {
        setFieldError(fullnameInput, 'fullnameError', 'Full name is required.');
        if (!hasError) {
            fullnameInput.focus();
            hasError = true;
        }
    } else {
        setFieldError(fullnameInput, 'fullnameError', '');
    }
    
    // Validate email
    if (!emailInput.value.trim()) {
        setEmailState(false, 'Email address is required.');
        if (!hasError) {
            emailInput.focus();
            hasError = true;
        }
    } else if (!isValidEmail(emailInput.value)) {
        setEmailState(false, 'Please enter a valid email (e.g., name@example.com).');
        if (!hasError) {
            emailInput.focus();
            hasError = true;
        }
    }
    
    // Validate password
    if (!pwInput.value) {
        setFieldError(pwInput, 'passwordError', 'Password is required.');
        if (!hasError) {
            pwInput.focus();
            hasError = true;
        }
    } else if (pwInput.value.length < 8) {
        setFieldError(pwInput, 'passwordError', 'Password must be at least 8 characters.');
        if (!hasError) {
            pwInput.focus();
            hasError = true;
        }
    }
    
    // Validate confirm password
    if (!confirmInput.value) {
        setFieldError(confirmInput, 'confirmPasswordError', 'Please confirm your password.');
        if (!hasError) {
            confirmInput.focus();
            hasError = true;
        }
    } else if (confirmInput.value !== pwInput.value) {
        setFieldError(confirmInput, 'confirmPasswordError', 'Passwords do not match.');
        if (!hasError) {
            confirmInput.focus();
            hasError = true;
        }
    }
    
    // Validate phone (optional but validate format if provided)
    const phoneInput = document.getElementById('phone');
    if (phoneInput.value && !/^[\+\d\s\-\(\)]{10,}$/.test(phoneInput.value)) {
        setFieldError(phoneInput, 'phoneError', 'Please enter a valid phone number.');
        if (!hasError) {
            phoneInput.focus();
            hasError = true;
        }
    } else {
        setFieldError(phoneInput, 'phoneError', '');
    }
    
    // Validate province and city
    if (!provinceSelect.value) {
        setFieldError(provinceSelect, 'provinceError', 'Please select your province.');
        if (!hasError) {
            provinceSelect.focus();
            hasError = true;
        }
    } else {
        setFieldError(provinceSelect, 'provinceError', '');
    }
    
    if (!citySelect.value || citySelect.disabled) {
        setFieldError(citySelect, 'cityError', 'Please select your city/district.');
        if (!hasError) {
            citySelect.focus();
            hasError = true;
        }
    } else {
        setFieldError(citySelect, 'cityError', '');
    }
    
    // Validate blood type
    const bloodTypeSelect = document.getElementById('bloodType');
    if (!bloodTypeSelect.value) {
        setFieldError(bloodTypeSelect, 'bloodTypeError', 'Please select your blood type.');
        if (!hasError) {
            bloodTypeSelect.focus();
            hasError = true;
        }
    } else {
        setFieldError(bloodTypeSelect, 'bloodTypeError', '');
    }
    
    // Validate terms
    const termsCheckbox = document.getElementById('terms');
    if (!termsCheckbox.checked) {
        alert('Please agree to the Terms of Service and Privacy Policy.');
        if (!hasError) {
            termsCheckbox.focus();
            hasError = true;
        }
    }
    
    if (hasError) return;
    
    const btn = signupForm.querySelector('.btn-submit');
    const originalText = btn.textContent;
    btn.textContent = 'Creating account...';
    btn.disabled = true;
    
    // Prepare user data
    const userData = {
        fullname: fullnameInput.value.trim(),
        email: emailInput.value.trim(),
        password: pwInput.value,
        phone: phoneInput.value.trim() || null,
        province: provinceSelect.value,
        city: citySelect.value,
        blood_type: bloodTypeSelect.value
    };
    
    try {
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Save token and user data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            btn.textContent = '✓ Account Created!';
            btn.style.background = '#16A34A';
            
            // Redirect to dashboard after success
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            // Show error message
            btn.textContent = originalText;
            btn.disabled = false;
            btn.style.background = '';
            
            if (data.errors && data.errors.length > 0) {
                alert(data.errors[0].msg);
            } else if (data.message) {
                if (data.message.includes('Email already registered')) {
                    setEmailState(false, 'This email is already registered. Please login instead.');
                    emailInput.focus();
                } else {
                    alert(data.message);
                }
            } else {
                alert('Registration failed. Please try again.');
            }
        }
    } catch (error) {
        console.error('Signup error:', error);
        btn.textContent = originalText;
        btn.disabled = false;
        btn.style.background = '';
        alert('Network error. Please make sure the backend server is running on port 5000.');
    }
});

// Helper function for setting field errors
function setFieldError(input, errorId, message) {
    let errorEl = document.getElementById(errorId);
    
    if (!errorEl && message) {
        errorEl = document.createElement('span');
        errorEl.id = errorId;
        errorEl.className = 'field-error';
        const formGroup = input.closest('.form-group');
        if (formGroup) {
            formGroup.appendChild(errorEl);
        } else if (input.parentElement) {
            input.parentElement.appendChild(errorEl);
        }
    }
    
    if (errorEl) {
        if (input.tagName === 'SELECT') {
            input.style.borderColor = message ? '#EF4444' : '';
        } else {
            input.classList.toggle('input-error', !!message);
            input.classList.toggle('input-valid', !message && input.value && input.value.length > 0);
        }
        errorEl.textContent = message;
        errorEl.style.display = message ? 'block' : 'none';
    }
}
// Navigation
document.getElementById("btn-login").onclick = () => window.location.href = "/login";
document.getElementById("home-logo").onclick = () => window.location.href = "/";