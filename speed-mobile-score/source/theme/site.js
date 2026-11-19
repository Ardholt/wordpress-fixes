document.addEventListener('DOMContentLoaded', () => {
  const button = document.querySelector('.menu-toggle');
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    document.querySelector('nav').classList.toggle('open', open);
  });
});

// The original reveal waits for every eager image before opening the hero.
window.addEventListener('load', () => {
  if (document.body.classList.contains('unoptimized')) document.querySelector('.hero').style.height = 'auto';
});
