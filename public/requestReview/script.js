// ── Button interactions ──
document.addEventListener('DOMContentLoaded', () => {
  const approveBtn = document.querySelector('.btn-approve');
  const rejectBtn  = document.querySelector('.btn-reject');

  approveBtn?.addEventListener('click', () => {
    approveBtn.textContent = '✓ Approved';
    approveBtn.style.background = 'linear-gradient(104.67deg,#1b8a56 0%,#22c55e 100%)';
    approveBtn.style.boxShadow = '0px 10px 15px -3px rgba(27,138,86,0.3)';
    approveBtn.disabled = true;
    rejectBtn.disabled  = true;
    rejectBtn.style.opacity = '0.45';
  });

  rejectBtn?.addEventListener('click', () => {
    rejectBtn.textContent = '✕ Rejected';
    rejectBtn.style.background = '#FFDAD6';
    rejectBtn.style.borderColor = 'rgba(158,32,22,0.5)';
    rejectBtn.disabled  = true;
    approveBtn.disabled = true;
    approveBtn.style.opacity = '0.45';
  });
});