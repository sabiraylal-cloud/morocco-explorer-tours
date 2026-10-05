'use strict';
document.documentElement.classList.add('js');
const header = document.querySelector('.site-header');
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
  if (open) {
    header.classList.remove('is-hidden');
    header.classList.add('is-visible');
  }
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
let lastScrollY = window.scrollY;
let headerTicking = false;
function updateHeader() {
  const currentScrollY = Math.max(window.scrollY, 0);
  const menuOpen = navigation.classList.contains('is-open');
  if (currentScrollY <= 10 || menuOpen) {
    header.classList.remove('is-hidden');
    header.classList.toggle('is-visible', currentScrollY > 4 || menuOpen);
  } else if (currentScrollY > lastScrollY + 6 && currentScrollY > header.offsetHeight + 24) {
    header.classList.add('is-hidden');
    header.classList.remove('is-visible');
  } else if (currentScrollY < lastScrollY - 6) {
    header.classList.remove('is-hidden');
    header.classList.add('is-visible');
  }
  lastScrollY = currentScrollY;
  headerTicking = false;
}
window.addEventListener('scroll', () => {
  if (!headerTicking) {
    requestAnimationFrame(updateHeader);
    headerTicking = true;
  }
}, { passive: true });
updateHeader();
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


/* Official Morocco Explorer Tours contact UI */
(() => {
  const official = {
    email: 'moroccoexploredtours@gmail.com',
    phoneDisplay: '+212 704 321 335',
    phoneTel: '+212704321335',
    whatsapp: 'https://wa.me/212704321335',
    facebook: 'https://www.facebook.com/share/1FFJ8rrrof/',
    instagram: 'https://www.instagram.com/moroccoexplorertours2026?stkn=MWNwOWpqbjNjdzNscg==',
    youtube: 'https://www.youtube.com/@MoroccoExplorerTours'
  };

  const socialIcons = `
    <div class="site-footer__social" aria-label="Official social media channels">
      <a href="${official.facebook}" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13.5 22v-8h2.7l.4-3h-3.1V7.6c0-.9.3-1.5 1.7-1.5H16V3.1c-.3-.1-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.4V11H7v3h2.3v8h4.2Z"/></svg>
      </a>
      <a href="${official.instagram}" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5Zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5Zm5.5-3.3a1.2 1.2 0 1 1-1.2-1.2 1.2 1.2 0 0 1 1.2 1.2Z"/></svg>
      </a>
      <a href="${official.youtube}" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M22.5 7.2a3 3 0 0 0-2.1-2.1C18.7 4.7 12 4.7 12 4.7s-6.7 0-8.4.4A3 3 0 0 0 1.5 7.2 31 31 0 0 0 1 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.7.4 8.4.4 8.4.4s6.7 0 8.4-.4a3 3 0 0 0 2.1-2.1A31 31 0 0 0 23 12a31 31 0 0 0-.5-4.8ZM10 15.5v-7l6 3.5-6 3.5Z"/></svg>
      </a>
    </div>`;

  const footer = document.querySelector('footer');
  if (footer && !footer.querySelector('.site-footer__contact-panel')) {
    const panel = document.createElement('div');
    panel.className = 'container site-footer__contact-panel';
    panel.innerHTML = `
      <div class="site-footer__contacts">
        <a href="mailto:${official.email}">${official.email}</a>
        <a href="tel:${official.phoneTel}">${official.phoneDisplay}</a>
        <a href="${official.whatsapp}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <a href="${location.pathname.includes('/tours/') || location.pathname.includes('/destinations/') || location.pathname.includes('/blog/') ? '../' : ''}contact.html">Contact</a>
      </div>
      ${socialIcons}`;
    const bottom = footer.querySelector('.footer-bottom');
    if (bottom) footer.insertBefore(panel, bottom);
    else footer.append(panel);
  }

  if (!document.querySelector('.whatsapp-float')) {
    const button = document.createElement('a');
    button.className = 'whatsapp-float';
    button.href = official.whatsapp;
    button.target = '_blank';
    button.rel = 'noopener noreferrer';
    button.setAttribute('aria-label', 'Chat with Morocco Explorer Tours on WhatsApp');
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2a9.9 9.9 0 0 0-8.5 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3.1.8.8-3-.2-.3A8 8 0 1 1 12 20Zm4.5-6c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.7.8-.8 1-.2.2-.3.2-.6.1-1.5-.7-2.5-1.3-3.5-3-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.6l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.4-.2.3-.9.9-.9 2.1 0 1.3.9 2.5 1 2.7.1.2 1.8 2.8 4.5 3.9 1.7.7 2.4.8 3.3.7 1-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.2-.3-.3-.7-.4Z"/></svg>';
    document.body.append(button);
  }
})();
