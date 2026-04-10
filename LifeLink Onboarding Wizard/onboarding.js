// ── Onboarding interactions ─────────────────────────────────────

document.querySelector('.next-btn').addEventListener('click', function () {
  // Navigate to next onboarding step
  console.log('Next step');
});

document.querySelector('.skip-link').addEventListener('click', function () {
  // Skip onboarding
  console.log('Skipped onboarding');
});

document.querySelectorAll('.action-card').forEach(function (card) {
  card.addEventListener('click', function () {
    const title = card.querySelector('.ac-title').textContent;
    console.log('Selected:', title);
  });
});
