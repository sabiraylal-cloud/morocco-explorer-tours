'use strict';
document.documentElement.classList.add('js');
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
menuButton.hidden = false;
function closeMenu(returnFocus = false) {
  menuButton.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('is-open');
  if (returnFocus) menuButton.focus();
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  navigation.classList.toggle('is-open', open);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigation.classList.contains('is-open')) closeMenu(true);
});
document.addEventListener('click', event => {
  if (!event.target.closest('.site-header')) closeMenu();
});
navigation.addEventListener('click', event => {
  if (event.target.closest('a')) closeMenu();
});
const mobileQuery = matchMedia('(max-width: 800px)');
function updateMenu() {
  menuButton.hidden = !mobileQuery.matches;
  closeMenu();
}
mobileQuery.addEventListener('change', updateMenu);
updateMenu();
const filters = document.querySelector('#tour-filters');
if (filters) {
  filters.hidden = false;
  const cards = [...document.querySelectorAll('.tour-card')];
  const params = new URLSearchParams(location.search);
  for (const name of ['start', 'category', 'days']) {
    const select = filters.elements.namedItem(name);
    if ([...select.options].some(option => option.value === params.get(name))) select.value = params.get(name);
  }
  function applyFilters(updateURL = true) {
    const data = new FormData(filters);
    let count = 0;
    for (const card of cards) {
      const visible = [...data].every(([key, value]) => !value || card.dataset[key] === value);
      card.hidden = !visible;
      if (visible) count++;
    }
    document.querySelector('#result-count').textContent = `${count} ${count === 1 ? 'journey' : 'journeys'} to explore`;
    document.querySelector('#empty-results').hidden = count > 0;
    if (updateURL) {
      const query = new URLSearchParams([...data].filter(([, value]) => value));
      history.replaceState(null, '', location.pathname + (query.size ? '?' + query : ''));
    }
  }
  filters.addEventListener('change', () => applyFilters());
  filters.addEventListener('submit', event => event.preventDefault());
  filters.addEventListener('reset', () => setTimeout(() => applyFilters(), 0));
  applyFilters(false);
}
const form = document.querySelector('#trip-form');
if (form) {
  form.hidden = false;
  const params = new URLSearchParams(location.search);
  const arrival = form.elements.namedItem('arrival');
  if ([...arrival.options].some(option => option.value === params.get('arrival'))) arrival.value = params.get('arrival');
  form.elements.namedItem('interest').value = (params.get('tour') || params.get('destination') || '').slice(0, 200);
  const month = form.elements.namedItem('month');
  const now = new Date();
  month.min = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const result = document.querySelector('#trip-result');
  const status = document.querySelector('#brief-status');
  let brief = '';
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const value = name => String(data.get(name) || '').trim();
    brief = `MOROCCO EXPLORER TOURS — MY TRIP BRIEF\n\nName: ${value('name') || 'Not provided'}\nTravel month: ${value('month') || 'Flexible'}\nArrival city: ${value('arrival')}\nTravellers: ${value('travellers')}\nDays in Morocco: ${value('days')}\nAccommodation: ${value('comfort')}\nTour or destination: ${value('interest') || 'Open to ideas'}\n\nMy ideas:\n${value('notes') || 'Help me find a route that fits.'}\n\nThis is a planning enquiry, not a confirmed booking.`;
    document.querySelector('#brief-text').textContent = brief;
    const share = document.querySelector('#share-brief');
    const phone = form.dataset.whatsapp.replace(/\D/g, '');
    const email = form.dataset.email.trim();
    share.hidden = true;
    if (/^\d{8,15}$/.test(phone)) {
      share.href = `https://wa.me/${phone}?text=${encodeURIComponent(brief)}`;
      share.textContent = 'Open WhatsApp draft ↗';
      share.hidden = false;
    } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      share.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('My Morocco trip enquiry')}&body=${encodeURIComponent(brief)}`;
      share.textContent = 'Open email draft ↗';
      share.hidden = false;
    }
    status.textContent = '';
    form.hidden = true;
    result.hidden = false;
    document.querySelector('#brief-title').focus();
  });
  document.querySelector('#edit-brief').addEventListener('click', () => {
    result.hidden = true;
    form.hidden = false;
    form.elements.namedItem('name').focus();
  });
  document.querySelector('#copy-brief').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(brief);
      status.textContent = 'Copied. You can paste your brief into a message. It has not been sent.';
    } catch {
      status.textContent = 'Copy is unavailable in this browser. Select the brief text to copy it, or use Download .txt.';
    }
  });
  document.querySelector('#download-brief').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([brief], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'morocco-trip-brief.txt';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = 'Your download is ready. This brief has not been sent.';
  });
}
