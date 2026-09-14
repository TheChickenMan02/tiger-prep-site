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

const packageInputs = document.querySelectorAll('#package-program, #package-duration, #package-frequency, #package-length');
const HOURLY_RATES = { k12: 35, sat: 50 };
const PROGRAM_LABELS = { k12: 'K–12 tutoring', sat: 'SAT prep' };
const formatCurrency = (value) => `$${value.toFixed(2)}`;

function getPackageSelection() {
  const program = document.querySelector('#package-program').value;
  const duration = Number(document.querySelector('#package-duration').value);
  const frequency = Number(document.querySelector('#package-frequency').value);
  const weeks = Number(document.querySelector('#package-length').value);
  const discount = weeks === 4 ? 0.9 : 0.85;
  const rate = HOURLY_RATES[program];
  const regularTotal = frequency * weeks * duration * rate;
  const packageTotal = regularTotal * discount;
  return {
    program,
    duration,
    frequency,
    weeks,
    rate,
    regularTotal,
    packageTotal,
    savings: regularTotal - packageTotal,
  };
}

function updatePackagePrice() {
  const { regularTotal, packageTotal, savings } = getPackageSelection();

  document.querySelector('#package-total').textContent = formatCurrency(packageTotal);
  document.querySelector('#regular-total').textContent = formatCurrency(regularTotal);
  document.querySelector('#package-savings').textContent = `Save ${formatCurrency(savings)}`;
}

packageInputs.forEach((input) => input.addEventListener('change', updatePackagePrice));
updatePackagePrice();

// Plan confirmation modal + Calendly handoff + Web3Forms notification
const CALENDLY_BASE_URL = 'https://calendly.com/dbjimson/tiger-prep-discovery-call'; // TODO: replace with your real Calendly event URL before launch
const WEB3FORMS_ACCESS_KEY = 'f19637d4-1444-4b46-b9da-b23cd3a989b9';

const planModal = document.querySelector('#plan-modal');
const planForm = document.querySelector('#plan-form');
const planRecap = document.querySelector('#plan-recap');
const calendlyLink = document.querySelector('#calendly-link');
const calendlyHeading = document.querySelector('#calendly-heading');
const calendlyCopy = document.querySelector('#calendly-copy');

function sessionLengthLabel(duration) {
  return duration === 1 ? '60 minutes' : '30 minutes';
}

function summaryRows(selection) {
  return [
    ['Program', PROGRAM_LABELS[selection.program]],
    ['Session length', sessionLengthLabel(selection.duration)],
    ['Sessions per week', String(selection.frequency)],
    ['Package length', `${selection.weeks} weeks`],
    ['Package total', formatCurrency(selection.packageTotal)],
  ];
}

function renderSummary(container, selection) {
  const rows = summaryRows(selection);
  container.innerHTML = rows
    .map(([label, value], index) => {
      const isTotal = index === rows.length - 1;
      return `<dt>${label}</dt><dd${isTotal ? ' class="plan-summary-total"' : ''}>${value}</dd>`;
    })
    .join('');
}

function openPlanModal() {
  planModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closePlanModal() {
  planModal.hidden = true;
  document.body.style.overflow = '';
}

document.querySelector('#confirm-plan').addEventListener('click', openPlanModal);
document.querySelector('#plan-modal-close').addEventListener('click', closePlanModal);
document.querySelector('#plan-modal-overlay').addEventListener('click', closePlanModal);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !planModal.hidden) closePlanModal();
});

function planDetailLines(selection, contact) {
  return [
    `Program: ${PROGRAM_LABELS[selection.program]}`,
    `Session length: ${sessionLengthLabel(selection.duration)}`,
    `Sessions per week: ${selection.frequency}`,
    `Package length: ${selection.weeks} weeks`,
    `Estimated package total: ${formatCurrency(selection.packageTotal)}`,
    `Student: ${contact.studentName}`,
    contact.grade ? `Grade level: ${contact.grade}` : null,
    contact.subject ? `Subject / focus: ${contact.subject}` : null,
    contact.goal ? `Goal: ${contact.goal}` : null,
    contact.phone ? `Phone: ${contact.phone}` : null,
  ].filter(Boolean);
}

function buildCalendlyUrl(selection, contact) {
  const params = new URLSearchParams({
    name: contact.parentName,
    email: contact.email,
    a1: planDetailLines(selection, contact).join('\n'),
  });
  return `${CALENDLY_BASE_URL}?${params.toString()}`;
}

async function notifyWeb3Forms(selection, contact) {
  try {
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: `New Tiger Prep plan request — ${contact.parentName}`,
        from_name: contact.parentName,
        parent_name: contact.parentName,
        student_name: contact.studentName,
        email: contact.email,
        phone: contact.phone,
        referral_source: contact.referral,
        message: planDetailLines(selection, contact).join('\n'),
      }),
    });
    const result = await response.json();
    if (!result.success) console.error('Web3Forms submission error', result);
  } catch (error) {
    console.error('Web3Forms submission failed', error);
  }
}

planForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const selection = getPackageSelection();
  const contact = {
    parentName: document.querySelector('#plan-parent-name').value.trim(),
    studentName: document.querySelector('#plan-student-name').value.trim(),
    email: document.querySelector('#plan-email').value.trim(),
    phone: document.querySelector('#plan-phone').value.trim(),
    grade: document.querySelector('#plan-grade').value.trim(),
    subject: document.querySelector('#plan-subject').value.trim(),
    goal: document.querySelector('#plan-goal').value.trim(),
    referral: document.querySelector('#plan-referral').value,
  };
  const calendlyUrl = buildCalendlyUrl(selection, contact);

  notifyWeb3Forms(selection, contact);

  calendlyLink.href = calendlyUrl;
  calendlyHeading.textContent = `You're all set, ${contact.parentName.split(' ')[0] || 'there'}.`;
  calendlyCopy.textContent = 'Your plan is ready — pick a time and we’ll see you then.';
  renderSummary(planRecap, selection);
  planRecap.hidden = false;

  closePlanModal();
  planForm.reset();
  showPage('booking');
  history.replaceState(null, '', '#booking');
  window.open(calendlyUrl, '_blank', 'noreferrer');
});

const initialRoute = window.location.hash.slice(1) || 'home';
showPage(initialRoute === 'pricing' ? 'services' : initialRoute);

window.addEventListener('hashchange', () => {
  const route = window.location.hash.slice(1) || 'home';
  showPage(route === 'pricing' ? 'services' : route);
});
