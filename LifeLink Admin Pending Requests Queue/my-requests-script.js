// ── Filter by status ─────────────────────────────────────────────────────────
function filterBy(status, btn) {
  // Update pill active state
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');

  // Show/hide rows
  const rows = document.querySelectorAll('#table-body tr');
  rows.forEach(row => {
    const rowStatus = row.getAttribute('data-status');
    row.style.display = (status === 'all' || rowStatus === status) ? '' : 'none';
  });
}

// ── New Blood Request button ──────────────────────────────────────────────────
document.querySelector('.btn-new').addEventListener('click', () => {
  // Placeholder — navigate or open modal
  alert('Redirecting to New Blood Request form…');
});

// ── View Details links ────────────────────────────────────────────────────────
document.querySelectorAll('.view-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const row = link.closest('tr');
    const date = row.querySelector('.date').textContent;
    const blood = row.querySelector('.blood-badge').textContent;
    alert(`Viewing details for ${blood} request submitted on ${date}`);
  });
});

// ── Sort dropdown (placeholder toggle) ───────────────────────────────────────
document.querySelector('.sort-btn').addEventListener('click', function () {
  const options = ['Date: Newest first', 'Date: Oldest first', 'Urgency: Critical first'];
  const current = this.childNodes[1].textContent.trim();
  const next = options[(options.indexOf(current) + 1) % options.length];
  this.childNodes[1].textContent = ' ' + next + ' ';
});
