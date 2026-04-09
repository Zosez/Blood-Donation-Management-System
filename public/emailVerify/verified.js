// LifeLink – Email Verified Script

let seconds = 5;
const countdownEl = document.getElementById('countdown');
const redirectNote = document.getElementById('redirectNote');

// Countdown timer — auto-redirect after 5 seconds
const timer = setInterval(() => {
  seconds--;
  if (countdownEl) countdownEl.textContent = seconds;

  if (seconds <= 0) {
    clearInterval(timer);
    if (redirectNote) redirectNote.textContent = 'REDIRECTING NOW...';
    window.location.href = '/login';
  }
}, 1000);

// Manual continue button
function handleContinue() {
  clearInterval(timer);
  if (redirectNote) redirectNote.textContent = 'REDIRECTING NOW...';
  window.location.href = '/login';
}
