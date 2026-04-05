// ── Send Reset Link Handler ──
function handleSend() {
  const input  = document.getElementById('email');
  const btn    = document.getElementById('sendBtn');
  const notice = document.getElementById('successWrap');

  // Validate email
  if (!input.value.trim() || !input.value.includes('@')) {
    input.style.borderColor = '#b92020';
    input.focus();
    setTimeout(() => (input.style.borderColor = ''), 1800);
    return;
  }

  // Loading state
  btn.disabled = true;
  btn.textContent = 'Sending…';

  // Simulate API call
  setTimeout(() => {
    btn.textContent = 'Send Reset Link';
    btn.disabled = false;
    notice.classList.add('visible');
  }, 1200);
}

// ── Enter key support ──
document.getElementById('email').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSend();
});
