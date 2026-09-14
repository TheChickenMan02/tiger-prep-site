const pages = document.querySelectorAll('.page');
const nav = document.querySelector('.desktop-nav');
const menuToggle = document.querySelector('.menu-toggle');

function showPage(route) {
  const target = document.querySelector(`[data-route="${route}"]`) || document.querySelector('[data-route="home"]');
  pages.forEach((page) => page.classList.toggle('active', page === target));
  document.querySelectorAll('[data-page]').forEach((link) => link.classList.toggle('current', link.dataset.page === route));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  nav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const route = link.getAttribute('href').slice(1);
    if (!document.querySelector(`[data-route="${route}"]`) && route !== 'pricing') return;
    event.preventDefault();
    showPage(route === 'pricing' ? 'services' : route);
    history.replaceState(null, '', `#${route}`);
  });
});

menuToggle.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

document.querySelector('#session-type').addEventListener('change', (event) => {
  document.querySelector('#total-price').textContent = event.target.value === 'sat' ? '$50.00' : '$35.00';
});

const packageInputs = document.querySelectorAll('#package-duration, #package-frequency, #package-length');

function updatePackagePrice() {
  const duration = Number(document.querySelector('#package-duration').value);
  const frequency = Number(document.querySelector('#package-frequency').value);
  const weeks = Number(document.querySelector('#package-length').value);
  const discount = weeks === 4 ? 0.9 : 0.85;
  const regularTotal = frequency * weeks * duration * 32;
  const packageTotal = regularTotal * discount;
  const formatCurrency = (value) => `$${value.toFixed(2)}`;

  document.querySelector('#package-total').textContent = formatCurrency(packageTotal);
  document.querySelector('#regular-total').textContent = formatCurrency(regularTotal);
  document.querySelector('#package-savings').textContent = `Save ${formatCurrency(regularTotal - packageTotal)}`;
}

packageInputs.forEach((input) => input.addEventListener('change', updatePackagePrice));
updatePackagePrice();

const initialRoute = window.location.hash.slice(1) || 'home';
showPage(initialRoute === 'pricing' ? 'services' : initialRoute);

window.addEventListener('hashchange', () => {
  const route = window.location.hash.slice(1) || 'home';
  showPage(route === 'pricing' ? 'services' : route);
});
